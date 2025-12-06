CREATE TABLE IF NOT EXISTS components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    custom_id VARCHAR(100) NOT NULL, -- Unique ID for the bot to reference
    type ENUM('button', 'select_menu') NOT NULL,
    name VARCHAR(100) NOT NULL, -- Human readable name
    data JSON NOT NULL, -- Stores all component data (label, style, actions, etc)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_component (guild_id, custom_id)
);
