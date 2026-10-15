package membership

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/url"
	"time"

	"audio-app-backend/core/domain"
	"audio-app-backend/server/middleware"
	"audio-app-backend/server/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

type VIPPackage struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Amount       int      `json:"amount"`
	DurationDays int      `json:"durationDays"`
	OriginalCost int      `json:"originalCost"`
	Discount     string   `json:"discount"`
	Description  string   `json:"description"`
	Perks        []string `json:"perks"`
}

var AvailablePackages = []VIPPackage{
	{
		ID:           "1_MONTH",
		Name:         "Gói VIP 1 Tháng",
		Amount:       49000,
		DurationDays: 30,
		OriginalCost: 59000,
		Discount:     "Tiết kiệm 17%",
		Description:  "Trải nghiệm đầy đủ đặc quyền VIP trong 30 ngày",
		Perks: []string{
			"Mở khóa 100% truyện độc quyền VIP",
			"Không giới hạn số lượt import YouTube",
			"Đồng bộ tiến trình đám mây ưu tiên cao nhất",
			"Huy hiệu VIP Member phong cách Manga",
		},
	},
	{
		ID:           "3_MONTHS",
		Name:         "Gói VIP 3 Tháng",
		Amount:       129000,
		DurationDays: 90,
		OriginalCost: 177000,
		Discount:     "Tiết kiệm 27% (Khuyên dùng)",
		Description:  "Gói cày truyện phổ biến nhất dành cho độc giả chân chính",
		Perks: []string{
			"Mọi đặc quyền của gói VIP 1 Tháng",
			"Thời lượng kéo dài 90 ngày liên tục",
			"Cộng dồn thời hạn nếu đang có gói cũ",
			"Hỗ trợ ưu tiên khi gặp sự cố kỹ thuật",
		},
	},
	{
		ID:           "12_MONTHS",
		Name:         "Gói VIP 1 Năm (Trọn Bộ)",
		Amount:       399000,
		DurationDays: 365,
		OriginalCost: 708000,
		Discount:     "Tiết kiệm 44% (Siêu rẻ)",
		Description:  "1 năm cày truyện không giới hạn, trọn vẹn mọi tác phẩm",
		Perks: []string{
			"Toàn bộ đặc quyền cao cấp nhất của hệ thống",
			"365 ngày VIP không lo gia hạn",
			"Huy hiệu Gold VIP Độc Bản",
			"Nhận thông báo sớm nhất khi có audio bom tấn mới",
		},
	},
}

type CreateOrderRequest struct {
	PackageID string `json:"packageId" binding:"required"`
}

type SimulatePaymentRequest struct {
	Status string `json:"status" binding:"required"` // "SUCCESS" | "FAILED"
}

type CancelVipRequest struct {
	Reason string `json:"reason"`
}

type RefundRequest struct {
	OrderCode string `json:"orderCode"`
	Reason    string `json:"reason" binding:"required"`
	BankInfo  string `json:"bankInfo"`
}

type ComplaintRequest struct {
	Category string `json:"category"`
	Subject  string `json:"subject" binding:"required"`
	Content  string `json:"content" binding:"required"`
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	mem := rg.Group("/membership")
	{
		mem.GET("/packages", h.GetPackages)
		mem.GET("/me", middleware.RequireAuth(), h.GetMyMembership)
		mem.POST("/orders", middleware.RequireAuth(), h.CreateOrder)
		mem.GET("/orders/:orderCode", middleware.RequireAuth(), h.GetOrder)
		mem.POST("/orders/:orderCode/simulate", middleware.RequireAuth(), h.SimulatePayment)
		mem.POST("/cancel-vip", middleware.RequireAuth(), h.CancelVIP)
		mem.POST("/refund", middleware.RequireAuth(), h.RequestRefund)
		mem.POST("/complaint", middleware.RequireAuth(), h.SubmitComplaint)
	}
}

func (h *Handler) GetPackages(c *gin.Context) {
	response.OK(c, AvailablePackages, nil)
}

func (h *Handler) GetMyMembership(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	var u domain.User
	if err := h.db.First(&u, userID).Error; err != nil {
		response.NotFound(c, "Người dùng không tồn tại")
		return
	}

	isVip := u.Role == domain.RoleAdmin || u.Role == domain.RoleVIP || u.Membership == domain.MembershipVIP
	if u.VipExpiresAt != nil && time.Now().UTC().After(*u.VipExpiresAt) && u.Role != domain.RoleAdmin {
		isVip = false
		// Tự động chuyển về FREE nếu hết hạn
		h.db.Model(&u).Updates(map[string]interface{}{
			"membership": domain.MembershipFree,
			"role":       domain.RoleUser,
		})
		u.Membership = domain.MembershipFree
		u.Role = domain.RoleUser
	}

	// Lấy đơn hàng gần nhất
	var latestOrder domain.MembershipOrder
	h.db.Where("user_id = ?", userID).Order("created_at DESC").First(&latestOrder)

	response.OK(c, gin.H{
		"userId":       u.ID,
		"username":     u.Username,
		"role":         u.Role,
		"membership":   u.Membership,
		"isVip":        isVip,
		"vipExpiresAt": u.VipExpiresAt,
		"latestOrder":  latestOrder,
	}, nil)
}

func (h *Handler) CreateOrder(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng chọn gói VIP hợp lệ")
		return
	}

	var pkg *VIPPackage
	for _, p := range AvailablePackages {
		if p.ID == req.PackageID {
			pkg = &p
			break
		}
	}
	if pkg == nil {
		response.BadRequest(c, "Gói VIP không tồn tại")
		return
	}

	// Sinh mã đơn hàng ngẫu nhiên an toàn: VIP-UID-RANDOM
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	randCode := n.Int64() + 100000
	orderCode := fmt.Sprintf("VIP-%d-%d", userID, randCode)

	// Tạo URL QR Code mô phỏng thanh toán (Chuẩn VietQR Demo)
	qrDescription := url.QueryEscape(fmt.Sprintf("Thanh toan don %s", orderCode))
	qrURL := fmt.Sprintf("https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=%d&addInfo=%s&accountName=COMIC%%20AUDIO%%20HUB", pkg.Amount, qrDescription)

	order := domain.MembershipOrder{
		OrderCode:    orderCode,
		UserID:       userID,
		PackageID:    pkg.ID,
		PackageName:  pkg.Name,
		Amount:       pkg.Amount,
		DurationDays: pkg.DurationDays,
		Status:       "PENDING",
		QRCodeURL:    qrURL,
		ExpiresAt:    time.Now().UTC().Add(15 * time.Minute),
		CreatedAt:    time.Now().UTC(),
	}

	if err := h.db.Create(&order).Error; err != nil {
		response.Internal(c, "Không thể tạo đơn hàng thanh toán: "+err.Error())
		return
	}

	response.Created(c, order)
}

func (h *Handler) GetOrder(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	orderCode := c.Param("orderCode")

	var order domain.MembershipOrder
	if err := h.db.Where("order_code = ? AND user_id = ?", orderCode, userID).First(&order).Error; err != nil {
		response.NotFound(c, "Không tìm thấy đơn hàng")
		return
	}

	// Kiểm tra nếu quá 15 phút chưa thanh toán thì đánh dấu EXPIRED
	if order.Status == "PENDING" && time.Now().UTC().After(order.ExpiresAt) {
		h.db.Model(&order).Update("status", "EXPIRED")
		order.Status = "EXPIRED"
	}

	response.OK(c, order, nil)
}

func (h *Handler) SimulatePayment(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	orderCode := c.Param("orderCode")

	var req SimulatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Trạng thái mô phỏng không hợp lệ")
		return
	}

	var order domain.MembershipOrder
	if err := h.db.Where("order_code = ? AND user_id = ?", orderCode, userID).First(&order).Error; err != nil {
		response.NotFound(c, "Không tìm thấy đơn hàng")
		return
	}

	if order.Status == "PAID" {
		response.OK(c, gin.H{
			"message": "Đơn hàng này đã được thanh toán trước đó",
			"order":   order,
		}, nil)
		return
	}

	now := time.Now().UTC()

	if req.Status == "FAILED" {
		h.db.Model(&order).Update("status", "FAILED")
		order.Status = "FAILED"
		response.OK(c, gin.H{
			"success": false,
			"message": "Giao dịch mô phỏng thất bại hoặc đã bị người dùng hủy",
			"order":   order,
		}, nil)
		return
	}

	if req.Status != "SUCCESS" {
		response.BadRequest(c, "Trạng thái mô phỏng chỉ nhận SUCCESS hoặc FAILED")
		return
	}

	// Xử lý thanh toán thành công trong Transaction
	err := h.db.Transaction(func(tx *gorm.DB) error {
		// 1. Cập nhật trạng thái đơn hàng
		if err := tx.Model(&order).Updates(map[string]interface{}{
			"status":  "PAID",
			"paid_at": &now,
		}).Error; err != nil {
			return err
		}

		// 2. Tìm người dùng
		var u domain.User
		if err := tx.First(&u, userID).Error; err != nil {
			return err
		}

		// 3. Tính toán thời hạn VIP (Cộng dồn nếu vẫn còn hạn)
		var newExpiry time.Time
		if u.VipExpiresAt != nil && u.VipExpiresAt.After(now) {
			newExpiry = u.VipExpiresAt.Add(time.Duration(order.DurationDays) * 24 * time.Hour)
		} else {
			newExpiry = now.Add(time.Duration(order.DurationDays) * 24 * time.Hour)
		}

		// Giữ nguyên role ADMIN nếu đã là ADMIN, còn lại nâng thành VIP
		newRole := domain.RoleUser
		if u.Role == domain.RoleAdmin {
			newRole = domain.RoleAdmin
		} else {
			newRole = domain.RoleVIP
		}

		if err := tx.Model(&u).Updates(map[string]interface{}{
			"role":           newRole,
			"membership":     domain.MembershipVIP,
			"vip_expires_at": &newExpiry,
		}).Error; err != nil {
			return err
		}

		// 4. Tạo thông báo chúc mừng vào Notification Center
		notif := domain.Notification{
			UserID:    userID,
			Title:     " Chúc mừng bạn đã nâng cấp VIP thành công!",
			Message:   fmt.Sprintf("Bạn đã kích hoạt thành công %s (thời hạn tới %s). Hãy thưởng thức toàn bộ kho truyện không giới hạn ngay bây giờ!", order.PackageName, newExpiry.Format("02/01/2006")),
			Type:      "VIP",
			Link:      "#/profile",
			IsRead:    false,
			CreatedAt: now,
		}
		if err := tx.Create(&notif).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		response.Internal(c, "Lỗi cập nhật quyền VIP: "+err.Error())
		return
	}

	h.db.First(&order, order.ID)
	var updatedUser domain.User
	h.db.First(&updatedUser, userID)

	response.OK(c, gin.H{
		"success": true,
		"message": "Nâng cấp VIP thành công! Toàn bộ quyền lợi đã được kích hoạt.",
		"order":   order,
		"user": gin.H{
			"id":           updatedUser.ID,
			"username":     updatedUser.Username,
			"role":         updatedUser.Role,
			"membership":   updatedUser.Membership,
			"vipExpiresAt": updatedUser.VipExpiresAt,
		},
	}, nil)
}

func (h *Handler) CancelVIP(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req CancelVipRequest
	c.ShouldBindJSON(&req)

	var u domain.User
	if err := h.db.First(&u, userID).Error; err != nil {
		response.NotFound(c, "Người dùng không tồn tại")
		return
	}

	now := time.Now().UTC()
	u.Role = domain.RoleUser
	u.Membership = domain.MembershipFree
	u.VipExpiresAt = nil

	if err := h.db.Model(&u).Updates(map[string]interface{}{
		"role":           domain.RoleUser,
		"membership":     domain.MembershipFree,
		"vip_expires_at": nil,
	}).Error; err != nil {
		response.Internal(c, "Lỗi hủy gói VIP")
		return
	}

	notif := domain.Notification{
		UserID:    userID,
		Title:     "Hủy gói VIP WaveLink thành công",
		Message:   "Bạn đã hủy gia hạn gói VIP. Quyền lợi VIP đã dừng. Cảm ơn bạn đã đồng hành cùng WaveLink!",
		Type:      "SYSTEM",
		Link:      "#/membership",
		IsRead:    false,
		CreatedAt: now,
	}
	h.db.Create(&notif)

	response.OK(c, gin.H{"message": "Đã hủy gói VIP thành công", "user": u}, nil)
}

func (h *Handler) RequestRefund(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng nhập lý do yêu cầu hoàn tiền")
		return
	}

	now := time.Now().UTC()
	notif := domain.Notification{
		UserID:    userID,
		Title:     "Yêu cầu hoàn tiền đã được tiếp nhận",
		Message:   fmt.Sprintf("Yêu cầu hoàn tiền cho đơn hàng '%s' (Lý do: %s) đã được ghi nhận. Bộ phận hỗ trợ sẽ xử lý trong 24h.", req.OrderCode, req.Reason),
		Type:      "SYSTEM",
		Link:      "#/settings",
		IsRead:    false,
		CreatedAt: now,
	}
	h.db.Create(&notif)

	response.OK(c, gin.H{
		"message":   "Yêu cầu hoàn tiền đã được ghi nhận thành công! Ban quản trị sẽ liên hệ và xử lý trong 24h.",
		"orderCode": req.OrderCode,
	}, nil)
}

func (h *Handler) SubmitComplaint(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	var req ComplaintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Vui lòng nhập tiêu đề và nội dung khiếu nại")
		return
	}

	category := req.Category
	if category == "" {
		category = "Chung"
	}

	now := time.Now().UTC()
	notif := domain.Notification{
		UserID:    userID,
		Title:     fmt.Sprintf("Đã tiếp nhận khiếu nại [%s]", category),
		Message:   fmt.Sprintf("Nội dung: '%s'. Ban quản trị WaveLink đã nhận được phản hồi của bạn và sẽ kiểm tra sớm nhất.", req.Subject),
		Type:      "SYSTEM",
		Link:      "#/notifications",
		IsRead:    false,
		CreatedAt: now,
	}
	h.db.Create(&notif)

	response.OK(c, gin.H{
		"message":  "Khiếu nại/Góp ý của bạn đã được gửi thành công! Cảm ơn bạn đã đóng góp cho WaveLink.",
		"category": category,
		"subject":  req.Subject,
	}, nil)
}
