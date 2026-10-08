import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.docx_builder import (
    create_document_base, add_title, add_heading_1, add_heading_2, 
    add_heading_3, add_callout, add_code_block, add_table_data
)

def build_16():
    doc = create_document_base("16_Nginx_Architecture")
    add_title(doc, "16. NGINX ARCHITECTURE & CONFIGURATION", "Đặc Tả Reverse Proxy, SSL Termination, Rate Limiting & Offloading")
    
    add_heading_1(doc, "1. Vai Trò Của Nginx Trong Kiến Trúc Server Yếu")
    doc.add_paragraph(
        "Nginx đóng vai trò là 'tấm khiên' bảo vệ tuyến đầu và động cơ tối ưu hiệu năng cho hệ thống backend: "
        "tiếp nhận kết nối HTTPS từ internet, chấm dứt mã hóa SSL, xử lý nén phản hồi, áp dụng rate limiting nghiêm ngặt "
        "và phục vụ tệp media tĩnh trực tiếp từ đĩa cứng bằng cơ chế zero-copy sendfile của Linux kernel."
    )
    
    add_heading_1(doc, "2. File Cấu Hình Nginx Hoàn Chỉnh Chuẩn Production")
    add_code_block(doc,
"""# /etc/nginx/conf.d/audio_backend.conf

# Định nghĩa Rate Limiting Zones (tiết kiệm RAM: 10MB lưu được 160,000 IP)
limit_req_zone $binary_remote_addr zone=api_general:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL Certbot Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Giới hạn kích thước upload và kết nối
    client_max_body_size 50M;
    limit_conn conn_limit 20;

    # Bảo mật Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Phục vụ Static Artwork & Thumbnails có Cache
    location /static/covers/ {
        alias /data/audio/covers/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # Nội bộ Streaming Audio qua X-Accel-Redirect (Bảo mật tối cao)
    location /internal_media/ {
        internal;
        alias /data/audio/processed/;
        mp4_buffer_size 1m;
        mp4_max_buffer_size 5m;
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
    }

    # Rate limiting đặc biệt cho Auth endpoint
    location /api/v1/auth/login {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include proxy_params;
    }

    # Proxy mặc định sang Go Backend API
    location / {
        limit_req zone=api_general burst=40 nodelay;
        proxy_pass http://127.0.0.1:8080;
        include proxy_params;
    }
}"""
    )

    doc.save("docs/16_Nginx_Architecture.docx")
    print("Saved docs/16_Nginx_Architecture.docx")

def build_17():
    doc = create_document_base("17_Server_Deployment")
    add_title(doc, "17. SERVER DEPLOYMENT SPECIFICATION", "Quy Trình Triển Khai Hạ Tầng Native Binary, Systemd & Nginx")
    
    add_heading_1(doc, "1. So Sánh Kiến Trúc Triển Khai: Native Binary vs Docker")
    headers = ["Chỉ số đánh giá", "Mô hình Docker / Container", "Mô hình Native Binary + Systemd (KHUYẾN NGHỊ)"]
    data = [
        ["Tiêu tốn RAM tĩnh", "Cao: Docker daemon, containerd tiêu tốn 100MB - 180MB RAM", "Cực thấp: 0MB daemon overhead, Go binary chạy trực tiếp trên OS"],
        ["Độ trễ I/O tệp", "Có overhead qua overlayfs/storage driver của container", "Zero overhead: Ghi trực tiếp xuống file system ext4/xfs"],
        ["Cấu hình quản lý", "Cần học Docker Compose, network bridge, volume mapping", "Đơn giản: Quản lý tiêu chuẩn qua systemctl, journalctl"],
        ["Độ phù hợp VPS 1GB RAM", "Kém: Rất dễ bị OOM tiêu diệt container", "Lý tưởng nhất: Tận dụng trọn vẹn 100% tài nguyên vật lý"]
    ]
    add_table_data(doc, headers, data, [2.0, 2.5, 2.5])

    add_heading_1(doc, "2. Cấu Hình Systemd Service Đơn Nhiệm Cho Go Backend")
    add_code_block(doc,
"""# /etc/systemd/system/audio-backend.service
[Unit]
Description=Audio Web Platform - Go Backend API
After=network.target mysql.service

[Service]
Type=simple
User=audioweb
Group=audioweb
WorkingDirectory=/var/www/audio-backend
ExecStart=/var/www/audio-backend/bin/server
Restart=always
RestartSec=5s

# Bảo vệ tài nguyên, chống OOM lan sang toàn bộ hệ thống
MemoryMax=150M
TasksMax=100
LimitNOFILE=65535

# Tách biệt bảo mật
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true
EnvironmentFile=/var/www/audio-backend/.env

# Ghi nhật ký
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target"""
    )

    doc.save("docs/17_Server_Deployment.docx")
    print("Saved docs/17_Server_Deployment.docx")

def build_18():
    doc = create_document_base("18_Low_Resource_Server_Optimization")
    add_title(doc, "18. LOW-RESOURCE SERVER OPTIMIZATION", "Chiến Lược Tối Ưu Hóa CPU, RAM, Disk & Network Cho Budget VPS")
    
    add_heading_1(doc, "1. Bảng Phân Bổ Ngân Sách Bộ Nhớ RAM (RAM Budget Allocation)")
    add_callout(doc,
        "Kế hoạch phân bổ bộ nhớ cho máy chủ thực tế 1GB RAM (1024MB RAM vật lý + 1GB Swap ZRAM):",
        "[ESTIMATE]"
    )
    headers = ["Thành phần tiến trình", "Ngân sách RAM cấp phát", "Tỷ lệ %", "Kỹ thuật kiểm soát & khống chế"]
    data = [
        ["Hệ điều hành Linux (Kernel + OS)", "120 MB", "12%", "Tắt dịch vụ thừa (snapd, bluetooth, modemmanager)"],
        ["MySQL 8.x Database", "320 MB", "31%", "innodb_buffer_pool_size=256M, max_connections=50"],
        ["Golang Backend API", "50 MB", "5%", "Go GOMEMLIMIT=45MiB, GOGC=80"],
        ["Nginx Reverse Proxy", "25 MB", "2.5%", "worker_processes 1, keepalive_timeout 30s"],
        ["FFmpeg Worker (Khi chạy)", "150 MB", "15%", "threads 1, giới hạn bitrate & buffer"],
        ["OS Page Cache & Buffer", "359 MB", "34.5%", "Bộ nhớ đệm Linux kernel tối ưu đọc ghi đĩa"],
        ["TỔNG CỘNG HỆ THỐNG", "1,024 MB", "100%", "Đảm bảo không bao giờ chạm ngưỡng kích hoạt OOM Killer"]
    ]
    add_table_data(doc, headers, data, [1.8, 1.4, 1.0, 2.8])

    add_heading_1(doc, "2. Thiết Lập Linux Kernel & Swap File An Toàn")
    doc.add_paragraph("Kích hoạt 1GB Swap file và điều chỉnh tham số swappiness giúp hệ thống không bị crash đột ngột khi tải tăng đột biến:")
    add_code_block(doc,
"""# Thiết lập swappiness thấp để ưu tiên RAM thực, chỉ swap khi thực sự cần
sysctl -w vm.swappiness=10
sysctl -w vm.vfs_cache_pressure=50

# Lưu cố định vào /etc/sysctl.conf:
vm.swappiness = 10
vm.vfs_cache_pressure = 50
net.core.somaxconn = 1024"""
    )

    doc.save("docs/18_Low_Resource_Server_Optimization.docx")
    print("Saved docs/18_Low_Resource_Server_Optimization.docx")

def build_19():
    doc = create_document_base("19_Backup_and_Recovery")
    add_title(doc, "19. BACKUP & DISASTER RECOVERY", "Chiến Lược Sao Lưu Dự Phòng Ngoại Vi & Khôi Phục Thảm Họa (DRP)")
    
    add_heading_1(doc, "1. Nguyên Tắc Sao Lưu Cốt Lõi: Quy Tắc 3-2-1")
    doc.add_paragraph("• 3 Bản sao dữ liệu: 1 bản chạy trên server chính, 2 bản backup dự phòng.")
    doc.add_paragraph("• 2 Loại phương tiện lưu trữ: Đĩa cứng máy chủ cục bộ và Object Storage trên đám mây.")
    doc.add_paragraph("• 1 Bản sao lưu ngoại vi (Off-site): Bắt buộc đồng bộ ra dịch vụ Cloudflare R2 / AWS S3 / Backblaze B2.")
    add_callout(doc,
        "CẢNH BÁO BẮT BUỘC: Sao lưu không đơn thuần là copy dữ liệu sang một thư mục khác trên cùng một ổ cứng vật lý! "
        "Nếu ổ đĩa VPS hỏng hoặc nhà cung cấp máy chủ gặp sự cố, toàn bộ dữ liệu sẽ biến mất vĩnh viễn.",
        "[WARNING]"
    )

    add_heading_1(doc, "2. Kịch Bản Tự Động Hóa Sao Lưu Hàng Ngày (Crontab Script)")
    add_code_block(doc,
"""#!/usr/bin/env bash
# /usr/local/bin/backup_audio.sh
set -euo pipefail

BACKUP_DIR="/var/backups/audio"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 1. Dump MySQL Database và nén gzip tức thì
mysqldump --single-transaction --quick -u root audio_db | gzip -9 > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# 2. Đồng bộ tệp MP3 và cover sang Cloud Storage rẻ (R2 / S3) qua rclone
rclone sync /data/audio/ remote_r2:audio-backup-bucket/data/ --fast-list

# 3. Đẩy file dump DB lên cloud
rclone copy "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" remote_r2:audio-backup-bucket/db/

# 4. Giữ lại bản sao lưu cục bộ tối đa 7 ngày
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete"""
    )

    doc.save("docs/19_Backup_and_Recovery.docx")
    print("Saved docs/19_Backup_and_Recovery.docx")

def build_20():
    doc = create_document_base("20_Performance_and_Scaling")
    add_title(doc, "20. PERFORMANCE TARGETS & CAPACITY PLANNING", "Đặc Tả Mục Tiêu Hiệu Năng & Ước Tính Dung Lượng Người Dùng")
    
    add_heading_1(doc, "1. Mô Hình Ước Tính Tải Và Băng Thông (Capacity Estimation)")
    headers = ["Số lượng người nghe đồng thời", "Băng thông yêu cầu (MP3 192k)", "Số lượng kết nối Nginx", "Tải CPU ước tính", "Đánh giá mức độ khả thi"]
    data = [
        ["10 Concurrent Users", "1.92 Mbps [ESTIMATE]", "10 - 15 connections", "2% - 5% [ESTIMATE]", "Rất nhẹ nhàng, hoàn hảo cho VPS $3 - $5"],
        ["50 Concurrent Users", "9.60 Mbps [ESTIMATE]", "50 - 70 connections", "8% - 15% [ESTIMATE]", "Hoạt động mượt mà, RAM ổn định"],
        ["100 Concurrent Users", "19.2 Mbps [ESTIMATE]", "100 - 140 connections", "15% - 25% [ESTIMATE]", "Hoạt động tốt với Nginx sendfile, card mạng 100Mbps"],
        ["500 Concurrent Users", "96.0 Mbps [ESTIMATE]", "500 - 700 connections", "40% - 60% [ESTIMATE]", "Chạm trần băng thông port 100Mbps của budget VPS"],
        ["1,000 Concurrent Users", "192.0 Mbps [ESTIMATE]", "1000 - 1500 connections", "70% - 85% [ESTIMATE]", "Vượt giới hạn network VPS nhỏ; Cần bật Cloudflare CDN Cache cho audio"]
    ]
    add_table_data(doc, headers, data, [1.6, 1.5, 1.4, 1.2, 1.8])

    add_heading_1(doc, "2. Lộ Trình Mở Rộng Tiếp Theo (Post-MVP Scaling Path)")
    doc.add_paragraph("Khi lượng truy cập vượt quá 500 người nghe đồng thời, lộ trình mở rộng không yêu cầu viết lại toàn bộ mã nguồn:")
    doc.add_paragraph("• Bước 1: Di chuyển toàn bộ tệp MP3 tĩnh sang Cloudflare R2 kết hợp Cloudflare CDN Caching (Miễn phí 100% phí egress bandwidth).")
    doc.add_paragraph("• Bước 2: Tách biệt MySQL Database sang máy chủ chuyên dụng Managed DB nếu truy vấn đọc ghi metadata tăng cao.")
    doc.add_paragraph("• Bước 3: Nhân bản Go Backend API chạy song song phía sau Nginx Load Balancer.")

    doc.save("docs/20_Performance_and_Scaling.docx")
    print("Saved docs/20_Performance_and_Scaling.docx")

if __name__ == "__main__":
    build_16()
    build_17()
    build_18()
    build_19()
    build_20()
