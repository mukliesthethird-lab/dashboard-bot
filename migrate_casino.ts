import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pool from './src/lib/db';

async function migrateCasino() {
    console.log('Starting Casino Multiplayer Migration...');

    try {
        // Table for Casino Chips
        await pool.query(`
            CREATE TABLE IF NOT EXISTS casino_chips (
                user_id VARCHAR(255) PRIMARY KEY,
                chips BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Checked/Created casino_chips table');

        // Table for Casino Rooms
        await pool.query(`
            CREATE TABLE IF NOT EXISTS casino_rooms (
                id VARCHAR(50) PRIMARY KEY,
                game_type VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
                state JSON,
                max_players INT NOT NULL DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Checked/Created casino_rooms table');

        // Table for Casino Players
        await pool.query(`
            CREATE TABLE IF NOT EXISTS casino_players (
                room_id VARCHAR(50),
                user_id VARCHAR(255),
                seat_number INT,
                bet BIGINT DEFAULT 0,
                state JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (room_id, user_id),
                FOREIGN KEY (room_id) REFERENCES casino_rooms(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Checked/Created casino_players table');

        console.log('Migration Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateCasino();
