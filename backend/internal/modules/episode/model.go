package episode

import "time"

type Episode struct {
	ID              int64     `json:"id"`
	AudioID         int64     `json:"audioId"`
	EpisodeNumber   int       `json:"episodeNumber"`
	Title           string    `json:"title"`
	StartSeconds    int       `json:"startSeconds"`
	EndSeconds      int       `json:"endSeconds"`
	Duration        int       `json:"duration"`
	Completed       bool      `json:"completed"`
	ProgressPercent int       `json:"progressPercent"`
	IsLocked        bool      `json:"isLocked"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type GenerateEpisodesRequest struct {
	BlockSizeSeconds int `json:"blockSizeSeconds"` // e.g. 7200 (2h), 14400 (4h)
	DurationSeconds  int `json:"durationSeconds,omitempty"`
}

type UpdateEpisodeRequest struct {
	Title        string `json:"title"`
	StartSeconds int    `json:"startSeconds"`
	EndSeconds   int    `json:"endSeconds"`
}

type CreateEpisodeRequest struct {
	AudioID       int64  `json:"audioId"`
	EpisodeNumber int    `json:"episodeNumber"`
	Title         string `json:"title"`
	StartSeconds  int    `json:"startSeconds"`
	EndSeconds    int    `json:"endSeconds"`
}
