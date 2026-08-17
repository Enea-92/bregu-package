-- Hotel Bregu guest app — database schema
-- Works as-is in SQLite (used by the local demo server).
-- For Postgres/Supabase: change AUTOINCREMENT -> SERIAL/IDENTITY and
-- TEXT timestamps -> TIMESTAMPTZ DEFAULT now().

CREATE TABLE IF NOT EXISTS rooms (
  room_number TEXT PRIMARY KEY,
  floor TEXT,
  guest_name TEXT,
  checked_in INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('guest', 'staff')),
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quick_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL,
  request_type TEXT NOT NULL,      -- towels | cleaning | pillows | toiletries
  status TEXT DEFAULT 'pending',   -- pending | done
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL,
  items TEXT NOT NULL,             -- JSON array: [{"name":"Club Sandwich","price":450}]
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',   -- pending | preparing | delivered
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON room_service_orders(status);
CREATE INDEX IF NOT EXISTS idx_requests_status ON quick_requests(status);
