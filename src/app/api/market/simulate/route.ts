import { NextResponse } from 'next/server';
import { runSimulation, getBotActivity, resetAllCandles } from '@/lib/marketSimulator';

export const dynamic = 'force-dynamic';

/** GET /api/market/simulate — Run one simulation tick */
export async function GET() {
    try {
        const result = await runSimulation();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Simulate route error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/** POST /api/market/simulate — Special actions: reset or get bot activity */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));

        if (body.action === 'reset') {
            await resetAllCandles();
            return NextResponse.json({ success: true, message: 'All candle data cleared. Will re-seed on next ticker fetch.' });
        }

        if (body.action === 'bot_activity') {
            return NextResponse.json({ success: true, activity: getBotActivity() });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
