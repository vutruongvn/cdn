// FULL CODE SCRIPT OPTIMIZED for HOMEPAGE === Trang chủ đã tối ưu ===
// VT Zone === vutruong.vn ===
// ============== PHẦN 1: CÁC HÀM HỖ TRỢ (TIME, SLUG) ==============

// Định nghĩa đoạn HTML Skeleton
const SKELETON_TEMPLATE = `
<div class='VT-timeline-loading-animation vt-temp-ske'>
  <div class='vt-loading-effect-header-wrap'>
    <div class='vt-loading-effect-avatar'></div>
    <div class='vt-loading-effect-info-block'>
      <div class='vt-loading-effect-username vt-loading-effect-loading'></div>
      <div class='vt-loading-effect-time vt-loading-effect-loading'></div>
    </div>
  </div>
  <div class='vt-loading-effect-content-wrap'>
    <div class='vt-loading-effect-text-line-main vt-loading-effect-loading'></div>
    <div class='vt-loading-effect-text-line vt-loading-effect-loading'></div>
    <div class='vt-loading-effect-text-line vt-loading-effect-loading'></div>
    <div class='vt-loading-effect-text-line vt-loading-effect-loading'></div>
    <div class='vt-loading-effect-text-line-last vt-loading-effect-loading'></div>
  </div>
  <div style='display: flex; margin-top: 10px; justify-content: start;'>
    <div class='vt-loading-effect-small-block vt-loading-effect-loading'></div>
    <div class='vt-loading-effect-small-block vt-loading-effect-loading'></div>
  </div>
</div>`;

// 1. Hiệu ứng loading ban đầu (Delay 500ms)
// ĐÃ XÓA

// 2. Tính toán thời gian tương đối
const TIME_UNITS = { year: 31536000, month: 2592000, day: 86400, hour: 3600, minute: 60 };

function timeSince(date) {
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

// ============== PHẦN 2: CÁC CHỨC NĂNG TƯƠNG TÁC ==============

function initAdminProfilePopup() {
    const wrappers = document.querySelectorAll('.VT_adminProfile_showPopup:not(.popup-processed)');
    wrappers.forEach(wrapper => {
        wrapper.classList.add('popup-processed');
        const link = wrapper.querySelector('.post_authorName');
        const popup = wrapper.querySelector('.VT_adminProfile');
        if (!link || !popup) return;
        let hideTimer, showTimer;
        const show = () => {
            clearTimeout(hideTimer);
            if (!showTimer) {
                showTimer = setTimeout(() => { popup.classList.add('is-visible'); showTimer = null; }, 100);
            }
        };
        const hide = () => {
            clearTimeout(showTimer); showTimer = null;
            hideTimer = setTimeout(() => { popup.classList.remove('is-visible'); }, 300);
        };
        [link, popup].forEach(el => { el.addEventListener('mouseenter', show); el.addEventListener('mouseleave', hide); });
    });
}

let isPopupShowing = false;
function initNewLikeButtons() {
    if (typeof db === 'undefined' || typeof auth === 'undefined') return;
    const likeBtns = document.querySelectorAll('.likePost:not(.firebase-like-btn)');
    if (likeBtns.length === 0) return;
    auth.onAuthStateChanged((user) => {
        likeBtns.forEach(btn => {
            if (user) {
                if (typeof initSingleLikeButton === 'function') initSingleLikeButton(btn, user);
            } else {
                if (typeof updateLikeUI === 'function') updateLikeUI(btn, false);
                btn.onclick = (e) => {
                    e.preventDefault();
                    const loginPopup = document.querySelector(".VTloginPopup");
                    if (loginPopup && !isPopupShowing) {
                        isPopupShowing = true;
                        loginPopup.style.display = 'block';
                        loginPopup.style.opacity = '1';
                        setTimeout(() => {
                            loginPopup.style.opacity = '0';
                            setTimeout(() => { loginPopup.style.display = 'none'; isPopupShowing = false; }, 300);
                        }, 3000);
                    }
                };
            }
            btn.classList.add('firebase-like-btn');
        });
    });
}

function applyPostLogic() {
    document.querySelectorAll('.post-date-iso:not([data-relative-applied])').forEach(el => {
        const isoDate = el.getAttribute('datetime');
        if (isoDate) {
            const relative = timeSince(new Date(isoDate));
            if (relative) { el.innerHTML = relative; el.setAttribute('data-relative-applied', 'true'); }
        }
    });
    document.querySelectorAll('.home_hashtagPost a:not([data-slug-converted])').forEach(link => {
        link.innerText = toSlug(link.innerText);
        link.setAttribute('data-slug-converted', 'true');
    });
    initNewLikeButtons();
    initAdminProfilePopup();
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
        
        // 1. Hiển thị Skeleton và trạng thái nút
        loadMoreBtn.querySelector('.loadMore_text').style.display = 'none';
        loadMoreBtn.querySelector('.loadingMore_text').style.display = 'inline-block';
        
        // Chèn Skeleton vào cuối container
        container.insertAdjacentHTML('beforeend', SKELETON_TEMPLATE);

        try {
            // 2. Tải dữ liệu và đồng thời đợi 500ms
            const response = await fetch(nextUrl);
            const html = await response.text();
            
            // Ép buộc delay 1s hiện loading rồi mới load post
            await new Promise(resolve => setTimeout(resolve, 0)); // thêm thời gian delay vào đây

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const newPosts = doc.querySelector(postContainerSelector).children;

            // 3. Xóa Skeleton tạm thời
            const tempSke = container.querySelector('.vt-temp-ske');
            if (tempSke) tempSke.remove();

            // 4. Chèn bài viết mới
            Array.from(newPosts).forEach(post => {
                const clone = post.cloneNode(true);
                clone.style.display = 'block'; // Đảm bảo hiển thị
                clone.style.opacity = '1';
                container.appendChild(clone);
            });

            const nextLinkEl = doc.querySelector("a.blog-pager-older-link");
            nextUrl = nextLinkEl ? nextLinkEl.getAttribute("href") : "";

            applyPostLogic();
            updateButtonState();

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
        if (window._WidgetManager && _WidgetManager._GetAllData().blog.pageType !== "item") {
            const olderLink = document.querySelector("a.blog-pager-older-link");
            if (!olderLink) return;

            nextUrl = olderLink.getAttribute("href");

            const btnContainer = document.createElement('div');
            btnContainer.className = 'VT_ajaxLoadMorePosts';
            
            loadMoreBtn = document.createElement('a');
            loadMoreBtn.className = 'VT_loadMorePost ripple ripple-radius';
            loadMoreBtn.href = 'javascript:;';
            loadMoreBtn.innerHTML = `
                <span class="loadMore_text">Xem thêm <i class="fad fa-angle-down"></i></span>
                <span class="loadingMore_text" style="display:none">Đang tải <i class="fa-duotone fa-spinner-third fa-spin"></i></span>
                <span class="allViewed_text" style="display:none">Bạn đã xem hết rồi <i class="fad fa-exclamation fa-shake"></i></span>
            `;

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
            }, { rootMargin: '0px' });

            observer.observe(btnContainer);
            applyPostLogic();
        }
    });
})();
