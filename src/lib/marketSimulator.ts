import pool from './db';

// ── Module-level state ─────────────────────────────────────────────────────────
let lastSimulationMs = 0;
const SIM_INTERVAL_MS = 2000;

// ── CANDLE PERIOD: 30 seconds per candle ────────────────────────────────────────
// Each candle covers a 30s window. Multiple sim ticks per candle = proper OHLC with range.
const CANDLE_PERIOD_S = 30;

// Momentum tracker
interface Momentum { dir: 1 | -1 | 0; ticks: number; }
const momentum: Record<string, Momentum> = {};

// ── Bot activity log (in-memory, last 50 actions) ────────────────────────────
export interface BotActivity {
    id: number;
    symbol: string;
    action: 'BUY' | 'SELL' | 'WHALE_PUMP' | 'WHALE_DUMP' | 'CRASH' | 'RECOVERY';
    amount: number;
    price: number;
    pct: number;
    ts: number;
}
const botActivityLog: BotActivity[] = [];
let activityIdCounter = 1;

function logBotActivity(entry: Omit<BotActivity, 'id' | 'ts'>) {
    botActivityLog.unshift({ ...entry, id: activityIdCounter++, ts: Date.now() });
    if (botActivityLog.length > 50) botActivityLog.pop();
}

export function getBotActivity(): BotActivity[] {
    return botActivityLog.slice(0, 30);
}

// ── MARKET PARAMETERS ──────────────────────────────────────────────────────────
// Higher volatility per tick = visible candle bodies & wicks over 30s periods

const BOT_MAX_IMPACT: Record<string, number> = {
    DYTO:  0.025,   // 2.5% max swing per tick
    JOKOW: 0.035,
    POLLO: 0.070,
    OHIO:  0.080,
    SIGMA: 0.110,
    BONE:  0.160,
    MEW:   0.220,
};

const WHALE_IMPACT: Record<string, [number, number]> = {
    DYTO:  [0.060, 0.120],
    JOKOW: [0.080, 0.160],
    POLLO: [0.140, 0.260],
    OHIO:  [0.130, 0.270],
    SIGMA: [0.200, 0.380],
    BONE:  [0.280, 0.500],
    MEW:   [0.320, 0.600],
};

const CRASH_PROBABILITY: Record<string, number> = {
    DYTO:  0.0010, JOKOW: 0.0013, POLLO: 0.0025,
    OHIO:  0.0030, SIGMA: 0.0050, BONE:  0.0070, MEW: 0.0100,
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

// ── Gaussian random (Box-Muller) ───────────────────────────────────────────────
function gauss(mean = 0, std = 1): number {
    const u = Math.max(Math.random(), 1e-10);
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std + mean;
}

// ── Get current candle timestamp bucket ───────────────────────────────────────
function candleBucket(): number {
    return Math.floor(Date.now() / (CANDLE_PERIOD_S * 1000)) * CANDLE_PERIOD_S;
}

// ── Upsert candle with proper OHLC accrual ────────────────────────────────────
// Each sim tick contributes to the SAME candle for its 30s window.
// open = first price of window, high = max, low = min, close = latest.
async function applyPrice(
    sym: string, assetId: number,
    oldPrice: number, rawNew: number, floor: number
): Promise<number> {
    const final = Math.max(floor, Math.round(rawNew * 100) / 100);
    const ts = candleBucket(); // 30-second bucket

    await pool.execute(
        `UPDATE market_assets SET previous_price = ?, current_price = ?, ath = GREATEST(COALESCE(ath, 0), ?) WHERE id = ?`,
        [oldPrice, final, final, assetId]
    );

    // Proper OHLC: open only set on INSERT (first tick of candle)
    // high = running max, low = running min, close = latest price
    await pool.execute(
        `INSERT INTO market_candles (symbol, open, high, low, close, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           high  = GREATEST(high, ?),
           low   = LEAST(low, ?),
           close = ?`,
        [sym, oldPrice, final, final, final, ts,
              final,        final,              final]
    );

    return final;
}

// ── Delete all existing candles (reset) ───────────────────────────────────────
export async function resetAllCandles(): Promise<void> {
    await pool.execute('DELETE FROM market_candles');
}

// ── MAIN SIMULATION ───────────────────────────────────────────────────────────
export async function runSimulation(): Promise<{ skipped: boolean; reason?: string }> {
    const now = Date.now();
    if (now - lastSimulationMs < SIM_INTERVAL_MS) {
        return { skipped: true, reason: 'too_soon' };
    }
    lastSimulationMs = now;

    try {
        // Update last_simulation timestamp
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

            // ── CRASH RECOVERY ─────────────────────────────────────────────────
            if (Number(asset.crash_mode) === 1) {
                const target = Number(asset.crash_recovery_target);
                if (cur >= target) {
                    await pool.execute('UPDATE market_assets SET crash_mode = 0, crash_recovery_target = 0 WHERE id = ?', [asset.id]);
                } else {
                    const bounce = Math.abs(gauss(botMax * 0.5, botMax * 0.5)) + botMax * 0.15;
                    newPrice = Math.min(target, cur * (1 + bounce));
                    const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
                    const pct = ((fp - cur) / cur) * 100;
                    logBotActivity({ symbol: sym, action: 'RECOVERY', amount: 1, price: fp, pct });
                    netChange[sym] = (fp - cur) / cur;
                    finalPrices[sym] = fp;
                    continue;
                }
            }

            // ── CRASH TRIGGER ──────────────────────────────────────────────────
            if (Math.random() < crashProb) {
                const crashPct = 0.30 + Math.random() * 0.30;
                newPrice = Math.max(floor, cur * (1 - crashPct));
                await pool.execute(
                    'UPDATE market_assets SET crash_mode = 1, crash_recovery_target = ? WHERE id = ?',
                    [cur * 0.80, asset.id]
                );
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, 'crash', +(-crashPct * 100).toFixed(4), cur, newPrice]
                ).catch(() => {});
                momentum[sym] = { dir: -1, ticks: 15 };
                const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
                logBotActivity({ symbol: sym, action: 'CRASH', amount: 1, price: fp, pct: -crashPct * 100 });
                netChange[sym] = (fp - cur) / cur;
                finalPrices[sym] = fp;
                continue;
            }

            // ── WHALE EVENTS (4% pump, 4% dump) ───────────────────────────────
            const whaleRoll = Math.random();
            if (whaleRoll < 0.040) {
                const pct = wMin + Math.random() * (wMax - wMin);
                newPrice = cur * (1 + pct);
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, 'whale_pump', +(pct * 100).toFixed(4), cur, newPrice]
                ).catch(() => {});
                momentum[sym] = { dir: 1, ticks: Math.floor(Math.random() * 15) + 8 };
                const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
                logBotActivity({ symbol: sym, action: 'WHALE_PUMP', amount: Math.floor(Math.random() * 500) + 100, price: fp, pct: pct * 100 });
                netChange[sym] = (fp - cur) / cur;
                finalPrices[sym] = fp;
                continue;
            } else if (whaleRoll < 0.080) {
                const pct = wMin + Math.random() * (wMax - wMin) * 1.3;
                newPrice = Math.max(floor, cur * (1 - pct));
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, 'whale_dump', +(-pct * 100).toFixed(4), cur, newPrice]
                ).catch(() => {});
                momentum[sym] = { dir: -1, ticks: Math.floor(Math.random() * 15) + 8 };
                const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
                logBotActivity({ symbol: sym, action: 'WHALE_DUMP', amount: Math.floor(Math.random() * 500) + 100, price: fp, pct: -pct * 100 });
                netChange[sym] = (fp - cur) / cur;
                finalPrices[sym] = fp;
                continue;
            } else {
                // ── MOMENTUM TRENDING + BOT TRADE ─────────────────────────────
                let mom = momentum[sym] ?? { dir: 0, ticks: 0 };
                if (mom.ticks <= 0) {
                    const roll = Math.random();
                    const newDir: 1 | -1 | 0 = roll < 0.45 ? 1 : roll < 0.80 ? -1 : 0;
                    mom = { dir: newDir, ticks: Math.floor(Math.random() * 20) + 8 };
                }
                mom.ticks--;
                momentum[sym] = mom;

                const sentBias = sentiment === 'bullish' ? 0.12 : sentiment === 'bearish' ? -0.12 : 0;
                const momBias = mom.dir * 0.38;
                const buyBias = Math.max(0.05, Math.min(0.95, 0.50 + momBias + sentBias));

                // 95% chance bot trades actively
                if (Math.random() < 0.95) {
                    const isBuy = Math.random() < buyBias;

                    // Use Gaussian for realistic price impact — centered around mid-range
                    const rawImpact = Math.abs(gauss(botMax * 0.5, botMax * 0.5));
                    const impact = Math.min(rawImpact, botMax);

                    newPrice = isBuy
                        ? cur * (1 + impact)
                        : Math.max(floor, cur * (1 - impact));

                    const tradePct = ((newPrice - cur) / cur) * 100;
                    const tradeAmt = Math.floor(Math.random() * 300) + 10;
                    logBotActivity({
                        symbol: sym,
                        action: isBuy ? 'BUY' : 'SELL',
                        amount: tradeAmt,
                        price: Math.round(newPrice),
                        pct: tradePct,
                    });
                } else {
                    // 5% micro-jitter (no log — too noisy)
                    newPrice = Math.max(floor, cur * (1 + gauss(0, botMax * 0.20)));
                }
            }

            // Price bounds
            newPrice = Math.max(floor, newPrice);
            if (ceil > 0) newPrice = Math.min(ceil, newPrice);

            const fp = await applyPrice(sym, asset.id, cur, newPrice, floor);
            netChange[sym] = (fp - cur) / cur;
            finalPrices[sym] = fp;
        }

        // ── CORRELATION PASS ─────────────────────────────────────────────────
        const corrTasks: Promise<void>[] = [];
        for (const [sym, pct] of Object.entries(netChange)) {
            if (Math.abs(pct) < 0.003) continue;
            for (const { symbol: cs, factor } of (CORRELATIONS[sym] ?? [])) {
                const ca = assetMap[cs];
                if (!ca || Number(ca.crash_mode) === 1) continue;
                const cp = finalPrices[cs] ?? Number(ca.current_price);
                const cf = Number(ca.floor_price) || 1;
                const corrPct = pct * factor * (0.5 + Math.random() * 1.0);
                const np = Math.max(cf, cp * (1 + corrPct));
                if (Math.abs(np - cp) < cp * 0.0005) continue;
                corrTasks.push(
                    applyPrice(cs, ca.id, cp, np, cf).then(fp => { finalPrices[cs] = fp; })
                );
            }
        }
        await Promise.all(corrTasks);

        // ── SENTIMENT ROTATION ──────────────────────────────────────────────
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

        // ── FILL PENDING LIMIT ORDERS ────────────────────────────────────────
        const [pending]: any = await pool.execute(
            `SELECT lo.*, ma.current_price AS asset_price
             FROM limit_orders lo JOIN market_assets ma ON lo.symbol = ma.symbol
             WHERE lo.status = 'pending'`
        ).catch(() => [[]]);

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
        lastSimulationMs = 0;
        throw err;
    }
}
