// =========================================================================================
/**
 * VUTRUONG.VN - MULTIPLE ITEMS PAGE SCRIPTS
 * Chạy trên trang Index / Multiple Items
 * Phiên bản: 5.0.0
 * Cập nhật: 18/2/2026
 */
// =========================================================================================

console.log("[Multiple Items] Scripts đang khởi tạo...");

// =====================
// HIỂN THỊ COMMENT MỚI NHẤT DƯỚI MỖI BÀI VIẾT (Blogger API)
// Fetch từ Blogger JSON Feed - không dùng Firestore
// =====================

const VT_PostComments = {

    config: {
        defaultAvatar: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-KgeTskqBUEMrGKXdyXDY-UoKDfmGAnlIITmiGc0bWYAcmkKlJuM1GacV-7OjlKUaIN8dK7WhkhRI3Z2NtgnfdJw3bDQtsMu7FOCnezYZYnoRxoTZhNtJ-WGY54pILgR8K6HsqhaWdXpkoD4l4Uoex11TA8yoEXY71MqG1e_8OiqXAEHhlGBJX1RyHEw/s40/vtzone-default-avatar.jpg',
        adminId:       '06242775367226739172',
        verifiedIcon:  `<svg class='Admin_verifiedIcon' data-bs-placement='right' data-bs-toggle='tooltip' fill='none' height='1rem' title='Admin' viewBox='0 0 24 24' width='16px' xmlns='http://www.w3.org/2000/svg'><g><path clip-rule='evenodd' d='M9.5924 3.20027C9.34888 3.4078 9.22711 3.51158 9.09706 3.59874C8.79896 3.79854 8.46417 3.93721 8.1121 4.00672C7.95851 4.03705 7.79903 4.04977 7.48008 4.07522C6.6787 4.13918 6.278 4.17115 5.94371 4.28923C5.17051 4.56233 4.56233 5.17051 4.28923 5.94371C4.17115 6.278 4.13918 6.6787 4.07522 7.48008C4.04977 7.79903 4.03705 7.95851 4.00672 8.1121C3.93721 8.46417 3.79854 8.79896 3.59874 9.09706C3.51158 9.22711 3.40781 9.34887 3.20027 9.5924C2.67883 10.2043 2.4181 10.5102 2.26522 10.8301C1.91159 11.57 1.91159 12.43 2.26522 13.1699C2.41811 13.4898 2.67883 13.7957 3.20027 14.4076C3.40778 14.6511 3.51158 14.7729 3.59874 14.9029C3.79854 15.201 3.93721 15.5358 4.00672 15.8879C4.03705 16.0415 4.04977 16.201 4.07522 16.5199C4.13918 17.3213 4.17115 17.722 4.28923 18.0563C4.56233 18.8295 5.17051 19.4377 5.94371 19.7108C6.278 19.8288 6.6787 19.8608 7.48008 19.9248C7.79903 19.9502 7.95851 19.963 8.1121 19.9933C8.46417 20.0628 8.79896 20.2015 9.09706 20.4013C9.22711 20.4884 9.34887 20.5922 9.5924 20.7997C10.2043 21.3212 10.5102 21.5819 10.8301 21.7348C11.57 22.0884 12.43 22.0884 13.1699 21.7348C13.4898 21.5819 13.7957 21.3212 14.4076 20.7997C14.6511 20.5922 14.7729 20.4884 14.9029 20.4013C15.201 20.2015 15.5358 20.0628 15.8879 19.9933C16.0415 19.963 16.201 19.9502 16.5199 19.9248C17.3213 19.8608 17.722 19.8288 18.0563 19.7108C18.8295 19.4377 19.4377 18.8295 19.7108 18.0563C19.8288 17.722 19.8608 17.3213 19.9248 16.5199C19.9502 16.201 19.963 16.0415 19.9933 15.8879C20.0628 15.5358 20.2015 15.201 20.4013 14.9029C20.4884 14.7729 20.5922 14.6511 20.7997 14.4076C21.3212 13.7957 21.5819 13.4898 21.7348 13.1699C22.0884 12.43 22.0884 11.57 21.7348 10.8301C21.5819 10.5102 21.3212 10.2043 20.7997 9.5924C20.5922 9.34887 20.4884 9.22711 20.4013 9.09706C20.2015 8.79896 20.0628 8.46417 19.9933 8.1121C19.963 7.95851 19.9502 7.79903 19.9248 7.48008C19.8608 6.6787 19.8288 6.278 19.7108 5.94371C19.4377 5.17051 18.8295 4.56233 18.0563 4.28923C17.722 4.17115 17.3213 4.13918 16.5199 4.07522C16.201 4.04977 16.0415 4.03705 15.8879 4.00672C15.5358 3.93721 15.201 3.79854 14.9029 3.59874C14.7729 3.51158 14.6511 3.40781 14.4076 3.20027C13.7957 2.67883 13.4898 2.41811 13.1699 2.26522C12.43 1.91159 11.57 1.91159 10.8301 2.26522C10.5102 2.4181 10.2043 2.67883 9.5924 3.20027ZM16.3735 9.86314C16.6913 9.5453 16.6913 9.03 16.3735 8.71216C16.0557 8.39433 15.5403 8.39433 15.2225 8.71216L10.3723 13.5624L8.77746 11.9676C8.45963 11.6498 7.94432 11.6498 7.62649 11.9676C7.30866 12.2854 7.30866 12.8007 7.62649 13.1186L9.79678 15.2889C10.1146 15.6067 10.6299 15.6067 10.9478 15.2889L16.3735 9.86314Z' fill='#4285F4' fill-rule='evenodd'/></g></svg>`,
        anonymousNames: ['Binz','M-TP','HIEUTHUHAI','Trịnh Trần Phương Tuấn','Nguyễn Thanh Tùng','Phan Mạnh Quỳnh','Jack - J97','Trấn Thành','Mono']
    },

    resizeAvatar(url, size) {
        if (!url || url.includes('blank.gif')) return this.config.defaultAvatar;
        return url.replace(/\/s\d+(-c)?\//g, `/s${size}-c/`);
    },

    renameAnonymous(name) {
        if (['Anonymous', 'Ẩn danh'].includes(name)) {
            return this.config.anonymousNames[Math.floor(Math.random() * this.config.anonymousNames.length)];
        }
        return name;
    },

    timeAgo(dateString) {
        const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (diff < 60)   return 'vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
        const days = Math.floor(diff / 86400);
        if (days < 30)   return `${days} ngày`;
        return new Date(dateString).toLocaleDateString('vi-VN');
    },

    renderItem(entry) {
        const author     = entry.author[0];
        const authorName = this.renameAnonymous(author.name.$t);
        const authorUri  = author.uri?.$t || '';
        const isAdmin    = authorUri.includes(this.config.adminId);
        const link       = entry.link.find(l => l.rel === 'alternate')?.href || '#';
        const time       = this.timeAgo(entry.published.$t);
        const avatar     = this.resizeAvatar(author.gd$image?.src, 40);
        const content    = entry.content.$t.replace(/<[^>]*>?/gm, '').substring(0, 80);

        return `
            <li class="list-comment-post m-0 p-0">
                <div class="comment-wrapper d-flex align-items-start gap-2">
                    <img loading="lazy" class="comment-avatar rounded-pill m-0" src="${avatar}" alt="${authorName}">
                    <div class="comment-info py-2 px-3 rounded-4">
                        <span class="comment-author comment-full-name-user fw-medium">
                            ${authorName} ${isAdmin ? this.config.verifiedIcon : ''}
                        </span>
                        <span class="comment-text comment-content-body">${content}</span>
                    </div>
                </div>
                <div class="comment-meta d-flex align-items-center gap-2 ms-5 mt-1 small" style="font-size:12px">
                    <a href="${link}" class="comment-time ms-3">${time}</a>
                    <a href="${link}" class="comment-reply-action text-decoration-none fw-medium" title="Trả lời">Trả lời</a>
                </div>
            </li>`;
    },

    async load(container) {
        const postId = container.getAttribute('data-post-id');
        if (!postId || container.classList.contains('loaded')) return;
        try {
            const res  = await fetch(`/feeds/${postId}/comments/default?alt=json&max-results=3`);
            if (!res.ok) throw new Error('Network error');
            const data    = await res.json();
            const entries = data.feed.entry;
            if (entries && entries.length > 0) {
                let html = '<ul class="post-comment-list list-unstyled p-0 px-3 m-0 mt-3 d-flex flex-column gap-2">';
                entries.forEach(e => html += this.renderItem(e));
                html += '</ul>';
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div class="py-2 px-3 m-3 mb-0 rounded-3 d-none" style="background:#f2f3f5"><i class="fa-regular fa-duotone fa-user me-2"></i>Bình luận</div>';
            }
            container.classList.add('loaded');
        } catch(err) {
            console.error(`[PostComments] Lỗi tải comment bài ${postId}:`, err);
            container.innerHTML = '';
        }
    },

    init() {
        const containers = document.querySelectorAll('.multipleItems-rc:not(.loaded)');
        containers.forEach(el => this.load(el));
    }
};

document.addEventListener('DOMContentLoaded', () => VT_PostComments.init());

// =====================
// COMMENT MANAGER - Blogger iframe embed
// Lazy load iframe comment và tự động mở rộng
// =====================

const VT_CommentManager = (() => {
    const BLOG_ID = '3049740051705190505';

    // 1. Lazy load iframe khi bài viết vào vùng nhìn thấy
    const VT_InitLazyLoad = () => {
        const containers = document.querySelectorAll('[id^="comment-box-"]:not(.vt-initialized)');
        const options    = { root: null, rootMargin: '10px 0px', threshold: 0.01 };

        const createIframe = (container) => {
            const postId = container.id.replace('comment-box-', '');
            if (!postId) return;

            container.classList.add('vt-initialized');
            container.innerHTML = `<div class="loading-status d-flex align-items-center justify-content-center position-absolute w-100 start-50 translate-middle-x" style="height:70px;font-size:1.2rem"><i class="fa-pro fa-duotone fa-spinner-third fa-spin"></i></div>`;

            const iframe        = document.createElement('iframe');
            iframe.src          = `https://www.blogger.com/comment-iframe.g?blogID=${BLOG_ID}&postID=${postId}&skin=contempo`;
            iframe.width        = '100%';
            iframe.height       = '70px';
            iframe.frameBorder  = '0';
            iframe.scrolling    = 'auto';
            iframe.style.cssText = 'display:block;border:1px solid #eee;border-radius:12px;margin:1rem 0 0;opacity:0;transition:opacity 0.5s ease,height 0.5s ease';

            iframe.onload = function() {
                container.querySelector('.loading-status')?.remove();
                iframe.style.opacity = '1';
            };
            container.appendChild(iframe);
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) { createIframe(entry.target); obs.unobserve(entry.target); }
            });
        }, options);

        containers.forEach(c => observer.observe(c));
    };

    // 2. Tự động mở rộng iframe khi user click vào
    const VT_InitAutoExpand = () => {
        document.addEventListener('pointerdown', (e) => {
            const container = e.target.closest('.VTmultipleItems_postCommentWrapper_commentContainer');
            if (container && !container.classList.contains('is-expanded')) {
                VT_Expand(container);
            }
        });

        // Dự phòng: phát hiện focus vào iframe qua sự kiện blur
        window.addEventListener('blur', () => {
            setTimeout(() => {
                const active = document.activeElement;
                if (active && active.tagName === 'IFRAME') {
                    const c = active.closest('.VTmultipleItems_postCommentWrapper_commentContainer');
                    if (c) VT_Expand(c);
                }
            }, 150);
        });
    };

    const VT_Expand = (container) => {
        const iframe = container.querySelector('iframe');
        container.classList.add('is-expanded');
        if (iframe) iframe.style.height = '200px';
    };

    return {
        init:       () => { VT_InitLazyLoad(); VT_InitAutoExpand(); },
        reInitLazy: VT_InitLazyLoad
    };
})();

document.addEventListener('DOMContentLoaded', () => VT_CommentManager.init());

// =====================
// HELPER FUNCTIONS
// =====================

// Skeleton loading template
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
    "<div style='display:flex;margin-top:10px;justify-content:start;'>" +
        "<div class='vt-loading-effect-small-block vt-loading-effect-loading'></div>" +
        "<div class='vt-loading-effect-small-block vt-loading-effect-loading'></div>" +
    "</div>" +
"</div>";

// Tính thời gian tương đối
const TIME_UNITS = { year: 31536000, month: 2592000, day: 86400, hour: 3600, minute: 60 };

function timeSince(date) {
    if (!date || isNaN(date.getTime())) return null;
    const sec = Math.floor((new Date() - date) / 1000);
    if (sec / TIME_UNITS.year  > 1) return Math.floor(sec / TIME_UNITS.year)  + " năm";
    if (sec / TIME_UNITS.month > 1) return Math.floor(sec / TIME_UNITS.month) + " tháng";
    const days = Math.floor(sec / TIME_UNITS.day);
    if (days >= 1) { if (days < 15) return days === 1 ? "Hôm qua" : days + " ngày"; return null; }
    if (sec / TIME_UNITS.hour   > 1) return Math.floor(sec / TIME_UNITS.hour)   + " giờ";
    if (sec / TIME_UNITS.minute > 1) return Math.floor(sec / TIME_UNITS.minute) + " phút";
    return sec <= 50 ? "Vừa xong" : Math.floor(sec) + " giây";
}

// Chuyển đổi slug cho Hashtag
function toSlug(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Khởi tạo Bootstrap Tooltips cho các element mới
function initBootstrapTooltips() {
    if (typeof bootstrap === 'undefined' || !bootstrap.Tooltip) return;
    document.querySelectorAll('[data-bs-toggle="tooltip"]:not([data-bs-initialized])').forEach(el => {
        new bootstrap.Tooltip(el);
        el.setAttribute('data-bs-initialized', 'true');
    });
}

// =====================
// LIKE BUTTONS TRANG INDEX
// Dùng window.auth và window.initSingleLikeButton từ firebase.js
// =====================

// Biến đặt tên riêng để tránh xung đột với firebase.js
let _multiItemsPopupShowing = false;

function initNewLikeButtons() {
    // Guard: firebase.js phải load trước
    if (typeof window.db === 'undefined' || typeof window.auth === 'undefined') return;

    const likeBtns = document.querySelectorAll('.likePost:not(.firebase-like-btn)');
    if (!likeBtns.length) return;

    // Tạo Toast nếu chưa có
    let toastEl = document.getElementById('loginToast');
    if (!toastEl) {
        const container     = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1060';
        container.innerHTML = `
            <div id="loginToast" class="toast align-items-center text-white bg-dark border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fa-solid fa-circle-info me-2"></i>Đăng nhập để Thích bài viết này!
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>`;
        document.body.appendChild(container);
        toastEl = document.getElementById('loginToast');
    }

    const loginToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });

    window.auth.onAuthStateChanged((user) => {
        likeBtns.forEach(btn => {
            if (user) {
                if (typeof window.initSingleLikeButton === 'function') {
                    window.initSingleLikeButton(btn, user);
                }
            } else {
                if (typeof window.updateLikeUI === 'function') window.updateLikeUI(btn, false);
                btn.onclick = (e) => { e.preventDefault(); loginToast.show(); };
            }
            btn.classList.add('firebase-like-btn');
        });
    });
}

// =====================
// ÁP DỤNG LOGIC SAU KHI THÊM BÀI VIẾT (CÀ KHI LOAD TRANG LẪN SAU AJAX)
// =====================

function applyPostLogic() {
    // Cập nhật thời gian tương đối
    document.querySelectorAll('.post-date-iso:not([data-relative-applied])').forEach(el => {
        const iso  = el.getAttribute('datetime');
        if (!iso) return;
        const rel  = timeSince(new Date(iso));
        if (rel) { el.innerHTML = rel; el.setAttribute('data-relative-applied', 'true'); }
    });

    // Chuyển tên label thành slug hashtag
    document.querySelectorAll('.home_hashtagPost a:not([data-slug-converted])').forEach(link => {
        link.innerText = toSlug(link.innerText);
        link.setAttribute('data-slug-converted', 'true');
    });

    initBootstrapTooltips();

    if (typeof window.auth !== 'undefined') initNewLikeButtons();

    if (typeof window.initLikeCountDisplay === 'function') {
        window.initLikeCountDisplay();
    }
}

// =====================
// AJAX LOAD MORE BÀI VIẾT
// Infinite scroll + nút "Xem thêm" thuần JS
// =====================

(function() {
    let nextUrl = "";
    let isLoading = false;
    let loadMoreBtn;

    async function loadMorePosts() {
        if (isLoading || !nextUrl) return;
        isLoading = true;

        const container = document.querySelector("div.blog-posts");
        if (!container) return;

        loadMoreBtn.querySelector('.loadMore_text').style.display    = 'none';
        loadMoreBtn.querySelector('.loadingMore_text').style.display = 'inline-block';
        container.insertAdjacentHTML('beforeend', SKELETON_TEMPLATE);

        try {
            const response = await fetch(nextUrl);
            const html     = await response.text();
            await new Promise(r => setTimeout(r, 500));

            const parser   = new DOMParser();
            const doc      = parser.parseFromString(html, "text/html");
            const newPosts = doc.querySelector("div.blog-posts").children;
            const tempSke  = container.querySelector('.vt-temp-ske');
            if (tempSke) tempSke.remove();

            Array.from(newPosts).forEach(post => {
                const clone        = post.cloneNode(true);
                clone.style.display = 'block';
                clone.style.opacity = '1';
                container.appendChild(clone);
            });

            const nextLink = doc.querySelector("a.blog-pager-older-link");
            nextUrl        = nextLink ? nextLink.getAttribute("href") : "";

            // Kích hoạt tất cả tính năng cho bài viết mới
            applyPostLogic();
            updateButtonState();
            VT_PostComments.init();
            VT_homePostLayout();
            VT_checkReadMore();
            VT_LazyLoad();
            VT_CommentManager.init();

            // Khởi tạo comment system Firestore cho bài viết mới
            if (typeof window.VT_InitCommentSystem === 'function') {
                window.VT_InitCommentSystem();
            }

            // Áp dụng lại admin tools sau AJAX
            if (typeof window.VT_ApplyAdminUI === 'function') {
                window.VT_ApplyAdminUI();
            }

        } catch(err) {
            console.error("[LoadMore] Lỗi tải bài viết:", err);
            container.querySelector('.vt-temp-ske')?.remove();
        } finally {
            isLoading = false;
        }
    }

    function updateButtonState() {
        const textEl    = loadMoreBtn.querySelector('.loadMore_text');
        const loadingEl = loadMoreBtn.querySelector('.loadingMore_text');
        const doneEl    = loadMoreBtn.querySelector('.allViewed_text');

        loadingEl.style.display = 'none';
        if (nextUrl) {
            textEl.style.display = 'inline-block';
            doneEl.style.display = 'none';
        } else {
            textEl.style.display = 'none';
            doneEl.style.display = 'inline-block';
            loadMoreBtn.classList.add('viewed-all');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Chỉ chạy trên trang index/multiple items
        if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.pageType !== "item") {
            const olderLink = document.querySelector("a.blog-pager-older-link");
            if (!olderLink) return;

            nextUrl = olderLink.getAttribute("href");

            const btnContainer     = document.createElement('div');
            btnContainer.className = 'VT_ajaxLoadMorePosts mt-3';
            loadMoreBtn            = document.createElement('a');
            loadMoreBtn.className  = 'VT_loadMorePost ripple';
            loadMoreBtn.href       = 'javascript:;';
            loadMoreBtn.innerHTML  =
                "<span class='loadMore_text'>Xem thêm <i class='fad fa-angle-down ms-1'></i></span>" +
                "<span class='loadingMore_text' style='display:none'><i class='fa-duotone fa-spinner-third fa-spin'></i></span>" +
                "<span class='allViewed_text' style='display:none'>Bạn đã xem hết rồi <i class='fad fa-exclamation fa-shake ms-1'></i></span>";

            btnContainer.appendChild(loadMoreBtn);
            const pager = document.getElementById('blog-pager');
            if (pager) { pager.parentNode.insertBefore(btnContainer, pager); pager.style.display = 'none'; }

            loadMoreBtn.addEventListener('click', loadMorePosts);

            // Auto-trigger khi scroll gần cuối trang
            new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading && nextUrl) loadMorePosts();
            }, { root: null, rootMargin: '0px 0px 1000px 0px', threshold: 0.01 })
                .observe(btnContainer);

            // Lần đầu khởi chạy
            applyPostLogic();
            VT_homePostLayout();
            VT_checkReadMore();
        }
    });
})();

// =====================
// XEM THÊM NỘI DUNG BÀI VIẾT (v-fullPost)
// =====================

document.addEventListener('click', function(e) {
    if (!e.target || !e.target.classList.contains('v-fullPost')) return;
    e.preventDefault();

    const btn       = e.target;
    const postBody  = btn.previousElementSibling;
    const featImg   = btn.nextElementSibling;

    if (postBody && postBody.classList.contains('postBodyLimited')) {
        postBody.classList.remove('postBodyLimited');

        // Thêm data-fancybox cho các ảnh trong nội dung vừa mở
        const galleryId  = 'gallery-' + Math.floor(Math.random() * 1000000);
        const imageLinks = postBody.querySelectorAll('a[href$=".jpg"],a[href$=".png"],a[href$=".jpeg"],a[href$=".webp"],a[href$=".gif"]');
        imageLinks.forEach(link => {
            link.setAttribute('data-fancybox', galleryId);
            const img = link.querySelector('img');
            if (img && img.alt) link.setAttribute('data-caption', img.alt);
        });
    }

    btn.classList.add('d-none');
    if (featImg && featImg.classList.contains('postFeaturedImage')) {
        featImg.classList.add('d-none');
    }
});

// =====================
// THÔNG BÁO LẦN ĐẦU TRUY CẬP
// =====================

(function() {
    const KEY            = 'hasVisitedBlog';
    const welcomeMessage = document.getElementById('first-visit-message');

    function checkFirstVisit() {
        if (localStorage.getItem(KEY) === null) {
            if (welcomeMessage) welcomeMessage.style.display = 'block';
            localStorage.setItem(KEY, 'true');
        }
    }

    function closeWelcomeMessage() {
        if (welcomeMessage) welcomeMessage.style.display = 'none';
    }

    // Export để HTML có thể gọi
    window.closeWelcomeMessage = closeWelcomeMessage;

    document.addEventListener('DOMContentLoaded', checkFirstVisit);
})();

// =====================
// LAZY LOAD ẢNH
// Tải trước ảnh trong .VT_homePostGallery khi sắp vào vùng nhìn
// =====================

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) {
            img.src     = src;
            img.removeAttribute('data-src');
            img.onload  = () => img.style.opacity = '1';
        }
        observer.unobserve(img);
    });
}, { root: null, rootMargin: '0px 0px 300px 0px', threshold: 0.01 });

function VT_LazyLoad() {
    document.querySelectorAll('.VT_homePostGallery img:not(.lazy-processed)').forEach(img => {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:') || img.classList.contains('no-lazy')) return;

        img.classList.add('lazy-processed');
        img.setAttribute('data-src', src);
        img.src             = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        img.style.opacity   = '0';
        img.style.transition = 'transform .3s ease, opacity 1s ease';
        img.style.backgroundColor = '#f2f3f5';
        imageObserver.observe(img);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_LazyLoad);
} else {
    VT_LazyLoad();
}

// =========================================================================================
// VT Zone Multiple Items Scripts v5.0.0 - Ready
// =========================================================================================
