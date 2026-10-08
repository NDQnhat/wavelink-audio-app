package episode

import (
	"context"
	"database/sql"
	"fmt"

	"audio-app-backend/internal/platform/middleware"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByAudioID(ctx context.Context, audioID int64, userID int64) ([]Episode, error) {
	query := `
		SELECT e.id, e.audio_id, e.episode_number, e.title, e.start_seconds, e.end_seconds, e.duration_seconds,
		       COALESCE(lp.completed, 0) AS completed,
		       COALESCE(lp.progress_percent, 0.0) AS progress_percent,
		       e.created_at, e.updated_at
		FROM episodes e
		LEFT JOIN listening_progress lp ON lp.episode_id = e.id AND lp.user_id = ?
		WHERE e.audio_id = ?
		ORDER BY e.episode_number ASC
	`
	rows, err := r.db.QueryContext(ctx, query, userID, audioID)
	if err != nil {
		return nil, fmt.Errorf("failed to query episodes: %w", err)
	}
	defer rows.Close()

	var list []Episode
	for rows.Next() {
		var ep Episode
		var percent float64
		if err := rows.Scan(
			&ep.ID, &ep.AudioID, &ep.EpisodeNumber, &ep.Title, &ep.StartSeconds, &ep.EndSeconds, &ep.Duration,
			&ep.Completed, &percent, &ep.CreatedAt, &ep.UpdatedAt,
		); err != nil {
			return nil, err
		}
		ep.ProgressPercent = int(percent)
		
		role := middleware.GetRole(ctx)
		membership := middleware.GetMembership(ctx)
		isVIP := role == "ADMIN" || membership == "VIP"

		if !isVIP && ep.EpisodeNumber > 2 {
			ep.IsLocked = true
			ep.StartSeconds = 0
			ep.EndSeconds = 0
			ep.Duration = 0
		}

		list = append(list, ep)
	}
	if list == nil {
		list = []Episode{}
	}
	return list, nil
}

func (r *Repository) ReplaceEpisodes(ctx context.Context, audioID int64, episodes []Episode) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, "DELETE FROM episodes WHERE audio_id = ?", audioID)
	if err != nil {
		return err
	}

	for _, ep := range episodes {
		_, err := tx.ExecContext(ctx,
			`INSERT INTO episodes (audio_id, episode_number, title, start_seconds, end_seconds, duration_seconds)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			audioID, ep.EpisodeNumber, ep.Title, ep.StartSeconds, ep.EndSeconds, ep.Duration,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *Repository) GetAudioDuration(ctx context.Context, audioID int64) (int, error) {
	var d int
	err := r.db.QueryRowContext(ctx, "SELECT duration_seconds FROM youtube_videos WHERE id = ?", audioID).Scan(&d)
	return d, err
}

func (r *Repository) UpdateEpisode(ctx context.Context, id int64, title string, startSec, endSec int) error {
	duration := endSec - startSec
	if duration < 0 {
		duration = 0
	}
	_, err := r.db.ExecContext(ctx,
		"UPDATE episodes SET title = ?, start_seconds = ?, end_seconds = ?, duration_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		title, startSec, endSec, duration, id,
	)
	return err
}

func (r *Repository) DeleteEpisode(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM episodes WHERE id = ?", id)
	return err
}

func (r *Repository) CreateEpisode(ctx context.Context, ep Episode) (int64, error) {
	duration := ep.EndSeconds - ep.StartSeconds
	if duration < 0 {
		duration = 0
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO episodes (audio_id, episode_number, title, start_seconds, end_seconds, duration_seconds)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		ep.AudioID, ep.EpisodeNumber, ep.Title, ep.StartSeconds, ep.EndSeconds, duration,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}
