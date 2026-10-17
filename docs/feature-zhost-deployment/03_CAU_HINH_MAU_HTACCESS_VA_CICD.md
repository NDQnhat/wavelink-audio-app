# 03. CẤU HÌNH MẪU `.htaccess`, WORKFLOW GITHUB ACTIONS & SCRIPT TIỆN ÍCH
### Tài liệu kỹ thuật chi tiết dành cho triển khai zHost Hosting
**Tài liệu:** `docs/feature-zhost-deployment/03_CAU_HINH_MAU_HTACCESS_VA_CICD.md`  
**Ngày cập nhật:** 17/10/2026  

---

## 1. FILE CẤU HÌNH `.htaccess` CHUẨN TỐI ƯU CHO LITESPEED / APACHE

File này cần được đặt tại: `frontend/public/.htaccess`  
*(Khi chạy `npm run build`, Vite sẽ tự động copy file này vào `frontend/dist/.htaccess` để đẩy lên hosting)*

```apache
# ==============================================================================
# WaveLink Audio App - Production LiteSpeed & Apache Configuration
# - Hỗ trợ Single Page Application (SPA) Routing (React Router v6)
# - Tránh xung đột điều hướng /student-login và các deep link
# - Tối ưu bộ đệm Browser Caching cho Assets băm tên
# - Tăng tốc nén Gzip / Brotli & Bảo mật HTTP Headers
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. THIẾT LẬP FILE MẶC ĐỊNH & TẮT DUYỆT THƯ MỤC
# ------------------------------------------------------------------------------
DirectoryIndex index.html index.php
Options -Indexes -MultiViews

# ------------------------------------------------------------------------------
# 2. ĐIỀU HƯỚNG SPA REWRITE CHO REACT ROUTER
# ------------------------------------------------------------------------------
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Bỏ qua index.html để tránh vòng lặp vô tận
  RewriteRule ^index\.html$ - [L]

  # Bỏ qua nếu người dùng truy cập trực tiếp vào file hoặc thư mục vật lý có thật
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Chuyển hướng toàn bộ các đường dẫn ảo (như /student-login, /player/1) về index.html
  RewriteRule . /index.html [L]
</IfModule>

# ------------------------------------------------------------------------------
# 3. TỐI ƯU HÓA BỘ NHỚ ĐỆM TRÌNH DUYỆT (BROWSER CACHING / EXPIRES)
# ------------------------------------------------------------------------------
<IfModule mod_expires.c>
  ExpiresActive On

  # Mặc định cache 1 giờ
  ExpiresDefault "access plus 1 hour"

  # HTML & Service Worker: KHÔNG CACHE để luôn nhận bản cập nhật mới nhất
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/javascript "access plus 0 seconds"

  # Static Assets có mã băm (Vite hash: /assets/*): Cache 1 năm bất biến
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/x-javascript "access plus 1 year"
  ExpiresByType font/ttf "access plus 1 year"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
</IfModule>

# ------------------------------------------------------------------------------
# 4. KIỂM SOÁT HEADER CACHE-CONTROL
# ------------------------------------------------------------------------------
<IfModule mod_headers.c>
  # Đảm bảo index.html và sw.js luôn được revalidate
  <FilesMatch "\.(html|htm)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
  </FilesMatch>

  <FilesMatch "^sw\.js$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>

  # Assets trong thư mục assets được cache lâu dài
  <FilesMatch "\.(js|css|woff2|woff|ttf|png|jpg|jpeg|webp|svg)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Các header bảo mật cơ bản
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-XSS-Protection "1; mode=block"
</IfModule>

# ------------------------------------------------------------------------------
# 5. BẬT NÉN GZIP / BROTLI NẾU MÁY CHỦ HỖ TRỢ
# ------------------------------------------------------------------------------
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css
  AddOutputFilterByType DEFLATE application/xml application/xhtml+xml application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript application/x-javascript
  AddOutputFilterByType DEFLATE application/json
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>
```

---

## 2. NÂNG CẤP WORKFLOW GITHUB ACTIONS (`.github/workflows/docker-ci.yml`)

Dưới đây là phần code chuẩn hóa cho các bước build và deploy trong pipeline:

### 2.1. Cập nhật trong Job `frontend-test`
Truyền biến môi trường API vào bước build Vite:

```yaml
    - name: Verify Production Vite Build (TypeScript + Minification)
      working-directory: frontend
      env:
        # Bắt buộc truyền API URL để Vite nhúng trực tiếp vào bundle production
        VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL || 'https://wavelink-audio-app-backend-latest.onrender.com/api/v1' }}
        VITE_ITEMS_PER_PAGE: 12
      run: npm run build

    - name: Upload Frontend Production Artifact
      uses: actions/upload-artifact@v4
      with:
        name: frontend-dist
        path: frontend/dist/
        retention-days: 1
```

### 2.2. Cập nhật trong Job `docker-delivery`
Thêm bước trích xuất package từ Docker GHCR hoặc dùng Artifact và đẩy qua FTP chuẩn xác:

```yaml
    - name: Check FTP Secret
      id: check_ftp
      env:
        FTP_SERVER: ${{ secrets.FTP_SERVER }}
      run: |
        if [ -n "$FTP_SERVER" ]; then
          echo "enabled=true" >> $GITHUB_OUTPUT
        else
          echo "enabled=false" >> $GITHUB_OUTPUT
        fi

    - name: Download Frontend Production Artifact
      if: steps.check_ftp.outputs.enabled == 'true'
      uses: actions/download-artifact@v4
      with:
        name: frontend-dist
        path: frontend/dist

    # Deploy an toàn lên hosting zHost qua tài khoản FTP
    - name: Deploy via FTP to zHost Hosting
      if: steps.check_ftp.outputs.enabled == 'true'
      continue-on-error: true
      uses: SamKirkland/FTP-Deploy-Action@v4.3.5
      with:
        server: ${{ secrets.FTP_SERVER }}
        username: ${{ secrets.FTP_USERNAME }}
        password: ${{ secrets.FTP_PASSWORD }}
        local-dir: ./frontend/dist/
        # Sử dụng ./public_html/ nếu dùng user stephen@..., hoặc ./domains/wavelink-audio-app.zhost.education/public_html/ nếu dùng wavelink
        server-dir: ${{ secrets.FTP_SERVER_DIR || './public_html/' }}
        dangerous-clean-slate: false
```

---

## 3. SCRIPT POWERSHELL HỖ TRỢ KIỂM TRA & SAO LƯU FTP TỰ ĐỘNG

Script này có thể chạy trực tiếp trên máy phát triển để kiểm tra tình trạng kết nối FTP đến zHost bất cứ lúc nào:

```powershell
<#
.SYNOPSIS
    Kiểm tra kết nối và liệt kê tài nguyên trên zHost FTP.
.EXAMPLE
    .\deploy\zhost\verify-ftp.ps1
#>

$FtpHost = "[HIDDEN_IP]"
$FtpUser = "wavelink"
$FtpPass = "[HIDDEN_PASSWORD]"
$DomainPath = "domains/wavelink-audio-app.zhost.education/public_html"

Write-Host ">>> Đang kiểm tra kết nối tới FTP zHost: $FtpHost ..." -ForegroundColor Cyan

$ftpUrl = "ftp://$FtpHost/$DomainPath/"
$ftp = [System.Net.FtpWebRequest]::Create($ftpUrl)
$ftp.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPass)
$ftp.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$ftp.Timeout = 8000

try {
    $response = $ftp.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $files = $reader.ReadToEnd()
    Write-Host "[THÀNH CÔNG] Đã kết nối FTP thành công!" -ForegroundColor Green
    Write-Host "Danh sách tệp tin trong public_html:" -ForegroundColor Yellow
    Write-Host $files
    $reader.Close()
    $response.Close()
} catch {
    Write-Host "[LỖI] Không thể kết nối FTP: $($_.Exception.Message)" -ForegroundColor Red
}
```
