package logic

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/samber/mo"
)

var (
	// Hỗ trợ watch?v=, youtu.be/, embed/, shorts/, live/, music.youtube.com
	ytRegex = regexp.MustCompile(`(?i)(?:https?://)?(?:www\.|m\.|music\.)?(?:youtube\.com/(?:watch\?.*v=|embed/|v/|shorts/|live/)|youtu\.be/)([a-zA-Z0-9_-]{11})`)
	// Khử độc ID chuẩn 11 ký tự Base64-safe
	ytIDExactRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{11}$`)

	// Regex suy luận thời lượng từ tiêu đề
	hourPattern = regexp.MustCompile(`(?i)(\d+)\s*(?:tiếng|giờ|h|hours|hour)`)
	minPattern  = regexp.MustCompile(`(?i)(\d+)\s*(?:phút|p|m|mins|minute|minutes)`)
	secPattern  = regexp.MustCompile(`(?i)(\d+)\s*(?:giây|giay|seconds|second|sec|s)`)

	approxDurationMsRegex = regexp.MustCompile(`(?i)"approxDurationMs"\s*:\s*"(\d+)"`)
	lengthSecondsRegex    = regexp.MustCompile(`(?i)"lengthSeconds"\s*:\s*"(\d+)"`)
	isoDurationRegex      = regexp.MustCompile(`(?i)PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?`)
)

// ExtractYouTubeVideoID tách ID 11 ký tự từ link YouTube một cách thuần khiết
func ExtractYouTubeVideoID(rawURL string) mo.Result[string] {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return mo.Err[string](errors.New("URL YouTube không được để trống"))
	}

	// Nếu người dùng nhập trực tiếp ID 11 ký tự
	if ytIDExactRegex.MatchString(trimmed) {
		return mo.Ok(trimmed)
	}

	matches := ytRegex.FindStringSubmatch(trimmed)
	if len(matches) < 2 || !ytIDExactRegex.MatchString(matches[1]) {
		return mo.Err[string](errors.New("định dạng URL YouTube không hợp lệ hoặc không trích xuất được Video ID"))
	}

	return mo.Ok(matches[1])
}

// InferDuration suy luận thời lượng video (giây) từ tiêu đề nếu oEmbed không trả về duration
func InferDuration(title string, fallbackSec int) int {
	var totalSec int
	hourMatch := hourPattern.FindStringSubmatch(title)
	if len(hourMatch) >= 2 {
		if h, err := strconv.Atoi(hourMatch[1]); err == nil && h > 0 {
			totalSec += h * 3600
		}
	}

	minMatch := minPattern.FindStringSubmatch(title)
	if len(minMatch) >= 2 {
		if m, err := strconv.Atoi(minMatch[1]); err == nil && m > 0 {
			totalSec += m * 60
		}
	}

	secMatch := secPattern.FindStringSubmatch(title)
	if len(secMatch) >= 2 {
		if s, err := strconv.Atoi(secMatch[1]); err == nil && s > 0 {
			totalSec += s
		}
	}

	if totalSec > 0 {
		return totalSec
	}
	return fallbackSec
}

// FormatDuration chuyển đổi số giây sang định dạng thân thiện "10h 16m 22s" hoặc "18h 30m" hoặc "45m"
func FormatDuration(secs int) string {
	if secs <= 0 {
		return "00m"
	}
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	if h > 0 {
		if s > 0 {
			return fmt.Sprintf("%dh %02dm %02ds", h, m, s)
		}
		return fmt.Sprintf("%dh %02dm", h, m)
	}
	if s > 0 {
		return fmt.Sprintf("%02dm %02ds", m, s)
	}
	return fmt.Sprintf("%02dm", m)
}

// FormatTime chuyển đổi số giây sang mm:ss hoặc hh:mm:ss cho mốc phát của tập
func FormatTime(secs int) string {
	return FormatTimeWithHourForce(secs, false)
}

// FormatTimeWithHourForce định dạng mốc thời gian, có thể ép hiển thị phần giờ HH:MM:SS
func FormatTimeWithHourForce(secs int, forceHour bool) string {
	if secs < 0 {
		secs = 0
	}
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	if h > 0 || forceHour {
		return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}

// ParseDurationString chuyển đổi chuỗi thời lượng bất kỳ sang số giây (ví dụ: "10h 16m 22s", "04:10:22", "15022")
func ParseDurationString(val string) int {
	str := strings.TrimSpace(val)
	if str == "" {
		return 0
	}

	// 1. Dạng HH:MM:SS hoặc MM:SS
	if strings.Contains(str, ":") {
		parts := strings.Split(str, ":")
		if len(parts) == 3 {
			h, e1 := strconv.Atoi(strings.TrimSpace(parts[0]))
			m, e2 := strconv.Atoi(strings.TrimSpace(parts[1]))
			s, e3 := strconv.Atoi(strings.TrimSpace(parts[2]))
			if e1 == nil && e2 == nil && e3 == nil {
				return h*3600 + m*60 + s
			}
		} else if len(parts) == 2 {
			m, e1 := strconv.Atoi(strings.TrimSpace(parts[0]))
			s, e2 := strconv.Atoi(strings.TrimSpace(parts[1]))
			if e1 == nil && e2 == nil {
				return m*60 + s
			}
		}
	}

	// 2. Dạng văn bản có đơn vị h/m/s hoặc tiếng/giờ/phút/giây
	var totalSec int
	hasMatch := false
	if m := hourPattern.FindStringSubmatch(str); len(m) >= 2 {
		if h, err := strconv.Atoi(m[1]); err == nil && h > 0 {
			totalSec += h * 3600
			hasMatch = true
		}
	}
	if m := minPattern.FindStringSubmatch(str); len(m) >= 2 {
		if min, err := strconv.Atoi(m[1]); err == nil && min > 0 {
			totalSec += min * 60
			hasMatch = true
		}
	}
	if m := secPattern.FindStringSubmatch(str); len(m) >= 2 {
		if s, err := strconv.Atoi(m[1]); err == nil && s > 0 {
			totalSec += s
			hasMatch = true
		}
	}

	if hasMatch && totalSec > 0 {
		return totalSec
	}

	// 3. Số nguyên thuần
	if sec, err := strconv.Atoi(str); err == nil && sec > 0 {
		return sec
	}

	return 0
}

// ParseISO8601Duration trích xuất số giây từ chuỗi định dạng ISO 8601 (ví dụ PT22H15M30S)
func ParseISO8601Duration(iso string) int {
	matches := isoDurationRegex.FindStringSubmatch(strings.TrimSpace(iso))
	if len(matches) < 4 {
		return 0
	}
	var total int
	if matches[1] != "" {
		if h, err := strconv.Atoi(matches[1]); err == nil {
			total += h * 3600
		}
	}
	if matches[2] != "" {
		if m, err := strconv.Atoi(matches[2]); err == nil {
			total += m * 60
		}
	}
	if matches[3] != "" {
		if s, err := strconv.Atoi(matches[3]); err == nil {
			total += s
		}
	}
	return total
}

// ExtractDurationFromHTML bóc tách thời lượng thực tế từ mã nguồn trang YouTube watch
func ExtractDurationFromHTML(html string) int {
	// 1. Thử bóc tách qua lengthSeconds
	if m := lengthSecondsRegex.FindStringSubmatch(html); len(m) >= 2 {
		if sec, err := strconv.Atoi(m[1]); err == nil && sec > 0 {
			return sec
		}
	}
	// 2. Thử bóc tách qua approxDurationMs
	if m := approxDurationMsRegex.FindStringSubmatch(html); len(m) >= 2 {
		if ms, err := strconv.ParseInt(m[1], 10, 64); err == nil && ms > 0 {
			return int(ms / 1000)
		}
	}
	// 3. Thử itemprop="duration" content="PT..."
	itempropRegex := regexp.MustCompile(`itemprop="duration"\s+content="([^"]+)"`)
	if m := itempropRegex.FindStringSubmatch(html); len(m) >= 2 {
		if sec := ParseISO8601Duration(m[1]); sec > 0 {
			return sec
		}
	}
	return 0
}
