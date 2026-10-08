// API Client: Kết nối hoàn chỉnh với Golang Backend (/api/v1) & LocalStorage Fallback

const API_BASE = (window.location.port === '8080' || window.location.origin.includes('8080')) 
  ? '/api/v1' 
  : 'http://localhost:8080/api/v1';

export const api = {
  db: null,
  isLive: false,

  async init() {
    // 1. Kiểm tra kết nối tới Go Backend API
    try {
      const ping = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (ping.ok) {
        this.isLive = true;
        console.log("🚀 Kết nối thành công tới Golang Backend API:", API_BASE);
      }
    } catch (e) {
      console.warn("⚠️ Không kết nối được Go Backend API, chuyển sang chế độ Local Fallback:", e);
      this.isLive = false;
    }

    // 2. Nạp dữ liệu fallback cục bộ
    try {
      const cached = localStorage.getItem('audio_library_db');
      if (cached) {
        this.db = JSON.parse(cached);
      } else {
        const res = await fetch('./data/db.json');
        this.db = await res.json();
        this.save();
      }
    } catch (e) {
      console.warn('Load db.json error, using fallback state:', e);
      this.db = { systemStats: {}, categories: [], tags: [], audios: [], recentHistory: [] };
    }

    // 3. Tự động đồng bộ Offline Queue khi có mạng
    window.addEventListener('online', () => {
      this.syncOfflineQueue();
    });
    if (navigator.onLine) {
      this.syncOfflineQueue();
    }
  },

  save() {
    if (this.db) {
      localStorage.setItem('audio_library_db', JSON.stringify(this.db));
    }
  },

  getToken() {
    return localStorage.getItem('auth_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async login(username, password) {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();
      if (json.success) {
        this.setToken(json.data.token);
        this.user = json.data.user;
        return json.data;
      }
      throw new Error(json.error?.message || 'Đăng nhập thất bại');
    }
    throw new Error('Chỉ hỗ trợ khi có mạng');
  },

  async register(username, password) {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, email: '', password })
      });
      const json = await res.json();
      if (json.success) {
        this.setToken(json.data.token);
        this.user = json.data.user;
        return json.data;
      }
      throw new Error(json.error?.message || 'Đăng ký thất bại');
    }
    throw new Error('Chỉ hỗ trợ khi có mạng');
  },

  async getMe() {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) {
          this.user = json.data;
          return json.data;
        }
      } catch (e) {
        console.warn('getMe failed:', e);
      }
    }
    return null;
  },

  async logout() {
    this.setToken(null);
    this.user = null;
    if (this.isLive) {
      try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: this.getHeaders() });
      } catch (e) {}
    }
  },

  async guestLogin() {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/auth/guest`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        this.setToken(json.data.token);
        this.user = json.data.user;
        return json.data;
      }
      throw new Error('Lỗi đăng nhập khách');
    }
    return null;
  },

  // --- USER PROFILE & ADMIN ---
  async updateProfile(username, email) {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, email })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update");
      await this.getMe(); // reload user
      return true;
    }
    return false;
  },

  async updatePassword(oldPassword, newPassword) {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/users/me/password`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update");
      return true;
    }
    return false;
  },

  async getUsers() {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/users`, { headers: this.getHeaders() });
      const json = await res.json();
      if (json.success) return json.data;
    }
    return [];
  },

  async updateUserRole(id, role, membership) {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ role, membership })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update");
      return true;
    }
    return false;
  },

  async deleteUser(id) {
    if (this.isLive) {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: this.getHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to delete");
      return true;
    }
    return false;
  },

  // --- STATS ---
  async getStats() {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/stats`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getStats live API failed, fallback to local', e);
      }
    }
    // Tính toán từ local db
    const totalAudios = this.db.audios?.length || 0;
    const listeningCount = this.db.audios?.filter(a => a.progressPercent > 0 && a.progressPercent < 100).length || 0;
    const completedCount = this.db.audios?.filter(a => a.progressPercent >= 100).length || 0;
    let totalSecs = 0;
    let totalEpisodes = 0;
    this.db.audios?.forEach(a => {
      totalSecs += (a.lastPositionSeconds || 0);
      totalEpisodes += (a.totalEpisodes || a.episodes?.length || 1);
    });
    const totalHoursListened = Math.round(totalSecs / 3600);

    return {
      totalAudios,
      listeningCount,
      completedCount,
      totalHoursListened,
      totalEpisodes: totalEpisodes || 48
    };
  },

  // --- CATEGORIES ---
  async getCategories() {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/categories`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getCategories live API failed, fallback to local', e);
      }
    }
    return this.db.categories;
  },

  async createCategory(cat) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/categories`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(cat)
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('createCategory live API failed', e);
      }
    }
    const newCat = {
      id: Date.now(),
      name: cat.name,
      slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
      description: cat.description || '',
      count: 0
    };
    this.db.categories.push(newCat);
    this.save();
    return newCat;
  },

  async updateCategory(id, cat) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(cat)
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('updateCategory live API failed', e);
      }
    }
    const idx = this.db.categories.findIndex(c => c.id == id);
    if (idx !== -1) {
      this.db.categories[idx] = { ...this.db.categories[idx], ...cat };
      this.save();
      return this.db.categories[idx];
    }
    return null;
  },

  async deleteCategory(id) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE', headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('deleteCategory live API failed', e);
      }
    }
    this.db.categories = this.db.categories.filter(c => c.id != id);
    this.save();
    return true;
  },

  // --- TAGS ---
  async getTags() {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/tags`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getTags live API failed, fallback to local', e);
      }
    }
    return this.db.tags;
  },

  async createTag(tag) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/tags`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(tag)
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('createTag live API failed', e);
      }
    }
    const newTag = {
      id: Date.now(),
      name: tag.name,
      slug: tag.slug || tag.name.toLowerCase().replace(/\s+/g, '-'),
      count: 0
    };
    this.db.tags.push(newTag);
    this.save();
    return newTag;
  },

  async deleteTag(id) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/tags/${id}`, { method: 'DELETE', headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('deleteTag live API failed', e);
      }
    }
    this.db.tags = this.db.tags.filter(t => t.id != id);
    this.save();
    return true;
  },

  // --- AUDIOS ---
  async getAudios(filter = {}) {
    if (this.isLive) {
      try {
        const params = new URLSearchParams();
        if (filter.search) params.append('search', filter.search);
        if (filter.categoryId) params.append('categoryId', filter.categoryId);
        if (filter.status) params.append('status', filter.status);
        if (filter.tag) params.append('tag', filter.tag);

        const res = await fetch(`${API_BASE}/audios?${params.toString()}`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getAudios live API failed, fallback to local', e);
      }
    }

    let list = [...this.db.audios];
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.author.toLowerCase().includes(q) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q))) ||
        (a.youtubeVideoId && a.youtubeVideoId.toLowerCase().includes(q))
      );
    }
    if (filter.categoryId) {
      list = list.filter(a => a.categoryId == filter.categoryId);
    }
    if (filter.tag) {
      list = list.filter(a => a.tags && a.tags.includes(filter.tag));
    }
    if (filter.status === 'listening') {
      list = list.filter(a => a.progressPercent > 0 && a.progressPercent < 100);
    } else if (filter.status === 'completed') {
      list = list.filter(a => a.progressPercent >= 100);
    } else if (filter.status === 'favorite') {
      list = list.filter(a => a.isFavorite);
    }
    return list;
  },

  async getAudioById(id) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/${id}`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getAudioById live API failed, fallback to local', e);
      }
    }
    return this.db.audios.find(a => a.id == id);
  },

  async updateAudio(id, data) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('updateAudio live API failed', e);
      }
    }
    const audio = this.db.audios.find(a => a.id == id);
    if (audio) {
      Object.assign(audio, data);
      this.save();
      return audio;
    }
    return null;
  },

  async deleteAudio(id) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/${id}`, { method: 'DELETE', headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('deleteAudio live API failed', e);
      }
    }
    this.db.audios = this.db.audios.filter(a => a.id != id);
    this.save();
    return true;
  },

  async refreshAudio(id) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/${id}/refresh`, { method: 'POST', headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('refreshAudio live API failed', e);
      }
    }
    return this.getAudioById(id);
  },

  // --- EPISODES ---
  async getEpisodes(audioId) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/${audioId}/episodes`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getEpisodes live API failed', e);
      }
    }
    const audio = this.db.audios.find(a => a.id == audioId);
    return audio?.episodes || [];
  },

  async generateEpisodes(audioId, blockSizeSeconds = 14400, durationSeconds = 0) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/${audioId}/episodes/generate`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ blockSizeSeconds, durationSeconds })
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('generateEpisodes live API failed', e);
      }
    }
    // Local re-generate fallback
    const audio = this.db.audios.find(a => a.id == audioId);
    if (audio) {
      const total = durationSeconds > 0 ? durationSeconds : audio.totalDurationSeconds;
      const count = Math.ceil(total / blockSizeSeconds);
      const eps = [];
      for (let i = 0; i < count; i++) {
        const start = i * blockSizeSeconds;
        const end = Math.min((i + 1) * blockSizeSeconds, total);
        eps.push({
          id: Date.now() + i,
          audioId: audio.id,
          episodeNumber: i + 1,
          title: `Tập ${i + 1} (${this.formatTime(start)} - ${this.formatTime(end)})`,
          startSeconds: start,
          endSeconds: end,
          duration: end - start,
          completed: false,
          progressPercent: 0
        });
      }
      audio.episodes = eps;
      audio.totalEpisodes = eps.length;
      this.save();
      return eps;
    }
    return [];
  },

  async updateEpisode(id, data) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/episodes/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('updateEpisode live API failed', e);
      }
    }
    for (const a of this.db.audios) {
      const ep = a.episodes?.find(e => e.id == id);
      if (ep) {
        Object.assign(ep, data);
        ep.duration = ep.endSeconds - ep.startSeconds;
        this.save();
        return true;
      }
    }
    return false;
  },

  async deleteEpisode(id) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/episodes/${id}`, { method: 'DELETE', headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return true;
      } catch (e) {
        console.warn('deleteEpisode live API failed', e);
      }
    }
    for (const a of this.db.audios) {
      if (a.episodes) {
        a.episodes = a.episodes.filter(e => e.id != id);
        a.totalEpisodes = a.episodes.length;
        this.save();
        return true;
      }
    }
    return false;
  },

  async createEpisode(data) {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/episodes`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('createEpisode live API failed', e);
      }
    }
    const audio = this.db.audios.find(a => a.id == data.audioId);
    if (audio) {
      if (!audio.episodes) audio.episodes = [];
      const newEp = {
        id: Date.now(),
        ...data,
        duration: data.endSeconds - data.startSeconds,
        completed: false,
        progressPercent: 0
      };
      audio.episodes.push(newEp);
      audio.totalEpisodes = audio.episodes.length;
      this.save();
      return newEp;
    }
    return null;
  },

  // --- FAVORITE ---
  async toggleFavorite(audioId, isCurrentlyFavorite) {
    if (this.isLive) {
      try {
        const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
        const res = await fetch(`${API_BASE}/favorites/${audioId}`, { method: method, headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data.isFavorite;
      } catch (e) {
        console.warn('toggleFavorite live API failed', e);
      }
    }
    const audio = this.db.audios.find(a => a.id == audioId);
    if (audio) {
      audio.isFavorite = !audio.isFavorite;
      this.save();
      return audio.isFavorite;
    }
    return false;
  },

  // --- HISTORY ---
  async getRecentHistory() {
    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/history`, { headers: this.getHeaders() });
        const json = await res.json();
        if (json.success) return json.data;
      } catch (e) {
        console.warn('getRecentHistory live API failed', e);
      }
    }
    return this.db.recentHistory || [];
  },

  async recordHistory(audioId, episodeId, durationListened) {
    if (this.isLive) {
      try {
        await fetch(`${API_BASE}/history`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            audioId: parseInt(audioId),
            episodeId: parseInt(episodeId),
            durationListened: Math.round(durationListened)
          })
        });
      } catch (e) {
        console.warn('recordHistory live API failed', e);
      }
    }
  },

  // --- PROGRESS & OFFLINE QUEUE ---
  async updateProgress(audioId, episodeId, positionSeconds, percent) {
    const payload = {
      audioId: parseInt(audioId),
      episodeId: parseInt(episodeId),
      positionSeconds: Math.round(positionSeconds),
      progressPercent: parseFloat(percent),
      completed: percent >= 95
    };

    if (this.isLive && navigator.onLine) {
      try {
        await fetch(`${API_BASE}/progress`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('updateProgress live API failed, saving to offline queue', e);
        this.enqueueOfflineProgress(payload);
      }
    } else {
      this.enqueueOfflineProgress(payload);
    }

    // Luôn lưu cache cục bộ
    const audio = this.db.audios.find(a => a.id == audioId);
    if (audio) {
      audio.lastPositionSeconds = positionSeconds;
      audio.progressPercent = Math.min(100, Math.round(percent));
      audio.formattedPosition = this.formatTime(positionSeconds);
      const ep = audio.episodes?.find(e => e.id == episodeId);
      if (ep) {
        ep.progressPercent = Math.min(100, Math.round(percent));
        if (percent >= 95) ep.completed = true;
      }
      this.save();
    }
  },

  enqueueOfflineProgress(payload) {
    try {
      const q = JSON.parse(localStorage.getItem('offline_progress_queue') || '[]');
      // Update or add
      const idx = q.findIndex(item => item.audioId === payload.audioId && item.episodeId === payload.episodeId);
      if (idx !== -1) {
        q[idx] = payload;
      } else {
        q.push(payload);
      }
      localStorage.setItem('offline_progress_queue', JSON.stringify(q));
    } catch (e) {
      console.warn('enqueueOfflineProgress error:', e);
    }
  },

  async syncOfflineQueue() {
    try {
      const qStr = localStorage.getItem('offline_progress_queue');
      if (!qStr) return;
      const q = JSON.parse(qStr);
      if (!Array.isArray(q) || q.length === 0) return;

      console.log(`📡 Đang đồng bộ ${q.length} bản ghi tiến trình offline...`);
      for (const item of q) {
        await fetch(`${API_BASE}/progress`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(item)
        });
      }
      localStorage.removeItem('offline_progress_queue');
      console.log('✅ Đồng bộ tiến trình offline hoàn tất!');
    } catch (e) {
      console.warn('syncOfflineQueue failed, will retry later:', e);
    }
  },

  // --- YOUTUBE PREVIEW & IMPORT ---
  extractVideoId(url) {
    const ytRegex = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url?.trim().match(ytRegex);
    return match ? match[1] : null;
  },

  async previewYouTube(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) return null;

    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      if (res.ok) {
        const json = await res.json();
        return {
          videoId,
          title: json.title || `Audio YouTube - ${videoId}`,
          author: json.author_name || 'YouTube Creator',
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
      }
    } catch (e) {
      // Fallback
    }
    return {
      videoId,
      title: `Audio YouTube - ${videoId}`,
      author: 'YouTube Creator',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  },

  async importYouTube(url, categoryId, tags, blockSizeSeconds = 14400, customDuration = 0) {
    const videoId = this.extractVideoId(url);
    if (!videoId) throw new Error("URL YouTube không hợp lệ!");

    const duration = customDuration > 0 ? customDuration : 57600; // 16h mặc định nếu không truyền

    if (this.isLive) {
      try {
        const res = await fetch(`${API_BASE}/audios/import-youtube`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            url: url,
            categoryId: parseInt(categoryId),
            tags: tags || [],
            durationSeconds: duration
          })
        });
        const json = await res.json();
        if (json.success) {
          const imported = json.data.audio;
          if (imported) {
            // Nếu người dùng chọn blockSize khác 4h (14400), generate lại
            if (blockSizeSeconds !== 14400) {
              await this.generateEpisodes(imported.id, blockSizeSeconds, duration);
            }
            const exists = this.db.audios.find(a => a.id === imported.id);
            if (!exists) {
              this.db.audios.unshift(imported);
              this.save();
            }
          }
          return json.data;
        } else {
          throw new Error(json.error?.message || "Lỗi nhập URL YouTube");
        }
      } catch (e) {
        console.warn('importYouTube live API error, fallback to local:', e);
        if (e.message && !e.message.includes('fetch')) throw e;
      }
    }

    // Local Fallback
    const exists = this.db.audios.find(a => a.youtubeVideoId === videoId);
    if (exists) {
      return { duplicate: true, audio: exists };
    }

    const preview = await this.previewYouTube(url) || {
      title: "Audio mới nhập - " + videoId,
      author: "YouTube Creator",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };

    const cat = this.db.categories.find(c => c.id == categoryId) || { id: 1, name: "Tiên hiệp" };
    const numEpisodes = Math.ceil(duration / blockSizeSeconds);
    const episodes = [];
    for (let i = 0; i < numEpisodes; i++) {
      const start = i * blockSizeSeconds;
      const end = Math.min((i + 1) * blockSizeSeconds, duration);
      episodes.push({
        id: Date.now() + i,
        audioId: Date.now(),
        episodeNumber: i + 1,
        title: `Tập ${i + 1} (${this.formatTime(start)} - ${this.formatTime(end)})`,
        startSeconds: start,
        endSeconds: end,
        duration: end - start,
        completed: false,
        progressPercent: 0
      });
    }

    const newAudio = {
      id: Date.now(),
      youtubeVideoId: videoId,
      youtubeUrl: url,
      title: preview.title,
      author: preview.author,
      channel: preview.author,
      categoryId: cat.id,
      categoryName: cat.name,
      tags: tags.length ? tags : ["Audiobook", "Tu tiên"],
      thumbnailUrl: preview.thumbnailUrl,
      totalDurationSeconds: duration,
      formattedDuration: this.formatDuration(duration),
      totalEpisodes: episodes.length,
      status: "ACTIVE",
      currentEpisodeNumber: 1,
      currentEpisodeTitle: episodes[0]?.title || "Tập 1",
      lastPositionSeconds: 0,
      formattedPosition: "00:00:00",
      progressPercent: 0,
      isFavorite: false,
      episodes: episodes
    };

    this.db.audios.unshift(newAudio);
    if (this.db.systemStats.totalAudios) this.db.systemStats.totalAudios++;
    this.save();
    return { duplicate: false, audio: newAudio };
  },

  formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  },

  formatDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }
};
