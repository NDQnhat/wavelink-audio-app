package audio

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"audio-app-backend/internal/modules/episode"
)

type Repository struct {
	db          *sql.DB
	episodeRepo *episode.Repository
}

func NewRepository(db *sql.DB, episodeRepo *episode.Repository) *Repository {
	return &Repository{
		db:          db,
		episodeRepo: episodeRepo,
	}
}

func formatDurationHours(secs int) string {
	h := secs / 3600
	m := (secs % 3600) / 60
	if h > 0 {
		return fmt.Sprintf("%dh %02dm", h, m)
	}
	return fmt.Sprintf("%02dm", m)
}

func (r *Repository) GetByID(ctx context.Context, id int64, userID int64) (*Audio, error) {
	query := `
		SELECT v.id, v.youtube_video_id, v.youtube_url, v.title, COALESCE(v.description, ''),
		       COALESCE(v.author_name, 'YouTube Creator'), COALESCE(v.channel_id, 'Official Channel'),
		       COALESCE(v.thumbnail_url, ''), v.duration_seconds, COALESCE(v.category_id, 0),
		       COALESCE(c.name, 'Chung'), COALESCE(v.status, 'ACTIVE'), v.created_at, v.updated_at,
		       (SELECT COUNT(*) FROM episodes WHERE audio_id = v.id) AS total_episodes,
		       (SELECT COUNT(*) FROM favorites WHERE user_id = ? AND audio_id = v.id) AS is_fav
		FROM youtube_videos v
		LEFT JOIN categories c ON c.id = v.category_id
		WHERE v.id = ?
	`
	var a Audio
	var favCount int
	err := r.db.QueryRowContext(ctx, query, userID, id).Scan(
		&a.ID, &a.YoutubeVideoID, &a.YoutubeURL, &a.Title, &a.Description,
		&a.Author, &a.Channel, &a.ThumbnailURL, &a.TotalDurationSeconds,
		&a.CategoryID, &a.CategoryName, &a.Status, &a.CreatedAt, &a.UpdatedAt,
		&a.TotalEpisodes, &favCount,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get audio: %w", err)
	}
	a.IsFavorite = favCount > 0
	a.FormattedDuration = formatDurationHours(a.TotalDurationSeconds)

	// Fetch tags
	a.Tags, _ = r.getAudioTags(ctx, a.ID)

	// Fetch progress
	r.populateProgress(ctx, &a, userID)

	// Fetch episodes
	if r.episodeRepo != nil {
		eps, err := r.episodeRepo.GetByAudioID(ctx, a.ID, userID)
		if err == nil {
			a.Episodes = eps
			if len(eps) > 0 && a.CurrentEpisodeNumber == 0 {
				a.CurrentEpisodeNumber = eps[0].EpisodeNumber
				a.CurrentEpisodeTitle = eps[0].Title
			}
		}
	}

	return &a, nil
}

func (r *Repository) GetByVideoID(ctx context.Context, videoID string, userID int64) (*Audio, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, "SELECT id FROM youtube_videos WHERE youtube_video_id = ?", videoID).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id, userID)
}

func (r *Repository) List(ctx context.Context, filter FilterParams, userID int64) ([]Audio, int, error) {
	baseQuery := `
		FROM youtube_videos v
		LEFT JOIN categories c ON c.id = v.category_id
		WHERE 1=1
	`
	var args []interface{}

	if filter.Search != "" {
		s := "%" + strings.ToLower(filter.Search) + "%"
		baseQuery += ` AND (LOWER(v.title) LIKE ? OR LOWER(v.author_name) LIKE ? OR v.youtube_video_id LIKE ?)`
		args = append(args, s, s, s)
	}

	if filter.CategoryID > 0 {
		baseQuery += ` AND v.category_id = ?`
		args = append(args, filter.CategoryID)
	}

	if filter.Tag != "" {
		baseQuery += ` AND v.id IN (SELECT at.audio_id FROM audio_tags at JOIN tags t ON t.id = at.tag_id WHERE t.slug = ? OR t.name = ?)`
		args = append(args, filter.Tag, filter.Tag)
	}

	if filter.Status == "favorite" {
		baseQuery += ` AND v.id IN (SELECT audio_id FROM favorites WHERE user_id = ?)`
		args = append(args, userID)
	}

	// Count total
	countQuery := "SELECT COUNT(DISTINCT v.id) " + baseQuery
	var totalItems int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, err
	}

	// Pagination
	limit := filter.PageSize
	if limit <= 0 {
		limit = 20
	}
	offset := (filter.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}

	selectQuery := fmt.Sprintf(`
		SELECT v.id, v.youtube_video_id, v.youtube_url, v.title, COALESCE(v.description, ''),
		       COALESCE(v.author_name, 'YouTube Creator'), COALESCE(v.channel_id, 'Official Channel'),
		       COALESCE(v.thumbnail_url, ''), v.duration_seconds, COALESCE(v.category_id, 0),
		       COALESCE(c.name, 'Chung'), COALESCE(v.status, 'ACTIVE'), v.created_at, v.updated_at,
		       (SELECT COUNT(*) FROM episodes WHERE audio_id = v.id) AS total_episodes,
		       (SELECT COUNT(*) FROM favorites WHERE user_id = %d AND audio_id = v.id) AS is_fav
		%s
		ORDER BY v.id DESC
		LIMIT %d OFFSET %d
	`, userID, baseQuery, limit, offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list audios: %w", err)
	}
	defer rows.Close()

	var list []Audio
	for rows.Next() {
		var a Audio
		var favCount int
		if err := rows.Scan(
			&a.ID, &a.YoutubeVideoID, &a.YoutubeURL, &a.Title, &a.Description,
			&a.Author, &a.Channel, &a.ThumbnailURL, &a.TotalDurationSeconds,
			&a.CategoryID, &a.CategoryName, &a.Status, &a.CreatedAt, &a.UpdatedAt,
			&a.TotalEpisodes, &favCount,
		); err != nil {
			return nil, 0, err
		}
		a.IsFavorite = favCount > 0
		a.FormattedDuration = formatDurationHours(a.TotalDurationSeconds)
		a.Tags, _ = r.getAudioTags(ctx, a.ID)
		r.populateProgress(ctx, &a, userID)

		if filter.Status == "listening" && (a.ProgressPercent == 0 || a.ProgressPercent >= 100) {
			continue
		}
		if filter.Status == "completed" && a.ProgressPercent < 100 {
			continue
		}

		list = append(list, a)
	}

	if list == nil {
		list = []Audio{}
	}

	return list, totalItems, nil
}

func (r *Repository) Create(ctx context.Context, a *Audio, tagNames []string) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx,
		`INSERT INTO youtube_videos (youtube_video_id, youtube_url, title, description, author_name, channel_id, thumbnail_url, duration_seconds, category_id, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.YoutubeVideoID, a.YoutubeURL, a.Title, a.Description, a.Author, a.Channel, a.ThumbnailURL, a.TotalDurationSeconds, a.CategoryID, "ACTIVE",
	)
	if err != nil {
		return 0, fmt.Errorf("failed to insert video: %w", err)
	}

	audioID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	// Link tags
	for _, tName := range tagNames {
		tName = strings.TrimSpace(tName)
		if tName == "" {
			continue
		}
		var tagID int64
		err := tx.QueryRowContext(ctx, "SELECT id FROM tags WHERE name = ?", tName).Scan(&tagID)
		if err == sql.ErrNoRows {
			slug := strings.ToLower(strings.ReplaceAll(tName, " ", "-"))
			tRes, err := tx.ExecContext(ctx, "INSERT INTO tags (name, slug) VALUES (?, ?)", tName, slug)
			if err == nil {
				tagID, _ = tRes.LastInsertId()
			}
		}
		if tagID > 0 {
			_, _ = tx.ExecContext(ctx, "INSERT INTO audio_tags (audio_id, tag_id) VALUES (?, ?)", audioID, tagID)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return audioID, nil
}

func (r *Repository) Update(ctx context.Context, id int64, req UpdateAudioRequest) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "ACTIVE"
	}

	if req.DurationSeconds > 0 {
		_, err = tx.ExecContext(ctx,
			`UPDATE youtube_videos SET title = ?, description = ?, author_name = ?, category_id = ?, status = ?, duration_seconds = ? WHERE id = ?`,
			req.Title, req.Description, req.Author, req.CategoryID, status, req.DurationSeconds, id,
		)
	} else {
		_, err = tx.ExecContext(ctx,
			`UPDATE youtube_videos SET title = ?, description = ?, author_name = ?, category_id = ?, status = ? WHERE id = ?`,
			req.Title, req.Description, req.Author, req.CategoryID, status, id,
		)
	}
	if err != nil {
		return err
	}

	if len(req.Tags) > 0 {
		_, _ = tx.ExecContext(ctx, "DELETE FROM audio_tags WHERE audio_id = ?", id)
		for _, tName := range req.Tags {
			tName = strings.TrimSpace(tName)
			if tName == "" {
				continue
			}
			var tagID int64
			err := tx.QueryRowContext(ctx, "SELECT id FROM tags WHERE name = ?", tName).Scan(&tagID)
			if err == sql.ErrNoRows {
				slug := strings.ToLower(strings.ReplaceAll(tName, " ", "-"))
				tRes, err := tx.ExecContext(ctx, "INSERT INTO tags (name, slug) VALUES (?, ?)", tName, slug)
				if err == nil {
					tagID, _ = tRes.LastInsertId()
				}
			}
			if tagID > 0 {
				_, _ = tx.ExecContext(ctx, "INSERT INTO audio_tags (audio_id, tag_id) VALUES (?, ?)", id, tagID)
			}
		}
	}

	return tx.Commit()
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM youtube_videos WHERE id = ?", id)
	return err
}

func (r *Repository) UpdateMetadata(ctx context.Context, id int64, title, author, thumbnail string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE youtube_videos SET title = ?, author_name = ?, thumbnail_url = ? WHERE id = ?",
		title, author, thumbnail, id,
	)
	return err
}

func (r *Repository) getAudioTags(ctx context.Context, audioID int64) ([]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT t.name FROM tags t JOIN audio_tags at ON at.tag_id = t.id WHERE at.audio_id = ?`,
		audioID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			tags = append(tags, name)
		}
	}
	return tags, nil
}

func (r *Repository) populateProgress(ctx context.Context, a *Audio, userID int64) {
	query := `
		SELECT lp.position_seconds, lp.progress_percent, e.episode_number, e.title
		FROM listening_progress lp
		JOIN episodes e ON e.id = lp.episode_id
		WHERE lp.user_id = ? AND lp.audio_id = ?
		ORDER BY lp.updated_at DESC
		LIMIT 1
	`
	var pos int
	var percent float64
	var epNum int
	var epTitle string

	err := r.db.QueryRowContext(ctx, query, userID, a.ID).Scan(&pos, &percent, &epNum, &epTitle)
	if err == nil {
		a.LastPositionSeconds = pos
		a.FormattedPosition = episode.FormatTime(pos)
		a.ProgressPercent = int(percent)
		a.CurrentEpisodeNumber = epNum
		a.CurrentEpisodeTitle = epTitle
	} else {
		a.LastPositionSeconds = 0
		a.FormattedPosition = "00:00:00"
		a.ProgressPercent = 0
		a.CurrentEpisodeNumber = 1
		a.CurrentEpisodeTitle = "Tập 1"
	}
}
