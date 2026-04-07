import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const session = await getServerSession(authOptions);
        
        // Always require login to view market to avoid random scraping
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;

        if (action === 'assets') {
            // Get all assets
            const [assets]: any = await pool.query('SELECT * FROM market_assets ORDER BY current_price DESC');
            
            // Get last 20 history points for each asset to build the chart
            // To do this efficiently, we query up to 60 rows total (assuming 3 assets)
            const [historyRaw]: any = await pool.query(`
                SELECT h.asset_id, h.price, h.timestamp, a.symbol 
                FROM market_history h
                JOIN market_assets a ON h.asset_id = a.id
                WHERE h.timestamp >= NOW() - INTERVAL 2 HOUR
                ORDER BY h.timestamp ASC
            `);
            
            // Format history into recharts-friendly data
            // { time: '10:00', POLLO: 1000, OHIO: 500, SIGMA: 100 }
            const chartDataObj: Record<string, any> = {};
            
            for (const row of historyRaw) {
                // Group by minute or 5-minute chunks for the chart X-axis
                const timeKey = new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (!chartDataObj[timeKey]) {
                    chartDataObj[timeKey] = { time: timeKey };
                }
                chartDataObj[timeKey][row.symbol] = row.price;
            }
            
            const chartData = Object.values(chartDataObj);

            // Get user's current balance
            const [userRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
            const balance = userRow[0]?.balance || 0;

            return NextResponse.json({
                assets,
                chartData,
                balance
            });
        }

        if (action === 'portfolio') {
            const [portfolio]: any = await pool.query(`
                SELECT p.amount_owned, a.symbol, a.name, a.current_price, a.id as asset_id
                FROM user_portfolio p
                JOIN market_assets a ON p.asset_id = a.id
                WHERE p.user_id = ?
            `, [userId]);

            return NextResponse.json(portfolio);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Market GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const body = await request.json();
        const { action, symbol, amount } = body;

        if (!symbol || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount or symbol' }, { status: 400 });
        }

        const [assets]: any = await pool.query('SELECT id, current_price FROM market_assets WHERE symbol = ?', [symbol]);
        if (!assets || assets.length === 0) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }
        const asset = assets[0];
        const totalValue = asset.current_price * amount;

        // Verify balance / portfolio row locking is normally good here, but standard query is fine for this demo
        if (action === 'buy') {
            const [userRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
            if (!userRow[0] || userRow[0].balance < totalValue) {
                return NextResponse.json({ error: 'Saldo koin tidak cukup' }, { status: 400 });
            }

            // Deduct balance
            await pool.query('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [totalValue, userId]);
            
            // Add to portfolio
            const [portRow]: any = await pool.query('SELECT amount_owned FROM user_portfolio WHERE user_id = ? AND asset_id = ?', [userId, asset.id]);
            if (portRow.length > 0) {
                await pool.query('UPDATE user_portfolio SET amount_owned = amount_owned + ? WHERE user_id = ? AND asset_id = ?', [amount, userId, asset.id]);
            } else {
                await pool.query('INSERT INTO user_portfolio (user_id, asset_id, amount_owned) VALUES (?, ?, ?)', [userId, asset.id, amount]);
            }

            return NextResponse.json({ success: true, message: `Berhasil membeli ${amount} ${symbol}` });
        }

        if (action === 'sell') {
            const [portRow]: any = await pool.query('SELECT amount_owned FROM user_portfolio WHERE user_id = ? AND asset_id = ?', [userId, asset.id]);
            if (!portRow[0] || portRow[0].amount_owned < amount) {
                return NextResponse.json({ error: 'Lembar saham tidak cukup' }, { status: 400 });
            }

            // Deduct portfolio
            if (portRow[0].amount_owned === amount) {
                await pool.query('DELETE FROM user_portfolio WHERE user_id = ? AND asset_id = ?', [userId, asset.id]);
            } else {
                await pool.query('UPDATE user_portfolio SET amount_owned = amount_owned - ? WHERE user_id = ? AND asset_id = ?', [amount, userId, asset.id]);
            }

            // Add balance
            await pool.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [totalValue, userId]);

            return NextResponse.json({ success: true, message: `Berhasil menjual ${amount} ${symbol} seharga ${totalValue}` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Market POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
