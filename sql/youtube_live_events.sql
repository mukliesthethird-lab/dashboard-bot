-- Execute this SQL in your database to create the required table for YouTube live events
-- This table stores live stream events received via PubSubHubbub webhook

CREATE TABLE IF NOT EXISTS youtube_live_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL,         -- YouTube channel ID
    video_id VARCHAR(255) NOT NULL,           -- YouTube video ID
    video_title TEXT,                         -- Video/stream title
    channel_name VARCHAR(255),                -- Channel name
    published_at DATETIME,                    -- When the video was published
    event_type ENUM('live', 'video', 'upcoming') DEFAULT 'video',
    is_processed BOOLEAN DEFAULT FALSE,        -- Whether bot has sent notification
    processed_at DATETIME NULL,               -- When bot processed this event
    raw_xml TEXT,                             -- Store raw XML for debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_video (video_id),       -- Prevent duplicate entries
    INDEX idx_channel (channel_id),
    INDEX idx_processed (is_processed),
    INDEX idx_event_type (event_type)
);

-- Table to track PubSubHubbub subscriptions
CREATE TABLE IF NOT EXISTS youtube_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL,         -- YouTube channel ID
    hub_topic VARCHAR(512) NOT NULL,          -- The topic URL subscribed to
    hub_lease_seconds INT DEFAULT 432000,     -- Lease duration (5 days default)
    subscribed_at DATETIME,                   -- When subscription was confirmed
    expires_at DATETIME,                      -- When subscription expires
    status ENUM('pending', 'active', 'expired', 'unsubscribed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_channel (channel_id),
    INDEX idx_status (status),
    INDEX idx_expires (expires_at)
);
