-- Client video upload and Buffer scheduling. A NULL publish_profile means no publish tools.
ALTER TABLE clients ADD COLUMN publish_profile TEXT;
ALTER TABLE clients ADD COLUMN reel_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reel_enabled IN (0, 1));

CREATE TABLE publish_videos (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  filename TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  upload_key_hash TEXT NOT NULL,
  upload_expires_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX publish_videos_client ON publish_videos (client_id, created_at DESC);

CREATE TABLE publish_posts (
  video_id TEXT NOT NULL REFERENCES publish_videos(id),
  service TEXT NOT NULL CHECK (service IN ('youtube', 'instagram', 'facebook')),
  client_id TEXT NOT NULL REFERENCES clients(id),
  post_id TEXT,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (video_id, service)
);
CREATE INDEX publish_posts_post ON publish_posts (post_id);

CREATE TABLE publish_usage (
  client_id TEXT NOT NULL REFERENCES clients(id),
  day TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('upload', 'post')),
  runs INTEGER NOT NULL CHECK (runs >= 1),
  PRIMARY KEY (client_id, day, kind)
);
