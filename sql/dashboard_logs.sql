-- Dashboard Activity Logs Table
-- Run this on your VexyHost database

CREATE TABLE IF NOT EXISTS dashboard_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(100) DEFAULT 'Unknown',
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_time (guild_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example entries for testing:
-- INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) 
-- VALUES ('123456789', '987654321', 'TestUser', 'Dashboard accessed', 'Viewed server overview');
