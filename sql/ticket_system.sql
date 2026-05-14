-- SQL for Ticket System
-- This script creates the necessary tables for the Ticket system

CREATE TABLE IF NOT EXISTS guild_config (
    guild_id VARCHAR(20) PRIMARY KEY,
    category_id VARCHAR(20),
    log_channel_id VARCHAR(20),
    panel_channel_id VARCHAR(20),
    panel_message_id VARCHAR(20),
    support_role_id VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS active_tickets (
    channel_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20),
    user_id VARCHAR(20),
    created_at VARCHAR(50),
    reason TEXT
);
