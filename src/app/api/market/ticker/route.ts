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

        // ── Batch fetch ALL candles in ONE query (was 7 separate queries) ───
        const windowStart = Math.floor(Date.now() / 10000) * 10 - 990; // last ~100 candles
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

        // ── Auto-seed candles for assets that have none ──────────────────────
        const seedTasks: Promise<void>[] = [];
        for (const asset of assets) {
            if ((candlesData[asset.symbol]?.length ?? 0) > 0) continue;

            seedTasks.push((async () => {
                const now10 = Math.floor(Date.now() / 10000) * 10;
                const vol = Number(asset.volatility) || 0.04;
                const base = Number(asset.current_price);
                const floor = Number(asset.floor_price) || 1;
                let last = base;
                const rows: any[] = [];

                for (let i = 99; i >= 0; i--) {
                    const t = now10 - i * 10;
                    const open = last;
                    const u1 = Math.max(Math.random(), 1e-10);
                    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
                    const close = Math.max(floor, open * (1 + gauss * vol * 0.7));
                    const hi = Math.max(open, close) * (1 + Math.random() * vol * 0.3);
                    const lo = Math.max(floor, Math.min(open, close) * (1 - Math.random() * vol * 0.3));
                    rows.push([asset.symbol, open, hi, lo, close, t]);
                    last = close;
                }

                await pool.query(
                    'INSERT IGNORE INTO market_candles (symbol, open, high, low, close, timestamp) VALUES ?',
                    [rows]
                );

                // Add to response
                const [fresh]: any = await pool.execute(
                    'SELECT open, high, low, close, timestamp AS time FROM market_candles WHERE symbol = ? ORDER BY timestamp ASC LIMIT 100',
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
