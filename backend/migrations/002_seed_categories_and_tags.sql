-- 002_seed_categories_and_tags.sql
-- Nạp danh mục thể loại (20 categories) và thẻ phân loại (32 tags) cho WaveLink

-- 1. Thể loại Audio (Categories)
INSERT INTO categories (name, slug, description, color) VALUES
('Xuyên Không', 'xuyen-khong', 'Du hành không gian, xuyên qua thế giới khác', 'primary'),
('Xuyên Nhanh', 'xuyen-nhanh', 'Khoái xuyên, thực hiện nhiệm vụ qua nhiều thế giới', 'secondary'),
('Sảng Văn', 'sang-van', 'Nội dung giải trí, nhân vật chính bá đạo thuận buồm xuôi gió', 'warning'),
('Hệ Thống', 'he-thong', 'Nhân vật chính sở hữu hệ thống hỗ trợ', 'accent'),
('Trọng Sinh', 'trong-sinh', 'Chết đi sống lại, bắt đầu lại cuộc đời', 'success'),
('Võng Du', 'vong-du', 'Thế giới game online, thực tế ảo', 'neutral'),
('Mạt Thế', 'mat-the', 'Tận thế, thây ma, sinh tồn khắc nghiệt', 'danger'),
('Dị Năng', 'di-nang', 'Năng lực đặc biệt, siêu năng lực', 'primary'),
('Vô Địch Lưu', 'vo-dich', 'Vừa xuất hiện đã vô địch thiên hạ', 'warning'),
('Lịch Sử Quân Sự', 'lich-su-quan-su', 'Chiến tranh, mưu lược, cải biến lịch sử', 'secondary'),
('Linh Dị Ma Quái', 'ma-kinh-di', 'Kinh dị, trừ tà, bắt ma quái', 'neutral'),
('Đồng Nhân', 'dong-nhan', 'Phóng tác dựa trên tác phẩm hoặc nhân vật có sẵn', 'accent'),
('Cung Đấu Gia Đấu', 'cung-dau', 'Tranh giành quyền lực chốn hoàng cung, gia tộc', 'danger'),
('Khoa Huyễn', 'khoa-huyen', 'Khoa học viễn tưởng, tương lai, cơ giáp, tinh tế', 'secondary'),
('Huyền Huyễn', 'huyen-huyen', 'Ma pháp, thế giới kỳ ảo, tu vi phân tầng', 'accent'),
('Tiên Hiệp', 'tien-hiep', 'Tu chân, phi thăng, đại đạo, nghịch thiên', 'primary'),
('Kiếm Hiệp', 'kiem-hiep', 'Giang hồ ân oán, võ lâm hiệp nghĩa', 'warning'),
('Đô Thị', 'do-thi', 'Thương trường, hào môn, đời sống hiện đại', 'success'),
('Dị Giới', 'di-gioi', 'Thế giới song song, nền văn minh khác biệt', 'primary'),
('Kỳ Huyễn', 'ky-huyen', 'Huyền bí, phép thuật Tây phương, rồng và ma thuật', 'secondary')
ON DUPLICATE KEY UPDATE 
    slug = VALUES(slug),
    description = VALUES(description),
    color = VALUES(color);

-- 2. Thẻ phân loại (Tags)
INSERT INTO tags (name, slug) VALUES
('Xuyên Không', 'xuyen-khong'),
('Xuyên Nhanh', 'xuyen-nhanh'),
('Xuyên Qua Dị Giới', 'xuyen-qua-di-gioi'),
('Xuyên Thư', 'xuyen-thu'),
('Phản Xuyên', 'phan-xuyen'),
('Vô Địch Lưu', 'vo-dich-luu'),
('Cẩu Đạo', 'cau-dao'),
('Hắc Ám', 'hac-am'),
('Vả Mặt', 'va-mat'),
('Thông Minh', 'thong-minh'),
('Hài Bựa', 'hai-bua'),
('Điểm Danh', 'diem-danh'),
('Không Gian Tùy Thân', 'khong-gian-tuy-than'),
('Tiến Hóa Vô Hạn', 'tien-hoa-vo-han'),
('Trăm Lần Bạo Kích', 'tram-lan-bao-kich'),
('Đô Thị Tu Tiên', 'do-thi-tu-tien'),
('Thần Hào', 'than-hao'),
('Hậu Cung', 'hau-cung'),
('Đơn Nữ Chính', 'don-nu-chinh'),
('Không Nữ Chính', 'khong-nu-chinh'),
('Toàn Dân Chuyển Chức', 'toan-dan-chuyen-chuc'),
('Lãnh Chúa Chiến Tranh', 'lanh-chua-chien-tranh'),
('Quy Tắc Quái Đàm', 'quy-tac-quai-dam'),
('Sát Phạt Quyết Đoán', 'sat-phat-quyet-doan'),
('Heo Ăn Thịt Hổ', 'heo-an-thit-ho'),
('Giả HEO Ăn Hổ', 'gia-heo-an-ho'),
('Nuôi Thú Cưng', 'nuoi-thu-cung'),
('Tận Thế Tái Sinh', 'tan-the-tai-sinh'),
('Full Trọn Bộ', 'full-tron-bo'),
('Siêu Phẩm Cày Đêm', 'sieu-pham-cay-dem'),
('Trên 1000 Chương', 'tren-1000-chuong'),
('Tiến Độ Nhanh', 'tien-do-nhanh')
ON DUPLICATE KEY UPDATE 
    slug = VALUES(slug);
