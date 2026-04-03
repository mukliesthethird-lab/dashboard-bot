const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    });

    try {
        console.log("--- Mengecek Isi Database ---");
        const [rows] = await pool.execute("SELECT * FROM donors");
        console.log("Daftar Donatur:", JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await pool.end();
    }
}

check();
