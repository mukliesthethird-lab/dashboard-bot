const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDb() {
    const dbConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306,
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB");

        const [tables] = await connection.query("SHOW TABLES");
        console.log("Tables in database:", tables.map(t => Object.values(t)[0]));

        const [statusData] = await connection.query("SELECT * FROM bot_status");
        console.log("Data in bot_status:", statusData);

        await connection.end();
    } catch (err) {
        console.error("DB Error:", err.message);
    }
}

checkDb();
