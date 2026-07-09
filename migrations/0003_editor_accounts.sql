ALTER TABLE editors ADD COLUMN display_name TEXT;
ALTER TABLE editors ADD COLUMN password_salt TEXT;
ALTER TABLE editors ADD COLUMN password_hash TEXT;
ALTER TABLE editors ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 210000;
ALTER TABLE editors ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS editor_sessions (
  token_hash TEXT PRIMARY KEY,
  editor_email TEXT NOT NULL COLLATE NOCASE,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (editor_email) REFERENCES editors(email) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS editor_sessions_email_idx
  ON editor_sessions(editor_email, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS editor_sessions_expiry_idx
  ON editor_sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  window_started_at TEXT NOT NULL
);
