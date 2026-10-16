#!/bin/bash
# ==============================================================================
# Script Tự Động Triển Khai WaveLink Cho Server Ubuntu (Tối Ưu Cho VPS 1GB - 2GB RAM)
# 
# Sử dụng 1 file docker-compose.yml duy nhất kết hợp file cấu hình env.vps:
#
# Chế độ chạy:
#   1. Mặc định (Khuyên dùng): 2 Containers (Backend API + MySQL) | Frontend trên Vercel
#      ./deploy/ubuntu-deploy.sh
#      (Chỉ khởi chạy backend & db, tiết kiệm 100% RAM frontend cho VPS)
#
#   2. Fullstack: 3 Containers (Frontend Nginx + Backend API + MySQL)
#      ./deploy/ubuntu-deploy.sh --mode=fullstack
# ==============================================================================

set -euo pipefail

MODE="${1:-vps-api}"
ENV_FILE="env.vps"
COMPOSE_FILE="docker-compose.yml"

if [[ "$MODE" == "--mode=fullstack" || "$MODE" == "fullstack" ]]; then
    PROFILE_FLAG="--profile fullstack"
    echo "⚙️  Chế độ triển khai: FULLSTACK (Frontend Nginx + Backend API + MySQL)"
else
    PROFILE_FLAG=""
    echo "⚙️  Chế độ triển khai: 2-CONTAINERS TỐI ƯU (Backend API + MySQL | Frontend trên Vercel)"
fi

echo "================================================================================"
echo " 🚀 BẮT ĐẦU TRIỂN KHAI WAVELINK PRODUCTION TRÊN UBUNTU SERVER"
echo "================================================================================"

# ------------------------------------------------------------------------------
# 1. TỰ ĐỘNG CẤU HÌNH SWAP 2GB CHO SERVER NHỎ (BẢO VỆ CHỐNG SẬP RAM / OOM KILLER)
# ------------------------------------------------------------------------------
TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 1024 ]; then
    echo "⚠️  Hệ thống phát hiện Swap hiện tại quá ít ($TOTAL_SWAP MB)."
    echo "🛡️  Đang tự động khởi tạo 2GB Swapfile để bảo vệ máy chủ nhỏ..."
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
        # Tối ưu swappiness cho Database Server (chỉ swap khi RAM thực sự cạn kiệt)
        sudo sysctl vm.swappiness=10
        echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null
        echo "✅ Đã kích hoạt thành công 2GB Swapfile an toàn!"
    fi
else
    echo "✅ Dung lượng Swap hiện tại: $TOTAL_SWAP MB (Đạt tiêu chuẩn an toàn)"
fi

# ------------------------------------------------------------------------------
# 2. KIỂM TRA VÀ CÀI ĐẶT DOCKER & DOCKER COMPOSE PLUGIN
# ------------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
    echo "📦 Đang cài đặt Docker Engine và Docker Compose Plugin..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "✅ Docker đã được cài đặt và khởi động thành công!"
fi

# ------------------------------------------------------------------------------
# 3. KIỂM TRA VÀ TỰ ĐỘNG KHỞI TẠO FILE env.vps
# ------------------------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
    if [ -f env.vps.example ]; then
        echo "⚠️  Chưa tìm thấy $ENV_FILE, tự động sao chép từ env.vps.example..."
        cp env.vps.example "$ENV_FILE"
        echo "❗ Vui lòng kiểm tra và thay đổi các mật khẩu bí mật (JWT_SECRET, MYSQL_ROOT_PASSWORD) trong $ENV_FILE!"
    elif [ -f .env.production ]; then
        echo "ℹ️  Tự động tái sử dụng cấu hình từ .env.production sang $ENV_FILE..."
        cp .env.production "$ENV_FILE"
    else
        echo "❌ Lỗi: Không tìm thấy $ENV_FILE hoặc env.vps.example"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 4. KÉO MÃ NGUỒN MỚI NHẤT TỪ GIT
# ------------------------------------------------------------------------------
if [ -d .git ]; then
    echo "🔄 Đang cập nhật mã nguồn từ Git..."
    git pull origin main || echo "Cảnh báo: Không thể git pull, sử dụng mã nguồn hiện tại."
fi

# ------------------------------------------------------------------------------
# 5. KHỞI CHẠY CONTAINER: ƯU TIÊN PULL PRE-BUILT IMAGE (TRÁNH OOM KHI BUILD TRÊN VPS)
# ------------------------------------------------------------------------------
echo "🐳 Đang tải Docker Images tối ưu..."
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" $PROFILE_FLAG pull; then
    echo "✅ Kéo image từ Registry thành công! Khởi động container..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" $PROFILE_FLAG up -d --remove-orphans
else
    echo "⚠️  Không thể kéo pre-built image (có thể do private repo hoặc chưa push). Tiến hành build cục bộ an toàn..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" $PROFILE_FLAG up -d --build --remove-orphans
fi

# ------------------------------------------------------------------------------
# 6. KIỂM TRA TRẠNG THÁI SỨC KHỎE HỆ THỐNG
# ------------------------------------------------------------------------------
echo "⏳ Đang đợi dịch vụ ổn định (10 giây)..."
sleep 10
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" $PROFILE_FLAG ps

# Lấy địa chỉ IP máy chủ
SERVER_IP=$(curl -s -m 3 ifconfig.me || curl -s -m 3 icanhazip.com || echo "localhost")

echo "================================================================================"
echo " ✅ TRIỂN KHAI THÀNH CÔNG!"
echo " • Compose File: $COMPOSE_FILE"
echo " • Env Config:   $ENV_FILE"
echo " • Backend API:  http://$SERVER_IP:8080/health"
if [[ "$MODE" == "--mode=fullstack" || "$MODE" == "fullstack" ]]; then
    echo " • Frontend:     http://$SERVER_IP:80 (Nginx Docker)"
else
    echo " • Frontend:     Triển khai trên Vercel Edge (Trỏ VITE_API_BASE_URL về Backend này)"
fi
echo "================================================================================"
echo " 🔒 LƯU Ý KẾT NỐI VERCEL (HTTPS):"
echo " Trình duyệt sẽ chặn Mixed Content nếu gọi API từ Vercel (HTTPS) sang HTTP thô."
echo " Khuyên dùng một trong 2 cách sau để có HTTPS miễn phí cho Backend VPS:"
echo " 1. Cloudflare Tunnel (Cực nhanh, miễn phí, không cần mở port firewall VPS)."
echo " 2. Cài Nginx + Certbot Let's Encrypt cấp SSL cho tên miền api.yourdomain.com."
echo "================================================================================"
