// FULL CODE SCRIPT OPTIMIZED for INDEX - MULTIPLE ITEMS
// VT Zone === vutruong.vn ===

// Function hiển thị comments bên dưới mỗi bài viết trang Index
const VT_PostComments = {
    // 1. Cấu hình
    config: {
        defaultAvatar: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-KgeTskqBUEMrGKXdyXDY-UoKDfmGAnlIITmiGc0bWYAcmkKlJuM1GacV-7OjlKUaIN8dK7WhkhRI3Z2NtgnfdJw3bDQtsMu7FOCnezYZYnoRxoTZhNtJ-WGY54pILgR8K6HsqhaWdXpkoD4l4Uoex11TA8yoEXY71MqG1e_8OiqXAEHhlGBJX1RyHEw/s40/vtzone-default-avatar.jpg',
        adminId: '06242775367226739172',
        verifiedIcon: `<svg class='Admin_verifiedIcon' data-bs-placement='right' data-bs-toggle='tooltip' fill='none' height='1rem' title='Admin' viewBox='0 0 24 24' width='16px' xmlns='http://www.w3.org/2000/svg'><g><path clip-rule='evenodd' d='M9.5924 3.20027C9.34888 3.4078 9.22711 3.51158 9.09706 3.59874C8.79896 3.79854 8.46417 3.93721 8.1121 4.00672C7.95851 4.03705 7.79903 4.04977 7.48008 4.07522C6.6787 4.13918 6.278 4.17115 5.94371 4.28923C5.17051 4.56233 4.56233 5.17051 4.28923 5.94371C4.17115 6.278 4.13918 6.6787 4.07522 7.48008C4.04977 7.79903 4.03705 7.95851 4.00672 8.1121C3.93721 8.46417 3.79854 8.79896 3.59874 9.09706C3.51158 9.22711 3.40781 9.34887 3.20027 9.5924C2.67883 10.2043 2.4181 10.5102 2.26522 10.8301C1.91159 11.57 1.91159 12.43 2.26522 13.1699C2.41811 13.4898 2.67883 13.7957 3.20027 14.4076C3.40778 14.6511 3.51158 14.7729 3.59874 14.9029C3.79854 15.201 3.93721 15.5358 4.00672 15.8879C4.03705 16.0415 4.04977 16.201 4.07522 16.5199C4.13918 17.3213 4.17115 17.722 4.28923 18.0563C4.56233 18.8295 5.17051 19.4377 5.94371 19.7108C6.278 19.8288 6.6787 19.8608 7.48008 19.9248C7.79903 19.9502 7.95851 19.963 8.1121 19.9933C8.46417 20.0628 8.79896 20.2015 9.09706 20.4013C9.22711 20.4884 9.34887 20.5922 9.5924 20.7997C10.2043 21.3212 10.5102 21.5819 10.8301 21.7348C11.57 22.0884 12.43 22.0884 13.1699 21.7348C13.4898 21.5819 13.7957 21.3212 14.4076 20.7997C14.6511 20.5922 14.7729 20.4884 14.9029 20.4013C15.201 20.2015 15.5358 20.0628 15.8879 19.9933C16.0415 19.963 16.201 19.9502 16.5199 19.9248C17.3213 19.8608 17.722 19.8288 18.0563 19.7108C18.8295 19.4377 19.4377 18.8295 19.7108 18.0563C19.8288 17.722 19.8608 17.3213 19.9248 16.5199C19.9502 16.201 19.963 16.0415 19.9933 15.8879C20.0628 15.5358 20.2015 15.201 20.4013 14.9029C20.4884 14.7729 20.5922 14.6511 20.7997 14.4076C21.3212 13.7957 21.5819 13.4898 21.7348 13.1699C22.0884 12.43 22.0884 11.57 21.7348 10.8301C21.5819 10.5102 21.3212 10.2043 20.7997 9.5924C20.5922 9.34887 20.4884 9.22711 20.4013 9.09706C20.2015 8.79896 20.0628 8.46417 19.9933 8.1121C19.963 7.95851 19.9502 7.79903 19.9248 7.48008C19.8608 6.6787 19.8288 6.278 19.7108 5.94371C19.4377 5.17051 18.8295 4.56233 18.0563 4.28923C17.722 4.17115 17.3213 4.13918 16.5199 4.07522C16.201 4.04977 16.0415 4.03705 15.8879 4.00672C15.5358 3.93721 15.201 3.79854 14.9029 3.59874C14.7729 3.51158 14.6511 3.40781 14.4076 3.20027C13.7957 2.67883 13.4898 2.41811 13.1699 2.26522C12.43 1.91159 11.57 1.91159 10.8301 2.26522C10.5102 2.4181 10.2043 2.67883 9.5924 3.20027ZM16.3735 9.86314C16.6913 9.5453 16.6913 9.03 16.3735 8.71216C16.0557 8.39433 15.5403 8.39433 15.2225 8.71216L10.3723 13.5624L8.77746 11.9676C8.45963 11.6498 7.94432 11.6498 7.62649 11.9676C7.30866 12.2854 7.30866 12.8007 7.62649 13.1186L9.79678 15.2889C10.1146 15.6067 10.6299 15.6067 10.9478 15.2889L16.3735 9.86314Z' fill='#4285F4' fill-rule='evenodd'/></g></svg>`,
        // Danh sách tên random cho người ẩn danh
        anonymousNames: [
            'Binz',
            'M-TP',
            'HIEUTHUHAI',
            'Trịnh Trần Phương Tuấn',
            'Mỹ Tâm',
            'Phan Mạnh Quỳnh',
            'Jack',
            'J97',
            'Trấn Thành',
            'Bùi Anh Tuấn'
        ]
    },

    // 2. Xử lý ảnh đại diện
    resizeAvatar(url, size) {
        if (!url || url.includes('blank.gif')) return this.config.defaultAvatar;
        return url.replace(/\/s\d+(-c)?\//g, `/s${size}-c/`);
    },

    // Hàm đổi tên người ẩn danh Random
    renameAnonymous(name) {
        const checkNames = ['Anonymous', 'Ẩn danh'];
        if (checkNames.includes(name)) {
            const names = this.config.anonymousNames;
            // Tính toán vị trí ngẫu nhiên trong mảng
            const randomIndex = Math.floor(Math.random() * names.length);
            return names[randomIndex];
        }
        return name;
    },
    
    // Hàm tính khoảng thời gian
    timeAgo(dateString) {
        const now = new Date();
        const past = new Date(dateString);
        const diffInSeconds = Math.floor((now - past) / 1000);

        if (diffInSeconds < 60) return 'vừa xong';
        
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `${minutes} phút`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ`;
        
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} ngày`;
        
        return past.toLocaleDateString('vi-VN');
    },

    // 3. Render HTML từng mục
    renderItem(entry) {
        const author = entry.author[0];
        // Sử dụng hàm renameAnonymous tại đây
        const authorName = this.renameAnonymous(author.name.$t);
        const authorUri = author.uri?.$t || '';
        const isAdmin = authorUri.includes(this.config.adminId);
        
        const commentLink = entry.link.find(l => l.rel === 'alternate')?.href || '#';
        const publishedDate = entry.published.$t;
        const timeDisplay = this.timeAgo(publishedDate);
        
        const avatar = this.resizeAvatar(author.gd$image?.src, 40);
        const content = entry.content.$t.replace(/<[^>]*>?/gm, '').substring(0, 80) + '';

        return `
            <li class="list-comment-post m-0 p-0">
                    <div class="comment-wrapper d-flex align-items-start gap-2">
                        <img loading="lazy" class="comment-avatar rounded-pill m-0" src="${avatar}" alt="${authorName}">
                        <div class="comment-info py-2 px-3 rounded-4">
                            <span class="comment-author comment-full-name-user fw-medium">
                                ${authorName} ${isAdmin ? this.config.verifiedIcon : ''}
                            </span>
                            <span class="comment-text comment-content-body">
                                ${content}
                            </span>
                        </div>
                    </div>
                    <div class="comment-meta d-flex align-items-center gap-2 ms-5 mt-1 small" style="font-size:12px">
                        <a href="${commentLink}" class="comment-time ms-3">${timeDisplay}</a> 
                        <a href="${commentLink}" class="comment-reply-action text-decoration-none fw-medium" title="Trả lời">Trả lời</a>
                    </div>
            </li>`;
    },

    // 4. Hàm fetch và đổ dữ liệu
    async load(container) {
        const postId = container.getAttribute('data-post-id');
        if (!postId || container.classList.contains('loaded')) return;

        try {
            const response = await fetch(`/feeds/${postId}/comments/default?alt=json&max-results=3`);
            if (!response.ok) throw new Error('Network response error');
            
            const data = await response.json();
            const entries = data.feed.entry;

            if (entries && entries.length > 0) {
                let html = '<ul class="post-comment-list list-unstyled p-3 pb-0 m-0 d-flex flex-column gap-2">';
                entries.forEach(entry => html += this.renderItem(entry));
                html += '</ul>';
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div class="py-2 px-3 m-3 mb-0 rounded-3 d-none" style="background:#f2f3f5"><i class="fa-regular fa-duotone fa-user me-2"></i>Bình luận</div>';
            }
            container.classList.add('loaded');

        } catch (error) {
            console.error(`Error loading comments for ${postId}:`, error);
            container.innerHTML = '';
        }
    },

    // 5. Hàm khởi tạo
    init() {
        const containers = document.querySelectorAll('.multipleItems-rc:not(.loaded)');
        containers.forEach(el => this.load(el));
    }
};
document.addEventListener('DOMContentLoaded', () => VT_PostComments.init());

// Function đăng bình luận trực tiếp theo từng bài viết tại trang Multiple Items
// === by VT Zone ===
document.addEventListener('DOMContentLoaded', function() {
    const BLOG_ID = '3049740051705190505';

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.VTmultipleItems_postCommentWrapper_btnClicktoLoadIframe');
        if (!btn) return;

        const postId = btn.getAttribute('data-post-id');
        const container = document.getElementById('comment-box-' + postId);

        if (container) {
			container.innerHTML = `<div class="loading-status position-absolute w-100 d-flex align-items-center justify-content-center" style="height:210px;font-size:1.2rem"><i class="fa-pro fa-duotone fa-spinner-third fa-spin"></div>`;
            const iframe = document.createElement('iframe');
            const src = 'https://www.blogger.com/comment-iframe.g?blogID=' + BLOG_ID + '&postID=' + postId + '&skin=contempo';
            iframe.src = src;
            iframe.width = '100%';
            iframe.height = '210px';
            iframe.frameBorder = '0';
            iframe.scrolling = 'auto';
            iframe.style.display = 'block';
            iframe.style.border = '1px solid #eee';
            iframe.style.margin = '1rem 0 .25rem';

            iframe.onload = function() {
                const loader = container.querySelector('.loading-status');
                if (loader) loader.remove();
            };

            container.appendChild(iframe);
            // btn.remove(); 
        }
    });
});

// ============== PHẦN 1: CÁC HÀM HỖ TRỢ (TIME, SLUG, TOOLTIP) ==============

// 1. Định nghĩa đoạn HTML Skeleton
const SKELETON_TEMPLATE = "<div class='VT-timeline-loading-animation vt-temp-ske mb-3'>" +
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
    if (seconds / TIME_UNITS.year > 1) return Math.floor(seconds / TIME_UNITS.year) + " năm trước";
    if (seconds / TIME_UNITS.month > 1) return Math.floor(seconds / TIME_UNITS.month) + " tháng trước";
    const days = Math.floor(seconds / TIME_UNITS.day);
    if (days >= 1) {
        if (days < 15) return days === 1 ? "Hôm qua" : days + " ngày trước";
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
            btnContainer.className = 'VT_ajaxLoadMorePosts';
            
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
    			rootMargin: '0px 0px 300px 0px', // Đón đầu 300px từ phía dưới
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
    const images = document.querySelectorAll('#centerMain img:not(.lazy-processed)');

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















