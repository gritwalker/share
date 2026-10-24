-- 학교 안 아바다 (share) D1 스키마

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  school_code TEXT NOT NULL,
  school_name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6),
  class_num INTEGER NOT NULL CHECK (class_num BETWEEN 1 AND 20),
  eco_coins INTEGER NOT NULL DEFAULT 50,
  badges TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('sale', 'donate')),
  emoji TEXT NOT NULL DEFAULT '📦',
  image_data TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'donated')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_item_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  buyer_id INTEGER REFERENCES users(id),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('sale', 'donate')),
  price INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_school_status ON items(school_code, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_history_user ON coin_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
