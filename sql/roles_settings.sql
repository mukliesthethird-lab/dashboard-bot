-- Roles settings table for Discord server role management

CREATE TABLE IF NOT EXISTS roles_settings (
    guild_id VARCHAR(20) PRIMARY KEY,
    
    -- Join Roles settings
    join_roles_enabled BOOLEAN DEFAULT FALSE,
    join_roles JSON DEFAULT '[]',
    wait_for_screening BOOLEAN DEFAULT TRUE,
    delay_assignment BOOLEAN DEFAULT FALSE,
    delay_seconds INT DEFAULT 0,
    bot_roles JSON DEFAULT '[]',
    
    -- Reaction Roles settings
    reaction_roles_enabled BOOLEAN DEFAULT FALSE,
    auto_add_reactions BOOLEAN DEFAULT TRUE,
    auto_remove_reactions BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reaction_role_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    message_id VARCHAR(20),
    message_content TEXT,
    embeds JSON DEFAULT '[]',
    reactions JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_guild (guild_id),
    INDEX idx_message (message_id)
);

-- If table exists, run these to add new columns:
-- ALTER TABLE reaction_role_messages ADD COLUMN message_content TEXT AFTER message_id;
-- ALTER TABLE reaction_role_messages ADD COLUMN embeds JSON DEFAULT '[]' AFTER message_content;
-- ALTER TABLE reaction_role_messages DROP INDEX unique_message;
