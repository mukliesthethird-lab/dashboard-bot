CREATE TABLE IF NOT EXISTS automation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT FALSE,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_value VARCHAR(255),
    conditions JSON,
    actions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild_id (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
