// Chức năng Lưu lịch sử xem bài viết vào db firebase by VTZone
// --- LOGIC GHI LỊCH SỬ XEM BÀI VIẾT (ĐÃ TỐI ƯU CÁCH LẤY POST ID) ---
$(document).ready(function() {
    
    // 1. CHỈ CHẠY TRÊN TRANG BÀI VIẾT CHI TIẾT
    const isItemPage = typeof _WidgetManager !== 'undefined' && 
                       _WidgetManager._GetAllData().blog.pageType === "item";
                       
    if (!isItemPage) {
        return; // Không phải trang bài viết, thoát
    }
    
    // 2. CHỜ ĐĂNG NHẬP
    window.auth.onAuthStateChanged((user) => {
        if (user) {
            saveViewHistory(user);
        }
    });

    async function saveViewHistory(user) {
        
        // CÁCH 1: Lấy ID từ biến Blogger (ổn định nhất)
        let postId = null;
        if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.postId) {
            postId = _WidgetManager._GetAllData().blog.postId;
        }
        
        // CÁCH 2 (Fallback): Lấy ID từ data-post-id trên DOM (nếu Cách 1 lỗi)
        if (!postId) {
             const postContainer = $('.blog-posts article.post, .blog-posts .post-outer').first();
             if (postContainer.length) {
                 postId = postContainer.attr('data-post-id');
             }
        }
        
        // Lấy Tiêu đề và URL
        const title = document.title; 
        const url = window.location.href.split('?')[0]; 

        if (postId && window.db) {
            
            // Debug: Kiểm tra xem đã lấy được ID chưa
            console.log("DEBUG Ghi Lịch Sử: Post ID = " + postId); 

            try {
                // Lưu vào collection: users/{uid}/viewedHistory/{postId}
                await window.db.collection('users').doc(user.uid).collection('viewedHistory').doc(postId).set({
                    postId: postId,
                    title: title, 
                    url: url,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() // Thời gian server
                }, { merge: true });
                
                console.log("Đã lưu lịch sử xem thành công cho ID: " + postId);
            } catch (error) {
                console.error("Lỗi lưu lịch sử xem (Kiểm tra Security Rules):", error);
            }
        } else {
             console.log("DEBUG Ghi Lịch Sử: Không tìm thấy Post ID hoặc DB chưa sẵn sàng.");
        }
    }
});
// --- KẾT THÚC LOGIC GHI LỊCH SỬ XEM BÀI VIẾT ---
