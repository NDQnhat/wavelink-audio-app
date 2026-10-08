package category

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

func (r *Repository) GetAll(ctx context.Context) ([]Category, error) {
	query := `
		SELECT c.id, c.name, c.slug, COALESCE(c.description, ''), COALESCE(c.color, 'primary'),
		       COUNT(v.id) AS audio_count, c.created_at
		FROM categories c
		LEFT JOIN youtube_videos v ON v.category_id = c.id
		GROUP BY c.id
		ORDER BY c.id ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	var list []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Color, &c.Count, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	if list == nil {
		list = []Category{}
	}
	return list, nil
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*Category, error) {
	query := `
		SELECT c.id, c.name, c.slug, COALESCE(c.description, ''), COALESCE(c.color, 'primary'),
		       COUNT(v.id) AS audio_count, c.created_at
		FROM categories c
		LEFT JOIN youtube_videos v ON v.category_id = c.id
		WHERE c.id = ?
		GROUP BY c.id
	`
	var c Category
	err := r.db.QueryRowContext(ctx, query, id).Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Color, &c.Count, &c.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) Create(ctx context.Context, req CreateCategoryRequest) (*Category, error) {
	if req.Color == "" {
		req.Color = "primary"
	}
	res, err := r.db.ExecContext(ctx,
		"INSERT INTO categories (name, slug, description, color) VALUES (?, ?, ?, ?)",
		req.Name, req.Slug, req.Description, req.Color,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *Repository) Update(ctx context.Context, id int64, req UpdateCategoryRequest) (*Category, error) {
	if req.Color == "" {
		req.Color = "primary"
	}
	_, err := r.db.ExecContext(ctx,
		"UPDATE categories SET name = ?, slug = ?, description = ?, color = ? WHERE id = ?",
		req.Name, req.Slug, req.Description, req.Color, id,
	)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM categories WHERE id = ?", id)
	return err
}
