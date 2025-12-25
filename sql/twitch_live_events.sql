-- Twitch live events table for EventSub webhook notifications
CREATE TABLE IF NOT EXISTS twitch_live_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    broadcaster_id VARCHAR(255) NOT NULL,         -- Twitch broadcaster user ID
    broadcaster_login VARCHAR(255) NOT NULL,      -- Twitch username/login
    broadcaster_name VARCHAR(255),                -- Display name
    stream_title TEXT,                            -- Stream title
    game_name VARCHAR(255),                       -- Game/category name
    game_id VARCHAR(255),                         -- Game/category ID
    started_at DATETIME,                          -- When stream started
    event_type ENUM('stream.online', 'stream.offline') DEFAULT 'stream.online',
    is_processed BOOLEAN DEFAULT FALSE,           -- Whether bot has sent notification
    processed_at DATETIME NULL,                   -- When bot processed this event
    raw_json TEXT,                                -- Store raw JSON for debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_broadcaster (broadcaster_id),
    INDEX idx_processed (is_processed),
    INDEX idx_event_type (event_type)
);

-- Twitch EventSub subscriptions table
CREATE TABLE IF NOT EXISTS twitch_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id VARCHAR(255) NOT NULL,        -- EventSub subscription ID
    broadcaster_id VARCHAR(255) NOT NULL,         -- Twitch broadcaster user ID
    broadcaster_login VARCHAR(255),               -- Twitch username
    subscription_type VARCHAR(100) DEFAULT 'stream.online',
    status ENUM('pending', 'enabled', 'webhook_callback_verification_failed', 'disabled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_subscription (subscription_id),
    INDEX idx_broadcaster (broadcaster_id),
    INDEX idx_status (status)
);
