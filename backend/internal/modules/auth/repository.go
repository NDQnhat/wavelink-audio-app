package auth

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

func (r *Repository) GetByID(ctx context.Context, id int64) (*User, error) {
	query := `SELECT id, username, email, password_hash, is_guest, role, membership, created_at, updated_at FROM users WHERE id = ?`
	var u User
	var email, pass sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(&u.ID, &u.Username, &email, &pass, &u.IsGuest, &u.Role, &u.Membership, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if email.Valid {
		u.Email = &email.String
	}
	if pass.Valid {
		u.PasswordHash = &pass.String
	}
	return &u, nil
}

func (r *Repository) GetByUsername(ctx context.Context, username string) (*User, error) {
	query := `SELECT id, username, email, password_hash, is_guest, role, membership, created_at, updated_at FROM users WHERE username = ?`
	var u User
	var email, pass sql.NullString
	err := r.db.QueryRowContext(ctx, query, username).Scan(&u.ID, &u.Username, &email, &pass, &u.IsGuest, &u.Role, &u.Membership, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if email.Valid {
		u.Email = &email.String
	}
	if pass.Valid {
		u.PasswordHash = &pass.String
	}
	return &u, nil
}

func (r *Repository) CreateUser(ctx context.Context, username, email, passwordHash string, isGuest bool) (*User, error) {
	res, err := r.db.ExecContext(ctx,
		"INSERT INTO users (username, email, password_hash, is_guest, role, membership) VALUES (?, ?, ?, ?, 'USER', 'FREE')",
		username, email, passwordHash, isGuest,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}
