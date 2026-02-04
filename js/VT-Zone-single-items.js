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

        if (diffInSeconds < 60) return 'vừa xong';
        
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


/** ============================
 * JS cho chức năng bình luận của Blog by VT Zone - vutruong.vn (Vanilla JS Version)
 * Tối ưu tốc độ.
    ============================= */

// Đối tượng chứa dữ liệu cấu hình từ Blogger XML
var data = {
    view: { isHomepage: false, isPost: true },
    blog: {
        blogId: "<data:blog.blogId/>", // ID của blog
        postId: "<data:blog.postId/>", // ID bài viết hiện tại
        homepageUrl: "<data:blog.canonicalHomepageUrl/>", // URL trang chủ
        url: "<data:blog.canonicalUrl/>" // URL bài viết hiện tại
    }
};

// Hàm hỗ trợ chèn CSS/JS vào thẻ <head> một cách linh hoạt
function appendChildHead(name, type) {
    let fileref;
    if (type === 'css') {
        fileref = document.createElement('link'); // Tạo thẻ link cho CSS
        fileref.setAttribute('rel', 'stylesheet');
        fileref.setAttribute('href', name);
    } else if (type === 'js') {
        fileref = document.createElement('script'); // Tạo thẻ script cho JS
        fileref.setAttribute('type', 'text/javascript');
        fileref.setAttribute('async', ''); // Tải bất đồng bộ để không chặn render trang
        fileref.setAttribute('src', name);
    }
    if (fileref) {
        document.head.appendChild(fileref); // Chèn vào phần đầu trang
    }
}

// Hàm tải tệp Javascript thuần và thực thi callback sau khi tải xong (Thay thế $.getScript)
function getScriptPure(source, callback) {
    let script = document.createElement('script');
    script.async = 1;
    script.src = source;
    // Lắng nghe sự kiện khi script tải xong hoặc thay đổi trạng thái
    script.onload = script.onreadystatechange = function(_, isAbort) {
        if (isAbort || !script.readyState || /loaded|complete/.test(script.readyState)) {
            script.onload = script.onreadystatechange = null; // Xóa sự kiện để tránh rò rỉ bộ nhớ
            if (!isAbort && callback) callback(); // Gọi hàm phản hồi nếu thành công
        }
    };
    document.head.appendChild(script);
}

const url = window.location.href; // Lấy URL hiện tại của trang
var original_comments_html = ''; // Biến lưu trữ cấu trúc HTML gốc của khu vực bình luận

function initCommentLogic() {
    const commentsEl = document.getElementById('comments'); // Tìm vùng chứa bình luận
    if (!commentsEl) return; // Nếu không thấy thì dừng lại

    // Lấy các thuộc tính cấu hình từ thuộc tính data- của HTML
    const data_embed = commentsEl.getAttribute('data-embed');
    const data_allow_comments = commentsEl.getAttribute('data-allow-comments');
    const elem = document.querySelector('.commentForm'); // Khung chứa form soạn thảo
    
    // Lưu lại HTML gốc của bình luận để phục hồi khi cần (như khi bấm Hủy)
    if (original_comments_html === '') {
        original_comments_html = commentsEl.innerHTML;
    }

    // Chỉ thực thi nếu bài viết cho phép nhúng và cho phép bình luận
    if (data_embed === 'true' && data_allow_comments === 'true') {

        // --- HÀM TẠO IFRAME SOẠN THẢO ---
        const createBloggerIframe = () => {
            if (document.getElementById('comment-editor')) return; // Nếu đã có iframe thì không tạo thêm
            
            // Nếu là kiểu bình luận phân cấp, tải thêm file CSS xác thực của Blogger
            if (commentsEl.classList.contains('threaded')) {
                appendChildHead(`https://www.blogger.com/dyn-css/authorization.css?targetBlogID=${data.blog.blogId}`, 'css');
            }

            // Tạo phần tử iframe để nhúng khung soạn thảo Google
            const iframe = document.createElement('iframe');
            iframe.className = 'blogger-iframe-colorize blogger-comment-from-post';
            iframe.id = 'comment-editor';
            iframe.name = 'comment-editor';
            iframe.src = ''; // Sẽ được JS của Blogger điền sau
            iframe.title = 'comment iframe';
            elem.appendChild(iframe); // Đưa iframe vào form

            // Tải JS xử lý Iframe của Blogger
            getScriptPure('https://www.blogger.com/static/v1/jsbin/2567313873-comment_from_post_iframe.js', function() {
                if (typeof BLOG_CMT_createIframe === 'function') {
                    // Khởi tạo Iframe thông qua hàm gốc của Blogger
                    BLOG_CMT_createIframe('https://www.blogger.com/rpc_relay.html');
                }
                elem.classList.remove('loading'); // Gỡ bỏ hiệu ứng chờ nếu có
            });
        };

        // --- KỊCH BẢN 1: Tải ngay khi URL có đích danh khu vực bình luận ---
        if (url.includes('#comments') || url.includes('?showComment')) {
            if (url.includes('?showComment')) {
                appendChildHead(`https://www.blogger.com/dyn-css/authorization.css?targetBlogID=${data.blog.blogId}`, 'css');
            }
            createBloggerIframe();
        } else {
            // --- KỊCH BẢN 2: Lazy Load (Tải chậm để tối ưu tốc độ) ---
            let isLoaded = false;
            const lazyLoadTrigger = () => {
                if (!isLoaded) {
                    isLoaded = true;
                    createBloggerIframe(); // Bắt đầu tải Iframe
                    // Gỡ bỏ các sự kiện lắng nghe sau khi đã tải xong
                    window.removeEventListener('scroll', lazyLoadTrigger);
                    window.removeEventListener('mousemove', lazyLoadTrigger);
                }
            };
            // Kích hoạt khi cuộn trang, di chuyển chuột hoặc tự động sau 3 giây
            window.addEventListener('scroll', lazyLoadTrigger);
            window.addEventListener('mousemove', lazyLoadTrigger);
            setTimeout(lazyLoadTrigger, 3000);
        }

        // --- LOGIC XỬ LÝ TRẢ LỜI (Dùng Event Delegation để bắt sự kiện click) ---
        document.addEventListener('click', function(e) {
            // Tìm xem người dùng có click vào nút "Trả lời" không
            const replyBtn = e.target.closest('.comment a.comment-reply');
            if (replyBtn) {
                e.preventDefault(); // Ngăn trình duyệt nhảy trang
                const iframe = document.getElementById('comment-editor');
                let currentSrc = iframe.getAttribute('src');
                const commentId = replyBtn.getAttribute('data-comment-id'); // Lấy ID của bình luận được trả lời

                // Xóa nút "Hủy trả lời" cũ nếu đang tồn tại ở nơi khác
                const oldCancel = document.querySelector('.calcel-reply');
                if (oldCancel) oldCancel.remove();

                // Cập nhật tham số parentID vào URL của iframe để Blogger hiểu đây là phản hồi
                if (!currentSrc.includes('&parentID=')) {
                    currentSrc += `&parentID=${commentId}`;
                } else {
                    currentSrc = currentSrc.replace(/&parentID=.*$/, `&parentID=${commentId}`);
                }

                iframe.setAttribute('src', currentSrc); // Cập nhật lại src cho iframe
                replyBtn.parentElement.style.display = 'none'; // Ẩn nút trả lời vừa bấm

                // Tìm vùng chứa phản hồi của bình luận hiện tại
                const parentLi = replyBtn.closest('.comment-thread > ol > li') || replyBtn.closest('li');
                const replyBox = parentLi.querySelector('.comment-replybox-single');
                
                if (replyBox) {
                    replyBox.appendChild(elem); // Di chuyển khung soạn thảo đến dưới bình luận này
                    const cancelDiv = document.createElement('div'); // Tạo nút Hủy
                    cancelDiv.className = 'calcel-reply';
                    cancelDiv.innerHTML = '<a style="font-size:14px;font-weight:500" class="btn btn-light w-100 text-decoration-none mb-3 mt-2" role="button">Hủy trả lời</a>';
                    replyBox.appendChild(cancelDiv);

                    // Xử lý khi bấm nút Hủy
                    cancelDiv.onclick = function() {
                        window.location.reload(); // Tải lại trang để reset trạng thái
                    };
                }
            }

            // Xử lý nút "Xem phản hồi" (Dành cho bình luận có phân cấp)
            const viewRepliesSpan = e.target.closest('.comment .view-replies > span');
            if (viewRepliesSpan) {
                const parent = viewRepliesSpan.parentElement;
                parent.style.display = 'none'; // Ẩn nút "Xem phản hồi"
                parent.nextElementSibling.classList.remove('hidden'); // Hiển thị danh sách phản hồi con
            }
        });

        // --- TỰ ĐỘNG THÊM NÚT "XEM PHẢN HỒI" NẾU CÓ BÌNH LUẬN CON ---
        document.querySelectorAll('.toplevel-thread > ol > li > .comment-replies').forEach(replyArea => {
            // Nếu có bình luận con và chưa có nút bấm thì tạo mới
            if (replyArea.querySelectorAll('.comment-thread > ol > li').length > 0 && !replyArea.previousElementSibling.classList.contains('view-replies')) {
                const count = replyArea.querySelectorAll('.comment-thread > ol > li').length;
                const viewBtn = document.createElement('div');
                viewBtn.className = 'view-replies ms-5 pb-2';
                viewBtn.innerHTML = `<span class="viewRepliesBtn small fw-medium" style="cursor:pointer"><i class="fa-regular fa-angle-down"></i> ${count} phản hồi</span>`;
                replyArea.before(viewBtn);
            }
        });

        // --- LOGIC PHÂN TRANG BÌNH LUẬN ---
        const topComments = document.querySelectorAll('.toplevel-thread > ol > li'); // Danh sách bình luận cấp 1
        const limit = 10; // Mỗi lần hiển thị 10 bình luận
        const total = topComments.length;

        // Ẩn tất cả bình luận vượt quá giới hạn ban đầu
        topComments.forEach((item, index) => {
            if (index < limit) item.classList.remove('hidden');
            else item.classList.add('hidden');
        });

        const loadMoreArea = document.querySelector('#comments .loadmore'); // Vùng chứa nút Xem thêm
        const showLessArea = document.querySelector('#comments .showless'); // Vùng chứa nút Thu gọn

        // Hiển thị nút "Xem thêm" nếu tổng số bình luận lớn hơn giới hạn
        if (total > limit && loadMoreArea) loadMoreArea.classList.remove('hidden');

        // Xử lý sự kiện nút "Xem thêm"
        const btnLoadMore = document.querySelector('#comments .loadmore > a');
        if (btnLoadMore) {
            btnLoadMore.onclick = (e) => {
                e.preventDefault();
                const hiddenItems = document.querySelectorAll('.toplevel-thread > ol > li.hidden');
                
                // Hiển thị thêm tối đa 10 mục đang bị ẩn
                for (let i = 0; i < limit && i < hiddenItems.length; i++) {
                    hiddenItems[i].classList.remove('hidden');
                }

                // Nếu không còn mục ẩn nào, đổi nút Xem thêm thành Thu gọn
                if (document.querySelectorAll('.toplevel-thread > ol > li.hidden').length === 0) {
                    loadMoreArea.classList.add('hidden');
                    if (showLessArea) showLessArea.classList.remove('hidden');
                }
            };
        }

        // Xử lý sự kiện nút "Thu gọn"
        const btnShowLess = document.querySelector('#comments .showless > a');
        if (btnShowLess) {
            btnShowLess.onclick = (e) => {
                e.preventDefault();
                topComments.forEach((item, index) => {
                    if (index >= limit) item.classList.add('hidden'); // Ẩn lại các mục từ thứ 11 trở đi
                });
                showLessArea.classList.add('hidden');
                loadMoreArea.classList.remove('hidden');
                elem.scrollIntoView({ behavior: 'smooth' }); // Cuộn mượt lên khung soạn thảo
            };
        }
    }
}

// Khởi chạy hệ thống sau khi tài liệu đã sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommentLogic);
} else {
    initCommentLogic();
}


