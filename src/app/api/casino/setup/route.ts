import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Starting Casino Multiplayer Migration via API...');

        // Table for Casino Chips
        await pool.query(`
            CREATE TABLE IF NOT EXISTS casino_chips (
                user_id VARCHAR(255) PRIMARY KEY,
                chips BIGINT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Table for Casino Rooms
        await pool.query(`
            CREATE TABLE IF NOT EXISTS casino_rooms (
                id VARCHAR(50) PRIMARY KEY,
                game_type VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
                state JSON,
                max_players INT NOT NULL DEFAULT 5,
                minimum_bet BIGINT NOT NULL DEFAULT 10,
                host_id VARCHAR(255),
                host_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Add columns if they missed the creation due to IF NOT EXISTS
        try { await pool.query('ALTER TABLE casino_rooms ADD COLUMN minimum_bet BIGINT NOT NULL DEFAULT 10'); } catch(e){}
        try { await pool.query('ALTER TABLE casino_rooms ADD COLUMN host_id VARCHAR(255)'); } catch(e){}
        try { await pool.query('ALTER TABLE casino_rooms ADD COLUMN host_name VARCHAR(100)'); } catch(e){}

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

        console.log('Migration Completed Successfully!');
        return NextResponse.json({ success: true, message: 'Casino tables created/verified' });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
