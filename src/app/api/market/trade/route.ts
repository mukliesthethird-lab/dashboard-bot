import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Value-Based Liquidity Factors — higher = harder to move the price
const LIQUIDITY: Record<string, number> = {
    POLLO:   5_000_000,
    OHIO:    3_000_000,
    SIGMA:   1_000_000,
    FISH:      500_000,
    BONE:      250_000,
    MEW:       100_000,
    DYTO: 1_000_000_000,
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const user = session.user as any;
        if (!user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { symbol, amount, type } = await req.json();
        const userId = user.id;
        const sym = symbol.toUpperCase();

        if (amount <= 0) {
            return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
        }

        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // 1. Get Asset
            const [assetRows]: any = await conn.execute(
                'SELECT id, current_price FROM market_assets WHERE symbol = ?',
                [sym]
            );

            if (!assetRows || assetRows.length === 0) {
                await conn.rollback();
                return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
            }

            const asset = assetRows[0];
            const currentPrice = Number(asset.current_price);
            const totalCost = currentPrice * amount;

            // 2. Value-Based Price Impact
            const liquidity = LIQUIDITY[sym] ?? 1_000_000;
            const impactPct = totalCost / liquidity;
            const cappedImpact = Math.min(impactPct, 0.10); // max 10% single-trade impact

            let newPrice = currentPrice;

            // 3. Process Trade
            if (type === 'buy') {
                const [userRows]: any = await conn.execute(
                    'SELECT balance FROM slot_users WHERE user_id = ?',
                    [userId]
                );

                if (!userRows || Number(userRows[0].balance) < totalCost) {
                    await conn.rollback();
                    return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 });
                }

                // Buy pushes price UP
                newPrice = currentPrice * (1 + cappedImpact);

                await conn.execute(
                    'UPDATE slot_users SET balance = balance - ? WHERE user_id = ?',
                    [totalCost, userId]
                );

                const [portRows]: any = await conn.execute(
                    'SELECT amount_owned FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                    [userId, asset.id]
                );

                if (portRows && portRows.length > 0) {
                    await conn.execute(
                        'UPDATE user_portfolio SET amount_owned = amount_owned + ? WHERE user_id = ? AND asset_id = ?',
                        [amount, userId, asset.id]
                    );
                } else {
                    await conn.execute(
                        'INSERT INTO user_portfolio (user_id, asset_id, amount_owned) VALUES (?, ?, ?)',
                        [userId, asset.id, amount]
                    );
                }
            } else if (type === 'sell') {
                const [portRows]: any = await conn.execute(
                    'SELECT amount_owned FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                    [userId, asset.id]
                );

                if (!portRows || portRows.length === 0 || Number(portRows[0].amount_owned) < amount) {
                    await conn.rollback();
                    return NextResponse.json({ success: false, error: 'Insufficient shares' }, { status: 400 });
                }

                // Sell pushes price DOWN (slightly amplified for realism)
                newPrice = Math.max(1, currentPrice * (1 - cappedImpact * 1.2));

                await conn.execute(
                    'UPDATE slot_users SET balance = balance + ? WHERE user_id = ?',
                    [totalCost, userId]
                );

                if (Number(portRows[0].amount_owned) === amount) {
                    await conn.execute(
                        'DELETE FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                        [userId, asset.id]
                    );
                } else {
                    await conn.execute(
                        'UPDATE user_portfolio SET amount_owned = amount_owned - ? WHERE user_id = ? AND asset_id = ?',
                        [amount, userId, asset.id]
                    );
                }
            } else {
                await conn.rollback();
                return NextResponse.json({ success: false, error: 'Invalid trade type' }, { status: 400 });
            }

            // 4. Update Global Price
            await conn.execute(
                'UPDATE market_assets SET previous_price = ?, current_price = ? WHERE id = ?',
                [currentPrice, newPrice, asset.id]
            );

            // 5. Instant Candle Sync — spike shows up on chart immediately
            const candle_ts = Math.floor(Date.now() / 15000) * 15;
            const [candleRows]: any = await conn.execute(
                'SELECT * FROM market_candles WHERE symbol = ? AND timestamp = ?',
                [sym, candle_ts]
            );

            if (candleRows && candleRows.length > 0) {
                const c = candleRows[0];
                const high = Math.max(Number(c.high), newPrice);
                const low = Math.min(Number(c.low), newPrice);
                await conn.execute(
                    'UPDATE market_candles SET high = ?, low = ?, close = ? WHERE id = ?',
                    [high, low, newPrice, c.id]
                );
            } else {
                await conn.execute(
                    'INSERT INTO market_candles (symbol, open, high, low, close, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                    [sym, currentPrice, Math.max(currentPrice, newPrice), Math.min(currentPrice, newPrice), newPrice, candle_ts]
                );
            }

            await conn.commit();
            return NextResponse.json({ 
                success: true, 
                message: `Successfully ${type}ed ${amount} ${sym}`,
                newPrice,
                impact: `${(cappedImpact * 100).toFixed(4)}%`
            });

        } catch (e: any) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

    } catch (error: any) {
        console.error('Trade API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
