const mysql = require('mysql2/promise');
async function checkSubmissions() {
    const pool = mysql.createPool({
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    });

    try {
        console.log('Describing form_submissions table...');
        const [rows] = await pool.query('DESCRIBE form_submissions');
        console.table(rows);
    } catch (err) {
        console.error('Error querying database:', err.message);
    } finally {
        await pool.end();
    }
}

checkSubmissions();
