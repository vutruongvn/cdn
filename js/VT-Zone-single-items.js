// Js for SingleItem === chỉ chạy trên các trang => data:view.isSingleItem
// Function tự add data-fancybox vào thẻ img trong bài viết
/**
 * VT_AutoFancybox_Pro - Tự động bọc link và định danh gallery theo từng bài viết
 */
function VT_AutoFancybox() {
    // 1. Tìm tất cả các container bài viết trong #centerMain
    const posts = document.querySelectorAll('#centerMain .post .postBody_singleItem');

    posts.forEach((post, index) => {
        // 2. Lấy ID bài viết từ thuộc tính của Blogger (thường là post-id hoặc từ class)
        // Nếu không có, dùng index để tạo ID tạm thời
        let postId = post.getAttribute('data-id') || post.id || 'gallery-' + index;
        
        // 3. Tìm tất cả ảnh trong bài viết này
        const postImages = post.querySelectorAll('img');

        postImages.forEach(img => {
            // Kiểm tra nếu ảnh đã có thẻ <a> bao quanh thì bỏ qua
            if (img.closest('a')) return;

            const imageURL = img.getAttribute('data-src') || img.getAttribute('src');

            if (imageURL && !imageURL.startsWith('data:')) {
                const wrapLink = document.createElement('a');
                wrapLink.href = imageURL;
                
                // Gán data-fancybox theo ID bài viết để tạo gallery riêng biệt
                wrapLink.setAttribute('data-fancybox', 'gallery-' + postId);
                
                // Bọc ảnh
                img.parentNode.insertBefore(wrapLink, img);
                wrapLink.appendChild(img);
            }
        });
    });
}

// Chạy khi trang load xong
document.addEventListener('DOMContentLoaded', () => {
    VT_AutoFancybox();
});


// Function thay đổi tên Nặc danh thành tên ngẫu nhiên trong #comments
(function() {
    const anonymousNames = new Set([
        'Nặc danh', 
        'Ẩn danh',
        'Khách', 
        'Anonymous',
        'Unknown' 
    ]);

    // Danh sách các tên sẽ được chọn ngẫu nhiên
    const randomNames = [
    	'Binz',
    	'Sơn Tùng M-TP',
    	'HIEUTHUHAI',
    	'Trịnh Trần Phương Tuấn',
    	'Mỹ Tâm',
    	'Phan Mạnh Quỳnh',
    	'Jack',
    	'Trấn Thành',
    	'Bùi Anh Tuấn'
    ];

    const combinedSelector = '.comment .comment-header > .user';

    document.addEventListener('DOMContentLoaded', function() {
        const elements = document.querySelectorAll(combinedSelector); 
        elements.forEach(function(element) {
            const currentText = element.textContent.trim();
            
            if (anonymousNames.has(currentText)) {
                // Lấy ngẫu nhiên một tên từ danh sách randomNames
                const randomIndex = Math.floor(Math.random() * randomNames.length);
                element.textContent = randomNames[randomIndex];
            }
        });
    });
})();

// Function chỉnh sửa thời gian đăng bình luận trong trang bài viết thành tương đối
(function() {
    // Hàm chuyển đổi chuỗi "3/2/26 20:52" thành đối tượng Date chuẩn
    function parseBloggerDate(dateStr) {
    if (!dateStr) return null;
    
    // Tự động nhận diện dấu phân cách là / hoặc -
    const separator = dateStr.includes('/') ? '/' : '-';
    const parts = dateStr.split(' ');
    if (parts.length < 2) return new Date(dateStr);

    const dateParts = parts[0].split(separator);
    const timeParts = parts[1].split(':');

    // Xử lý năm (YY hoặc YYYY)
    let year = parseInt(dateParts[2]);
    if (year < 100) year += 2000; 

    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    return new Date(year, month, day, hour, minute);
}

    function getTimeAgo(dateString) {
        const past = parseBloggerDate(dateString);
        if (!past || isNaN(past.getTime())) return null;

        const now = new Date();
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return minutes + ' phút';
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + ' giờ';
        
        const days = Math.floor(hours / 24);
        if (days < 30) return days + ' ngày';
        
        return past.toLocaleDateString('vi-VN');
    }

    const processCommentsTime = () => {
        const timeContainers = document.querySelectorAll('.comment-publish');
        timeContainers.forEach(container => {
            const metaTag = container.querySelector('meta[itemprop="datePublished"]');
            const linkTag = container.querySelector('a');

            if (metaTag && linkTag) {
                const rawDate = metaTag.getAttribute('content'); // Lấy "3/2/26 20:52"
                const relativeTime = getTimeAgo(rawDate);
                if (relativeTime) {
                    linkTag.textContent = relativeTime;
                }
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processCommentsTime);
    } else {
        processCommentsTime();
    }
})();


// Khởi tạo tooltip bootstrap 5 in SingleItem
document.addEventListener('DOMContentLoaded', function () {
    // Tìm tất cả các phần tử có thuộc tính data-bs-toggle="tooltip"
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    
    // Khởi tạo từng Tooltip
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
});

// Thông báo Toast: Tính năng Thích bình luận đang phát triển
document.addEventListener('click', function(e) {
    // Kiểm tra nếu click vào .comment-reaction
    const target = e.target.closest('.comment-reaction');
    if (!target) return;

    e.preventDefault();

    // 1. Kiểm tra xem Toast đã tồn tại trong DOM chưa, nếu chưa thì tạo mới
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.innerHTML = `
            <div id="devToast" class="toast align-items-center text-white bg-dark border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fa-solid fa-code-branch me-2"></i> Tính năng này đang được phát triển.
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        document.body.appendChild(toastContainer);
    }

    // 2. Khởi tạo và hiển thị Toast bằng Bootstrap 5 instance
    const toastEl = document.getElementById('devToast');
    const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastEl);
    toastBootstrap.show();
});





