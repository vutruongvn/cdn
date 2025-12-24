// Sử dụng bao đóng để tạo phạm vi cục bộ an toàn
(function($) { 
    // Kiểm tra xem jQuery có sẵn không
    if (typeof $ === 'undefined') {
        console.error("Lỗi: jQuery không được tìm thấy.");
        return;
    }

    // Hàm Hiển thị Tổng số Like
function initLikeCountDisplay(scopeElement = document) {
        const db = window.db;

        if (typeof db === 'undefined') {
            console.warn("Firestore object (window.db) chưa sẵn sàng cho chức năng đếm Like.");
            return;
        }

        // Sửa: Chỉ quét trong phạm vi (scopeElement) thay vì toàn bộ document
        const likeButtons = scopeElement.querySelectorAll('.likePost[data-post-id]');
        const postIds = new Set();
        
        likeButtons.forEach(btn => {
            const postId = btn.getAttribute('data-post-id');
            if (postId) {
                postIds.add(postId);
            }
        });
        
        postIds.forEach(postId => {
            const postCountRef = db.collection('postMetrics').doc(postId);
            
            // Lắng nghe thời gian thực (realtime)
            postCountRef.onSnapshot(doc => {
                // Vẫn dùng document.querySelectorAll để cập nhật TẤT CẢ nút like cho post này
                const countElements = document.querySelectorAll('.likePost[data-post-id=\"' + postId + '\"] .like-count');
                
                if (doc.exists) {
                    const count = doc.data().likeCount || 0; 
                    const formattedCount = count.toLocaleString('en-US'); 
                    countElements.forEach(el => el.innerText = formattedCount);
                } else {
                    countElements.forEach(el => el.innerText = '0');
                }
            }, err => {
                console.error("Lỗi đọc lượt like từ Firestore cho Post ID " + postId + ":", err);
            });
        });
    }

    // Thực thi: Chạy hàm khi DOM đã sẵn sàng
    $(document).ready(function() {
        initLikeCountDisplay(); // Gọi cho các bài viết tải lần đầu
    });

})(window.jQuery); // Truyền jQuery vào khối bao đóng