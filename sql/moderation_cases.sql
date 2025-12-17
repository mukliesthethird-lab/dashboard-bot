-- Moderation cases table for tracking ban/kick/mute/warn actions
-- Run this SQL to create the table

CREATE TABLE IF NOT EXISTS moderation_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id VARCHAR(20) NOT NULL,             -- Unique case ID (e.g., "fgvQR3U")
    guild_id VARCHAR(20) NOT NULL,
    
    -- Case type
    type ENUM('ban', 'kick', 'mute', 'warn') NOT NULL,
    
    -- Target user info
    user_id VARCHAR(20) NOT NULL,
    user_username VARCHAR(100) NOT NULL,
    user_avatar VARCHAR(100) DEFAULT NULL,
    
    -- Moderator info
    author_id VARCHAR(20) NOT NULL,
    author_username VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(100) DEFAULT NULL,
    
    -- Case details
    reason TEXT,
    duration VARCHAR(50) DEFAULT 'Permanent',
    status ENUM('open', 'closed') DEFAULT 'open',
    is_mass_action BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    closed_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Indexes
    INDEX idx_guild (guild_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    UNIQUE KEY unique_case (guild_id, case_id)
);
