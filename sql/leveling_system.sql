CREATE TABLE IF NOT EXISTS leveling_settings (
    guild_id VARCHAR(20) PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    message TEXT,
    channel_id VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leveling_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    role_id VARCHAR(20) NOT NULL,
    level INT NOT NULL,
    UNIQUE KEY unique_level_role (guild_id, level),
    INDEX idx_guild_level (guild_id, level)
);
