import pool from './db';

// ── Module-level locks & state (shared across requests in same Node process) ────
let lastSimulationMs = 0;
const SIM_INTERVAL_MS = 2000;

// Momentum tracker: each asset can be in an UP/DOWN/SIDEWAYS trend for N ticks
interface Momentum { dir: 1 | -1 | 0; ticks: number; }
const momentum: Record<string, Momentum> = {};

// ── MARKET PARAMETERS (Aggressive — for visible candlestick movement) ──────────

// Max impact per bot trade per tick (3-5x more than before for visible movement)
const BOT_MAX_IMPACT: Record<string, number> = {
    DYTO:  0.015,   // 1.5% max per bot tick
    JOKOW: 0.022,   // 2.2%
    POLLO: 0.050,   // 5%
    OHIO:  0.060,   // 6%
    SIGMA: 0.085,   // 8.5%
    BONE:  0.130,   // 13%
    MEW:   0.180,   // 18%
};

const WHALE_IMPACT: Record<string, [number, number]> = {
    DYTO:  [0.050, 0.090],
    JOKOW: [0.070, 0.130],
    POLLO: [0.120, 0.220],
    OHIO:  [0.120, 0.230],
    SIGMA: [0.180, 0.320],
    BONE:  [0.220, 0.420],
    MEW:   [0.280, 0.550],
};

const CRASH_PROBABILITY: Record<string, number> = {
    DYTO:  0.0008, JOKOW: 0.0010, POLLO: 0.0020,
    OHIO:  0.0025, SIGMA: 0.0040, BONE:  0.0060, MEW: 0.0080,
};

const CORRELATIONS: Record<string, Array<{ symbol: string; factor: number }>> = {
    DYTO:  [{ symbol: 'JOKOW', factor: 0.50 }],
    JOKOW: [{ symbol: 'DYTO',  factor: 0.50 }],
    POLLO: [{ symbol: 'OHIO',  factor: 0.30 }],
    OHIO:  [{ symbol: 'POLLO', factor: 0.25 }, { symbol: 'SIGMA', factor: 0.15 }],
    SIGMA: [{ symbol: 'BONE',  factor: 0.40 }],
    BONE:  [{ symbol: 'MEW',   factor: 0.35 }, { symbol: 'SIGMA', factor: 0.20 }],
    MEW:   [{ symbol: 'BONE',  factor: 0.25 }],
};

export const LIQUIDITY: Record<string, number> = {
    DYTO:  2_000_000_000, JOKOW: 1_000_000_000,
    POLLO: 250_000_000,   OHIO:  150_000_000,
    SIGMA: 75_000_000,    BONE:  25_000_000, MEW: 15_000_000,
};

export const WHALE_IMPACT_MAP = WHALE_IMPACT;

// ── Gaussian random (Box-Muller) ──────────────────────────────────────────────
function gauss(mean = 0, std = 1): number {
    const u = Math.max(Math.random(), 1e-10);
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std + mean;
}

// ── Upsert price + candle (NO transaction — autocommit per statement) ─────────
async function applyPrice(sym: string, assetId: number, oldPrice: number, rawNew: number, floor: number): Promise<number> {
    const final = Math.max(floor, Math.round(rawNew * 10000) / 10000);
    const ts = Math.floor(Date.now() / 10000) * 10;
    const hi = Math.max(oldPrice, final);
    const lo = Math.max(floor, Math.min(oldPrice, final));

    await pool.execute(
        `UPDATE market_assets SET previous_price = ?, current_price = ?, ath = GREATEST(COALESCE(ath, 0), ?) WHERE id = ?`,
        [oldPrice, final, final, assetId]
    );
    await pool.execute(
        `INSERT INTO market_candles (symbol, open, high, low, close, timestamp) VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE high = GREATEST(high, ?), low = LEAST(low, ?), close = ?`,
        [sym, oldPrice, hi, lo, final, ts, hi, lo, final]
    );
    return final;
}

// ── MAIN SIMULATION (no transaction — fast, no lock contention) ───────────────
export async function runSimulation(): Promise<{ skipped: boolean; reason?: string }> {
    const now = Date.now();

    // Fast in-memory guard (no DB needed to check this)
    if (now - lastSimulationMs < SIM_INTERVAL_MS) {
        return { skipped: true, reason: 'too_soon' };
    }
    lastSimulationMs = now; // Claim slot immediately

    try {
        // Update market_config timestamp (best-effort, ignore errors)
        const nowSec = Math.floor(now / 1000);
        pool.execute(
            `INSERT INTO market_config (cfg_key, cfg_value) VALUES ('last_simulation', ?) ON DUPLICATE KEY UPDATE cfg_value = ?`,
            [String(nowSec), String(nowSec)]
        ).catch(() => {});

        const [assets]: any = await pool.execute('SELECT * FROM market_assets');
        const assetMap: Record<string, any> = {};
        for (const a of assets) assetMap[a.symbol] = a;

        const netChange: Record<string, number> = {};
        const finalPrices: Record<string, number> = {};

        for (const asset of assets) {
            const sym: string = asset.symbol;
            const cur = Number(asset.current_price);
            const floor = Number(asset.floor_price) || 1;
            const initP = Number(asset.initial_price) || cur;
            const ceilMult = Number(asset.ceiling_multiplier) || 10;
            const ceil = initP * ceilMult;
            const sentiment: string = asset.sentiment || 'neutral';
            const botMax = BOT_MAX_IMPACT[sym] ?? 0.05;
            const [wMin, wMax] = WHALE_IMPACT[sym] ?? [0.08, 0.20];
            const crashProb = CRASH_PROBABILITY[sym] ?? 0.003;

            let newPrice = cur;

            // ── CRASH RECOVERY ────────────────────────────────────────────────
            if (Number(asset.crash_mode) === 1) {
                const target = Number(asset.crash_recovery_target);
                if (cur >= target) {
                    await pool.execute('UPDATE market_assets SET crash_mode = 0, crash_recovery_target = 0 WHERE id = ?', [asset.id]);
                } else {
                    const bounce = Math.abs(gauss(botMax * 0.3, botMax * 0.4)) + botMax * 0.1;
                    newPrice = Math.min(target, cur * (1 + bounce));
                    const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
                    netChange[sym] = (fp - cur) / cur;
                    finalPrices[sym] = fp;
                    continue;
                }
            }

            // ── CRASH TRIGGER ─────────────────────────────────────────────────
            if (Math.random() < crashProb) {
                const crashPct = 0.30 + Math.random() * 0.25;
                newPrice = Math.max(floor, cur * (1 - crashPct));
                await pool.execute(
                    'UPDATE market_assets SET crash_mode = 1, crash_recovery_target = ? WHERE id = ?',
                    [cur * 0.75, asset.id]
                );
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, 'crash', +(-crashPct * 100).toFixed(4), cur, newPrice]
                ).catch(() => {});
                // Force bearish momentum after crash
                momentum[sym] = { dir: -1, ticks: 12 };
                const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
                netChange[sym] = (fp - cur) / cur;
                finalPrices[sym] = fp;
                continue;
            }

            // ── WHALE EVENTS (3% pump, 3% dump) ──────────────────────────────
            const whaleRoll = Math.random();
            if (whaleRoll < 0.030) {
                const pct = wMin + Math.random() * (wMax - wMin);
                newPrice = cur * (1 + pct);
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, 'whale_pump', +(pct * 100).toFixed(4), cur, newPrice]
                ).catch(() => {});
                // Whale pump resets momentum to bullish
                momentum[sym] = { dir: 1, ticks: Math.floor(Math.random() * 12) + 6 };
            } else if (whaleRoll < 0.060) {
                const pct = wMin + Math.random() * (wMax - wMin) * 1.2;
                newPrice = Math.max(floor, cur * (1 - pct));
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, 'whale_dump', +(-pct * 100).toFixed(4), cur, newPrice]
                ).catch(() => {});
                momentum[sym] = { dir: -1, ticks: Math.floor(Math.random() * 12) + 6 };
            } else {
                // ── MOMENTUM TRENDING SYSTEM ──────────────────────────────────
                // Each asset has a trend direction that persists for 8-27 ticks (~16-54 seconds)
                let mom = momentum[sym] ?? { dir: 0, ticks: 0 };

                if (mom.ticks <= 0) {
                    // Randomly assign new trend: 45% up, 35% down, 20% sideways
                    const roll = Math.random();
                    const newDir: 1 | -1 | 0 = roll < 0.45 ? 1 : roll < 0.80 ? -1 : 0;
                    mom = { dir: newDir, ticks: Math.floor(Math.random() * 20) + 8 };
                }
                mom.ticks--;
                momentum[sym] = mom;

                // Buy bias = base 50% + momentum bias (±35%) + sentiment bias (±10%)
                const sentBias = sentiment === 'bullish' ? 0.10 : sentiment === 'bearish' ? -0.10 : 0;
                const momBias = mom.dir * 0.35;
                const buyBias = Math.max(0.05, Math.min(0.95, 0.50 + momBias + sentBias));

                // 90% chance bot trades (increased from 80% — more active candles)
                if (Math.random() < 0.90) {
                    const isBuy = Math.random() < buyBias;
                    // Gaussian: most trades near mean, few at extreme
                    const impact = Math.min(Math.abs(gauss(botMax * 0.55, botMax * 0.45)), botMax);
                    newPrice = isBuy
                        ? cur * (1 + impact)
                        : Math.max(floor, cur * (1 - impact));
                } else {
                    // 10% passive micro-jitter
                    newPrice = Math.max(floor, cur * (1 + gauss(0, botMax * 0.15)));
                }
            }

            // Price bounds
            newPrice = Math.max(floor, newPrice);
            if (ceil > 0) newPrice = Math.min(ceil, newPrice);

            const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
            netChange[sym] = (fp - cur) / cur;
            finalPrices[sym] = fp;
        }

        // ── CORRELATION PASS (parallel) ───────────────────────────────────────
        const corrTasks: Promise<void>[] = [];
        for (const [sym, pct] of Object.entries(netChange)) {
            if (Math.abs(pct) < 0.003) continue;
            for (const { symbol: cs, factor } of (CORRELATIONS[sym] ?? [])) {
                const ca = assetMap[cs];
                if (!ca || Number(ca.crash_mode) === 1) continue;
                const cp = finalPrices[cs] ?? Number(ca.current_price);
                const cf = Number(ca.floor_price) || 1;
                const corrPct = pct * factor * (0.6 + Math.random() * 0.8);
                const np = Math.max(cf, cp * (1 + corrPct));
                if (Math.abs(np - cp) < cp * 0.0005) continue;
                corrTasks.push(
                    applyPrice(cs, ca.id, cp, np, cf).then(fp => { finalPrices[cs] = fp; })
                );
            }
        }
        await Promise.all(corrTasks);

        // ── SENTIMENT ROTATION (~0.8% chance per tick ≈ every ~4 min) ─────────
        if (Math.random() < 0.008) {
            const pool_s = ['bullish', 'bearish', 'neutral', 'neutral', 'neutral'];
            const sentUpdates = assets
                .filter(() => Math.random() < 0.40)
                .map((a: any) =>
                    pool.execute('UPDATE market_assets SET sentiment = ? WHERE id = ?',
                        [pool_s[Math.floor(Math.random() * pool_s.length)], a.id])
                );
            await Promise.all(sentUpdates);
        }

        // ── FILL PENDING LIMIT ORDERS ─────────────────────────────────────────
        const [pending]: any = await pool.execute(
            `SELECT lo.*, ma.current_price AS asset_price
             FROM limit_orders lo JOIN market_assets ma ON lo.symbol = ma.symbol
             WHERE lo.status = 'pending'`
        ).catch(() => [[]]); // Ignore if table doesn't exist yet

        for (const order of (pending as any[])) {
            const cp = Number(order.asset_price);
            const tp = Number(order.target_price);
            const amt = Number(order.amount);
            const totalVal = cp * amt;
            const fill = (order.type === 'buy' && cp <= tp) || (order.type === 'sell' && cp >= tp);
            if (!fill) continue;

            try {
                if (order.type === 'buy') {
                    const [ur]: any = await pool.execute('SELECT balance FROM slot_users WHERE user_id = ?', [order.user_id]);
                    if (!ur.length || Number(ur[0].balance) < totalVal) {
                        await pool.execute("UPDATE limit_orders SET status = 'cancelled' WHERE id = ?", [order.id]);
                        continue;
                    }
                    await pool.execute('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [totalVal, order.user_id]);
                    const [pr]: any = await pool.execute(
                        'SELECT amount_owned, avg_buy_price, total_invested FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                        [order.user_id, order.asset_id]
                    );
                    if (pr.length > 0) {
                        const oa = Number(pr[0].amount_owned), na = oa + amt;
                        const newAvg = ((Number(pr[0].avg_buy_price) * oa) + (cp * amt)) / na;
                        await pool.execute(
                            'UPDATE user_portfolio SET amount_owned = ?, avg_buy_price = ?, total_invested = total_invested + ? WHERE user_id = ? AND asset_id = ?',
                            [na, newAvg, totalVal, order.user_id, order.asset_id]
                        );
                    } else {
                        await pool.execute(
                            'INSERT INTO user_portfolio (user_id, asset_id, amount_owned, avg_buy_price, total_invested) VALUES (?,?,?,?,?)',
                            [order.user_id, order.asset_id, amt, cp, totalVal]
                        );
                    }
                } else {
                    const [pr]: any = await pool.execute(
                        'SELECT amount_owned, total_invested FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                        [order.user_id, order.asset_id]
                    );
                    if (!pr.length || Number(pr[0].amount_owned) < amt) {
                        await pool.execute("UPDATE limit_orders SET status = 'cancelled' WHERE id = ?", [order.id]);
                        continue;
                    }
                    await pool.execute('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [totalVal, order.user_id]);
                    const rem = Number(pr[0].amount_owned) - amt;
                    if (rem <= 0.000001) {
                        await pool.execute('DELETE FROM user_portfolio WHERE user_id = ? AND asset_id = ?', [order.user_id, order.asset_id]);
                    } else {
                        const prop = amt / Number(pr[0].amount_owned);
                        await pool.execute(
                            'UPDATE user_portfolio SET amount_owned = ?, total_invested = GREATEST(0, total_invested - ?) WHERE user_id = ? AND asset_id = ?',
                            [rem, prop * Number(pr[0].total_invested), order.user_id, order.asset_id]
                        );
                    }
                }
                await pool.execute("UPDATE limit_orders SET status = 'filled', filled_at = NOW() WHERE id = ?", [order.id]);
            } catch {}
        }

        return { skipped: false };
    } catch (err) {
        lastSimulationMs = 0; // Allow immediate retry on error
        throw err;
    }
}
