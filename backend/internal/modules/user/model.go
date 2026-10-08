package user

import "time"

type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	Email        *string   `json:"email,omitempty"`
	PasswordHash *string   `json:"-"`
	IsGuest      bool      `json:"isGuest"`
	Role         string    `json:"role"`
	Membership   string    `json:"membership"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type UpdateProfileRequest struct {
	Username string  `json:"username"`
	Email    *string `json:"email"`
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type AdminUpdateUserRequest struct {
	Role       string `json:"role"`
	Membership string `json:"membership"`
}
