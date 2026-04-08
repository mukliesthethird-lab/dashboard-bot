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

    const sym = String(symbol).toUpperCase();
    const [assetRows]: any = await pool.execute(
        'SELECT id, current_price FROM market_assets WHERE symbol = ?', [sym]
    );
    if (!assetRows.length) return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    const asset = assetRows[0];

    // For SELL orders: validate user actually owns enough shares
    if (type === 'sell') {
        const [pr]: any = await pool.execute(
            'SELECT amount_owned FROM user_portfolio WHERE user_id = ? AND asset_id = ?',
            [userId, asset.id]
        );
        if (!pr.length || Number(pr[0].amount_owned) < Number(amount)) {
            return NextResponse.json({ error: 'Lembar saham tidak cukup untuk limit sell' }, { status: 400 });
        }
    }

    await pool.execute(
        'INSERT INTO limit_orders (user_id, asset_id, symbol, type, amount, target_price) VALUES (?,?,?,?,?,?)',
        [userId, asset.id, sym, type, Number(amount), Number(target_price)]
    );

    return NextResponse.json({ success: true, message: 'Limit order berhasil dipasang!' });
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

    const [result]: any = await pool.execute(
        "UPDATE limit_orders SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'pending'",
        [id, userId]
    );

    if ((result as any).affectedRows === 0) {
        return NextResponse.json({ error: 'Order tidak ditemukan atau sudah diproses' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
