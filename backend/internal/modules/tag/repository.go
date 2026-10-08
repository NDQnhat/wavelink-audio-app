package tag

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

func (r *Repository) GetAll(ctx context.Context) ([]Tag, error) {
	query := `
		SELECT t.id, t.name, t.slug, COUNT(at.audio_id) AS audio_count, t.created_at
		FROM tags t
		LEFT JOIN audio_tags at ON at.tag_id = t.id
		GROUP BY t.id
		ORDER BY audio_count DESC, t.name ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query tags: %w", err)
	}
	defer rows.Close()

	var list []Tag
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Count, &t.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	if list == nil {
		list = []Tag{}
	}
	return list, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Tag, error) {
	query := `
		SELECT t.id, t.name, t.slug, COUNT(at.audio_id) AS audio_count, t.created_at
		FROM tags t
		LEFT JOIN audio_tags at ON at.tag_id = t.id
		WHERE t.id = ?
		GROUP BY t.id
	`
	var t Tag
	err := r.db.QueryRowContext(ctx, query, id).Scan(&t.ID, &t.Name, &t.Slug, &t.Count, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) Create(ctx context.Context, req CreateTagRequest) (*Tag, error) {
	res, err := r.db.ExecContext(ctx, "INSERT INTO tags (name, slug) VALUES (?, ?)", req.Name, req.Slug)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM tags WHERE id = ?", id)
	return err
}
