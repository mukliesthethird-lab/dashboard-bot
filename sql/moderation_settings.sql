-- Moderation settings table for Discord server moderation configuration
-- Run this SQL to create the table

CREATE TABLE IF NOT EXISTS moderation_settings (
    guild_id VARCHAR(20) PRIMARY KEY,
    
    -- Toggle settings
    user_notifications BOOLEAN DEFAULT TRUE,  -- DM users on punishment
    purge_pinned BOOLEAN DEFAULT TRUE,        -- Keep pinned when purging
    appeals_enabled BOOLEAN DEFAULT FALSE,    -- Enable appeals system
    
    -- Role/Channel configurations (JSON arrays/objects)
    immune_roles JSON DEFAULT '[]',           -- Role IDs immune to moderation
    predefined_reasons JSON DEFAULT '{}',     -- Reason aliases {"spam": "Spamming in chat", ...}
    locked_channels JSON DEFAULT '[]',        -- Currently locked channel IDs
    
    -- Privacy settings
    privacy_show_moderator BOOLEAN DEFAULT TRUE,  -- Show moderator to user
    privacy_show_reason BOOLEAN DEFAULT TRUE,     -- Show reason to user
    privacy_show_duration BOOLEAN DEFAULT TRUE,   -- Show duration to user
    
    -- Appeals configuration (JSON)
    appeals_channel_id VARCHAR(20) DEFAULT NULL,
    appeals_config JSON DEFAULT '{}',
    
    -- Default punishment durations
    default_mute_duration VARCHAR(50) DEFAULT '1 hour',
    default_ban_duration VARCHAR(50) DEFAULT 'Permanent',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
