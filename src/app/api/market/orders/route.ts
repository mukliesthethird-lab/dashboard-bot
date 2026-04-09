import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/market/orders?type=open|history
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any)?.id;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'open';
    const statusClause = type === 'history' ? `('filled','cancelled')` : `('pending')`;

    const [orders]: any = await pool.execute(
        `SELECT lo.*, ma.name AS asset_name, ma.current_price
         FROM limit_orders lo
         JOIN market_assets ma ON lo.asset_id = ma.id
         WHERE lo.user_id = ? AND lo.status IN ${statusClause}
         ORDER BY lo.created_at DESC
         LIMIT 30`,
        [userId]
    );

    return NextResponse.json({ success: true, orders });
}

// POST /api/market/orders — Create new limit order
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any)?.id;

    let body: any;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { symbol, amount, target_price, type } = body;

    if (!symbol || !amount || !target_price || !type) {
        return NextResponse.json({ error: 'Field tidak lengkap' }, { status: 400 });
    }
    if (Number(amount) <= 0 || Number(target_price) <= 0) {
        return NextResponse.json({ error: 'Nilai tidak valid (harus > 0)' }, { status: 400 });
    }
    if (!['buy', 'sell'].includes(type)) {
        return NextResponse.json({ error: 'Tipe order tidak valid' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch asset
        const sym = String(symbol).toUpperCase();
        const [assetRows]: any = await conn.execute(
            'SELECT id, current_price FROM market_assets WHERE symbol = ?', [sym]
        );
        if (!assetRows.length) {
            await conn.rollback();
            return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
        }
        const asset = assetRows[0];

        // 2. Escrow Logic
        if (type === 'sell') {
            // Validate ownership for Limit Sell
            const [pr]: any = await conn.execute(
                'SELECT amount_owned FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
                [userId, asset.id]
            );
            if (!pr.length || Number(pr[0].amount_owned) < Number(amount)) {
                await conn.rollback();
                return NextResponse.json({ error: 'Lembar saham tidak cukup untuk limit sell' }, { status: 400 });
            }
        } else {
            // Deduct balance for Limit Buy (Escrow)
            const totalCost = Number(amount) * Number(target_price);
            const [ur]: any = await conn.execute(
                'SELECT balance FROM slot_users WHERE user_id = ?', [userId]
            );
            if (!ur.length || Number(ur[0].balance) < totalCost) {
                await conn.rollback();
                return NextResponse.json({ error: 'Saldo tidak cukup untuk memasang limit buy' }, { status: 400 });
            }
            
            await conn.execute(
                'UPDATE slot_users SET balance = balance - ? WHERE user_id = ?',
                [totalCost, userId]
            );
        }

        // 3. Create Order
        await conn.execute(
            'INSERT INTO limit_orders (user_id, asset_id, symbol, type, amount, target_price) VALUES (?,?,?,?,?,?)',
            [userId, asset.id, sym, type, Number(amount), Number(target_price)]
        );

        await conn.beginTransaction();
        await conn.commit();
        return NextResponse.json({ success: true, message: 'Limit order berhasil dipasang!' });

    } catch (e: any) {
        try { await conn.rollback(); } catch {}
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        conn.release();
    }
}

// DELETE /api/market/orders — Cancel a pending order
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any)?.id;

    let body: any;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID order tidak valid' }, { status: 400 });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch order to check type for refund logic
        const [orderRows]: any = await conn.execute(
            'SELECT * FROM limit_orders WHERE id = ? AND user_id = ? AND status = "pending"',
            [id, userId]
        );
        if (!orderRows.length) {
            await conn.rollback();
            return NextResponse.json({ error: 'Order tidak ditemukan atau sudah diproses' }, { status: 404 });
        }
        const order = orderRows[0];

        // 2. Refund balance if it was a BUY order
        if (order.type === 'buy') {
            const refund = Number(order.amount) * Number(order.target_price);
            await conn.execute(
                'UPDATE slot_users SET balance = balance + ? WHERE user_id = ?',
                [refund, userId]
            );
        }

        // 3. Update status to cancelled
        await conn.execute(
            "UPDATE limit_orders SET status = 'cancelled' WHERE id = ?",
            [id]
        );

        await conn.commit();
        return NextResponse.json({ success: true });
    } catch (e: any) {
        try { await conn.rollback(); } catch {}
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        conn.release();
    }
}
