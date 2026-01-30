  // Tính năng tự Fill Tiêu đề và URL bài viết về trang vtzone/p/report.html
document.addEventListener('DOMContentLoaded', function() {
    // 1. Khai báo biến
    const reportButton = document.querySelector('.reportPost');
    const storageKey = 'reportedPostData'; // Đổi key để lưu trữ đối tượng JSON
    
    // 2. Lắng nghe sự kiện click trên nút báo lỗi
    if (reportButton) {
        reportButton.addEventListener('click', function(event) {
            
            // Lấy URL bài viết hiện tại
            const currentPostUrl = window.location.href;
            
            // Lấy Tiêu đề bài viết từ thẻ H1 có class .items_postTitle
            const postTitleElement = document.querySelector('.items_postTitle');
            const postTitle = postTitleElement ? postTitleElement.innerText.trim() : 'Không tìm thấy Tiêu đề';

            // Tạo đối tượng chứa cả URL và Tiêu đề
            const postData = {
                url: currentPostUrl,
                title: postTitle
            };
            
            // 3. Lưu đối tượng JSON vào localStorage (Cần JSON.stringify)
            try {
                localStorage.setItem(storageKey, JSON.stringify(postData));
                // console.log("Dữ liệu bài viết đã được lưu vào localStorage:", postData);
                
                // 4. Chuyển hướng người dùng đến trang báo lỗi
                window.location.href = "https://www.vutruong.vn/p/report.html";
                
            } catch (e) {
                console.error("Lỗi khi lưu dữ liệu vào localStorage:", e);
                window.location.href = "https://www.vutruong.vn/p/report.html";
            }
        });
    }
});


