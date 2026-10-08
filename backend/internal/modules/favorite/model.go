package favorite

import "time"

type Favorite struct {
	UserID    int64     `json:"userId"`
	AudioID   int64     `json:"audioId"`
	CreatedAt time.Time `json:"createdAt"`
}
