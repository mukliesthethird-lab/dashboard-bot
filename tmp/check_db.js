const mysql = require('mysql2/promise');

async function check() {
    // Hardcoded dari .env.local untuk pengetesan cepat
    const pool = mysql.createPool({
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    });

    try {
        console.log("--- Diagnosa Koneksi ---");
        const [rows] = await pool.execute("SHOW TABLES LIKE 'donors'");
        if (rows.length > 0) {
            console.log("✅ Tabel 'donors' ADA.");
            const [columns] = await pool.execute("DESCRIBE donors");
            console.log("Kolom:", columns.map(c => c.Field).join('|'));
            
            const [count] = await pool.execute("SELECT COUNT(*) as total FROM donors");
            console.log("Jumlah Data:", count[0].total);
        } else {
            console.log("❌ Tabel 'donors' TIDAK ADA.");
            console.log("Mencoba membuat tabel...");
            await pool.execute(`
                CREATE TABLE donors (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    message TEXT,
                    donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tier ENUM('Gold', 'Silver', 'Bronze') DEFAULT 'Bronze'
                )
            `);
            console.log("✅ Tabel berhasil dibuat.");
        }
    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await pool.end();
    }
}

check();
