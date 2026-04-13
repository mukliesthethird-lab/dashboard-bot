import pool from './db';

// ── V3 Module State ──────────────────────────────────────────────────────────
let lastSimulationMs = 0;
const SIM_INTERVAL_MS = 1000;
const CANDLE_PERIOD_S = 30;

interface MarketWave {
    symbol: string;
    dir: 1 | -1 | 0;
    intensity: number;
    remainingTicks: number;
}
const waves: Record<string, MarketWave> = {};

interface SurgeState { active: boolean; endsAt: number; }
let surge: SurgeState = { active: false, endsAt: 0 };

// ── V3 "PRO" CONSTANTS ────────────────────────────────────────────────────────

const LIQUIDITY_DEPTH: Record<string, number> = {
    DYTO:  10_000_000, 
    JOKOW: 8_000_000,
    POLLO: 3_000_000,
    OHIO:  2_000_000,
    SIGMA: 1_200_000,
    BONE:  800_000,
    MEW:   500_000,
};

const WHALE_IMPACT_MAP = {
    DYTO:  [0.02, 0.04],
    JOKOW: [0.03, 0.05],
    POLLO: [0.04, 0.08],
    OHIO:  [0.04, 0.10],
    SIGMA: [0.08, 0.12],
    BONE:  [0.10, 0.18],
    MEW:   [0.12, 0.25],
};

const SENSITIVITY: Record<string, number> = {
    DYTO:  3.0,
    JOKOW: 4.0,
    POLLO: 5.5,
    OHIO:  5.0,
    SIGMA: 6.0,
    BONE:  7.5,
    MEW:   9.0,
};

const MAX_TICK_MOVE = {
    DYTO:  0.02, JOKOW: 0.03, POLLO: 0.045,
    OHIO:  0.05, SIGMA: 0.07, BONE:  0.10, MEW: 0.15
};

const BEHAVIOR_PROFILES: Record<string, any> = {
    DYTO:  { retailFactor: [0.0001, 0.0003], whaleFactor: [0.008, 0.015], krocoDensity: [15, 30], whaleProb: 0.005, waveSticky: 2.5, jitter: 0.05 },
    JOKOW: { retailFactor: [0.0001, 0.0005], whaleFactor: [0.010, 0.020], krocoDensity: [12, 25], whaleProb: 0.006, waveSticky: 2.0, jitter: 0.08 },
    POLLO: { retailFactor: [0.0008, 0.0018], whaleFactor: [0.015, 0.035], krocoDensity: [10, 20], whaleProb: 0.010, waveSticky: 1.5, jitter: 0.15 },
    OHIO:  { retailFactor: [0.0010, 0.0020], whaleFactor: [0.015, 0.035], krocoDensity: [8, 18],  whaleProb: 0.008, waveSticky: 1.2, jitter: 0.20 },
    SIGMA: { retailFactor: [0.0012, 0.0025], whaleFactor: [0.020, 0.045], krocoDensity: [6, 15],  whaleProb: 0.010, waveSticky: 0.8, jitter: 0.30 },
    BONE:  { retailFactor: [0.0015, 0.0035], whaleFactor: [0.025, 0.060], krocoDensity: [4, 12],  whaleProb: 0.012, waveSticky: 0.4, jitter: 0.50 },
    MEW:   { retailFactor: [0.0020, 0.0050], whaleFactor: [0.030, 0.080], krocoDensity: [2, 8],   whaleProb: 0.015, waveSticky: 0.2, jitter: 0.80 },
};

// ── UTILS ─────────────────────────────────────────────────────────────────────

function gauss(mean = 0, std = 1): number {
    const u = Math.max(Math.random(), 1e-10);
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std + mean;
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function candleBucket(): number {
    return Math.floor(Date.now() / (CANDLE_PERIOD_S * 1000)) * CANDLE_PERIOD_S;
}

// ── VIRTUAL ORDER BOOK ───────────────────────────────────────────────────────

function getSlippageImpact(sym: string, volume: number, isBuy: boolean, isSurge: boolean): number {
    const depth = LIQUIDITY_DEPTH[sym] || 1_000_000;
    const sens  = SENSITIVITY[sym] || 5.0;
    const mmSupport = depth * 0.1; 
    
    let effectiveImpact: number;
    if (volume <= mmSupport) {
        effectiveImpact = (volume / depth) * (sens * 0.5);
    } else {
        const extraVolume = volume - mmSupport;
        effectiveImpact = (mmSupport / depth) * (sens * 0.5) + (extraVolume / depth) * sens * 1.5;
    }

    if (isSurge) effectiveImpact *= 1.30;
    const jitter = Math.abs(gauss(0, effectiveImpact * 0.15));
    const total = effectiveImpact + jitter;
    const cap = (MAX_TICK_MOVE as any)[sym] || 0.08;
    return isBuy ? Math.min(total, cap) : -Math.min(total, cap);
}

// ── ENGINE LOGIC ─────────────────────────────────────────────────────────────

function updateWave(sym: string) {
    let wave = waves[sym];
    if (!wave || wave.remainingTicks <= 0) {
        const roll = Math.random();
        const dir: 1 | -1 | 0 = roll < 0.40 ? 1 : roll < 0.70 ? -1 : 0;
        waves[sym] = {
            symbol: sym,
            dir: dir,
            intensity: 0.5 + Math.random() * 0.8,
            remainingTicks: randInt(40, 180) * (BEHAVIOR_PROFILES[sym]?.waveSticky || 1.0)
        };
    } else {
        wave.remainingTicks--;
    }
}

async function applyPriceUpdate(
    sym: string, assetId: number, 
    oldP: number, newP: number, floor: number, ceil: number
): Promise<number> {
    const final = Math.max(floor, Math.min(ceil > 0 ? ceil : newP, Math.round(newP * 100) / 100));
    const ts = candleBucket();

    await pool.execute(
        `UPDATE market_assets SET previous_price = ?, current_price = ?, ath = GREATEST(COALESCE(ath,0), ?) WHERE id = ?`,
        [oldP, final, final, assetId]
    );

    await pool.execute(
        `INSERT INTO market_candles (symbol, open, high, low, close, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            high = GREATEST(high, ?),
            low = LEAST(low, ?),
            close = ?`,
        [sym, oldP, final, final, final, ts, final, final, final]
    );
    return final;
}

export async function runSimulation() {
    const now = Date.now();
    if (now - lastSimulationMs < SIM_INTERVAL_MS) return { skipped: true };
    lastSimulationMs = now;

    if (surge.active && now > surge.endsAt) surge.active = false;
    if (!surge.active && Math.random() < 0.001) surge = { active: true, endsAt: now + 45000 };

    try {
        const nowSec = Math.floor(now / 1000);
        pool.execute(`UPDATE market_config SET cfg_value = ? WHERE cfg_key = 'last_simulation'`, [String(nowSec)]).catch(() => {});

        // Fetch User Sentiment Signals from Config for all assets
        const [configRows]: any = await pool.execute('SELECT cfg_key, cfg_value FROM market_config WHERE cfg_key LIKE "user_signal_%"');
        const userSignals = configRows.reduce((acc: any, row: any) => {
            acc[row.cfg_key.replace("user_signal_", "")] = row.cfg_value;
            return acc;
        }, {});

        const [assets]: any = await pool.execute('SELECT * FROM market_assets');
        
        // ─── V5 CORRELATION TRACKER ───
        // Calculate DYTO movement to influence other assets
        const dytoAsset = assets.find((a: any) => a.symbol === 'DYTO');
        let dytoPct = 0;
        if (dytoAsset) {
            const dCur = Number(dytoAsset.current_price);
            const dPrev = Number(dytoAsset.previous_price) || dCur;
            dytoPct = (dCur - dPrev) / dPrev;
        }

        for (const asset of assets) {
            const sym = asset.symbol;
            updateWave(sym);
            
            const cur = Number(asset.current_price);
            const prev = Number(asset.previous_price) || cur;
            const floor = Number(asset.floor_price) || 1;
            const initP = Number(asset.initial_price) || cur;
            const ceil = initP * (Number(asset.ceiling_multiplier) || 12);
            const sentiment = asset.sentiment || 'neutral';
            const profile = BEHAVIOR_PROFILES[sym] || BEHAVIOR_PROFILES.DYTO;
            const depth = LIQUIDITY_DEPTH[sym] || 1_000_000;
            
            let runningPrice = cur;
            const wave = waves[sym];
            const signal = userSignals[sym] || null;

            // ─── V5 MARKET CORRELATION ───
            // DYTO leads the market. If DYTO is up, others get a boost.
            let correlationBias = 0;
            if (sym !== 'DYTO') {
                if (dytoPct > 0.01) correlationBias = 0.12;       // Strong pump
                else if (dytoPct > 0.002) correlationBias = 0.04; // Mild pump
                else if (dytoPct < -0.01) correlationBias = -0.10; // Panic sell
            }

            // ─── PRICE RESISTANCE ───
            const priceRatio = cur / ceil;
            let resistanceFactor = 1.0;
            let resistanceSellBias = 0;
            
            // If price > 70% of max, reduce upward impact by up to 80% and bias sells
            if (priceRatio > 0.7) {
                const overshoot = (priceRatio - 0.7) / 0.3; // 0 -> 1.0 as it hits 100%
                resistanceFactor = 1.0 - (overshoot * 0.8); // 1.0 -> 0.2
            }
            if (priceRatio > 0.85) {
                resistanceSellBias = -0.4 * ((priceRatio - 0.85) / 0.15); // Up to -40% buy prob
            }

            // ─── AGENT 1: KROCO BOTS (Small activity 1-100 lembar) ───────────
            const krocoTrades = randInt(profile.krocoDensity[0], profile.krocoDensity[1]);
            for (let i = 0; i < krocoTrades; i++) {
                const vol = randInt(1, 100); 
                let impact = getSlippageImpact(sym, vol, Math.random() < 0.55 + correlationBias, surge.active);
                if (impact > 0) impact *= resistanceFactor;
                runningPrice = runningPrice * (1 + impact);
            }

            // ─── AGENT 2: RETAIL & TREND FOLLOWERS ───────────
            // Social Following Bias: if user signal exists, shift the probability
            let userBias = 0;
            if (signal === 'buy') userBias = 0.20;
            if (signal === 'sell') userBias = -0.15;

            const sentBias = sentiment === 'bullish' ? 0.10 : sentiment === 'bearish' ? -0.10 : 0;
            const waveBias = wave.dir * 0.45 * wave.intensity;
            const buyProb  = Math.max(0.05, Math.min(0.95, 0.5 + sentBias + waveBias + userBias + correlationBias + resistanceSellBias));
            
            const retailTrades = randInt(2, 5); 
            for (let i = 0; i < retailTrades; i++) {
                const isBuy = Math.random() < buyProb;
                const minV = depth * profile.retailFactor[0];
                const maxV = depth * profile.retailFactor[1];
                const vol = Math.max(minV, Math.min(maxV, Math.ceil(Math.abs(gauss(minV * 2, maxV / 2)))));
                let impact = getSlippageImpact(sym, vol, isBuy, surge.active);
                if (impact > 0) impact *= resistanceFactor;
                runningPrice = runningPrice * (1 + impact);
            }

            // ─── AGENT 3: WHALES (Event Driven / Recovery Mode) ───────────
            // 💡 WHALE RECOVERY: If price dropped > 5% recently AND signal is sell, whales step in to stabilize
            const priceDropped = ((prev - cur) / prev) > 0.05;
            const isRecoveryNeeded = priceDropped && signal === 'sell';
            
            const whaleProb = isRecoveryNeeded ? 0.80 : (surge.active ? 0.08 : profile.whaleProb);
            
            if (Math.random() < whaleProb) {
                // If recovery mode, WHALE ONLY BUYS
                const isPump = isRecoveryNeeded ? true : (Math.random() < (buyProb + 0.1)); 
                const minW = depth * profile.whaleFactor[0];
                const maxW = depth * profile.whaleFactor[1];
                const vol = randInt(minW, maxW); 
                let impact = getSlippageImpact(sym, vol, isPump, surge.active);
                if (impact > 0) impact *= resistanceFactor;
                runningPrice = runningPrice * (1 + impact);
                
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, isRecoveryNeeded ? 'whale_recovery' : (isPump ? 'whale_pump' : 'whale_dump'), +(impact * 100).toFixed(4), cur, runningPrice]
                ).catch(() => {});
            }

            if (Number(asset.crash_mode) === 1) {
                const target = Number(asset.crash_recovery_target);
                if (cur >= target) {
                    await pool.execute('UPDATE market_assets SET crash_mode = 0 WHERE id = ?', [asset.id]);
                } else {
                    const impact = Math.abs(getSlippageImpact(sym, randInt(200, 500), true, false)) * 1.8;
                    runningPrice = Math.min(target, runningPrice * (1 + impact));
                }
            } else {
                // Ultra-rare random crash (0.00002 = ~14 hours per coin)
                const crashProb = 0.00002;
                if (Math.random() < crashProb) {
                    const drop = 0.15 + Math.random() * 0.15;
                    runningPrice = runningPrice * (1 - drop);
                    await pool.execute('UPDATE market_assets SET crash_mode = 1, crash_recovery_target = ? WHERE id = ?', [cur, asset.id]);
                    pool.execute('INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                        [sym, 'crash', +(-drop * 100).toFixed(4), cur, runningPrice]
                    ).catch(() => {});
                }
            }

            // ─── V5 MATCHING ENGINE (Process Limit Orders) ───────────
            const [pendingOrders]: any = await pool.execute(
                "SELECT * FROM limit_orders WHERE asset_id = ? AND status = 'pending'",
                [asset.id]
            );

            for (const order of pendingOrders) {
                const minPrice = Number(order.min_price);
                const maxPrice = Number(order.max_price);
                const isBuy = order.type === 'buy';
                
                // Trigger condition: Price is within the target range
                const triggered = (runningPrice >= minPrice && runningPrice <= maxPrice);

                if (triggered) {
                    const amount = Number(order.amount);
                    const totalCost = amount * runningPrice;
                    
                    try {
                        // For SELL: execute trade logic
                        if (!isBuy) {
                            await pool.execute('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [totalCost, order.user_id]);
                            await pool.execute(
                                'UPDATE user_portfolio SET amount_owned = amount_owned - ? WHERE user_id = ? AND asset_id = ?',
                                [amount, order.user_id, asset.id]
                            );
                            // Cleanup empty portfolio
                            await pool.execute('DELETE FROM user_portfolio WHERE user_id = ? AND asset_id = ? AND amount_owned <= 0.0001', [order.user_id, asset.id]);
                        } else {
                            // For BUY: Balance was already escrowed, just add to portfolio
                            const [pr]: any = await pool.execute(
                                'SELECT id FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                                [order.user_id, asset.id]
                            );
                            if (pr.length > 0) {
                                await pool.execute(
                                    'UPDATE user_portfolio SET amount_owned = amount_owned + ?, total_invested = total_invested + ? WHERE id = ?',
                                    [amount, totalCost, pr[0].id]
                                );
                            } else {
                                await pool.execute(
                                    'INSERT INTO user_portfolio (user_id, asset_id, amount_owned, avg_buy_price, total_invested) VALUES (?,?,?,?,?)',
                                    [order.user_id, asset.id, amount, runningPrice, totalCost]
                                );
                            }
                        }

                        // Mark Order as FILLED
                        await pool.execute(
                            "UPDATE limit_orders SET status = 'filled', filled_at = NOW() WHERE id = ?",
                            [order.id]
                        );

                        // Price Impact from Limit Order
                        const impact = getSlippageImpact(sym, amount, isBuy, false);
                        runningPrice = runningPrice * (1 + impact);

                    } catch (e) { console.error('Matching Engine Error:', e); }
                }
            }

            await applyPriceUpdate(sym, asset.id, cur, runningPrice, floor, ceil);
        }
        return { skipped: false };
    } catch (err) {
        lastSimulationMs = 0;
        throw err;
    }
}

export async function resetAllCandles() {
    await pool.execute('DELETE FROM market_candles');
}

// ── EXPORTS BLOCK ─────────────────────────────────────────────────────────────
export { LIQUIDITY_DEPTH as LIQUIDITY, WHALE_IMPACT_MAP, getSlippageImpact };
