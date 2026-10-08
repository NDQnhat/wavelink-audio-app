package progress

import "time"

type ProgressRecord struct {
	ID              int64     `json:"id"`
	UserID          int64     `json:"userId"`
	AudioID         int64     `json:"audioId"`
	EpisodeID       int64     `json:"episodeId"`
	PositionSeconds int       `json:"positionSeconds"`
	DurationSeconds int       `json:"durationSeconds"`
	ProgressPercent float64   `json:"progressPercent"`
	Completed       bool      `json:"completed"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type UpdateProgressRequest struct {
	AudioID         int64   `json:"audioId"`
	EpisodeID       int64   `json:"episodeId"`
	PositionSeconds int     `json:"positionSeconds"`
	DurationSeconds int     `json:"durationSeconds,omitempty"`
	ProgressPercent float64 `json:"progressPercent"`
	Completed       bool    `json:"completed"`
}

type ProgressResponse struct {
	AudioID           int64   `json:"audioId"`
	EpisodeID         int64   `json:"episodeId"`
	PositionSeconds   int     `json:"positionSeconds"`
	FormattedPosition string  `json:"formattedPosition"`
	ProgressPercent   float64 `json:"progressPercent"`
	Completed         bool    `json:"completed"`
}
