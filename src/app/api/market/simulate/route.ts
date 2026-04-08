import { NextResponse } from 'next/server';
import { runSimulation } from '@/lib/marketSimulator';

export const dynamic = 'force-dynamic';

/** Exposed as GET /api/market/simulate — usable as a Vercel Cron target or manual trigger */
export async function GET() {
    try {
        const result = await runSimulation();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Simulate route error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
