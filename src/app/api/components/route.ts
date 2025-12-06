
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get("guild_id");
    const customId = searchParams.get("custom_id");

    if (!guildId) return NextResponse.json({ error: "Missing guild_id" }, { status: 400 });

    try {
        if (customId) {
            const [rows] = await db.query(
                "SELECT * FROM components WHERE guild_id = ? AND custom_id = ?",
                [guildId, customId]
            );
            return NextResponse.json(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
        } else {
            const [rows] = await db.query(
                "SELECT * FROM components WHERE guild_id = ? ORDER BY created_at DESC",
                [guildId]
            );
            return NextResponse.json(rows);
        }
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { guild_id, custom_id, type, name, data } = body;

        if (!guild_id || !custom_id || !type || !name || !data) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if custom_id exists
        const [existing] = await db.query(
            "SELECT id FROM components WHERE guild_id = ? AND custom_id = ?",
            [guild_id, custom_id]
        );

        if (Array.isArray(existing) && existing.length > 0) {
            return NextResponse.json({ error: "Custom ID already exists" }, { status: 409 });
        }

        await db.query(
            "INSERT INTO components (guild_id, custom_id, type, name, data) VALUES (?, ?, ?, ?, ?)",
            [guild_id, custom_id, type, name, JSON.stringify(data)]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { id, guild_id, name, data } = body;

        if (!id || !guild_id || !name || !data) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await db.query(
            "UPDATE components SET name = ?, data = ? WHERE id = ? AND guild_id = ?",
            [name, JSON.stringify(data), id, guild_id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const guildId = searchParams.get("guild_id");

    if (!id || !guildId) return NextResponse.json({ error: "Missing id or guild_id" }, { status: 400 });

    try {
        await db.query(
            "DELETE FROM components WHERE id = ? AND guild_id = ?",
            [id, guildId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Database error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}
