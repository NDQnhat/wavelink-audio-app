package stats

type SystemStats struct {
	TotalAudios        int `json:"totalAudios"`
	TotalEpisodes      int `json:"totalEpisodes"`
	TotalCategories    int `json:"totalCategories"`
	TotalTags          int `json:"totalTags"`
	TotalAuthors       int `json:"totalAuthors"`
	ListeningCount     int `json:"listeningCount"`
	CompletedCount     int `json:"completedCount"`
	TotalHoursListened int `json:"totalHoursListened"`
}
