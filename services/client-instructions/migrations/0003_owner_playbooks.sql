CREATE TABLE owner_playbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  body TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  content_type TEXT NOT NULL CHECK (content_type = 'text/markdown; charset=utf-8'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (name, version)
);

CREATE INDEX owner_playbooks_latest ON owner_playbooks (name, id DESC);
