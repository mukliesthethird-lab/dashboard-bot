import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';

const userCache: Map<string, { data: any; expires: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function fetchDiscordUser(userId: string, token: string): Promise<any> {
    const cached = userCache.get(userId);
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.data);

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/users/${userId}`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DonPolloBot/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const userData = JSON.parse(data);
                    userCache.set(userId, { data: userData, expires: Date.now() + CACHE_TTL });
                    resolve(userData);
                } else resolve(null);
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const userId = searchParams.get('user_id');
        const token = getDiscordToken();

        if (action === 'stats') {
            console.log('[Fishing API] Fetching stats...');
            console.log('[Fishing API] DB_HOST:', process.env.DB_HOST);
            console.log('[Fishing API] DB_NAME:', process.env.DB_NAME);

            try {
                const [profileCount]: any = await pool.query('SELECT COUNT(*) as count FROM fishing_profile');
                console.log('[Fishing API] fishing_profile count:', profileCount[0]?.count);

                const [rodsCount]: any = await pool.query('SELECT COUNT(*) as count FROM fishing_rods');
                console.log('[Fishing API] fishing_rods count:', rodsCount[0]?.count);

                const [fishCount]: any = await pool.query('SELECT COALESCE(MAX(id), 0) as total FROM fish_inventory');
                console.log('[Fishing API] fish_inventory highest ID (total caught):', fishCount[0]?.total);

                const [topFishers]: any = await pool.query(
                    `SELECT CAST(fp.user_id AS CHAR) as user_id, fp.total_catches as total_catch 
                     FROM fishing_profile fp 
                     ORDER BY fp.total_catches DESC LIMIT 10`
                );
                console.log('[Fishing API] topFishers count:', topFishers?.length);

                const enrichedTop = [];
                for (const user of topFishers) {
                    const discordUser = token ? await fetchDiscordUser(user.user_id, token) : null;
                    enrichedTop.push({
                        user_id: user.user_id,
                        total_catch: user.total_catch,
                        username: discordUser?.global_name || discordUser?.username || 'Unknown',
                        avatar: discordUser?.avatar
                            ? `https://cdn.discordapp.com/avatars/${user.user_id}/${discordUser.avatar}.png`
                            : null
                    });
                    await new Promise(r => setTimeout(r, 50));
                }

                return NextResponse.json({
                    totalFishers: profileCount[0]?.count || 0,
                    totalRods: rodsCount[0]?.count || 0,
                    totalFishCaught: fishCount[0]?.total || 0,
                    topFishers: enrichedTop
                });
            } catch (dbError: any) {
                console.error('[Fishing API] Database error:', dbError.message);
                return NextResponse.json({ error: 'Database error: ' + dbError.message }, { status: 500 });
            }
        }

        if (action === 'search' && userId) {
            const [users]: any = await pool.query(
                `SELECT CAST(fp.user_id AS CHAR) as user_id, fp.total_catches as total_catch 
                 FROM fishing_profile fp 
                 WHERE CAST(fp.user_id AS CHAR) LIKE ? LIMIT 5`,
                [`%${userId}%`]
            );

            const enrichedUsers = [];
            for (const user of users) {
                const discordUser = token ? await fetchDiscordUser(user.user_id, token) : null;
                enrichedUsers.push({
                    user_id: user.user_id,
                    total_catch: user.total_catch,
                    username: discordUser?.global_name || discordUser?.username || 'Unknown',
                    avatar: discordUser?.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.user_id}/${discordUser.avatar}.png`
                        : null
                });
            }
            return NextResponse.json(enrichedUsers);
        }

        if (action === 'user' && userId) {
            const [profile]: any = await pool.query(
                'SELECT * FROM fishing_profile WHERE user_id = ?', [userId]
            );
            const [rods]: any = await pool.query(
                'SELECT * FROM fishing_rods WHERE user_id = ?', [userId]
            );
            const [inventory]: any = await pool.query(
                'SELECT fish_name, rarity, weight, price FROM fish_inventory WHERE user_id = ? ORDER BY price DESC LIMIT 10', [userId]
            );

            return NextResponse.json({
                profile: profile[0] || null,
                rods: rods || [],
                inventory: inventory || []
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Fishing API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, user_id, guild_id } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        if (action === 'reset') {
            // Delete all fishing data for user
            await pool.query('DELETE FROM fish_inventory WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM fishing_rods WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM fishing_profile WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM fishing_materials WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM fishing_items WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM fishing_buffs WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM fishing_quests WHERE user_id = ?', [user_id]);

            if (guild_id) {
                await pool.query(
                    'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                    [guild_id, 'admin', session.user.name || 'Admin', 'Fishing: Reset User', `Reset all fishing data for user ${user_id}`]
                ).catch(() => { });
            }

            return NextResponse.json({ success: true, message: 'User fishing data reset' });
        }

        if (action === 'give_rod') {
            const { rod_name, rod_level } = body;
            if (!rod_name) {
                return NextResponse.json({ error: 'rod_name is required' }, { status: 400 });
            }

            // Check if user has this rod
            const [existing]: any = await pool.query(
                'SELECT * FROM fishing_rods WHERE user_id = ? AND rod_name = ?',
                [user_id, rod_name]
            );

            if (existing.length > 0) {
                return NextResponse.json({ error: 'User already has this rod' }, { status: 400 });
            }

            await pool.query(
                'INSERT INTO fishing_rods (user_id, rod_name, level) VALUES (?, ?, ?)',
                [user_id, rod_name, rod_level || 0]
            );

            if (guild_id) {
                await pool.query(
                    'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                    [guild_id, 'admin', session.user.name || 'Admin', 'Fishing: Give Rod', `Gave ${rod_name} +${rod_level || 0} to user ${user_id}`]
                ).catch(() => { });
            }

            return NextResponse.json({ success: true, message: `Gave ${rod_name} to user` });
        }

        if (action === 'give_material') {
            const { material_name, amount } = body;
            if (!material_name || !amount) {
                return NextResponse.json({ error: 'material_name and amount required' }, { status: 400 });
            }

            // Ensure user has a fishing profile first
            await pool.query(
                'INSERT IGNORE INTO fishing_profile (user_id, equipped_rod, total_catches) VALUES (?, NULL, 0)',
                [user_id]
            );

            // Check if user has this material
            const [existing]: any = await pool.query(
                'SELECT * FROM fishing_materials WHERE user_id = ? AND material_name = ?',
                [user_id, material_name]
            );

            if (existing.length > 0) {
                await pool.query(
                    'UPDATE fishing_materials SET amount = amount + ? WHERE user_id = ? AND material_name = ?',
                    [amount, user_id, material_name]
                );
            } else {
                await pool.query(
                    'INSERT INTO fishing_materials (user_id, material_name, amount) VALUES (?, ?, ?)',
                    [user_id, material_name, amount]
                );
            }

            if (guild_id) {
                await pool.query(
                    'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                    [guild_id, 'admin', session.user.name || 'Admin', 'Fishing: Give Material', `Gave ${amount}x ${material_name} to user ${user_id}`]
                ).catch(() => { });
            }

            return NextResponse.json({ success: true, message: `Gave ${amount}x ${material_name} to user` });
        }

        if (action === 'give_buff') {
            const { buff_name, amount } = body;
            if (!buff_name || !amount) {
                return NextResponse.json({ error: 'buff_name and amount required' }, { status: 400 });
            }

            // Ensure user has a fishing profile first
            await pool.query(
                'INSERT IGNORE INTO fishing_profile (user_id, equipped_rod, total_catches) VALUES (?, NULL, 0)',
                [user_id]
            );

            // Check if user has this item
            const [existing]: any = await pool.query(
                'SELECT * FROM fishing_items WHERE user_id = ? AND item_name = ?',
                [user_id, buff_name]
            );

            if (existing.length > 0) {
                await pool.query(
                    'UPDATE fishing_items SET amount = amount + ? WHERE user_id = ? AND item_name = ?',
                    [amount, user_id, buff_name]
                );
            } else {
                await pool.query(
                    'INSERT INTO fishing_items (user_id, item_name, amount) VALUES (?, ?, ?)',
                    [user_id, buff_name, amount]
                );
            }

            if (guild_id) {
                await pool.query(
                    'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                    [guild_id, 'admin', session.user.name || 'Admin', 'Fishing: Give Buff', `Gave ${amount}x ${buff_name} to user ${user_id}`]
                ).catch(() => { });
            }

            return NextResponse.json({ success: true, message: `Gave ${amount}x ${buff_name} to user` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Fishing API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
