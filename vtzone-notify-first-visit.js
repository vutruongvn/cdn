  // Thông báo lần đầu truy cập Blog và Ghim ra màn hình chính (chỉ xuất hiện 1 lần đầu truy cập)
    // 1. Tên biến dùng để lưu trạng thái trong trình duyệt
    const storageKey = 'hasVisitedBlog';
    // 2. Tham chiếu đến phần tử thông báo HTML
    const welcomeMessage = document.getElementById('first-visit-message');

    /**
     * Hàm kiểm tra và hiển thị thông báo
     */
    function checkFirstVisit() {
        // Kiểm tra xem đã có biến 'hasVisitedBlog' trong localStorage chưa
        if (localStorage.getItem(storageKey) === null) {
            // Nếu chưa có (Đây là lần đầu truy cập)
            
            // Hiển thị thông báo
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
            
            // Đặt biến vào localStorage để những lần sau không hiện nữa
            localStorage.setItem(storageKey, 'true');
        }
        // Nếu đã có, không làm gì cả (Không hiển thị thông báo)
    }
    
    /**
     * Hàm đóng thông báo khi người dùng nhấn nút
     */
    function closeWelcomeMessage() {
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    // Chạy hàm kiểm tra ngay khi trang tải xong
    document.addEventListener('DOMContentLoaded', checkFirstVisit);
// VTZone
// blog.vutruong.vn