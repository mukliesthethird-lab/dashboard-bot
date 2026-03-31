import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: 'Z'
};

const globalForDb = globalThis as unknown as {
    mysqlPool: mysql.Pool | undefined
};

const pool = globalForDb.mysqlPool ?? mysql.createPool(dbConfig);

if (process.env.NODE_ENV !== 'production') globalForDb.mysqlPool = pool;

export default pool;
