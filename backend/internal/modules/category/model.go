package category

import "time"

type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	Color       string    `json:"color"`
	Count       int       `json:"count"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateCategoryRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

type UpdateCategoryRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Color       string `json:"color"`
}
