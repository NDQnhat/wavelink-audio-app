# 04. TRIỂN KHAI, BẢO MẬT & VẬN HÀNH
### Hướng Dẫn Cấu Hình Nginx, Systemd, Backup R2 & Lộ Trình Triển Khai MVP

---

## 1. File Cấu Hình Nginx Hoàn Chỉnh Chuẩn Production

```nginx
# /etc/nginx/conf.d/audio_library.conf

limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=import_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=progress_limit:10m rate=60r/m;

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Bảo mật Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limit cho Import endpoint
    location /api/v1/audios/import-youtube {
        limit_req zone=import_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include proxy_params;
    }

    # Proxy mặc định sang Go Backend API
    location / {
        limit_req zone=api_general burst=50 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include proxy_params;
    }
}
```

---

## 2. Cấu Hình Systemd Service Quản Lý Go Backend

```ini
# /etc/systemd/system/audio-backend.service
[Unit]
Description=YouTube Audio Library - Go Backend API
After=network.target mysql.service

[Service]
Type=simple
User=audioweb
Group=audioweb
WorkingDirectory=/var/www/audio-backend
ExecStart=/var/www/audio-backend/bin/server
Restart=always
RestartSec=5s

# Khống chế tài nguyên bảo vệ VPS 1GB RAM
MemoryMax=150M
TasksMax=100
LimitNOFILE=65535

EnvironmentFile=/var/www/audio-backend/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

---

## 3. Kịch Bản Tự Động Sao Lưu Hàng Ngày Ra Cloudflare R2

```bash
#!/usr/bin/env bash
# /usr/local/bin/backup_library.sh
set -euo pipefail

BACKUP_DIR="/var/backups/audio_library"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 1. Dump MySQL Database và nén gzip (hoặc copy file .db nếu dùng SQLite)
mysqldump --single-transaction --quick -u root audio_library_db | gzip -9 > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# 2. Đẩy bản sao lưu ngoại vi lên Cloudflare R2 qua rclone
rclone copy "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" remote_r2:audio-backup-bucket/daily_db/

# 3. Giữ lại bản sao lưu cục bộ tối đa 7 ngày
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
```

---

## 4. Tài Liệu Mở Rộng: Đánh Giá CI/CD, Tối Ưu Hóa Docker & 3 Môi Trường Triển Khai

Xem chi tiết báo cáo kỹ thuật và hướng dẫn cấu hình chuyên sâu tại:
👉 **[05_DANH_GIA_CI_CD_DOCKER_VA_3_MOI_TRUONG.md](./05_DANH_GIA_CI_CD_DOCKER_VA_3_MOI_TRUONG.md)**
- Đánh giá kiến trúc GitHub Actions CI/CD và phát hành image lên GitHub Container Registry (`ghcr.io`).
- Phân tích tối ưu hóa tài nguyên cho VPS nhỏ 1GB RAM (MySQL Low-Memory, Swapfile 2GB).
- Hướng dẫn cấu hình biến môi trường chi tiết cho 3 môi trường: Dev, Cloud (Vercel/Render/Aiven), và Tự host (Vercel/Ubuntu VPS 2 Containers).

