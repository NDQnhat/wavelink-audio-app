# ==============================================================================
# WaveLink Backend Dockerfile - Multi-stage Production Build (Golang Alpine)
# ==============================================================================

# STAGE 1: Build binary statically using official Go Debian image (full glibc compatibility)
FROM golang:1.24-bookworm AS builder

WORKDIR /build

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ mã nguồn Backend
COPY . .

# Hỗ trợ multi-arch tự động từ Buildx (amd64 / arm64) mà không fix cứng amd64
ARG TARGETOS=linux
ARG TARGETARCH=amd64

# Biên dịch tĩnh nhị phân (loại bỏ symbol bảng & thông tin debug để thu nhỏ file còn ~15MB)
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /build/wavelink-api ./cmd/api/main.go

# Biên dịch sẵn CLI Seed phục vụ khởi tạo / reset data trong container
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /build/wavelink-seed ./cmd/seed/main.go

# ------------------------------------------------------------------------------
# STAGE 2: Minimal Distroless / Alpine Runner
FROM alpine:3.20 AS runner

# Chứng chỉ SSL gốc bắt buộc để kết nối YouTube HTTPS, VietQR và Aiven MySQL TLS
RUN apk add --no-cache ca-certificates tzdata curl && \
    update-ca-certificates

# Tạo user không có đặc quyền root để bảo mật tối đa
RUN addgroup -S wavelinkgroup -g 333 && \
    adduser -S -D -H -u 333 -h /app -s /sbin/nologin -G wavelinkgroup wavelink

WORKDIR /app

# Copy các file thực thi đã biên dịch từ Stage Builder
COPY --from=builder /build/wavelink-api /app/wavelink-api
COPY --from=builder /build/wavelink-seed /app/wavelink-seed
COPY --from=builder /build/migrations /app/migrations

# Phân quyền cho appuser
RUN chown -R wavelink:wavelinkgroup /app

USER wavelink

# Biến môi trường mặc định (Render / Docker Compose có thể ghi đè)
ENV PORT=8080 \
    APP_ENV=production \
    GIN_MODE=release \
    TZ=Asia/Ho_Chi_Minh

EXPOSE 8080

# Healthcheck định kỳ 30s xác nhận tiến trình API đang phản hồi khỏe mạnh
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

ENTRYPOINT ["/app/wavelink-api"]
