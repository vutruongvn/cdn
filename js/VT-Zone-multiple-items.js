// FULL CODE SCRIPT OPTIMIZED for INDEX - MULTIPLE ITEMS
// VT Zone === vutruong.vn ===

// ============== PHẦN 1: CÁC HÀM HỖ TRỢ (TIME, SLUG, TOOLTIP) ==============

// 1. Skeleton loading template
const SKELETON_TEMPLATE = "<div class='VT-timeline-loading-animation vt-temp-ske'>" +
  "<div class='vt-loading-effect-header-wrap'>" +
    "<div class='vt-loading-effect-avatar'></div>" +
    "<div class='vt-loading-effect-info-block'>" +
      "<div class='vt-loading-effect-username vt-loading-effect-loading'></div>" +
      "<div class='vt-loading-effect-time vt-loading-effect-loading'></div>" +
    "</div>" +
  "</div>" +
  "<div class='vt-loading-effect-content-wrap'>" +
    "<div class='vt-loading-effect-text-line-main vt-loading-effect-loading'></div>" +
    "<div class='vt-loading-effect-text-line vt-loading-effect-loading'></div>" +
    "<div class='vt-loading-effect-text-line vt-loading-effect-loading'></div>" +
    "<div class='vt-loading-effect-text-line vt-loading-effect-loading'></div>" +
    "<div class='vt-loading-effect-text-line-last vt-loading-effect-loading'></div>" +
  "</div>" +
  "<div style='display: flex; margin-top: 10px; justify-content: start;'>" +
    "<div class='vt-loading-effect-small-block vt-loading-effect-loading'></div>" +
    "<div class='vt-loading-effect-small-block vt-loading-effect-loading'></div>" +
  "</div>" +
"</div>";

// 2. Tính toán thời gian tương đối
const TIME_UNITS = { year: 31536000, month: 2592000, day: 86400, hour: 3600, minute: 60 };

function timeSince(date) {
    if (!date || isNaN(date.getTime())) return null; 
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds / TIME_UNITS.year > 1) return Math.floor(seconds / TIME_UNITS.year) + " năm";
    if (seconds / TIME_UNITS.month > 1) return Math.floor(seconds / TIME_UNITS.month) + " tháng";
    const days = Math.floor(seconds / TIME_UNITS.day);
    if (days >= 1) {
        if (days < 15) return days === 1 ? "Hôm qua" : days + " ngày";
        return null; 
    }
    if (seconds / TIME_UNITS.hour > 1) return Math.floor(seconds / TIME_UNITS.hour) + " giờ";
    if (seconds / TIME_UNITS.minute > 1) return Math.floor(seconds / TIME_UNITS.minute) + " phút";
    return seconds <= 50 ? "Vừa xong" : Math.floor(seconds) + " giây";
}

// 3. Chuyển đổi slug cho Hashtag
function toSlug(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

// 4. Khởi tạo Bootstrap Tooltips (Tính năng mới thêm vào)
function initBootstrapTooltips() {
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]:not([data-bs-initialized])');
        tooltipTriggerList.forEach(el => {
            new bootstrap.Tooltip(el);
            el.setAttribute('data-bs-initialized', 'true'); // Đánh dấu để không khởi tạo trùng lặp
        });
    }
}

// ============== PHẦN 2: CÁC CHỨC NĂNG TƯƠNG TÁC ==============

let isPopupShowing = false;
function initNewLikeButtons() {
    if (typeof db === 'undefined' || typeof auth === 'undefined') return;
    const likeBtns = document.querySelectorAll('.likePost:not(.firebase-like-btn)');
    if (likeBtns.length === 0) return;

    // 1. Kiểm tra và tự động tạo HTML cho Toast nếu chưa có
    let toastEl = document.getElementById('loginToast');
    if (!toastEl) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1060'; // Đảm bảo nằm trên các layer khác
        toastContainer.innerHTML = `
            <div id="loginToast" class="toast align-items-center text-white bg-dark border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fa-solid fa-circle-info me-2"></i>Đăng nhập để Thích bài viết này!
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>`;
        document.body.appendChild(toastContainer);
        toastEl = document.getElementById('loginToast');
    }

    // 2. Khởi tạo Bootstrap Toast instance
    const loginToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });

    auth.onAuthStateChanged((user) => {
        likeBtns.forEach(btn => {
            if (user) {
                if (typeof initSingleLikeButton === 'function') initSingleLikeButton(btn, user);
            } else {
                if (typeof updateLikeUI === 'function') updateLikeUI(btn, false);
                
                btn.onclick = (e) => {
                    e.preventDefault();
                    // Hiển thị Toast
                    loginToast.show();
                };
            }
            btn.classList.add('firebase-like-btn');
        });
    });
}
function applyPostLogic() {
    // Xử lý ngày tháng
    document.querySelectorAll('.post-date-iso:not([data-relative-applied])').forEach(el => {
        const isoDate = el.getAttribute('datetime');
        if (isoDate) {
            const dateObj = new Date(isoDate);
            const relative = timeSince(dateObj);
            if (relative) { el.innerHTML = relative; el.setAttribute('data-relative-applied', 'true'); }
        }
    });

    // Xử lý Hashtag
    document.querySelectorAll('.home_hashtagPost a:not([data-slug-converted])').forEach(link => {
        link.innerText = toSlug(link.innerText);
        link.setAttribute('data-slug-converted', 'true');
    });
    
    // Kích hoạt Tooltip cho các bài viết (Cả cũ và mới)
    initBootstrapTooltips();
    
    // Kiểm tra biến Global an toàn trước khi gọi
    if (typeof auth !== 'undefined') initNewLikeButtons();
    
    if (typeof initLikeCountDisplay === 'function') {
        initLikeCountDisplay(document.querySelector('div.blog-posts'));
    }
}

// ============== PHẦN 3: AJAX LOAD MORE (VANILLA JS + FETCH) ==============

(function() {
    let nextUrl = "";
    const postContainerSelector = "div.blog-posts";
    let isLoading = false;
    let loadMoreBtn;

    async function loadMorePosts() {
        if (isLoading || !nextUrl) return;
        isLoading = true;

        const container = document.querySelector(postContainerSelector);
        if (!container) return;
        
        loadMoreBtn.querySelector('.loadMore_text').style.display = 'none';
        loadMoreBtn.querySelector('.loadingMore_text').style.display = 'inline-block';
        
        container.insertAdjacentHTML('beforeend', SKELETON_TEMPLATE);

        try {
            const response = await fetch(nextUrl);
            const html = await response.text();
            
            await new Promise(resolve => setTimeout(resolve, 500));

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const newPosts = doc.querySelector(postContainerSelector).children;

            const tempSke = container.querySelector('.vt-temp-ske');
            if (tempSke) tempSke.remove();

            Array.from(newPosts).forEach(post => {
                const clone = post.cloneNode(true);
                clone.style.display = 'block'; 
                clone.style.opacity = '1';
                container.appendChild(clone);
            });

            const nextLinkEl = doc.querySelector("a.blog-pager-older-link");
            nextUrl = nextLinkEl ? nextLinkEl.getAttribute("href") : "";

            // Sau khi thêm bài mới, gọi hàm này để xử lý logic và Tooltip cho các phần tử mới
            applyPostLogic();
            updateButtonState();
            VT_PostComments.init();
            VT_homePostLayout();
            VT_checkReadMore();
            VT_LazyLoad();
			VT_CommentManager.init();
			window.VT_InitCommentSystem(); // Module Comments Google Firestore Database
			
        } catch (error) {
            console.error("Lỗi khi tải bài viết:", error);
            const tempSke = container.querySelector('.vt-temp-ske');
            if (tempSke) tempSke.remove();
        } finally {
            isLoading = false;
        }
    }

    function updateButtonState() {
        const loadMoreText = loadMoreBtn.querySelector('.loadMore_text');
        const loadingText = loadMoreBtn.querySelector('.loadingMore_text');
        const allViewedText = loadMoreBtn.querySelector('.allViewed_text');

        loadingText.style.display = 'none';
        if (nextUrl) {
            loadMoreText.style.display = 'inline-block';
            allViewedText.style.display = 'none';
        } else {
            loadMoreText.style.display = 'none';
            allViewedText.style.display = 'inline-block';
            loadMoreBtn.classList.add('viewed-all');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.pageType !== "item") {
            const olderLink = document.querySelector("a.blog-pager-older-link");
            if (!olderLink) return;

            nextUrl = olderLink.getAttribute("href");

            const btnContainer = document.createElement('div');
            btnContainer.className = 'VT_ajaxLoadMorePosts mt-3';
            
            loadMoreBtn = document.createElement('a');
            loadMoreBtn.className = 'VT_loadMorePost ripple';
            loadMoreBtn.href = 'javascript:;';
            loadMoreBtn.innerHTML = "<span class='loadMore_text'>Xem thêm <i class='fad fa-angle-down ms-1'></i></span>" +
                "<span class='loadingMore_text' style='display:none'><i class='fa-duotone fa-spinner-third fa-spin'></i></span>" +
                "<span class='allViewed_text' style='display:none'>Bạn đã xem hết rồi <i class='fad fa-exclamation fa-shake ms-1'></i></span>";

            btnContainer.appendChild(loadMoreBtn);
            const pager = document.getElementById('blog-pager');
            if (pager) {
                pager.parentNode.insertBefore(btnContainer, pager);
                pager.style.display = 'none';
            }

            loadMoreBtn.addEventListener('click', loadMorePosts);

            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading && nextUrl) {
                    loadMorePosts();
                }
            }, { 
    			root: null, // Theo dõi dựa trên khung hình trình duyệt
    			rootMargin: '0px 0px 1000px 0px', // Đón đầu 300px từ phía dưới
    			threshold: 0.01 // Chỉ cần chớm xuất hiện 1% là kích hoạt
			});

            observer.observe(btnContainer);
            
            // Lần đầu khởi chạy khi load trang
            applyPostLogic();
            VT_homePostLayout();
            VT_checkReadMore();
        }
    });
})();

// Function bấm nút xem thêm v-fullPost trang index show full bài viết
document.addEventListener('click', function (e) {
    // 1. Kiểm tra click vào nút "Xem thêm"
    if (e.target && e.target.classList.contains('v-fullPost')) {
        e.preventDefault();

        const btn = e.target;
        const postBody = btn.previousElementSibling; // Nội dung bài viết
        const featuredImg = btn.nextElementSibling;  // Ảnh featured bên ngoài

        if (postBody && postBody.classList.contains('postBodyLimited')) {
            // A. Xóa class giới hạn để bung nội dung
            postBody.classList.remove('postBodyLimited');

            // ============================================================
            // B. LOGIC MỚI: TỰ ĐỘNG THÊM DATA-FANCYBOX CHO ẢNH
            // ============================================================
            
            // Tạo một ID ngẫu nhiên cho nhóm ảnh của bài viết này 
            // (Giúp Fancybox hiểu các ảnh này thuộc cùng 1 album, ko lẫn sang bài khác)
            const galleryId = 'gallery-' + Math.floor(Math.random() * 1000000);

            // Tìm tất cả các thẻ <a> liên kết đến file ảnh (jpg, png, webp, jpeg, gif)
            const imageLinks = postBody.querySelectorAll('a[href$=".jpg"], a[href$=".png"], a[href$=".jpeg"], a[href$=".webp"], a[href$=".gif"]');

            imageLinks.forEach(link => {
                // 1. Thêm data-fancybox với ID nhóm
                link.setAttribute('data-fancybox', galleryId);
                
                // 2. (Tùy chọn) Thêm caption cho Fancybox từ thẻ img bên trong
                const imgChild = link.querySelector('img');
                if (imgChild && imgChild.alt) {
                    link.setAttribute('data-caption', imgChild.alt);
                }
            });
            // ============================================================
        }

        // 3. Ẩn nút "Xem thêm"
        btn.classList.add('d-none');

        // 4. Ẩn ảnh Featured bên ngoài (nếu có)
        if (featuredImg && featuredImg.classList.contains('postFeaturedImage')) {
            featuredImg.classList.add('d-none');
        }
    }
});


// Thông báo lần đầu truy cập Blog và Ghim ra màn hình chính (chỉ xuất hiện lần đầu truy cập)
// VT Zone
// vutruong.vn

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

/* =========================================
 * VT_LazyLoad v2.0 - Tối ưu cho vutruong.vn
 * Đã cấu hình tải trước 300px
 ========================================= */

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        // Khi ảnh chạm vào vùng đệm 300px bên dưới màn hình
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');

            if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                // Khi ảnh thật tải xong thì hiện ra
                img.onload = () => {
                    img.style.opacity = '1';
                };
            }
            
            // Dừng theo dõi ảnh này vì đã xử lý xong
            observer.unobserve(img);
        }
    });
}, { 
    root: null, // Theo dõi dựa trên khung hình trình duyệt
    rootMargin: '0px 0px 300px 0px', // Đón đầu 300px từ phía dưới
    threshold: 0.01 // Chỉ cần chớm xuất hiện 1% là kích hoạt
});



function VT_LazyLoad() {
    // Chỉ xử lý ảnh trong #centerMain và chưa được đánh dấu lazy
    const images = document.querySelectorAll('.VT_homePostGallery img:not(.lazy-processed)');

    images.forEach(img => {
        const currentSrc = img.getAttribute('src');

        // Bỏ qua nếu không có src hoặc đã là ảnh base64
        if (!currentSrc || currentSrc.startsWith('data:') || img.classList.contains('no-lazy')) return;

        // Đánh dấu để không quét lại ảnh này lần sau
        img.classList.add('lazy-processed');

        // Chuyển src thật sang data-src
        img.setAttribute('data-src', currentSrc);
        
        // Gán placeholder (ảnh trắng siêu nhẹ)
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        
        // Thiết lập hiệu ứng mượt mà
        img.style.opacity = '0';
        img.style.transition = 'transform .3s ease, opacity 1s ease';
        img.style.backgroundColor = '#f2f3f5';

        // Bắt đầu theo dõi
        imageObserver.observe(img);
    });
}

// Chạy khi DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_LazyLoad);
} else {
    VT_LazyLoad();
}




































