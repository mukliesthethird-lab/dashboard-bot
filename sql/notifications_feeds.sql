-- Execute this SQL in your database to create the required table for multi-feed notifications
CREATE TABLE IF NOT EXISTS notifications_feeds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'youtube' or 'live'
    feed_url TEXT NOT NULL,
    discord_channel_id VARCHAR(255) NOT NULL,
    custom_message_json TEXT, -- Store the embed/message object as JSON
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_guild ON notifications_feeds(guild_id);
