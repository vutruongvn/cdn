// =========================================================================================
/**
 * VUTRUONG.VN - ALL PAGE SCRIPTS
 * Chạy trên toàn hệ thống - vutruong.vn
 * Phiên bản: 5.0.1
 * Cập nhật: 20/2/2026
 */
// =========================================================================================

console.log("[VT Zone] Body scripts đang khởi tạo...");

// =====================
// DARK MODE TOGGLE
// Lưu trạng thái vào localStorage
// =====================

(function() {
    const htmlElement = document.documentElement;

    // Áp dụng theme đã lưu trước khi DOM sẵn sàng (tránh flash)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') htmlElement.classList.add('VT_darkMode');

    document.addEventListener('DOMContentLoaded', () => {
        const toggleButtons = document.querySelectorAll('.theme-toggle');
        if (!toggleButtons.length) return;

        function toggleTheme() {
            const isDark = htmlElement.classList.toggle('VT_darkMode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }

        toggleButtons.forEach(btn => btn.addEventListener('click', toggleTheme));
        console.log("[Theme] Đã khởi tạo");
    });
})();

// =====================
// FONT SWITCHER
// Toggle giữa Roboto và Google Sans Flex
// =====================

(function() {
    const FONT_KEY          = 'blogFontPreference';
    const GOOGLE_SANS_CLASS = 'font-google-sans';
    const FONT_NAME_1       = 'Roboto';
    const FONT_NAME_2       = 'Google Sans Flex';

    function toggleFont() {
        const isGoogleSans = document.body.classList.contains(GOOGLE_SANS_CLASS);
        if (isGoogleSans) {
            document.body.classList.remove(GOOGLE_SANS_CLASS);
            localStorage.setItem(FONT_KEY, FONT_NAME_1);
        } else {
            document.body.classList.add(GOOGLE_SANS_CLASS);
            localStorage.setItem(FONT_KEY, FONT_NAME_2);
        }
    }

    // Áp dụng font đã lưu
    if (localStorage.getItem(FONT_KEY) === FONT_NAME_2) {
        document.body.classList.add(GOOGLE_SANS_CLASS);
    }

    // Gắn sự kiện sau khi DOM sẵn sàng
    document.addEventListener('DOMContentLoaded', () => {
        const toggler = document.getElementById('font-toggler');
        if (toggler) toggler.addEventListener('click', toggleFont);
    });
})();

// =====================
// AUTHOR AVATAR
// Tự động lấy URL ảnh đại diện tác giả từ Blogger và điền vào DOM
// =====================

document.addEventListener("DOMContentLoaded", function() {
    if (typeof authorAvatarUrl === 'undefined' || !authorAvatarUrl) return;

    const optimizedUrl = authorAvatarUrl.replace(/\/s\d+(-c)?\//, '/s200/').replace(/\/w\d+(-h\d+)?(-c)?\//, '/s200/');
    const originalUrl  = authorAvatarUrl.replace(/\/s\d+(-c)?\//, '/s1600/').replace(/\/w\d+(-h\d+)?(-c)?\//, '/s1600/');

    const updateElements = (selector, url) => {
        document.querySelectorAll(selector).forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (tag === 'img')       el.src = url;
            else if (tag === 'a')    el.href = url;
            else                     el.style.backgroundImage = `url('${url}')`;
        });
    };

    updateElements('.set-author-avatar',          optimizedUrl);
    updateElements('.set-author-avatar-original', originalUrl);
});

// =====================
// NATIVE SHARE
// Sử dụng Web Share API hoặc copy link nếu không hỗ trợ
// =====================

document.addEventListener('click', async function(event) {
    const btn = event.target.closest('.btn-share-native');
    if (!btn) return;

    const shareData = {
        title: btn.getAttribute('data-title'),
        text:  btn.getAttribute('data-title'),
        url:   btn.getAttribute('data-url')
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareData.url);
            alert('Đã copy link: ' + shareData.title);
        }
    } catch(err) {
        // User hủy share - không cần log
    }
});

// =====================
// CENTER MENU - Ẩn/Hiện khi cuộn trang trên Mobile
// =====================

document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.centerMenu');
    if (!menu) return;

    let lastScrollTop = 0;
    const delta       = 5;
    let isTicking     = false;

    function handleScrollMenu() {
        const current = window.pageYOffset || document.documentElement.scrollTop;
        if (current < delta) { menu.classList.remove('menu-hidden'); lastScrollTop = current; return; }
        if (Math.abs(lastScrollTop - current) <= delta) return;
        menu.classList.toggle('menu-hidden', current > lastScrollTop);
        lastScrollTop = current;
    }

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => { handleScrollMenu(); isTicking = false; });
            isTicking = true;
        }
    }, { passive: true });
});

// =====================
// XÓA ?m=1 TRÊN URL KHI XEM MOBILE
// Fix: indexOf chỉ truyền 1 tham số (tham số thứ 2 phải là number, không phải string)
// =====================

(function() {
    const uri = window.location.toString();
    if (uri.indexOf("?m=1") > 0) {
        window.history.replaceState({}, document.title, uri.substring(0, uri.indexOf("?m=1")));
    }
})();

// =====================
// REPORT POST
// Lưu thông tin bài viết vào sessionStorage rồi chuyển đến trang /report
// =====================

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.reportPost');
    if (!btn) return;
    e.preventDefault();
    sessionStorage.setItem('pendingReport', JSON.stringify({
        title: btn.getAttribute('data-post-title'),
        url:   btn.getAttribute('data-post-url')
    }));
    window.location.href = '//vutruong.vn/report';
});

// =====================
// POST GALLERY LAYOUT AUTO
// Tự động tạo gallery layout cho bài viết có nhiều ảnh
// =====================

function VT_homePostLayout() {
    const postContainers = document.querySelectorAll('.postBody_multipleItems:not([data-layout-processed]), .postBody_singleItem:not([data-layout-processed])');

    postContainers.forEach((container) => {
        const imgs   = container.querySelectorAll('img');
        const count  = imgs.length;
        if (count === 0) { container.setAttribute('data-layout-processed', 'true'); return; }

        const gallery     = document.createElement('div');
        const displayCount = count > 5 ? 5 : count;
        gallery.className  = `VT_homePostGallery p-0 m-0 mb-3 layout-${displayCount}`;
        const postId       = container.closest('.post')?.id || 'album-' + Math.random().toString(36).substr(2, 5);

        imgs.forEach((img, idx) => {
            const parentSep = img.closest('.separator');
            const link      = document.createElement('a');
            link.href       = img.src;
            link.setAttribute('data-fancybox', 'gallery-' + postId);

            // Overlay "+N" tại ảnh thứ 5 nếu có nhiều hơn 5 ảnh
            if (idx === 4 && count > 5) {
                const overlay     = document.createElement('div');
                overlay.className = 'vt-gallery-overlay';
                overlay.innerHTML = `<span>+${count - 5}</span>`;
                link.appendChild(overlay);
            }

            // Từ ảnh thứ 6 trở đi ẩn nhưng vẫn có trong DOM để Fancybox quét được
            if (idx >= 5) link.style.display = 'none';

            img.removeAttribute('style');
            link.appendChild(img);
            gallery.appendChild(link);

            if (parentSep && parentSep.innerHTML.trim() === '') {
                parentSep.remove();
            } else if (parentSep) {
                parentSep.style.display = 'none';
            }
        });

        const target = container.querySelector('.postGallery');
        if (target) {
            target.innerHTML = '';
            target.appendChild(gallery);
        } else {
            container.appendChild(gallery);
        }

        container.setAttribute('data-layout-processed', 'true');
    });
}

document.addEventListener('DOMContentLoaded', VT_homePostLayout);

// =====================
// CHECK READ MORE
// Ẩn nút "Xem thêm" nếu bài viết quá ngắn (không tràn)
// =====================

function VT_checkReadMore() {
    document.querySelectorAll('.postBodyLimited:not([data-readmore-checked])').forEach(box => {
        const container = box.closest('.postBody_multipleItems, .postBody_singleItem');
        if (!container) return;
        const btn = container.querySelector('.v-fullPost');
        if (btn && !(box.scrollHeight > box.clientHeight)) {
            btn.style.setProperty('display', 'none', 'important');
        }
        box.setAttribute('data-readmore-checked', 'true');
    });
}

document.addEventListener('DOMContentLoaded', () => setTimeout(VT_checkReadMore, 200));

// =====================
// FADE IN / FADE OUT
// Hàm tiện ích dùng cho popup và live search (thuần JS)
// =====================

function fadeIn(element, duration = 100) {
    element.style.opacity    = '0';
    element.style.visibility = 'visible';
    element.style.transition = `opacity ${duration}ms ease-in`;
    requestAnimationFrame(() => { element.style.opacity = '1'; });
    element.addEventListener('transitionend', function h() {
        element.style.transition = '';
        element.removeEventListener('transitionend', h);
    }, { once: true });
}

function fadeOut(element, duration = 100) {
    element.style.opacity    = '1';
    element.style.transition = `opacity ${duration}ms ease-out`;
    requestAnimationFrame(() => { element.style.opacity = '0'; });
    element.addEventListener('transitionend', function h() {
        element.style.visibility = 'hidden';
        element.style.display    = 'none';
        element.style.opacity    = '';
        element.style.transition = '';
        element.removeEventListener('transitionend', h);
    }, { once: true });
}

// =====================
// POPUP TÀI KHOẢN NGƯỜI DÙNG
// Ẩn/Hiện panel khi click avatar
// =====================

document.addEventListener('DOMContentLoaded', function() {
    const avatarBtn  = document.querySelector('.user-profile-details .avatar-user');
    const popupPanel = document.querySelector('.popupShow_accountPanel');
    if (!avatarBtn || !popupPanel) return;

    const FADE_DUR = 100;
    popupPanel.style.display    = 'none';
    popupPanel.style.visibility = 'hidden';
    popupPanel.style.opacity    = '0';

    function togglePopup(event) {
        event.stopPropagation();
        const isVisible = window.getComputedStyle(popupPanel).visibility !== 'hidden'
                       && window.getComputedStyle(popupPanel).opacity    !== '0';
        if (isVisible) {
            fadeOut(popupPanel, FADE_DUR);
        } else {
            popupPanel.style.display = 'block';
            fadeIn(popupPanel, FADE_DUR);
        }
    }

    avatarBtn.addEventListener('click', togglePopup);

    document.body.addEventListener('click', function(event) {
        const isVisible = window.getComputedStyle(popupPanel).visibility !== 'hidden'
                       && window.getComputedStyle(popupPanel).opacity    !== '0';
        if (isVisible && !popupPanel.contains(event.target) && !avatarBtn.contains(event.target)) {
            fadeOut(popupPanel, FADE_DUR);
        }
    });
});

// =====================
// LIVE SEARCH - UI CONTROL (Thuần JS)
// Xử lý show/hide panel tìm kiếm
// =====================

document.addEventListener('DOMContentLoaded', function() {
    const liveSearchTarget = document.getElementById('target_VT_live_search');
    const showTrigger      = document.querySelector('.show_liveSearch');
    const closeButtons     = document.querySelectorAll('.close_liveSearch, .vt-live-search-wrapper-overlay-background');

    if (!liveSearchTarget || !showTrigger || closeButtons.length === 0) return;

    liveSearchTarget.style.display    = 'none';
    liveSearchTarget.style.visibility = 'hidden';
    liveSearchTarget.style.opacity    = '0';

    const openLiveSearch  = (dur = 300) => { liveSearchTarget.style.display = 'block'; fadeIn(liveSearchTarget, dur); };
    const closeLiveSearch = (dur = 300) => fadeOut(liveSearchTarget, dur);

    showTrigger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openLiveSearch(300); });
    closeButtons.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeLiveSearch(300); }));

    document.addEventListener('click', (e) => {
        const cs = window.getComputedStyle(liveSearchTarget);
        if (cs.visibility === 'hidden' || cs.opacity === '0') return;
        if (e.target !== liveSearchTarget && !liveSearchTarget.contains(e.target)
            && e.target !== showTrigger && !showTrigger.contains(e.target)) {
            closeLiveSearch(300);
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key !== "Escape") return;
        const cs = window.getComputedStyle(liveSearchTarget);
        if (cs.visibility !== 'hidden' && cs.opacity !== '0') closeLiveSearch(300);
    });
});

// =====================
// LIVE SEARCH - CORE SEARCH (Thuần JS, thay thế jQuery $.ajax)
// Gọi Blogger JSON Feed API để tìm kiếm bài viết
// =====================

document.addEventListener('DOMContentLoaded', function() {
    const showTrigger = document.querySelector('.show_liveSearch');
    if (!showTrigger) return;

    let isInitialized = false;

    showTrigger.addEventListener('click', function() {
        if (isInitialized) return;
        isInitialized = true;

        const searchInput  = document.getElementById('vt-search-input');
        const resultsBox   = document.getElementById('vt-live-results');
        if (!searchInput || !resultsBox) return;

        let typingTimer;
        const DEBOUNCE = 500;

        // Fetch kết quả từ Blogger API bằng fetch() thuần
        function fetchSearchResults(keyword) {
            fetch('/feeds/posts/summary?alt=json&q=' + encodeURIComponent(keyword) + '&max-results=10')
                .then(res => res.json())
                .then(data => renderResults(data, keyword))
                .catch(() => {
                    resultsBox.innerHTML = '<div class="vt-search-empty">Lỗi kết nối. Vui lòng thử lại.</div>';
                });
        }

        function renderResults(json, query) {
            if (!json.feed.entry) {
                resultsBox.innerHTML = '<div class="vt-search-empty"><i class="fad fa-circle-exclamation me-2"></i>Không tìm thấy kết quả nào, nhập Tiếng Việt có dấu để tìm kiếm chính xác nhất.</div>';
                return;
            }

            let html = '';
            json.feed.entry.forEach((entry) => {
                const fullId      = entry.id.$t;
                const displayId   = fullId.substring(fullId.lastIndexOf('-') + 1);
                const title       = (entry.title.$t || '').trim() || 'Bài viết ID: ' + displayId;
                let link          = '';
                for (const l of entry.link) {
                    if (l.rel === 'alternate') { link = l.href; break; }
                }
                let img = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi1iPw_w8MsNvluVqo_hgSKU5IoxcSUNJWb-YyjgdBGNyFH9ACIQHLj8g4EXnzHTiQ8D7PiR72qCpICKpVTPhyphenhyphen1Kq6u-GmBf5eJfLY5fmPxMscEdVXzfkXtP_2AFqz2oMaxB-Zm3cysmkl2ukTlqW7dz2BaOnqxUMPdH8wdS49L0snioA/s1600/avatarVT.JPEG';
                if (entry.media$thumbnail) img = entry.media$thumbnail.url.replace('/s72-c/', '/s100/');
                const label = (entry.category && entry.category.length > 0) ? entry.category[0].term : '';

                html += `<a href="${link}" class="vt-search-item ripple">
                    <div class="vt-search-info">
                        <span class="vt-search-title">${title}</span>
                        ${label ? `<span class="vt-search-label">#${label}</span>` : ''}
                    </div>
                </a>`;
            });

            html += `<a href="/search?q=${encodeURIComponent(query)}" class="vt-search-item" style="justify-content:center;color:#007bff;font-size:14px;font-weight:400">Xem tất cả kết quả <i class="fad fa-angle-down ms-1"/></a>`;
            resultsBox.innerHTML = html;
            resultsBox.style.display = 'block';
        }

        // Lắng nghe input với debounce
        searchInput.addEventListener('keyup', function() {
            clearTimeout(typingTimer);
            const q = this.value.trim();
            if (q.length > 1) {
                resultsBox.style.display = 'block';
                resultsBox.innerHTML     = '<div class="vt-search-loading text-left"><i class="fa-duotone fa-spinner-third fa-spin me-2"></i>Đang tìm kiếm...</div>';
                typingTimer = setTimeout(() => fetchSearchResults(q), DEBOUNCE);
            } else {
                resultsBox.style.display = 'none';
                resultsBox.innerHTML     = '';
            }
        });

        // Đóng kết quả khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.vt-live-search-wrapper')) {
                resultsBox.style.display = 'none';
            }
        });

        // Mở lại kết quả khi focus vào input (nếu đã có nội dung)
        searchInput.addEventListener('focus', function() {
            if (this.value.length > 1 && resultsBox.innerHTML.trim()) {
                resultsBox.style.display = 'block';
            }
        });
    });
});

// =====================
// SLIDE MENU (Sidenav)
// Class-based, thuần JS - thay thế jQuery slideToggle/fadeToggle
// =====================

class Sidenav {
    constructor(element) {
        this.el             = element;
        this.toggleSelector = this.el.getAttribute("data-sidenav-toggle");
        this.init();
    }

    init() { this.initToggle(); this.initDropdown(); }

    initToggle() {
        document.addEventListener("click", (e) => {
            const toggleBtn = this.toggleSelector ? e.target.closest(this.toggleSelector) : null;
            if (toggleBtn) {
                this.el.classList.toggle("show");
                document.body.classList.toggle("sidenav-no-scrolls");
                this.toggleOverlay();
            } else if (!e.target.closest('[data-sidenav]') && this.el.classList.contains("show")) {
                this.el.classList.remove("show");
                document.body.classList.remove("sidenav-no-scrolls");
                this.hideOverlay();
            }
        });
    }

    initDropdown() {
        this.el.addEventListener("click", (e) => {
            const toggle = e.target.closest("[data-sidenav-dropdown_toggle]");
            if (!toggle) return;
            e.preventDefault();
            const dropdown = toggle.nextElementSibling;
            const icon     = toggle.querySelector("[data-sidenav-dropdown-icon]");
            if (dropdown && dropdown.matches("[data-sidenav-dropdown]")) {
                this.slideToggle(dropdown);
                if (icon) icon.classList.toggle("show");
            }
        });
    }

    toggleOverlay() {
        let overlay = document.querySelector("[data-sidenav-overlay]");
        if (!overlay) {
            overlay            = document.createElement("div");
            overlay.setAttribute("data-sidenav-overlay", "");
            overlay.className  = "sidenav-overlay";
            document.body.appendChild(overlay);
        }
        getComputedStyle(overlay).display !== "none" ? this.fadeOut(overlay) : this.fadeIn(overlay);
    }

    hideOverlay() {
        const o = document.querySelector("[data-sidenav-overlay]");
        if (o) this.fadeOut(o);
    }

    slideToggle(el) {
        getComputedStyle(el).display === 'none' ? this.slideDown(el) : this.slideUp(el);
    }

    slideUp(el) {
        el.style.height = el.offsetHeight + 'px';
        el.offsetHeight; // force repaint
        el.style.height = '0px';
        setTimeout(() => { el.style.display = 'none'; el.style.removeProperty('height'); }, 300);
    }

    slideDown(el) {
        el.style.display = 'block';
        const h = el.scrollHeight;
        el.style.height  = '0px';
        el.offsetHeight;
        el.style.height  = h + 'px';
        setTimeout(() => el.style.removeProperty('height'), 300);
    }

    fadeIn(el) {
        el.style.opacity = 0;
        el.style.display = "block";
        requestAnimationFrame(() => { el.style.transition = "opacity 0.3s"; el.style.opacity = 1; });
    }

    fadeOut(el) {
        el.style.transition = "opacity 0.3s";
        el.style.opacity    = 0;
        setTimeout(() => el.style.display = "none", 300);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-sidenav]").forEach(el => new Sidenav(el));
});

// =====================
// AUTO SCROLL
// Tự động cuộn đến vị trí phù hợp khi trang load
// =====================

(function() {
    const path          = window.location.pathname;
    const isHomePage    = (path === '/' || path === '/index.html');
    const isSearchPage  = path.includes('/search');
    const isListView    = isHomePage || isSearchPage;
    const targetSel     = isListView ? '.profile-info-section' : '#mainPost';
    const offset        = isListView ? 90 : 75;
    const element       = document.querySelector(targetSel);

    if (element) {
        setTimeout(() => {
            window.scrollTo({
                top:      element.getBoundingClientRect().top + window.scrollY - offset,
                behavior: 'smooth'
            });
        }, 150);
    }
})();

// =====================
// FEATURED STORIES CAROUSEL
// =====================

document.addEventListener("DOMContentLoaded", function() {

    function getThumbnail(fullUrl) {
        return fullUrl.replace(/\/s\d+\//, '/s250/');
    }

    const track   = document.getElementById('vt-carousel-track');
    const btnPrev = document.getElementById('vt-btn-prev');
    const btnNext = document.getElementById('vt-btn-next');

    function renderCarousel() {
        if (!track || typeof carouselData === 'undefined') return;

        const grouped = carouselData.reduce((acc, cur) => {
            if (!acc[cur.title]) acc[cur.title] = [];
            acc[cur.title].push(cur);
            return acc;
        }, {});

        let html = '';
        Object.keys(grouped).forEach(title => {
            const items     = grouped[title];
            const main      = items[0];
            const groupId   = `group-${title.replace(/[\s\W]+/g, '-')}`;
            const thumb     = getThumbnail(main.link);

            html += `
            <div class="vt-card-item">
                <a href="${main.link}" class="text-decoration-none d-block" data-fancybox="${groupId}">
                    <div class="carousel-div-img position-relative p-0 m-0 overflow-hidden">
                        <img src="${thumb}" class="vt-card-img shadow-sm" alt="${title}" loading="lazy">
                        ${items.length > 1 ? `<span class="position-absolute bottom-0 start-0 m-2 bg-dark badge rounded-pill fw-normal opacity-75">+${items.length - 1}</span>` : ''}
                    </div>
                    <div class="text-center fw-medium small text-truncate px-1 d-none">${title}</div>
                </a>
                ${items.slice(1).map(i => `<a class="story-item-hidden d-none" href="${i.link}" data-fancybox="${groupId}"></a>`).join('')}
            </div>`;
        });

        track.innerHTML = html;
    }

    function handleScroll(dir) {
        if (!track) return;
        const amt     = track.clientWidth;
        const cur     = track.scrollLeft;
        const max     = track.scrollWidth - track.clientWidth;
        let target    = dir === 'next' ? cur + amt : cur - amt;
        if (dir === 'next' && target >= max - 10)  track.scrollTo({ left: max,  behavior: 'smooth' });
        else if (dir === 'prev' && target <= 10)   track.scrollTo({ left: 0,    behavior: 'smooth' });
        else                                        track.scrollTo({ left: target, behavior: 'smooth' });
    }

    function updateButtons() {
        if (!track || !btnPrev || !btnNext) return;
        const sl  = track.scrollLeft;
        const max = track.scrollWidth - track.clientWidth;
        btnPrev.style.display = sl <= 2       ? 'none' : 'flex';
        btnNext.style.display = sl >= max - 2 ? 'none' : 'flex';
    }

    if (btnNext) btnNext.addEventListener('click', () => handleScroll('next'));
    if (btnPrev) btnPrev.addEventListener('click', () => handleScroll('prev'));
    if (track)   { track.addEventListener('scroll', updateButtons); window.addEventListener('resize', updateButtons); }

    renderCarousel();
    setTimeout(updateButtons, 100);
});

// =====================
// PHOTO WIDGET - Post by Label
// =====================

(function() {
    const CONFIG = {
        blogUrl:     "https://www.vutruong.vn",
        maxResults:  9,
        labelName:   "photo",
        defaultThumb: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    };
    let startIndex = 1;

    document.addEventListener("DOMContentLoaded", () => {
        const wrapper = document.getElementById('VT_photoPostwidgetWrapper');
        if (!wrapper) return;
        fetchPosts();
        const btnMore = document.getElementById('VT_photoPostwidget_btnLoadMore');
        if (btnMore) {
            btnMore.onclick = function() {
                this.innerHTML = "<i class='fa-duotone fa-spinner-third fa-spin me-2'></i>";
                fetchPosts();
            };
        }
    });

    function fetchPosts() {
        const script    = document.createElement('script');
        const labelPath = CONFIG.labelName ? `/-/${encodeURIComponent(CONFIG.labelName)}` : "";
        script.src      = `${CONFIG.blogUrl}/feeds/posts/default${labelPath}?alt=json-in-script&start-index=${startIndex}&max-results=${CONFIG.maxResults}&callback=renderPosts`;
        document.head.appendChild(script);
        script.onload = () => script.remove();
    }

    // renderPosts phải là global để callback JSON-in-script gọi được
    window.renderPosts = function(json) {
        const wrapper = document.getElementById('VT_photoPostwidgetWrapper');
        const btn     = document.getElementById('VT_photoPostwidget_btnLoadMore');
        if (!wrapper) return;

        const loading = wrapper.querySelector('.VT_photoPostwidget_loadingText');
        if (loading) loading.remove();

        const entries = json.feed.entry;
        if (!entries || entries.length === 0) {
            if (startIndex === 1) wrapper.innerHTML = '<p class="m-0 p-0">Không có bài viết.</p>';
            if (btn) btn.style.display = "none";
            return;
        }

        const parser = new DOMParser();
        const html   = entries.map(post => {
            const id       = post.id.$t.split('-').pop();
            const title    = post.title.$t.trim();
            const content  = post.content?.$t || post.summary?.$t || "";
            const doc      = parser.parseFromString(content, 'text/html');
            const cleanTxt = doc.body.textContent.trim().replace(/\s+/g, ' ');
            const dispTitle = title || (cleanTxt ? cleanTxt.substring(0, 100) + "..." : `#ID: ${id}`);
            const summary  = cleanTxt.substring(0, 100) + (cleanTxt.length > 100 ? "..." : "");
            const link     = post.link.find(l => l.rel === 'alternate').href;
            let thumb      = CONFIG.defaultThumb;
            if (post.media$thumbnail) {
                thumb = post.media$thumbnail.url.replace(/\/s72\-c/, "/s200-c");
            } else {
                const firstImg = doc.querySelector('img');
                if (firstImg) thumb = firstImg.src;
            }
            const date = new Date(post.published.$t).toLocaleDateString('vi-VN');

            return `
                <div class="vtFeed_postItem custom-post-item position-relative">
                    <a class="d-block overflow-hidden w-100 h-100 rounded-3" href="${link}" title="${dispTitle}">
                        <img class="vtFeed_postThumbnail post-thumb rounded-3 m-0 w-100 h-100" loading="lazy" src="${thumb}" alt="thumb" onerror="this.src='${CONFIG.defaultThumb}'">
                    </a>
                    <div class="vtFeed_postInfo post-content-right rounded-3">
                        <h1 class="vtFeed_postTitle small m-0 px-2"><a class="text-decoration-none text-light fw-normal" href="${link}" title="${dispTitle}">${dispTitle}</a></h1>
                        <small class="vtFeed_postPublish d-none opacity-50">${date}</small>
                        <div class="vtFeed_postSnippet d-none post-summary">${summary}</div>
                    </div>
                </div>`;
        }).join('');

        wrapper.insertAdjacentHTML('beforeend', html);

        const hasMore = entries.length === CONFIG.maxResults;
        if (btn) {
            btn.style.display = hasMore ? "inline-block" : "none";
            btn.innerHTML     = "Xem thêm";
        }
        if (hasMore) startIndex += CONFIG.maxResults;
    };
})();

// =====================
// ADMIN SYSTEM
// Hiển thị .VT-admin-tools theo UID, không cần reload trang
// Logic chính đã được tích hợp vào firebase.js (applyAdminToolsUI trong updateAuthUI)
// Giữ lại VT_InitAdminSystem và VT_ApplyAdminUI để tương thích với multiple-items.js
// =====================

// VT_ApplyAdminUI: được khai báo trong firebase.js (window.VT_ApplyAdminUI)
// Đây chỉ là fallback nếu firebase.js chưa load
// UID Admin: dùng window.VT_ADMIN_UIDS từ firebase.js (nguồn gốc duy nhất)

if (typeof window.VT_ApplyAdminUI === 'undefined') {
    window.VT_ApplyAdminUI = () => {
        // Ưu tiên sessionStorage (do firebase.js set khi xác thực xong)
        const isAdminSession = sessionStorage.getItem('VT_AdminLogged') === 'true';
        // Fallback: kiểm tra uid hiện tại trong window.VT_ADMIN_UIDS nếu có
        const uid    = window._vtCurrentUid;
        const admins = window.VT_ADMIN_UIDS || [];
        const isAdmin = isAdminSession || (uid && admins.includes(uid));

        document.querySelectorAll('.VT-admin-tools').forEach(el => {
            if (isAdmin) el.classList.remove('d-none');
            else         el.remove();
        });
    };
}

// VT_InitAdminSystem: tương thích với multiple-items.js (gọi sau AJAX load more)
// firebase.js đã xử lý toàn bộ logic - hàm này chỉ áp dụng lại UI
window.VT_InitAdminSystem = function() {
    if (typeof window.VT_ApplyAdminUI === 'function') {
        window.VT_ApplyAdminUI();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.VT_InitAdminSystem);
} else {
    window.VT_InitAdminSystem();
}

// =====================
// CONVERT ẢNH SANG .WEBP
// Tự động chuyển đổi URL ảnh Blogger sang định dạng WebP
// =====================

document.addEventListener("DOMContentLoaded", function() {
    const processUrl = (url) => {
        if (!url || url.includes('-rw') || !url.match(/bp\.blogspot\.com|googleusercontent\.com/)) return url;
        if (url.includes('=')) return url.replace(/=([^]*)$/, "=$1-rw");
        return url.replace(/\/(s|w)(\d+)(-[^/]+)?\//, "/$1$2$3-rw/");
    };

    const convertAll = (container) => {
        container.querySelectorAll('img, a[data-fancybox]').forEach(el => {
            if (el.tagName === 'IMG') {
                const old = el.getAttribute('src');
                const n   = processUrl(old);
                if (n !== old) { el.onerror = function() { this.src = old; this.onerror = null; }; el.src = n; }
            } else {
                const old = el.getAttribute('href');
                const n   = processUrl(old);
                if (n !== old) { el.href = n; el.setAttribute('data-src', n); }
            }
        });
    };

    convertAll(document);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                if (node.tagName === 'IMG') {
                    const old = node.src; node.src = processUrl(old);
                } else if (node.tagName === 'A' && node.hasAttribute('data-fancybox')) {
                    const old = node.href; node.href = processUrl(old);
                }
                convertAll(node);
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

// =====================
// SIDEBAR STICKY
// Chỉ hoạt động trên desktop >= 992px
// =====================

document.addEventListener("DOMContentLoaded", (() => {
    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) return;

    let lastScrollY = window.pageYOffset;
    let sidebarOffset = 0;
    let isTicking     = false;

    function updateSidebar() {
        if (window.innerWidth < 992) {
            sidebar.style.position = '';
            sidebar.style.top      = '';
            sidebar.style.width    = '';
            return;
        }
        const curr          = window.pageYOffset;
        const viewH         = window.innerHeight;
        const sideH         = sidebar.offsetHeight;
        sidebarOffset      -= curr - lastScrollY;
        const maxOff        = viewH - sideH - 20;
        const minOff        = 80;
        sidebarOffset       = Math.min(minOff, Math.max(maxOff, sidebarOffset));
        sidebar.style.position = 'sticky';
        sidebar.style.top      = (sideH <= viewH) ? '80px' : sidebarOffset + 'px';
        lastScrollY = curr;
    }

    const tick = () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => { updateSidebar(); isTicking = false; });
            isTicking = true;
        }
    };

    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    updateSidebar();
}));

// =====================
// RIPPLE EFFECT
// Hiệu ứng Material Design khi click .ripple
// =====================

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", (e) => {
        const target = e.target.closest(".ripple");
        if (!target) return;

        const circle   = document.createElement("span");
        const diameter = Math.max(target.clientWidth, target.clientHeight);
        const radius   = diameter / 2;
        const rect     = target.getBoundingClientRect();

        circle.style.width  = circle.style.height = `${diameter}px`;
        circle.style.left   = `${e.clientX - rect.left - radius}px`;
        circle.style.top    = `${e.clientY - rect.top  - radius}px`;
        circle.classList.add("ripple-effect");

        target.querySelector(".ripple-effect")?.remove();
        target.appendChild(circle);
        circle.addEventListener("animationend", () => circle.remove(), { once: true });
    });
});

// =========================================================================================
// VT Zone Body Scripts v5.0.1 - Ready
// =========================================================================================
