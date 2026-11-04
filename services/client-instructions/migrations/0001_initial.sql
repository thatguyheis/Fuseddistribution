CREATE TABLE clients (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
  access_until TEXT,
  bundle_name TEXT NOT NULL,
  status_actor TEXT NOT NULL,
  status_reason TEXT NOT NULL,
  status_changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE instruction_bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  body TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (name, version)
);

CREATE INDEX instruction_bundles_latest ON instruction_bundles (name, id DESC);

CREATE TABLE payment_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  old_paid INTEGER NOT NULL,
  new_paid INTEGER NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE TRIGGER audit_paid_change
AFTER UPDATE OF paid ON clients
WHEN OLD.paid != NEW.paid
BEGIN
  INSERT INTO payment_audit (client_id, old_paid, new_paid, actor, reason)
  VALUES (NEW.id, OLD.paid, NEW.paid, NEW.status_actor, NEW.status_reason);
END;
