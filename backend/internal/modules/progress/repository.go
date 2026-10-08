package progress

import (
	"context"
	"database/sql"
	"fmt"
)

type Repository struct {
	db     *sql.DB
	driver string
}

func NewRepository(db *sql.DB, driver string) *Repository {
	return &Repository{
		db:     db,
		driver: driver,
	}
}

func (r *Repository) Upsert(ctx context.Context, userID int64, req UpdateProgressRequest) error {
	var query string
	if r.driver == "sqlite" {
		query = `
			INSERT INTO listening_progress (user_id, audio_id, episode_id, position_seconds, duration_seconds, progress_percent, completed, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, episode_id) DO UPDATE SET
				audio_id = excluded.audio_id,
				position_seconds = excluded.position_seconds,
				duration_seconds = excluded.duration_seconds,
				progress_percent = excluded.progress_percent,
				completed = excluded.completed,
				updated_at = CURRENT_TIMESTAMP
		`
	} else {
		// MySQL 8.x
		query = `
			INSERT INTO listening_progress (user_id, audio_id, episode_id, position_seconds, duration_seconds, progress_percent, completed, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE
				audio_id = VALUES(audio_id),
				position_seconds = VALUES(position_seconds),
				duration_seconds = VALUES(duration_seconds),
				progress_percent = VALUES(progress_percent),
				completed = VALUES(completed),
				updated_at = CURRENT_TIMESTAMP
		`
	}

	_, err := r.db.ExecContext(ctx, query,
		userID, req.AudioID, req.EpisodeID, req.PositionSeconds, req.DurationSeconds, req.ProgressPercent, req.Completed,
	)
	if err != nil {
		return fmt.Errorf("upsert progress failed: %w", err)
	}
	return nil
}

func (r *Repository) GetLatestProgress(ctx context.Context, userID int64, audioID int64) (*ProgressRecord, error) {
	query := `
		SELECT id, user_id, audio_id, episode_id, position_seconds, duration_seconds, progress_percent, completed, updated_at
		FROM listening_progress
		WHERE user_id = ? AND audio_id = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`
	var p ProgressRecord
	err := r.db.QueryRowContext(ctx, query, userID, audioID).Scan(
		&p.ID, &p.UserID, &p.AudioID, &p.EpisodeID, &p.PositionSeconds, &p.DurationSeconds, &p.ProgressPercent, &p.Completed, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetUserInProgress(ctx context.Context, userID int64) ([]ProgressRecord, error) {
	query := `
		SELECT id, user_id, audio_id, episode_id, position_seconds, duration_seconds, progress_percent, completed, updated_at
		FROM listening_progress
		WHERE user_id = ? AND completed = 0 AND progress_percent > 0
		ORDER BY updated_at DESC
		LIMIT 20
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ProgressRecord
	for rows.Next() {
		var p ProgressRecord
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.AudioID, &p.EpisodeID, &p.PositionSeconds, &p.DurationSeconds, &p.ProgressPercent, &p.Completed, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	if list == nil {
		list = []ProgressRecord{}
	}
	return list, nil
}
