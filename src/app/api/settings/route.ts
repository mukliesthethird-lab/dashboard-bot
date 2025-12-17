import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

// Database connection
const getConnection = async () => {
    return await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "donpollo",
    });
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get("guild_id");

    if (!guildId) {
        return NextResponse.json({ error: "Missing guild_id" }, { status: 400 });
    }

    try {
        const connection = await getConnection();

        // Fetch all settings for this guild
        const settings: Record<string, any> = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            guild_id: guildId,
        };

        // Welcome settings
        const [welcomeRows] = await connection.execute(
            "SELECT * FROM welcome_settings WHERE guild_id = ?",
            [guildId]
        );
        settings.welcome = (welcomeRows as any[])[0] || null;

        // Logging settings
        const [loggingRows] = await connection.execute(
            "SELECT * FROM logging_settings WHERE guild_id = ?",
            [guildId]
        );
        settings.logging = (loggingRows as any[])[0] || null;

        // Moderation settings
        const [moderationRows] = await connection.execute(
            "SELECT * FROM moderation_settings WHERE guild_id = ?",
            [guildId]
        );
        settings.moderation = (moderationRows as any[])[0] || null;

        // Reaction roles messages
        const [rolesRows] = await connection.execute(
            "SELECT * FROM reaction_role_messages WHERE guild_id = ?",
            [guildId]
        );
        settings.reaction_roles = rolesRows as any[];

        await connection.end();

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Settings export error:", error);
        return NextResponse.json({ error: "Failed to export settings" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { guild_id, settings, overwrite = false } = body;

        if (!guild_id || !settings) {
            return NextResponse.json({ error: "Missing guild_id or settings" }, { status: 400 });
        }

        // Validate settings structure
        if (!settings.version || settings.version !== "1.0") {
            return NextResponse.json({ error: "Invalid settings format or version" }, { status: 400 });
        }

        const connection = await getConnection();
        const imported: string[] = [];
        const skipped: string[] = [];

        // Import Welcome settings
        if (settings.welcome) {
            try {
                const { guild_id: _, id: __, ...welcomeData } = settings.welcome;

                if (overwrite) {
                    await connection.execute(
                        "DELETE FROM welcome_settings WHERE guild_id = ?",
                        [guild_id]
                    );
                }

                const columns = Object.keys(welcomeData);
                const values = Object.values(welcomeData);
                const placeholders = columns.map(() => "?").join(", ");

                await connection.execute(
                    `INSERT INTO welcome_settings (guild_id, ${columns.join(", ")}) VALUES (?, ${placeholders})
                     ON DUPLICATE KEY UPDATE ${columns.map(c => `${c} = VALUES(${c})`).join(", ")}`,
                    [guild_id, ...values]
                );
                imported.push("welcome");
            } catch (e) {
                console.error("Welcome import error:", e);
                skipped.push("welcome");
            }
        }

        // Import Logging settings
        if (settings.logging) {
            try {
                const { guild_id: _, id: __, ...loggingData } = settings.logging;

                if (overwrite) {
                    await connection.execute(
                        "DELETE FROM logging_settings WHERE guild_id = ?",
                        [guild_id]
                    );
                }

                const columns = Object.keys(loggingData);
                const values = Object.values(loggingData);
                const placeholders = columns.map(() => "?").join(", ");

                await connection.execute(
                    `INSERT INTO logging_settings (guild_id, ${columns.join(", ")}) VALUES (?, ${placeholders})
                     ON DUPLICATE KEY UPDATE ${columns.map(c => `${c} = VALUES(${c})`).join(", ")}`,
                    [guild_id, ...values]
                );
                imported.push("logging");
            } catch (e) {
                console.error("Logging import error:", e);
                skipped.push("logging");
            }
        }

        // Import Moderation settings
        if (settings.moderation) {
            try {
                const { guild_id: _, id: __, ...moderationData } = settings.moderation;

                if (overwrite) {
                    await connection.execute(
                        "DELETE FROM moderation_settings WHERE guild_id = ?",
                        [guild_id]
                    );
                }

                const columns = Object.keys(moderationData);
                const values = Object.values(moderationData);
                const placeholders = columns.map(() => "?").join(", ");

                await connection.execute(
                    `INSERT INTO moderation_settings (guild_id, ${columns.join(", ")}) VALUES (?, ${placeholders})
                     ON DUPLICATE KEY UPDATE ${columns.map(c => `${c} = VALUES(${c})`).join(", ")}`,
                    [guild_id, ...values]
                );
                imported.push("moderation");
            } catch (e) {
                console.error("Moderation import error:", e);
                skipped.push("moderation");
            }
        }

        // Note: Reaction roles are complex (have message IDs) - skip for safety
        if (settings.reaction_roles && settings.reaction_roles.length > 0) {
            skipped.push("reaction_roles (requires re-posting messages)");
        }

        await connection.end();

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            message: `Imported ${imported.length} setting(s). ${skipped.length > 0 ? `Skipped: ${skipped.join(", ")}` : ""}`
        });
    } catch (error) {
        console.error("Settings import error:", error);
        return NextResponse.json({ error: "Failed to import settings" }, { status: 500 });
    }
}
