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
    OHIO:  6.5,
    SIGMA: 8.0,
    BONE:  12.0,
    MEW:   18.0,
};

const MAX_TICK_MOVE = {
    DYTO:  0.02, JOKOW: 0.03, POLLO: 0.045,
    OHIO:  0.05, SIGMA: 0.07, BONE:  0.10, MEW: 0.15
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
            remainingTicks: randInt(60, 240)
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

        const [assets]: any = await pool.execute('SELECT * FROM market_assets');
        
        for (const asset of assets) {
            const sym = asset.symbol;
            updateWave(sym);
            
            const cur = Number(asset.current_price);
            const floor = Number(asset.floor_price) || 1;
            const initP = Number(asset.initial_price) || cur;
            const ceil = initP * (Number(asset.ceiling_multiplier) || 12);
            const sentiment = asset.sentiment || 'neutral';
            
            let runningPrice = cur;
            const wave = waves[sym];

            const mmTrades = randInt(2, 4);
            for (let i = 0; i < mmTrades; i++) {
                const vol = randInt(2, 12);
                const impact = getSlippageImpact(sym, vol, Math.random() < 0.5, surge.active);
                runningPrice = runningPrice * (1 + impact);
            }

            const sentBias = sentiment === 'bullish' ? 0.10 : sentiment === 'bearish' ? -0.10 : 0;
            const waveBias = wave.dir * 0.45 * wave.intensity;
            const buyProb  = Math.max(0.1, Math.min(0.9, 0.5 + sentBias + waveBias));
            const retailTrades = randInt(3, 8);
            for (let i = 0; i < retailTrades; i++) {
                const isBuy = Math.random() < buyProb;
                const vol = Math.max(1, Math.min(350, Math.ceil(Math.abs(gauss(50, 100)))));
                const impact = getSlippageImpact(sym, vol, isBuy, surge.active);
                runningPrice = runningPrice * (1 + impact);
            }

            const whaleProb = surge.active ? 0.08 : 0.02;
            if (Math.random() < whaleProb) {
                const isPump = Math.random() < (buyProb + 0.1);
                const vol = randInt(1000, 3500);
                const impact = getSlippageImpact(sym, vol, isPump, surge.active);
                runningPrice = runningPrice * (1 + impact);
                pool.execute(
                    'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                    [sym, isPump ? 'whale_pump' : 'whale_dump', +(impact * 100).toFixed(4), cur, runningPrice]
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
                const curCrashProb = sym === 'DYTO' || sym === 'JOKOW' ? 0.00005 : 0.0005;
                if (Math.random() < curCrashProb) {
                    const drop = 0.18 + Math.random() * 0.15;
                    runningPrice = runningPrice * (1 - drop);
                    await pool.execute('UPDATE market_assets SET crash_mode = 1, crash_recovery_target = ? WHERE id = ?', [cur, asset.id]);
                    pool.execute('INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                        [sym, 'crash', +(-drop * 100).toFixed(4), cur, runningPrice]
                    ).catch(() => {});
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
