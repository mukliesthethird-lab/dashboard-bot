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

        if (action === 'recent_catches') {
            const [catchesRaw]: any = await pool.query(
                `SELECT CAST(user_id AS CHAR) as user_id, fish_name, rarity, weight, price 
                 FROM fish_inventory 
                 WHERE rarity IN ('Epic', 'Legendary') 
                 ORDER BY id DESC LIMIT 10`
            );

            const [distRaw]: any = await pool.query(
                'SELECT rarity, COUNT(*) as count FROM fish_inventory GROUP BY rarity'
            );

            // Map distribution to a stable object
            const distribution = { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0 };
            distRaw.forEach((row: any) => {
                if (row.rarity in distribution) {
                    distribution[row.rarity as keyof typeof distribution] = row.count;
                }
            });

            const enrichedCatches = [];
            for (const c of catchesRaw) {
                const discordUser = token ? await fetchDiscordUser(c.user_id, token) : null;
                enrichedCatches.push({
                    ...c,
                    username: discordUser?.global_name || discordUser?.username || 'Unknown',
                    avatar: discordUser?.avatar
                        ? `https://cdn.discordapp.com/avatars/${c.user_id}/${discordUser.avatar}.png`
                        : null
                });
                await new Promise(r => setTimeout(r, 50));
            }
            return NextResponse.json({
                recent: enrichedCatches,
                distribution
            });
        }

        if (action === 'encyclopedia') {
            const fishData = {
                "Common": [
                    { "name": "Ikan Mas", "base_price": 10, "min_weight": 0.5, "max_weight": 2.0, "image_url": "/assets/fish/Ikan_Mas.png", "description": "Ikan air tawar populer yang sering dipelihara sebagai hiasan, dikenal dengan warna kemerahan dan sifatnya yang tenang." },
                    { "name": "Lele", "base_price": 12, "min_weight": 0.8, "max_weight": 3.0, "image_url": "/assets/fish/Lele.png", "description": "Ikan berkumis yang tangguh, mampu bertahan di kondisi air rendah oksigen dan memiliki daging yang lezat." },
                    { "name": "Nila", "base_price": 15, "min_weight": 0.5, "max_weight": 2.5, "image_url": "/assets/fish/Nila.png", "description": "Ikan konsumsi favorit yang mudah berkembang biak, sering ditemukan di danau dan sungai air tawar." },
                    { "name": "Sepat", "base_price": 8, "min_weight": 0.1, "max_weight": 0.5, "image_url": "/assets/fish/Ikan_Sepat.png", "description": "Ikan rawa kecil dengan pola tubuh yang unik, sering dijadikan ikan asin oleh masyarakat lokal." },
                    { "name": "Mujair", "base_price": 10, "min_weight": 0.4, "max_weight": 1.5, "image_url": "/assets/fish/Ikan_Mujair.png", "description": "Mirip dengan nila namun memiliki bintik-bintik yang khas, dinamai sesuai penemunya di Indonesia." }
                ],
                "Uncommon": [
                    { "name": "Gurame", "base_price": 25, "min_weight": 1.0, "max_weight": 5.0, "image_url": "/assets/fish/Gurame.png", "description": "Raja ikan air tawar yang memiliki pertumbuhan lambat namun rasa daging yang sangat premium." },
                    { "name": "Patin", "base_price": 30, "min_weight": 2.0, "max_weight": 8.0, "image_url": "/assets/fish/Ikan_Patin.png", "description": "Scaleless slippery fish, high in healthy fats and soft texture." },
                    { "name": "Bawal Hitam", "base_price": 28, "min_weight": 1.5, "max_weight": 6.0, "image_url": "/assets/fish/Ikan_Bawal_Hitam.png", "description": "Flat-bodied marine fish, fast swimmer often found in coral reefs." },
                    { "name": "Bandeng", "base_price": 35, "min_weight": 1.0, "max_weight": 4.0, "image_url": "/assets/fish/Bandeng.png", "description": "Brackish water fish, known for its many bones but very savory taste." },
                    { "name": "Toman", "base_price": 32, "min_weight": 2.0, "max_weight": 10.0, "image_url": "/assets/fish/Toman.png", "description": "Fierce freshwater predator from the Channa family, incredible pulling power." },
                    { "name": "Belida", "base_price": 40, "min_weight": 1.0, "max_weight": 5.0, "image_url": "/assets/fish/BelidA.png", "description": "Ancient river fish with curved body, main ingredient for crackers." },
                    { "name": "Kelah", "base_price": 50, "min_weight": 1.5, "max_weight": 8.0, "image_url": "/assets/fish/Kelah.png", "description": "Often called Red Kelah, highly sought after for agility and high price." },
                    { "name": "Selar", "base_price": 20, "min_weight": 0.5, "max_weight": 2.0, "image_url": "/assets/fish/Ikan_Selar.png", "description": "Small pelagic fish swimming in large schools, important protein source." },
                    { "name": "Kembung", "base_price": 22, "min_weight": 0.4, "max_weight": 2.0, "image_url": "/assets/fish/Ikan_Kembung.png", "description": "Ikan laut ekonomis yang sangat bergizi, memiliki kandungan omega-3 yang tinggi mirip dengan salmon." },
                    { "name": "Layur", "base_price": 38, "min_weight": 1.0, "max_weight": 3.0, "image_url": "/assets/fish/Ikan_Layur.png", "description": "Ribbon-like flat fish, scaleless with long dorsal fins." },
                    { "name": "Tongkol", "base_price": 33, "min_weight": 1.0, "max_weight": 4.0, "image_url": "/assets/fish/Tongkol.png", "description": "Fast swimming tuna family, packed with solid red meat often canned." },
                    { "name": "Tambakan", "base_price": 26, "min_weight": 0.3, "max_weight": 1.5, "image_url": "/assets/fish/Tambakan.png", "description": "Ikan air tawar yang unik karena sering terlihat seperti sedang 'mencium' benda di sekitarnya." },
                    { "name": "Betutu", "base_price": 45, "min_weight": 0.5, "max_weight": 2.0, "image_url": "/assets/fish/Betutu.png", "description": "Lazy fish staying at the bottom, but has high value for its benefits." },
                    { "name": "Gabus", "base_price": 34, "min_weight": 1.0, "max_weight": 4.0, "image_url": "/assets/fish/Gabus.png", "description": "Predator fish rich in albumin, great for post-surgery healing." },
                    { "name": "Bawal Putih", "base_price": 30, "min_weight": 1.0, "max_weight": 4.0, "image_url": "/assets/fish/Bawal_Putih.png", "description": "Ikan laut bernilai tinggi dengan tekstur daging yang halus dan putih, favorit di restoran seafood." }
                ],
                "Rare": [
                    { "name": "Kakap Merah", "base_price": 80, "min_weight": 3.0, "max_weight": 12.0, "image_url": "/assets/fish/Kakap_Merah.png", "description": "Ikan karang ikonik dengan warna merah cerah, menjadi primadona para pemancing laut dalam." },
                    { "name": "Kerapu", "base_price": 90, "min_weight": 4.0, "max_weight": 15.0, "image_url": "/assets/fish/Kerapu.png", "description": "Hunter penyamar yang tinggal di celah karang, memiliki mata yang tajam dan gerak refleks yang cepat." },
                    { "name": "Salmon", "base_price": 120, "min_weight": 5.0, "max_weight": 25.0, "image_url": "/assets/fish/Salmon.png", "description": "Ikan yang terkenal karena migrasi 'mud-run' mereka dari laut ke sungai untuk bertelur." },
                    { "name": "Gindara", "base_price": 140, "min_weight": 2.0, "max_weight": 7.0, "image_url": "/assets/fish/Gindara.png", "description": "Dikenal sebagai 'Ikan Minyak' karena tekstur dagingnya yang sangat lembut dan kaya akan minyak ikan." },
                    { "name": "Opah", "base_price": 150, "min_weight": 10.0, "max_weight": 90.0, "image_url": "/assets/fish/Opah.png", "description": "Ikan laut dalam yang berbentuk cakram bulat, salah satu dari sedikit ikan yang memiliki darah hangat." },
                    { "name": "Arwana Silver", "base_price": 130, "min_weight": 1.0, "max_weight": 6.0, "image_url": "/assets/fish/Arwana_Silver.png", "description": "Simbol keberuntungan dari Amerika Selatan, memiliki sisik perak besar yang berkilau saat terkena cahaya." },
                    { "name": "Tenggiri", "base_price": 85, "min_weight": 3.0, "max_weight": 10.0, "image_url": "/assets/fish/Tenggiri.png", "description": "Ikan pelagis yang sangat cepat, sering digunakan sebagai bahan dasar pempek dan siomay." },
                    { "name": "Baronang", "base_price": 70, "min_weight": 1.0, "max_weight": 4.0, "image_url": "/assets/fish/Baronang.png", "description": "Ikan herbivora yang memakan lumut di karang, memiliki duri punggung yang mengandung racun lemah." },
                    { "name": "Kurisi", "base_price": 65, "min_weight": 0.5, "max_weight": 2.0, "image_url": "/assets/fish/Kurisi.png", "description": "Medium-sized bottom fish with pink color, often caught in sandy areas." },
                    { "name": "Queenfish", "base_price": 90, "min_weight": 2.0, "max_weight": 10.0, "image_url": "/assets/fish/Queenfish.png", "description": "Agile fighting fish, often jumps out of water to shake off the hook." },
                    { "name": "Cakalang", "base_price": 100, "min_weight": 2.0, "max_weight": 6.0, "image_url": "/assets/fish/Cakalang.png", "description": "Kerabat tuna yang lebih kecil, menjadi bahan utama pembuatan 'Katsuobushi' di Jepang." },
                    { "name": "White Seabass", "base_price": 115, "min_weight": 5.0, "max_weight": 20.0, "image_url": "/assets/fish/White_Seabass.png", "description": "Rare coastal predator, known for the unique sound they make." },
                    { "name": "Golden Mahseer", "base_price": 150, "min_weight": 2.0, "max_weight": 10.0, "image_url": "/assets/fish/Golden_Mahseer.png", "description": "Legenda sungai Himalaya, ikan kuat yang dikenal sebagai 'Harimau di dalam Air'." },
                    { "name": "Lampuga", "base_price": 130, "min_weight": 3.0, "max_weight": 15.0, "image_url": "/assets/fish/Lampuga.png", "description": "Also known as Mahi-mahi, has a beautiful neon color when fresh out of the water." },
                    { "name": "Sapu Laut", "base_price": 75, "min_weight": 1.0, "max_weight": 5.0, "image_url": "/assets/fish/sapu_laut.png", "description": "Unique fish that clings to walls to clean algae." },
                    { "name": "Nila Merah", "base_price": 100, "min_weight": 0.5, "max_weight": 3.0, "image_url": "/assets/fish/Nila_merah.png", "description": "Pink-yellowish tilapia variety, more aesthetic than the regular one." },
                    { "name": "Ikan Kurau", "base_price": 110, "min_weight": 3.0, "max_weight": 15.0, "image_url": "/assets/fish/Kurau.png", "description": "Coastal fish with long whiskers to detect prey in the mud." },
                    { "name": "Ikan Gulama", "base_price": 95, "min_weight": 1.0, "max_weight": 3.0, "image_url": "/assets/fish/gulama.png", "description": "Dikenal karena kemampuannya mengeluarkan suara 'kerok-kerok' di dalam air." },
                    { "name": "Ikan Kakap Putih", "base_price": 120, "min_weight": 2.0, "max_weight": 8.0, "image_url": "/assets/fish/Ikan_Kakap_Putih.png", "description": "Ikan tangguh yang bisa hidup di air laut maupun tawar (katadromus), favorit para angler sport." }
                ],
                "Epic": [
                    { "name": "Arowana Merah", "base_price": 2500, "min_weight": 2.0, "max_weight": 7.0, "image_url": "/assets/fish/Arwana_Merah.png", "description": "Living art from Borneo, most expensive ornamental fish symbolizing a lucky dragon." },
                    { "name": "Koi Jumbo", "base_price": 1000, "min_weight": 1.0, "max_weight": 5.0, "image_url": "/assets/fish/koi_jumbo.png", "description": "Local pride reaching giant sizes, unique and calming color patterns." },
                    { "name": "Giant Trevally", "base_price": 800, "min_weight": 5.0, "max_weight": 25.0, "image_url": "/assets/fish/Giant_Trevally.png", "description": "Very strong sea gladiator, known to knock down anglers with brutal pulls." },
                    { "name": "Sturgeon", "base_price": 2500, "min_weight": 10.0, "max_weight": 50.0, "image_url": "/assets/fish/Sturgeon.png", "description": "Ancient fish producing valuable caviar, unchanged since the age of dinosaurs." },
                    { "name": "Goliath Tigerfish", "base_price": 3500, "min_weight": 5.0, "max_weight": 30.0, "image_url": "/assets/fish/Goliath_Tigerfish.png", "description": "Freshwater predator with piranha-like teeth but much larger." },
                    { "name": "Lobster", "base_price": 1500, "min_weight": 0.5, "max_weight": 3.0, "image_url": "/assets/fish/Lobster.png", "description": "King of crustaceans with hard shell, luxurious meat for dinner." },
                    { "name": "Nile Perch", "base_price": 2000, "min_weight": 10.0, "max_weight": 60.0, "image_url": "/assets/fish/Nile_Perch.png", "description": "Giant from the Nile river, highly invasive, grows up to hundreds of kilos." },
                    { "name": "Wahoo", "base_price": 1500, "min_weight": 3.0, "max_weight": 20.0, "image_url": "/assets/fish/ikan_wahoo.png", "description": "Salah satu ikan tercepat di samudera, memiliki gigi tajam yang mampu memotong kail dengan mudah." },
                    { "name": "Barramundi", "base_price": 1000, "min_weight": 5.0, "max_weight": 15.0, "image_url": "/assets/fish/ikan_Barramundi.png", "description": "Ikan pancing elit yang memiliki mata merah bercahaya di kegelapan, sangat cerdas menghindari jebakan." },
                    { "name": "Golden Dorado", "base_price": 700, "min_weight": 2.0, "max_weight": 10.0, "image_url": "/assets/fish/ikan_Golden_Dorado.png", "description": "Ikan emas predator dari Amerika Selatan, dikenal karena lompatan akrobatiknya saat terpancing." },
                    { "name": "Black Marlin", "base_price": 5000, "min_weight": 20.0, "max_weight": 80.0, "image_url": "/assets/fish/bLACK_MARLIN.png", "description": "Penguasa kecepatan di laut biru, buruan utama para pemancing sport profesional di seluruh dunia." },
                    { "name": "Permit", "base_price": 550, "min_weight": 1.0, "max_weight": 5.0, "image_url": "/assets/fish/ikan_permit.png", "description": "Ikan hantu yang sangat sulit ditangkap, membutuhkan ketelitian ekstra karena sifatnya yang sangat waspada." },
                    { "name": "Barracuda", "base_price": 2000, "min_weight": 1.0, "max_weight": 6.0, "image_url": "/assets/fish/ikan_Barracuda.png", "description": "Predator berdarah dingin dengan tubuh aerodinamis, sering menyerang mangsa dengan kecepatan kilat." },
                    { "name": "Roosterfish", "base_price": 500, "min_weight": 2.0, "max_weight": 10.0, "image_url": "/assets/fish/Roosterfish.png", "description": "Dinamai karena sirip punggungnya yang menyerupai jengger ayam, ikan eksotis dari Pasifik." },
                    { "name": "Sailfish", "base_price": 4500, "min_weight": 10.0, "max_weight": 60.0, "image_url": "/assets/fish/Sailfish.png", "description": "Ikan tercepat di samudera dengan sirip punggung lebar menyerupai layar kapal." },
                    { "name": "Red Drum", "base_price": 1500, "min_weight": 2.0, "max_weight": 15.0, "image_url": "/assets/fish/ikan_Red_Drum.png", "description": "Ikan pesisir yang memiliki bintik hitam khas di ekornya, memberikan perlawanan hebat saat dipancing." },
                    { "name": "Tuna Sirip Kuning", "base_price": 5000, "min_weight": 10.0, "max_weight": 40.0, "image_url": "/assets/fish/Tuna_Sirip_Kuning.png", "description": "Ikan migrasi jarak jauh yang sangat berharga untuk sashimi, penguasa rantai makanan laut dalam." }
                ],
                "Legendary": [
                    { "name": "Mekong Giant Catfish", "base_price": 6000, "min_weight": 50.0, "max_weight": 300.0, "image_url": "/assets/fish/Mekong_Giant_Catfish.png", "description": "Raksasa sungai Mekong yang terancam punah, ikan air tawar terbesar yang pernah tercatat dalam sejarah." },
                    { "name": "Arapaima Gigas", "base_price": 9000, "min_weight": 40.0, "max_weight": 200.0, "image_url": "/assets/fish/Arapaima_Gigas.png", "description": "Simbol ganas dari sungai Amazon, ikan bernapas udara yang memiliki sisik sekeras baju besi." },
                    { "name": "Blue Marlin", "base_price": 13000, "min_weight": 80.0, "max_weight": 300.0, "image_url": "/assets/fish/Blue_Marlin.png", "description": "Legenda samudera raya, ikan raksasa yang menjadi subjek utama dalam novel 'The Old Man and the Sea'." },
                    { "name": "Mola Mola", "base_price": 1500, "min_weight": 200.0, "max_weight": 1000.0, "image_url": "/assets/fish/Mola_Mola.png", "description": "Raksasa yang lembut, ikan bertulang sejati terberat yang sering terlihat berjemur di permukaan laut." },
                    { "name": "Napoleon", "base_price": 10000, "min_weight": 5.0, "max_weight": 25.0, "image_url": "/assets/fish/ikan_Napoleon.png", "description": "Ikan karang raksasa yang dilindungi, memiliki tonjolan khas di kepalanya dan sangat ramah terhadap penyelam." },
                    { "name": "Oarfish", "base_price": 12500, "min_weight": 20.0, "max_weight": 150.0, "image_url": "/assets/fish/Oarfish.png", "description": "Ikan pita raksasa yang muncul dari kedalaman laut dalam, sering dikaitkan dengan mitos munculnya gempa bumi." },
                    { "name": "Alligator Gar", "base_price": 5500, "min_weight": 10.0, "max_weight": 50.0, "image_url": "/assets/fish/Alligator_Gar.png", "description": "Ikan dengan moncong menyerupai aligator, makhluk purba yang mendiami sungai-sungai besar Amerika." },
                    { "name": "Manta Ray", "base_price": 14500, "min_weight": 100.0, "max_weight": 500.0, "image_url": "/assets/fish/Manta_Ray.png", "description": "Raksasa samudera yang melayang dengan anggun di dalam air, mahluk cerdas yang ramah terhadap manusia." },
                    { "name": "Giant Stingray", "base_price": 13000, "min_weight": 50.0, "max_weight": 300.0, "image_url": "/assets/fish/Giant_Stingray.png", "description": "Penghuni dasar sungai besar yang misterius, memiliki ekor beracun yang sangat berbahaya." },
                    { "name": "Hiu Martil", "base_price": 14500, "min_weight": 80.0, "max_weight": 300.0, "image_url": "/assets/fish/Hiu_Martil.png", "description": "Hiu dengan bentuk kepala unik yang membantunya mendeteksi sinyal listrik dari mangsa yang bersembunyi." },
                    { "name": "Hiu Macan", "base_price": 14000, "min_weight": 100.0, "max_weight": 500.0, "image_url": "/assets/fish/Hiu_Macan.png", "description": "Pemulung samudera yang tak kenal takut, dikenal karena pola garis-garis di tubuhnya saat masih muda." },
                    { "name": "Megalodon", "base_price": 20000, "min_weight": 8000.0, "max_weight": 30000.0, "image_url": "/assets/fish/Megalodon.png", "description": "Penguasa laut purba yang telah punah, pemangsa terbesar yang pernah berenang di samudera bumi." },
                    { "name": "Hiu Putih", "base_price": 15000, "min_weight": 100.0, "max_weight": 300.0, "image_url": "/assets/fish/Great_White_Shark.png", "description": "Predator puncak samudera yang melegenda, memiliki sensor penciuman yang luar biasa tajam." },
                    { "name": "Gurita", "base_price": 4500, "min_weight": 1.0, "max_weight": 300.0, "image_url": "/assets/fish/Gurita.png", "description": "Monster cerdas dari dasar laut, memiliki kemampuan kamuflase yang luar biasa dan kekuatan lengan yang dahsyat." }
                ]
            };
            return NextResponse.json(fishData);
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
