import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const secretKey = searchParams.get('key');

    console.log("--- Saweria Webhook Incoming ---");

    if (secretKey !== 'donpollo_secret') {
        console.error("❌ ERROR: Unauthorized - Secret Key Mismatch");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await req.json();
        console.log("Payload:", JSON.stringify(payload, null, 2));
        
        // Handle multiple possible field names from Saweria
        const name = payload.donator_name || payload.name || 'Anonim';
        const amount = Number(payload.amount_raw) || Number(payload.amount) || 0;
        const message = payload.message || '';

        if (amount === 0) {
            console.warn("⚠️ WARNING: Received donation with 0 amount");
        }

        // Tentukan Tier
        let tier: 'Gold' | 'Silver' | 'Bronze' = 'Bronze';
        if (amount >= 50000) tier = 'Gold';
        else if (amount >= 20000) tier = 'Silver';

        console.log(`Inserting: ${name} | Rp ${amount} | Tier: ${tier}`);

        // Simpan ke Database
        const [result] = await pool.execute(
            "INSERT INTO donors (name, amount, message, tier) VALUES (?, ?, ?, ?)",
            [name, amount, message, tier]
        );

        console.log("✅ SUCCESS: Data saved to database");

        return NextResponse.json({ 
            success: true, 
            message: "Donation recorded", 
            tier 
        });

    } catch (error: any) {
        console.error("❌ Saweria Webhook Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
