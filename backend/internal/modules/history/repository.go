package history

import (
	"context"
	"database/sql"
	"fmt"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Record(ctx context.Context, userID int64, req RecordHistoryRequest) error {
	query := `
		INSERT INTO listening_history (user_id, audio_id, episode_id, duration_listened, started_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
	`
	_, err := r.db.ExecContext(ctx, query, userID, req.AudioID, req.EpisodeID, req.DurationListened)
	if err != nil {
		return fmt.Errorf("failed to record history: %w", err)
	}
	return nil
}

func (r *Repository) GetRecent(ctx context.Context, userID int64, limit int) ([]HistoryItem, error) {
	if limit <= 0 {
		limit = 10
	}
	query := `
		SELECT h.id, h.user_id, h.audio_id, COALESCE(v.title, 'Không xác định'),
		       COALESCE(v.author_name, 'Tác giả'), COALESCE(v.thumbnail_url, ''),
		       h.episode_id, COALESCE(e.title, 'Tập 1'),
		       h.started_at, h.duration_listened, h.created_at
		FROM listening_history h
		LEFT JOIN youtube_videos v ON v.id = h.audio_id
		LEFT JOIN episodes e ON e.id = h.episode_id
		WHERE h.user_id = ?
		ORDER BY h.id DESC
		LIMIT ?
	`
	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	var list []HistoryItem
	for rows.Next() {
		var h HistoryItem
		if err := rows.Scan(
			&h.ID, &h.UserID, &h.AudioID, &h.AudioTitle, &h.Author, &h.ThumbnailURL,
			&h.EpisodeID, &h.EpisodeTitle, &h.StartedAt, &h.DurationListened, &h.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, h)
	}
	if list == nil {
		list = []HistoryItem{}
	}
	return list, nil
}
