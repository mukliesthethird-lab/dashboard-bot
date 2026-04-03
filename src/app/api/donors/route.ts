import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
    try {
        // Ambil 20 donatur terbaru
        const [donors] = await pool.execute(
            "SELECT name, amount, message, donated_at as date, tier FROM donors ORDER BY donated_at DESC LIMIT 20"
        );

        // Hitung total donasi bulan ini untuk progress bar
        const [totalResult]: any = await pool.execute(
            "SELECT SUM(amount) as total FROM donors WHERE MONTH(donated_at) = MONTH(CURRENT_DATE()) AND YEAR(donated_at) = YEAR(CURRENT_DATE())"
        );
        const currentGoal = totalResult[0]?.total || 0;

        return NextResponse.json({ 
            donors, 
            currentGoal: Number(currentGoal) 
        });

    } catch (error) {
        console.error("Donors API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
