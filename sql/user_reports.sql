-- User Reports table untuk Discord server user reporting system
-- Sesuai dengan skema dari Report.py
-- Jalankan SQL ini untuk membuat tabel

CREATE TABLE IF NOT EXISTS user_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL,
    reporter_name VARCHAR(255),
    reported_id BIGINT NOT NULL,
    reported_name VARCHAR(255),
    tanggal VARCHAR(100),
    reason TEXT,
    bukti_gambar TEXT,
    status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
    case_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes untuk performa query
    INDEX idx_guild_id (guild_id),
    INDEX idx_reported_id (reported_id),
    INDEX idx_status (status),
    INDEX idx_case_number (case_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
