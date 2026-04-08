import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LIQUIDITY, WHALE_IMPACT_MAP as WHALE_IMPACT } from '@/lib/marketSimulator';

export const dynamic = 'force-dynamic';

// Max single-trade price impact per asset
const MAX_IMPACT: Record<string, number> = {
    DYTO:  0.04,
    JOKOW: 0.07,
    POLLO: 0.12,
    OHIO:  0.12,
    SIGMA: 0.18,
    BONE:  0.22,
    MEW:   0.28,
};

// If impact exceeds this threshold → it's a whale trade → log to market_events
const WHALE_THRESHOLD: Record<string, number> = {
    DYTO:  0.025,
    JOKOW: 0.040,
    POLLO: 0.070,
    OHIO:  0.070,
    SIGMA: 0.090,
    BONE:  0.110,
    MEW:   0.130,
};

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    if (!userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { symbol, amount, type } = body;

    if (!symbol || !amount || Number(amount) <= 0 || !['buy', 'sell'].includes(type)) {
        return NextResponse.json({ success: false, error: 'Invalid request parameters' }, { status: 400 });
    }

    const sym = String(symbol).toUpperCase();
    const tradeAmount = Number(amount);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch asset
        const [assetRows]: any = await conn.execute(
            'SELECT * FROM market_assets WHERE symbol = ?', [sym]
        );
        if (!assetRows.length) {
            await conn.rollback();
            return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
        }

        const asset = assetRows[0];
        const curPrice = Number(asset.current_price);
        const floor = Number(asset.floor_price) || 1;
        const totalCost = curPrice * tradeAmount;

        // 2. Calculate price impact (Value-Based Liquidity Model)
        const liquidity = LIQUIDITY[sym] ?? 1_000_000;
        const rawImpact = totalCost / liquidity;
        const maxImpact = MAX_IMPACT[sym] ?? 0.10;
        const cappedImpact = Math.min(rawImpact, maxImpact);
        const isWhale = cappedImpact >= (WHALE_THRESHOLD[sym] ?? 0.05);

        let newPrice = curPrice;

        if (type === 'buy') {
            // Validate balance
            const [ur]: any = await conn.execute(
                'SELECT balance FROM slot_users WHERE user_id = ?', [userId]
            );
            if (!ur.length || Number(ur[0].balance) < totalCost) {
                await conn.rollback();
                return NextResponse.json({ success: false, error: 'Saldo tidak cukup' }, { status: 400 });
            }

            // Buy pushes price UP
            newPrice = curPrice * (1 + cappedImpact);

            // Deduct balance
            await conn.execute(
                'UPDATE slot_users SET balance = balance - ? WHERE user_id = ?',
                [totalCost, userId]
            );

            // Update portfolio with average buy price tracking
            const [pr]: any = await conn.execute(
                'SELECT amount_owned, avg_buy_price, total_invested FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                [userId, asset.id]
            );
            if (pr.length > 0) {
                const oldAmt = Number(pr[0].amount_owned);
                const newAmt = oldAmt + tradeAmount;
                const newAvg = ((Number(pr[0].avg_buy_price) * oldAmt) + (curPrice * tradeAmount)) / newAmt;
                await conn.execute(
                    'UPDATE user_portfolio SET amount_owned = ?, avg_buy_price = ?, total_invested = total_invested + ? WHERE user_id = ? AND asset_id = ?',
                    [newAmt, newAvg, totalCost, userId, asset.id]
                );
            } else {
                await conn.execute(
                    'INSERT INTO user_portfolio (user_id, asset_id, amount_owned, avg_buy_price, total_invested) VALUES (?,?,?,?,?)',
                    [userId, asset.id, tradeAmount, curPrice, totalCost]
                );
            }

        } else {
            // SELL — validate portfolio
            const [pr]: any = await conn.execute(
                'SELECT amount_owned, total_invested FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                [userId, asset.id]
            );
            if (!pr.length || Number(pr[0].amount_owned) < tradeAmount) {
                await conn.rollback();
                return NextResponse.json({ success: false, error: 'Lembar tidak cukup untuk dijual' }, { status: 400 });
            }

            // Sell pushes price DOWN (symmetric with buy — no amplification)
            newPrice = Math.max(floor, curPrice * (1 - cappedImpact));

            // Add proceeds to balance
            await conn.execute(
                'UPDATE slot_users SET balance = balance + ? WHERE user_id = ?',
                [totalCost, userId]
            );

            // Update portfolio — reduce proportionally
            const remaining = Number(pr[0].amount_owned) - tradeAmount;
            if (remaining <= 0.000001) {
                await conn.execute(
                    'DELETE FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                    [userId, asset.id]
                );
            } else {
                const proportion = tradeAmount / Number(pr[0].amount_owned);
                const investedRemoved = proportion * Number(pr[0].total_invested);
                await conn.execute(
                    'UPDATE user_portfolio SET amount_owned = ?, total_invested = GREATEST(0, total_invested - ?) WHERE user_id = ? AND asset_id = ?',
                    [remaining, investedRemoved, userId, asset.id]
                );
            }
        }

        // 3. Update global asset price + ATH
        const finalPrice = Math.max(floor, Math.round(newPrice * 10000) / 10000);
        await conn.execute(
            `UPDATE market_assets
             SET previous_price = ?, current_price = ?,
                 ath = GREATEST(COALESCE(ath, 0), ?)
             WHERE id = ?`,
            [curPrice, finalPrice, finalPrice, asset.id]
        );

        // 4. Instant candle sync — trade appears on chart immediately
        const candleTs = Math.floor(Date.now() / 10000) * 10;
        const [cr]: any = await conn.execute(
            'SELECT id FROM market_candles WHERE symbol = ? AND timestamp = ?',
            [sym, candleTs]
        );
        if (cr.length > 0) {
            await conn.execute(
                'UPDATE market_candles SET high = GREATEST(high, ?), low = LEAST(low, ?), close = ? WHERE id = ?',
                [finalPrice, finalPrice, finalPrice, cr[0].id]
            );
        } else {
            await conn.execute(
                'INSERT IGNORE INTO market_candles (symbol, open, high, low, close, timestamp) VALUES (?,?,?,?,?,?)',
                [sym, curPrice, Math.max(curPrice, finalPrice), Math.max(floor, Math.min(curPrice, finalPrice)), finalPrice, candleTs]
            );
        }

        // 5. Log whale event if this was a significant trade
        if (isWhale) {
            const evtType = type === 'buy' ? 'whale_pump' : 'whale_dump';
            const pctDisplay = cappedImpact * 100 * (type === 'sell' ? -1 : 1);
            await conn.execute(
                'INSERT INTO market_events (symbol, event_type, price_change_pct, old_price, new_price) VALUES (?,?,?,?,?)',
                [sym, evtType, +pctDisplay.toFixed(4), curPrice, finalPrice]
            );
        }

        await conn.commit();
        return NextResponse.json({
            success: true,
            message: `Berhasil ${type === 'buy' ? 'membeli' : 'menjual'} ${tradeAmount} ${sym}`,
            newPrice: finalPrice,
            impact: `${(cappedImpact * 100).toFixed(3)}%`,
            whaleAlert: isWhale,
        });

    } catch (error: any) {
        try { await conn.rollback(); } catch {}
        console.error('Trade API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        conn.release();
    }
}
