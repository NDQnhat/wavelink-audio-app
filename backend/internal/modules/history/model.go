package history

import "time"

type HistoryItem struct {
	ID               int64      `json:"id"`
	UserID           int64      `json:"userId"`
	AudioID          int64      `json:"audioId"`
	AudioTitle       string     `json:"audioTitle"`
	Author           string     `json:"author"`
	ThumbnailURL     string     `json:"thumbnailUrl"`
	EpisodeID        int64      `json:"episodeId"`
	EpisodeTitle     string     `json:"episodeTitle"`
	StartedAt        time.Time  `json:"startedAt"`
	EndedAt          *time.Time `json:"endedAt,omitempty"`
	DurationListened int        `json:"durationListened"`
	CreatedAt        time.Time  `json:"createdAt"`
}

type RecordHistoryRequest struct {
	AudioID          int64 `json:"audioId"`
	EpisodeID        int64 `json:"episodeId"`
	DurationListened int   `json:"durationListened"`
}
