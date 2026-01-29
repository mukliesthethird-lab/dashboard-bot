-- Forms Feature Database Schema
-- Run this in your MySQL database to create the forms tables

-- Forms table - stores form definitions
CREATE TABLE IF NOT EXISTS forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    name VARCHAR(45) NOT NULL,
    title VARCHAR(45) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    submission_type ENUM('default', 'application', 'ticket') DEFAULT 'default',
    submission_channel_id BIGINT,
    ping_roles JSON,
    add_roles_on_submit JSON,
    remove_roles_on_submit JSON,
    cooldown_seconds INT DEFAULT 0,
    max_submissions_per_user INT DEFAULT 0,
    -- Advanced settings
    required_roles JSON,
    blacklist_roles JSON,
    min_account_age_days INT DEFAULT 0,
    success_message TEXT,
    approve_dm_template TEXT,
    deny_dm_template TEXT,
    add_roles_on_approve JSON,
    pages JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild (guild_id)
);

-- Form panels - the message with button that opens the form
CREATE TABLE IF NOT EXISTS form_panels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    message_id BIGINT,
    message_content TEXT,
    embed_data JSON,
    components JSON,
    webhook_name VARCHAR(80),
    webhook_avatar_url VARCHAR(256),
    is_sticky BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    INDEX idx_guild (guild_id),
    INDEX idx_form (form_id)
);

-- Form submissions
CREATE TABLE IF NOT EXISTS form_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    responses JSON,
    status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
    reviewed_by BIGINT,
    reviewed_at TIMESTAMP NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    INDEX idx_form (form_id),
    INDEX idx_user (user_id),
    INDEX idx_guild_form (guild_id, form_id)
);
