-- Migration 004: Create community_messages table
CREATE TABLE IF NOT EXISTS community_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 0,
    username VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    is_vip BOOLEAN DEFAULT 0,
    role VARCHAR(20) DEFAULT 'USER',
    message TEXT NOT NULL,
    shared_audio_id INTEGER,
    created_at DATETIME,
    FOREIGN KEY (shared_audio_id) REFERENCES youtube_videos (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON community_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_community_messages_user_id ON community_messages (user_id);
