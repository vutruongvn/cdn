  // Tính năng tự Fill Tiêu đề và URL bài viết về trang vtzone/p/report.html
document.addEventListener(&#39;DOMContentLoaded&#39;, function() {
    // 1. Khai báo biến
    const reportButton = document.querySelector(&#39;.reportPost&#39;);
    const storageKey = &#39;reportedPostData&#39;; // Đổi key để lưu trữ đối tượng JSON
    
    // 2. Lắng nghe sự kiện click trên nút báo lỗi
    if (reportButton) {
        reportButton.addEventListener(&#39;click&#39;, function(event) {
            
            // Lấy URL bài viết hiện tại
            const currentPostUrl = window.location.href;
            
            // Lấy Tiêu đề bài viết từ thẻ H1 có class .items_postTitle
            const postTitleElement = document.querySelector(&#39;.items_postTitle&#39;);
            const postTitle = postTitleElement ? postTitleElement.innerText.trim() : &#39;Không tìm thấy Tiêu đề&#39;;

            // Tạo đối tượng chứa cả URL và Tiêu đề
            const postData = {
                url: currentPostUrl,
                title: postTitle
            };
            
            // 3. Lưu đối tượng JSON vào localStorage (Cần JSON.stringify)
            try {
                localStorage.setItem(storageKey, JSON.stringify(postData));
                // console.log(&quot;Dữ liệu bài viết đã được lưu vào localStorage:&quot;, postData);
                
                // 4. Chuyển hướng người dùng đến trang báo lỗi
                window.location.href = &quot;/p/report.html&quot;;
                
            } catch (e) {
                console.error(&quot;Lỗi khi lưu dữ liệu vào localStorage:&quot;, e);
                window.location.href = &quot;/p/report.html&quot;;
            }
        });
    }
});
