-- Table to store real-time health metrics from the bot shards
CREATE TABLE IF NOT EXISTS bot_status (
    shard_id INT PRIMARY KEY,
    status ENUM('Online', 'Maintenance', 'Offline') DEFAULT 'Online',
    latency INT DEFAULT 0,
    servers INT DEFAULT 0,
    users INT DEFAULT 0,
    memory_usage VARCHAR(50) DEFAULT '0MB',
    uptime_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version VARCHAR(20) DEFAULT '1.0.0'
);

-- Table to store daily uptime percentage (for the 90-day graph)
CREATE TABLE IF NOT EXISTS bot_uptime_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    check_date DATE UNIQUE,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    incident_count INT DEFAULT 0
);
