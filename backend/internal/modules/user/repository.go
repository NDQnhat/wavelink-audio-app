package user

import (
	"context"
	"database/sql"
	"errors"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetByID(ctx context.Context, id int64) (*User, error) {
	query := `SELECT id, username, email, password_hash, is_guest, role, membership, created_at, updated_at FROM users WHERE id = ?`
	row := r.db.QueryRowContext(ctx, query, id)
	
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.IsGuest, &u.Role, &u.Membership, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id int64, username string, email *string) error {
	query := `UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, username, email, id)
	return err
}

func (r *Repository) UpdatePassword(ctx context.Context, id int64, passwordHash string) error {
	query := `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, passwordHash, id)
	return err
}

func (r *Repository) GetAll(ctx context.Context) ([]User, error) {
	query := `SELECT id, username, email, is_guest, role, membership, created_at, updated_at FROM users ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.IsGuest, &u.Role, &u.Membership, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *Repository) UpdateRoleMembership(ctx context.Context, id int64, role, membership string) error {
	query := `UPDATE users SET role = ?, membership = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, role, membership, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	return err
}
