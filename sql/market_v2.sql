-- ============================================================
-- MARKET V2 MIGRATION — Don Pollo Bot
-- Jalankan file ini di database kamu sebelum deploy perubahan kode
-- PERINGATAN: Ini akan MENGHAPUS SEMUA data market dan portfolio lama!
-- ============================================================

-- Step 1: Reset semua data lama
DELETE FROM user_portfolio;
DELETE FROM market_candles;
DELETE FROM market_assets;

-- Step 2: Update schema market_assets (tambah kolom baru)
ALTER TABLE market_assets
  ADD COLUMN IF NOT EXISTS floor_price DECIMAL(20,4) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ceiling_multiplier DECIMAL(10,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS crash_mode TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crash_recovery_target DECIMAL(20,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment ENUM('bullish','bearish','neutral') DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS initial_price DECIMAL(20,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ath DECIMAL(20,4) DEFAULT 0;

-- Step 3: Update schema user_portfolio (tambah kolom P&L)
ALTER TABLE user_portfolio
  ADD COLUMN IF NOT EXISTS avg_buy_price DECIMAL(20,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_invested DECIMAL(20,4) DEFAULT 0;

-- Step 4: Tambah unique index ke market_candles (untuk UPSERT aman)
ALTER TABLE market_candles
  ADD UNIQUE INDEX IF NOT EXISTS idx_symbol_ts (symbol, timestamp);

-- Step 5: Buat tabel market_config (untuk lock simulasi & state)
CREATE TABLE IF NOT EXISTS market_config (
  cfg_key VARCHAR(50) PRIMARY KEY,
  cfg_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO market_config (cfg_key, cfg_value) VALUES ('last_simulation', '0')
  ON DUPLICATE KEY UPDATE cfg_key = cfg_key;
INSERT INTO market_config (cfg_key, cfg_value) VALUES ('sentiment_last_changed', '0')
  ON DUPLICATE KEY UPDATE cfg_key = cfg_key;

-- Step 6: Buat tabel limit_orders
CREATE TABLE IF NOT EXISTS limit_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  asset_id INT NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  type ENUM('buy','sell') NOT NULL,
  amount DECIMAL(20,6) NOT NULL,
  target_price DECIMAL(20,4) NOT NULL,
  status ENUM('pending','filled','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  filled_at TIMESTAMP NULL,
  INDEX (user_id),
  INDEX (symbol, status),
  INDEX (status)
);

-- Step 7: Buat tabel market_events (whale alerts & crash notifications)
CREATE TABLE IF NOT EXISTS market_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  price_change_pct DECIMAL(10,4),
  old_price DECIMAL(20,4),
  new_price DECIMAL(20,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (created_at),
  INDEX (symbol)
);

-- Step 8: Insert 7 aset baru dengan harga fresh
INSERT INTO market_assets (symbol, name, current_price, previous_price, volatility, floor_price, ceiling_multiplier, initial_price, ath, crash_mode, crash_recovery_target, sentiment) VALUES
('DYTO',  'Dyto',    30000000, 30000000, 0.008, 1, 1.00,  30000000, 30000000, 0, 0, 'neutral'),
('JOKOW', 'Jokowin', 25000000, 25000000, 0.012, 1, 1.00,  25000000, 25000000, 0, 0, 'neutral'),
('POLLO', 'Pollo',   1500000,  1500000,  0.025, 1, 5.00,  1500000,  1500000,  0, 0, 'neutral'),
('OHIO',  'Ohio',    1000000,  1000000,  0.030, 1, 5.00,  1000000,  1000000,  0, 0, 'neutral'),
('SIGMA', 'Sigma',   750000,   750000,   0.045, 1, 10.00, 750000,   750000,   0, 0, 'neutral'),
('BONE',  'Bone',    5000,     5000,     0.060, 1, 10.00, 5000,     5000,     0, 0, 'neutral'),
('MEW',   'Mew',     2500,     2500,     0.080, 1, 10.00, 2500,     2500,     0, 0, 'neutral');

-- Done! Pastikan kamu menjalankan ini SEBELUM server Next.js di-restart.
