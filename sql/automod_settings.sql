CREATE TABLE IF NOT EXISTS automod_settings (
    guild_id BIGINT PRIMARY KEY,
    anti_links BOOLEAN DEFAULT FALSE,
    anti_invites BOOLEAN DEFAULT FALSE,
    anti_spam BOOLEAN DEFAULT FALSE,
    spam_threshold INT DEFAULT 70,
    penalty_action VARCHAR(50) DEFAULT 'warn',
    blacklisted_words TEXT,
    anti_caps BOOLEAN DEFAULT FALSE,
    caps_threshold INT DEFAULT 70,
    anti_mentions BOOLEAN DEFAULT FALSE,
    mentions_threshold INT DEFAULT 5,
    anti_zalgo BOOLEAN DEFAULT FALSE,
    anti_emoji BOOLEAN DEFAULT FALSE,
    emoji_threshold INT DEFAULT 10,
    log_channel_id BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
