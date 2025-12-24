if (typeof db === 'undefined' || typeof db.collection !== 'function') {
        console.error("Lỗi: Đối tượng 'db' (Firestore) chưa được khởi tạo. Vui lòng kiểm tra lại phần khởi tạo.");
    } else {

        const likeBtns = document.querySelectorAll('.likePost'); 

        // === LOGIC GIAO DIỆN (THAY ĐỔI ICON FONT AWESOME) ===
        function updateLikeUI(btnElement, isLiked) {
            const iconElement = btnElement.querySelector('i'); 
            
            // 1. Thao tác trên nút chính (cho CSS màu sắc)
            if (isLiked) {
                btnElement.classList.add('active-like');
            } else {
                btnElement.classList.remove('active-like');
            }

            // 2. Thay đổi class Icon
            if (iconElement) {
                if (isLiked) {
                    iconElement.classList.remove('fa-regular');
                    iconElement.classList.add('fa-solid');
                } else {
                    iconElement.classList.remove('fa-solid');
                    iconElement.classList.add('fa-regular');
                }
            }
        }

        // === HÀM KHỞI TẠO CHO MỖI NÚT LIKE RIÊNG BIỆT (OPTIMISTIC UPDATE) ===
function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    const postId = button.getAttribute('data-post-id');
    const postTitle = button.getAttribute('data-post-title');
    const postUrl = button.getAttribute('data-post-url');
    
    // 1. Tham chiếu
    const userLikeRef = db.collection('users').doc(user.uid).collection('likes').doc(postId);
    const postMetricsRef = db.collection('postMetrics').doc(postId);

    // 2. LẮNG NGHE TRẠNG THÁI LIKE BAN ĐẦU (Để cập nhật UI)
    userLikeRef.onSnapshot(doc => {
        const isLiked = doc.exists;
        updateLikeUI(button, isLiked);
    });

    // 3. GÁN SỰ KIỆN CLICK (Sử dụng logic SET/MERGE và BẮT LỖI MẠNH MẼ)
    button.onclick = async (e) => {
        e.preventDefault();
        
        const currentLikeDoc = await userLikeRef.get();
        const isCurrentlyLiked = currentLikeDoc.exists;
        
        try {
            if (isCurrentlyLiked) {
                // --- UNLIKE ---
                
                // 1. Xóa lượt thích cá nhân
                await userLikeRef.delete();
                
                // 2. Giảm bộ đếm tổng hợp (BUỘC BÁO LỖI NẾU THẤT BẠI)
                await postMetricsRef.set({
                    likeCount: firebase.firestore.FieldValue.increment(-1)
                }, { merge: true }).catch(err => {
                    console.error("LỖI CỐT LÕI (UNLIKE) - BỊ CHẶN BỞI FIREBASE:", err);
                    throw new Error("Lỗi khi giảm bộ đếm tổng hợp.");
                });

            } else {
                // --- LIKE ---
                
                // 1. Ghi lượt thích cá nhân
                await userLikeRef.set({
                    postId: postId,
                    title: postTitle,
                    url: postUrl,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // 2. Tăng bộ đếm tổng hợp (BUỘC BÁO LỖI NẾU THẤT BẠI)
                await postMetricsRef.set({
                    likeCount: firebase.firestore.FieldValue.increment(1)
                }, { merge: true }).catch(err => {
                    console.error("LỖI CỐT LÕI (LIKE) - BỊ CHẶN BỞI FIREBASE:", err);
                    throw new Error("Lỗi khi tăng bộ đếm tổng hợp.");
                });
            }

            console.log("CẬP NHẬT LIKE/UNLIKE THÀNH CÔNG CHO POST:", postId);
            
        } catch (error) {
            // Lỗi ở đây sẽ hiển thị lỗi chi tiết từ throw new Error bên trên
            console.error("LỖI GHI POSTMETRICS CUỐI CÙNG:", error);
            alert("Lỗi Ghi dữ liệu: Vui lòng kiểm tra Console (F12) để xem lỗi chi tiết.");
        }
    };
}

        // === LOGIC ĐIỀU KIỆN ĐĂNG NHẬP (TRUNG TÂM) ===
        auth.onAuthStateChanged((user) => {
            if (user) {
                // ĐÃ ĐĂNG NHẬP: Khởi tạo cho TẤT CẢ các nút Like
                likeBtns.forEach(btn => initSingleLikeButton(btn, user));
            } else {
                // CHƯA ĐĂNG NHẬP: Gán sự kiện yêu cầu đăng nhập cho TẤT CẢ các nút
                likeBtns.forEach(btn => {
                    updateLikeUI(btn, false); // Đảm bảo icon là RỖNG
                    btn.onclick = (e) => {
                        e.preventDefault();
                        alert("Đăng nhập để Thích bài viết này!");
                    };
                });
            }
        });
    }
