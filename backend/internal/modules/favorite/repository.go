package favorite

import (
	"context"
	"database/sql"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Add(ctx context.Context, userID int64, audioID int64) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO favorites (user_id, audio_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
		userID, audioID,
	)
	if err != nil {
		// Fallback for MySQL 8 (INSERT IGNORE)
		_, err = r.db.ExecContext(ctx,
			"INSERT IGNORE INTO favorites (user_id, audio_id) VALUES (?, ?)",
			userID, audioID,
		)
	}
	return err
}

func (r *Repository) Remove(ctx context.Context, userID int64, audioID int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM favorites WHERE user_id = ? AND audio_id = ?", userID, audioID)
	return err
}

func (r *Repository) IsFavorite(ctx context.Context, userID int64, audioID int64) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM favorites WHERE user_id = ? AND audio_id = ?", userID, audioID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
