import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ── One-time table init (runs once per server restart) ───────────────────────
let tablesReady = false;

async function ensureTablesReady() {
    if (tablesReady) return;
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS market_config (
                cfg_key VARCHAR(50) PRIMARY KEY,
                cfg_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await pool.execute(
            "INSERT IGNORE INTO market_config (cfg_key, cfg_value) VALUES ('last_simulation', '0')"
        );
        await pool.execute(
            "INSERT IGNORE INTO market_config (cfg_key, cfg_value) VALUES ('sentiment_last_changed', '0')"
        );
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS market_candles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(10) NOT NULL,
                open DECIMAL(20,4) NOT NULL,
                high DECIMAL(20,4) NOT NULL,
                low DECIMAL(20,4) NOT NULL,
                close DECIMAL(20,4) NOT NULL,
                timestamp BIGINT NOT NULL,
                INDEX (symbol),
                UNIQUE INDEX idx_symbol_ts (symbol, timestamp)
            )
        `);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS limit_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                asset_id INT NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                type ENUM('buy','sell') NOT NULL,
                amount DECIMAL(20,6) NOT NULL,
                target_price DECIMAL(20,4) NOT NULL,
                status ENUM('pending','filled','cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                filled_at TIMESTAMP NULL,
                INDEX (user_id),
                INDEX (symbol, status)
            )
        `);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS market_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(10) NOT NULL,
                event_type VARCHAR(20) NOT NULL,
                price_change_pct DECIMAL(10,4),
                old_price DECIMAL(20,4),
                new_price DECIMAL(20,4),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (created_at),
                INDEX (symbol)
            )
        `);
        tablesReady = true;
    } catch (e) {
        // Don't set tablesReady = true — will retry next request
        console.error('ensureTablesReady error:', e);
        throw e;
    }
}

export async function GET() {
    try {
        // One-time init — ⚡ skipped on every subsequent request
        await ensureTablesReady();

        // ── Fetch assets (fast read, no locks) ──────────────────────────────
        const [assets]: any = await pool.execute('SELECT * FROM market_assets');
        if (!assets.length) {
            return NextResponse.json({ success: true, assets: [], candles: {}, events: [], user: null });
        }

        // ── Batch fetch ALL candles in ONE query ──────────────────────────────
        // 30-second candle periods. Fetch last 150 candles = ~75 min of history.
        const CANDLE_PERIOD_S = 30;
        const now10 = Math.floor(Date.now() / (CANDLE_PERIOD_S * 1000)) * CANDLE_PERIOD_S;
        const windowStart = now10 - 149 * CANDLE_PERIOD_S;
        const [allCandlesRaw]: any = await pool.execute(
            `SELECT symbol, open, high, low, close, timestamp AS time
             FROM market_candles
             WHERE timestamp >= ?
             ORDER BY symbol ASC, timestamp ASC`,
            [windowStart]
        );

        // Group candles by symbol
        const candlesData: Record<string, any[]> = {};
        for (const a of assets) candlesData[a.symbol] = [];
        for (const c of allCandlesRaw) {
            candlesData[c.symbol]?.push({
                open:  Number(c.open),
                high:  Number(c.high),
                low:   Number(c.low),
                close: Number(c.close),
                time:  Number(c.time),
            });
        }

        // ── Auto-seed candles for assets that have none or too few ─────────────
        // Seeds 150 bars of historical data with realistic volatile OHLC candles.
        const CANDLE_PERIOD_S_SEED = 30;
        const seedTasks: Promise<void>[] = [];
        for (const asset of assets) {
            if ((candlesData[asset.symbol]?.length ?? 0) >= 10) continue;

            seedTasks.push((async () => {
                // Clear any partial data first
                await pool.execute('DELETE FROM market_candles WHERE symbol = ?', [asset.symbol]);

                const now30 = Math.floor(Date.now() / (CANDLE_PERIOD_S_SEED * 1000)) * CANDLE_PERIOD_S_SEED;

                // vol = per-candle (30s) volatility.
                // Asset volatility column is typically daily, so we scale down to 30s:
                // vol_30s ≈ vol_daily * sqrt(30/(24*3600)) ≈ vol_daily * 0.019
                // We use vol directly from DB but clamp to reasonable range [0.005, 0.035]
                const rawVol = Number(asset.volatility) || 0.04;
                const vol = Math.min(Math.max(rawVol * 0.3, 0.005), 0.035);

                const base = Number(asset.current_price);
                const floor = Number(asset.floor_price) || 1;

                // Build a realistic price walk backwards from the current price
                let last = base;
                const rows: any[] = [];

                for (let i = 149; i >= 0; i--) {
                    const t = now30 - i * CANDLE_PERIOD_S_SEED;
                    const open = last;

                    // Box-Muller Gaussian for realistic drift
                    const u1 = Math.max(Math.random(), 1e-10);
                    const gaussVal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());

                    // Close can swing ±vol from open, capped at ±4%
                    const rawDelta = gaussVal * vol;
                    const cappedDelta = Math.max(-0.04, Math.min(0.04, rawDelta));
                    const close = Math.max(floor, open * (1 + cappedDelta));

                    // Wicks: high above max(o,c), low below min(o,c)
                    const body_high = Math.max(open, close);
                    const body_low  = Math.min(open, close);
                    const wickRange = vol * 0.5;
                    const hi = body_high * (1 + Math.random() * wickRange);
                    const lo = Math.max(floor, body_low * (1 - Math.random() * wickRange));

                    rows.push([asset.symbol, open, hi, lo, close, t]);
                    last = close;
                }

                if (rows.length > 0) {
                    await pool.query(
                        'INSERT IGNORE INTO market_candles (symbol, open, high, low, close, timestamp) VALUES ?',
                        [rows]
                    );
                }

                // Fetch and assign fresh data
                const [fresh]: any = await pool.execute(
                    'SELECT open, high, low, close, timestamp AS time FROM market_candles WHERE symbol = ? ORDER BY timestamp ASC LIMIT 150',
                    [asset.symbol]
                );
                candlesData[asset.symbol] = fresh.map((c: any) => ({
                    open: Number(c.open), high: Number(c.high),
                    low:  Number(c.low),  close: Number(c.close), time: Number(c.time),
                }));
            })());
        }
        await Promise.all(seedTasks);

        // ── Recent events (non-blocking — ignore if table missing) ───────────
        const [events]: any = await pool.execute(
            "SELECT id, symbol, event_type, price_change_pct, old_price, new_price FROM market_events WHERE created_at >= NOW() - INTERVAL 5 SECOND ORDER BY created_at DESC LIMIT 10"
        ).catch(() => [[]]);

        // ── User data (if logged in) ─────────────────────────────────────────
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        let userData = null;

        if (userId) {
            const [user]: any = await pool.execute(
                'SELECT balance FROM slot_users WHERE user_id = ?', [userId]
            );
            const [portfolio]: any = await pool.execute(
                `SELECT p.amount_owned, p.avg_buy_price, p.total_invested,
                        a.symbol, a.name, a.current_price, a.id AS asset_id
                 FROM user_portfolio p JOIN market_assets a ON p.asset_id = a.id
                 WHERE p.user_id = ?`,
                [userId]
            );

            userData = {
                balance: Number(user[0]?.balance) || 0,
                portfolio: portfolio.map((p: any) => {
                    const curVal  = Number(p.amount_owned) * Number(p.current_price);
                    const invested = Number(p.total_invested) || 0;
                    const pnl     = curVal - invested;
                    return {
                        symbol:             p.symbol,
                        name:               p.name,
                        asset_id:           p.asset_id,
                        amount_owned:       Number(p.amount_owned),
                        avg_buy_price:      Number(p.avg_buy_price),
                        current_price:      Number(p.current_price),
                        current_value:      curVal,
                        total_invested:     invested,
                        unrealized_pnl:     pnl,
                        unrealized_pnl_pct: invested > 0 ? (pnl / invested) * 100 : 0,
                    };
                }),
            };
        }

        return NextResponse.json({
            success: true,
            assets,
            candles: candlesData,
            events,
            user: userData,
        });

    } catch (error: any) {
        console.error('Ticker Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
