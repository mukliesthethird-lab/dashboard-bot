-- Logging settings table for Discord server logging
-- Run this SQL to create the table:
-- DROP TABLE IF EXISTS logging_settings;
-- Then run this CREATE TABLE statement

CREATE TABLE IF NOT EXISTS logging_settings (
    guild_id VARCHAR(20) PRIMARY KEY,
    
    -- General settings
    use_webhooks BOOLEAN DEFAULT TRUE,
    ignore_embeds BOOLEAN DEFAULT FALSE,
    ignore_voice_users BOOLEAN DEFAULT FALSE,
    log_deleted_polls BOOLEAN DEFAULT TRUE,
    log_sticky_messages BOOLEAN DEFAULT TRUE,
    
    -- Ignore lists (JSON arrays)
    ignored_channels JSON DEFAULT '[]',
    ignored_roles JSON DEFAULT '[]',
    ignored_users JSON DEFAULT '[]',
    
    -- Category channels (JSON object mapping category to channel_id)
    -- Categories: applications, channels, automod, emojis, events, invites, messages, 
    --             polls, roles, stage, server, stickers, soundboard, threads, 
    --             users, voice, webhooks, moderation
    category_channels JSON DEFAULT '{}',
    
    -- Type channels (JSON object mapping individual type to channel_id for overrides)
    type_channels JSON DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- If table already exists, run this to add the column:
-- ALTER TABLE logging_settings ADD COLUMN type_channels JSON DEFAULT '{}' AFTER category_channels;
