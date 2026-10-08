package audio

import (
	"time"

	"audio-app-backend/internal/modules/episode"
)

type Audio struct {
	ID                   int64             `json:"id"`
	YoutubeVideoID       string            `json:"youtubeVideoId"`
	YoutubeURL           string            `json:"youtubeUrl"`
	Title                string            `json:"title"`
	Description          string            `json:"description,omitempty"`
	Author               string            `json:"author"`
	Channel              string            `json:"channel"`
	CategoryID           int64             `json:"categoryId"`
	CategoryName         string            `json:"categoryName"`
	Tags                 []string          `json:"tags"`
	ThumbnailURL         string            `json:"thumbnailUrl"`
	TotalDurationSeconds int               `json:"totalDurationSeconds"`
	FormattedDuration    string            `json:"formattedDuration"`
	TotalEpisodes        int               `json:"totalEpisodes"`
	Status               string            `json:"status"`
	CurrentEpisodeNumber int               `json:"currentEpisodeNumber"`
	CurrentEpisodeTitle  string            `json:"currentEpisodeTitle"`
	LastPositionSeconds  int               `json:"lastPositionSeconds"`
	FormattedPosition    string            `json:"formattedPosition"`
	ProgressPercent      int               `json:"progressPercent"`
	IsFavorite           bool              `json:"isFavorite"`
	Episodes             []episode.Episode `json:"episodes,omitempty"`
	CreatedAt            time.Time         `json:"createdAt"`
	UpdatedAt            time.Time         `json:"updatedAt"`
}

type ImportYouTubeRequest struct {
	URL             string   `json:"url"`
	CategoryID      int64    `json:"categoryId"`
	Tags            []string `json:"tags"`
	DurationSeconds int      `json:"durationSeconds,omitempty"`
}

type ImportYouTubeResponse struct {
	Duplicate bool   `json:"duplicate"`
	Audio     *Audio `json:"audio"`
}

type UpdateAudioRequest struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Author          string   `json:"author"`
	CategoryID      int64    `json:"categoryId"`
	Status          string   `json:"status,omitempty"`
	DurationSeconds int      `json:"durationSeconds,omitempty"`
	Tags            []string `json:"tags"`
}

type FilterParams struct {
	Search     string
	CategoryID int64
	Tag        string
	Status     string // "listening", "completed", "favorite"
	Page       int
	PageSize   int
}
