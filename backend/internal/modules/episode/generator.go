package episode

import (
	"fmt"
)

const DefaultEpisodeDuration = 14400 // 4 hours in seconds

func FormatTime(secs int) string {
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

func GenerateLogicalEpisodes(audioID int64, totalDuration int, blockSize int) []Episode {
	if blockSize <= 0 {
		blockSize = DefaultEpisodeDuration
	}

	if totalDuration <= blockSize {
		return []Episode{
			{
				AudioID:         audioID,
				EpisodeNumber:   1,
				Title:           "Tập 1",
				StartSeconds:    0,
				EndSeconds:      totalDuration,
				Duration:        totalDuration,
				Completed:       false,
				ProgressPercent: 0,
			},
		}
	}

	numEpisodes := (totalDuration + blockSize - 1) / blockSize
	episodes := make([]Episode, 0, numEpisodes)

	for i := 0; i < numEpisodes; i++ {
		start := i * blockSize
		end := (i + 1) * blockSize
		if end > totalDuration {
			end = totalDuration
		}
		duration := end - start

		episodes = append(episodes, Episode{
			AudioID:         audioID,
			EpisodeNumber:   i + 1,
			Title:           fmt.Sprintf("Tập %d (%s - %s)", i+1, FormatTime(start), FormatTime(end)),
			StartSeconds:    start,
			EndSeconds:      end,
			Duration:        duration,
			Completed:       false,
			ProgressPercent: 0,
		})
	}

	return episodes
}
