-- Welcome Settings Table (Updated)
-- Run this in your MySQL database to create/update the welcome settings table
-- This new schema uses embed_data JSON for flexible embed configuration

-- If you have the old table, run this first to drop it:
-- DROP TABLE IF EXISTS welcome_settings;

CREATE TABLE IF NOT EXISTS welcome_settings (
    guild_id BIGINT PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    channel_id BIGINT,
    message_content TEXT DEFAULT '',
    use_embed BOOLEAN DEFAULT TRUE,
    embed_data JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default embed_data structure:
-- {
--   "author_name": "",
--   "author_icon_url": "",
--   "title": "Welcome!",
--   "title_url": "",
--   "description": "Hey {user}, Selamat datang di **{server}**!",
--   "color": "#00ff04",
--   "thumbnail_url": "{user.avatar}",
--   "image_url": "",
--   "footer_text": "",
--   "footer_icon_url": "",
--   "fields": []
-- }
