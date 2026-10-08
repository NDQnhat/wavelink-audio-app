package tag

import "time"

type Tag struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Count     int       `json:"count"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreateTagRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}
