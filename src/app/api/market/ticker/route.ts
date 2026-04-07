import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        // 1. Ensure Table Exists (Self-Healing)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS market_candles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(10) NOT NULL,
                open DECIMAL(20, 4) NOT NULL,
                high DECIMAL(20, 4) NOT NULL,
                low DECIMAL(20, 4) NOT NULL,
                close DECIMAL(20, 4) NOT NULL,
                timestamp BIGINT NOT NULL,
                INDEX (symbol),
                INDEX (timestamp)
            )
        `);

        // 2. Fetch Assets
        const [assets]: any = await pool.execute(
            'SELECT symbol, name, current_price, previous_price, volatility FROM market_assets'
        );

        // 2. Fetch candles for each asset (Last 100)
        const candlesData: Record<string, any[]> = {};
        for (const asset of assets) {
            let [candles]: any = await pool.execute(
                'SELECT open, high, low, close, timestamp as time FROM market_candles WHERE symbol = ? GROUP BY timestamp ORDER BY timestamp DESC LIMIT 100',
                [asset.symbol]
            );

            // Fix: Charting library requires ASC order
            candlesData[asset.symbol] = candles.map((c: any) => ({
                ...c,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close)
            })).reverse();

            // Auto-Seed History if missing (10s intervals for turbo mode)
            if (candles.length === 0) {
                const now = Math.floor(Date.now() / 10000) * 10; // 10s boundary
                const basePrice = Number(asset.current_price);
                let lastClose = basePrice;
                const seedRows = [];
                
                for (let i = 0; i < 100; i++) {
                    const time = now - (100 - i) * 10;
                    const open = lastClose;
                    const change = (Math.random() * 0.05 - 0.025); // Faster jitter
                    const close = Math.max(1, open * (1 + change));
                    const high = Math.max(open, close) + (Math.random() * 5);
                    const low = Math.max(1, Math.min(open, close) - (Math.random() * 5));
                    
                    seedRows.push([asset.symbol, open, high, low, close, time]);
                    lastClose = close;
                }

                // Batch Insert with UPSERT logic
                await pool.query(
                    'INSERT INTO market_candles (symbol, open, high, low, close, timestamp) VALUES ? ON DUPLICATE KEY UPDATE high = GREATEST(high, VALUES(high)), low = LEAST(low, VALUES(low)), close = VALUES(close)',
                    [seedRows]
                );

                // Fetch again
                const [newCandles]: any = await pool.execute(
                    'SELECT open, high, low, close, timestamp as time FROM market_candles WHERE symbol = ? ORDER BY timestamp DESC LIMIT 100',
                    [asset.symbol]
                );
                candles = newCandles;
            }

            // Reverse so they are in chronological order and ensure numeric data for all fields
            candlesData[asset.symbol] = candles.reverse().map((c: any) => ({
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                time: Number(c.time)
            }));
        }

        // Fetch User Data if logged in
        let userData = null;
        if (userId) {
            const [user]: any = await pool.execute(
                'SELECT balance FROM slot_users WHERE user_id = ?',
                [userId]
            );
            
            const [portfolio]: any = await pool.execute(
                `SELECT p.amount_owned, a.symbol 
                 FROM user_portfolio p 
                 JOIN market_assets a ON p.asset_id = a.id 
                 WHERE p.user_id = ?`,
                [userId]
            );

            userData = {
                balance: Number(user[0]?.balance) || 0,
                portfolio: portfolio || []
            };
        }

        return NextResponse.json({
            success: true,
            assets,
            candles: candlesData,
            user: userData
        });

    } catch (error: any) {
        console.error('Ticker API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
