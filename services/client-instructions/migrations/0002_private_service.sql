CREATE TABLE private_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  body TEXT NOT NULL CHECK (json_valid(body)),
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (name, version)
);
CREATE INDEX private_policies_latest ON private_policies (name, id DESC);
CREATE TABLE daily_usage (
  client_id TEXT NOT NULL REFERENCES clients(id),
  day TEXT NOT NULL,
  runs INTEGER NOT NULL CHECK (runs >= 1),
  PRIMARY KEY (client_id, day)
);
