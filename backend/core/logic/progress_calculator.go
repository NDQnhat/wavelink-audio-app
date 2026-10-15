package logic

import (
	"math"

	"audio-app-backend/core/domain"
	"github.com/samber/lo"
)

const (
	CompletionThresholdPercent = 95.0
)

// CalculateProgress tính toán phần trăm hoàn thành và giới hạn biên chuẩn xác
func CalculateProgress(positionSec int, durationSec int) domain.ProgressResult {
	if durationSec <= 0 {
		durationSec = 14400 // Dự phòng 4h
	}

	clampedPos := positionSec
	if clampedPos < 0 {
		clampedPos = 0
	} else if clampedPos > durationSec {
		clampedPos = durationSec
	}

	percent := (float64(clampedPos) / float64(durationSec)) * 100.0
	percent = math.Round(percent*100) / 100 // Làm tròn 2 chữ số thập phân
	if percent > 100.0 {
		percent = 100.0
	}

	completed := percent >= CompletionThresholdPercent

	return domain.ProgressResult{
		PositionSeconds: clampedPos,
		DurationSeconds: durationSec,
		ProgressPercent: percent,
		Completed:       completed,
	}
}

// CalculateResumeState tổng hợp trạng thái để Player tua ngay đến tập và mốc thời gian đang nghe dở
func CalculateResumeState(audio domain.Audio, episodes []domain.Episode, progresses []domain.ListeningProgress) domain.ResumeState {
	if len(episodes) == 0 {
		return domain.ResumeState{
			CurrentEpisodeID:     0,
			CurrentEpisodeNumber: 1,
			CurrentEpisodeTitle:  "Tập 1",
			LastPositionSeconds:  0,
			ProgressPercent:      0.0,
			FormattedPosition:    "00:00",
		}
	}

	epByID := make(map[uint]domain.Episode, len(episodes))
	epByNumber := make(map[int]domain.Episode, len(episodes))
	for _, ep := range episodes {
		epByID[ep.ID] = ep
		epByNumber[ep.EpisodeNumber] = ep
	}

	progressMap := lo.KeyBy(progresses, func(p domain.ListeningProgress) uint {
		return p.EpisodeID
	})

	// 1. Ưu tiên tập được nghe gần đây nhất theo UpdatedAt mới nhất
	if len(progresses) > 0 {
		var latestProg *domain.ListeningProgress
		for i := range progresses {
			p := &progresses[i]
			if latestProg == nil || p.UpdatedAt.After(latestProg.UpdatedAt) {
				latestProg = p
			}
		}

		if latestProg != nil {
			if ep, found := epByID[latestProg.EpisodeID]; found {
				// Nếu tập này chưa hoàn thành, tiếp tục nghe chính tập này
				if !latestProg.Completed && latestProg.ProgressPercent < CompletionThresholdPercent {
					return domain.ResumeState{
						CurrentEpisodeID:     ep.ID,
						CurrentEpisodeNumber: ep.EpisodeNumber,
						CurrentEpisodeTitle:  ep.Title,
						LastPositionSeconds:  latestProg.PositionSeconds,
						ProgressPercent:      latestProg.ProgressPercent,
						FormattedPosition:    FormatTime(latestProg.PositionSeconds),
					}
				}

				// Nếu tập này đã hoàn thành, chuyển sang tập kế tiếp
				if nextEp, hasNext := epByNumber[ep.EpisodeNumber+1]; hasNext {
					nextPos := 0
					nextPercent := 0.0
					if np, hasProg := progressMap[nextEp.ID]; hasProg {
						nextPos = np.PositionSeconds
						nextPercent = np.ProgressPercent
					}
					return domain.ResumeState{
						CurrentEpisodeID:     nextEp.ID,
						CurrentEpisodeNumber: nextEp.EpisodeNumber,
						CurrentEpisodeTitle:  nextEp.Title,
						LastPositionSeconds:  nextPos,
						ProgressPercent:      nextPercent,
						FormattedPosition:    FormatTime(nextPos),
					}
				}

				// Nếu đã hoàn thành tập cuối cùng, giữ ở tập cuối
				return domain.ResumeState{
					CurrentEpisodeID:     ep.ID,
					CurrentEpisodeNumber: ep.EpisodeNumber,
					CurrentEpisodeTitle:  ep.Title,
					LastPositionSeconds:  latestProg.PositionSeconds,
					ProgressPercent:      latestProg.ProgressPercent,
					FormattedPosition:    FormatTime(latestProg.PositionSeconds),
				}
			}
		}
	}

	// 2. Fallback: Tìm tập đầu tiên chưa hoàn thành có tiến trình > 0
	for _, ep := range episodes {
		if p, found := progressMap[ep.ID]; found {
			if !p.Completed && p.PositionSeconds > 0 {
				return domain.ResumeState{
					CurrentEpisodeID:     ep.ID,
					CurrentEpisodeNumber: ep.EpisodeNumber,
					CurrentEpisodeTitle:  ep.Title,
					LastPositionSeconds:  p.PositionSeconds,
					ProgressPercent:      p.ProgressPercent,
					FormattedPosition:    FormatTime(p.PositionSeconds),
				}
			}
		}
	}

	// 3. Nếu tất cả các tập đã nghe đều hoàn thành, tìm tập kế tiếp chưa nghe
	for _, ep := range episodes {
		if _, found := progressMap[ep.ID]; !found {
			return domain.ResumeState{
				CurrentEpisodeID:     ep.ID,
				CurrentEpisodeNumber: ep.EpisodeNumber,
				CurrentEpisodeTitle:  ep.Title,
				LastPositionSeconds:  0,
				ProgressPercent:      0.0,
				FormattedPosition:    "00:00",
			}
		}
	}

	// 4. Nếu đã nghe hết toàn bộ các tập, quay lại tập 1
	firstEp := episodes[0]
	firstProgress, exists := progressMap[firstEp.ID]
	lastPos := 0
	percent := 0.0
	if exists {
		lastPos = firstProgress.PositionSeconds
		percent = firstProgress.ProgressPercent
	}

	return domain.ResumeState{
		CurrentEpisodeID:     firstEp.ID,
		CurrentEpisodeNumber: firstEp.EpisodeNumber,
		CurrentEpisodeTitle:  firstEp.Title,
		LastPositionSeconds:  lastPos,
		ProgressPercent:      percent,
		FormattedPosition:    FormatTime(lastPos),
	}
}
