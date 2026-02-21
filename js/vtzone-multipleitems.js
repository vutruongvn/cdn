// =========================================================================================
/**
 * VUTRUONG.VN - MULTIPLE ITEMS PAGE SCRIPTS
 * Chạy trên trang Index / Multiple Items
 * Phiên bản: 5.0.1
 * Cập nhật: 20/2/2026
 */
// =========================================================================================

console.log("[Multiple Items] Scripts đang khởi tạo...");

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
// Dùng window.auth.currentUser + window.initSingleLikeButton từ firebase-system
// KHÔNG tạo onAuthStateChanged listener mới (firebase-system đã có 1 listener toàn cục)
// KHÔNG tạo loginToast mới (firebase-system quản lý qua #loginToast)
// =====================

function initNewLikeButtons() {
    if (typeof window.initSingleLikeButton !== 'function' ||
        typeof window.updateLikeUI !== 'function') return;

    const likeBtns = document.querySelectorAll('.likePost:not(.firebase-like-btn)');
    if (!likeBtns.length) return;

    const user = window.auth?.currentUser;
    likeBtns.forEach(btn => {
        if (user) {
            // Đã đăng nhập → khởi tạo like + realtime listener
            window.initSingleLikeButton(btn, user);
        } else {
            // Guest → reset UI + hiện toast khi click (toast do firebase-system quản lý)
            window.updateLikeUI(btn, false);
            btn.onclick = (e) => {
                e.preventDefault();
                const toastEl = document.getElementById('loginToast');
                if (toastEl && typeof bootstrap !== 'undefined') {
                    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 }).show();
                }
            };
        }
        btn.classList.add('firebase-like-btn');
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
    let btnContainer;  // Hoist lên IIFE scope để finally block và scroll listener truy cập được

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
            VT_homePostLayout();
            VT_checkReadMore();
            VT_LazyLoad();

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
            // Re-check: nếu user đã cuộn quá nhanh trong lúc đang tải, trigger tiếp
            if (nextUrl) {
                setTimeout(() => {
                    const rect = btnContainer.getBoundingClientRect();
                    if (rect.top <= window.innerHeight + 1200) loadMorePosts();
                }, 200);
            }
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

            btnContainer           = document.createElement('div');
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

            // Auto-trigger khi scroll gần cuối trang (IntersectionObserver)
            new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading && nextUrl) loadMorePosts();
            }, { root: null, rootMargin: '0px 0px 1200px 0px', threshold: 0.01 })
                .observe(btnContainer);

            // Backup scroll listener: đảm bảo load khi cuộn nhanh khiến IO bỏ lỡ
            window.addEventListener('scroll', function() {
                if (isLoading || !nextUrl) return;
                const rect = btnContainer.getBoundingClientRect();
                if (rect.top <= window.innerHeight + 1200) loadMorePosts();
            }, { passive: true });

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
// rootMargin 1200px: tải trước sớm để ảnh sẵn sàng trước khi user cuộn đến
// Hiệu ứng: blur(5px) → clear dần cùng với opacity 0 → 1
// =====================

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.onload = () => {
                img.style.filter  = 'none';
                img.style.opacity = '1';
            };
        }
        observer.unobserve(img);
    });
}, { root: null, rootMargin: '0px 0px 900px 0px', threshold: 0.01 });

function VT_LazyLoad() {
    document.querySelectorAll('.VT_homePostGallery img:not(.lazy-processed)').forEach(img => {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:') || img.classList.contains('no-lazy')) return;

        img.classList.add('lazy-processed');
        img.setAttribute('data-src', src);
        img.src                   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        img.style.opacity         = '0';
        img.style.filter          = 'blur(5px)';
        img.style.transition      = 'transform .3s ease, opacity 1s ease, filter 0.8s ease';
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
// VT Zone Multiple Items Scripts v5.0.1 - Ready
// =============================================
