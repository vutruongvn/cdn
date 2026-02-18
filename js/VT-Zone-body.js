// =========================================================================================
// VT ZONE - ALL PAGE SCRIPTS
// Chạy trên toàn hệ thống - vutruong.vn
// =========================================================================================

console.log('%c🚀 VT Zone Scripts', 'color: #4285F4; font-weight: bold; font-size: 14px;', 'Đang khởi tạo...');

// =========================================================================================
// Function bật/tắt VT_darkMode => Ghi nhớ lịch sử
// FIX: Bọc trong DOMContentLoaded để đảm bảo DOM đã sẵn sàng trước khi querySelectorAll
document.addEventListener('DOMContentLoaded', function() {
    console.log('%c🌓 Theme Toggle', 'color: #FBBC04;', 'Đã khởi tạo');

    const toggleButtons = document.querySelectorAll('.theme-toggle');
    const htmlElement = document.documentElement;

    function toggleTheme() {
        const isDark = htmlElement.classList.toggle('VT_darkMode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        console.log('%c🌓 Theme', 'color: #FBBC04;', isDark ? 'Chế độ tối' : 'Chế độ sáng');
    }

    toggleButtons.forEach(button => {
        button.addEventListener('click', toggleTheme);
    });
});

// Function auto lấy url ảnh đại diện tác giả => chèn vào profile-wrapper avatar
document.addEventListener("DOMContentLoaded", function() {
    if (typeof authorAvatarUrl !== 'undefined' && authorAvatarUrl !== "") {
        
        const optimizedUrl = authorAvatarUrl.replace(/\/s\d+(-c)?\//, '/s200/').replace(/\/w\d+(-h\d+)?(-c)?\//, '/s200/');
        const originalUrl = authorAvatarUrl.replace(/\/s\d+(-c)?\//, '/s1600/').replace(/\/w\d+(-h\d+)?(-c)?\//, '/s1600/');

        const updateElements = (selector, url) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const tagName = el.tagName.toLowerCase();
                if (tagName === 'img') {
                    el.src = url;
                } else if (tagName === 'a') {
                    el.href = url;
                } else {
                    el.style.backgroundImage = `url('${url}')`;
                }
            });
        };

        updateElements('.set-author-avatar', optimizedUrl);
        updateElements('.set-author-avatar-original', originalUrl);
    }
});

// =========================================================================================
// Function share native gán vào .btn-share-native sử dụng trình chia sẻ của hệ thống
document.addEventListener('click', async function(event) {
    const btn = event.target.closest('.btn-share-native');
    if (!btn) return;

    const title = btn.getAttribute('data-title');
    const url = btn.getAttribute('data-url');

    const shareData = { title, text: title, url };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(url);
            alert('Đã copy link: ' + title);
        }
    } catch (err) {
        console.log('User cancelled or error:', err);
    }
});

// =========================================================================================
// Function ẩn hiện .centerMenu khi xem trên Mobile === by VT Zone ===
document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.centerMenu');
    if (!menu) return;

    let lastScrollTop = 0;
    const delta = 5;
    let isTicking = false;

    function handleScrollMenu() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll < delta) {
            menu.classList.remove('menu-hidden');
            lastScrollTop = currentScroll;
            return;
        }

        if (Math.abs(lastScrollTop - currentScroll) <= delta) return;

        if (currentScroll > lastScrollTop) {
            menu.classList.add('menu-hidden');
        } else {
            menu.classList.remove('menu-hidden');
        }

        lastScrollTop = currentScroll;
    }

    const requestTick = () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                handleScrollMenu();
                isTicking = false;
            });
            isTicking = true;
        }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
});


// =========================================================================================
// Function xóa ?m=1 trên URL khi xem bằng Mobile
// FIX: Bỏ tham số thứ 2 dư thừa của indexOf (không phải fromIndex)
var uri = window.location.toString();
if (uri.indexOf("?m=1") > 0) {
    var clean_uri = uri.substring(0, uri.indexOf("?m=1"));
    window.history.replaceState({}, document.title, clean_uri);
}

// =========================================================================================
// Function lấy dữ liệu từ .reportPost => điền vào input trang /report
document.addEventListener('click', function(e) {
    const reportBtn = e.target.closest('.reportPost');
    if (reportBtn) {
        e.preventDefault();
        const reportData = {
            title: reportBtn.getAttribute('data-post-title'),
            url: reportBtn.getAttribute('data-post-url')
        };
        sessionStorage.setItem('pendingReport', JSON.stringify(reportData));
        window.location.href = '//vutruong.vn/report'; 
    }
});

// =========================================================================================
// ===== Function Post Gallery Layout Auto for Blog Post by VT Zone =====
function VT_homePostLayout() {
    console.log('%c🖼️ Gallery Layout', 'color: #4285F4;', 'Đang xử lý bài viết...');
    
    const postContainers = document.querySelectorAll('.postBody_multipleItems:not([data-layout-processed]), .postBody_singleItem:not([data-layout-processed])');

    postContainers.forEach((container) => {
        const imgs = container.querySelectorAll('img');
        const count = imgs.length;

        if (count > 0) {
            const gallery = document.createElement('div');
            const displayCount = count > 5 ? 5 : count;
            gallery.className = `VT_homePostGallery p-0 m-0 mb-3 layout-${displayCount}`;
            
            const postId = container.closest('.post')?.id || 'album-' + Math.random().toString(36).substr(2, 5);

            imgs.forEach((img, idx) => {
                const parentSep = img.closest('.separator');
                const link = document.createElement('a');
                link.href = img.src;
                link.setAttribute('data-fancybox', 'gallery-' + postId);
                
                if (idx === 4 && count > 5) {
                    const overlay = document.createElement('div');
                    overlay.className = 'vt-gallery-overlay';
                    overlay.innerHTML = `<span>+${count - 5}</span>`;
                    link.appendChild(overlay);
                }

                if (idx >= 5) link.style.display = 'none';

                img.removeAttribute('style'); 
                link.appendChild(img);
                gallery.appendChild(link);
                
                if (parentSep && parentSep.innerHTML.trim() === "") {
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
        }

        container.setAttribute('data-layout-processed', 'true');
    });
}
document.addEventListener('DOMContentLoaded', VT_homePostLayout);

// ========================================================================================================
// Function kiểm tra trạng thái data:post.body và ẩn nút v-fullPost
function VT_checkReadMore() {
    const limitedBoxes = document.querySelectorAll('.postBodyLimited:not([data-readmore-checked])');
    
    limitedBoxes.forEach(box => {
        const container = box.closest('.postBody_multipleItems, .postBody_singleItem');
        if (!container) return;
        
        const btn = container.querySelector('.v-fullPost');
        if (btn) {
            const isOverflowing = box.scrollHeight > (box.clientHeight + 0);
            if (!isOverflowing) {
                btn.style.setProperty('display', 'none', 'important');
            }
        }

        box.setAttribute('data-readmore-checked', 'true');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(VT_checkReadMore, 200);
});

// =========================================================================================
/* === Hàm Fade (Chỉ dùng JS thuần) === */

function fadeIn(element, duration = 100) {
    element.style.opacity = '0';
    element.style.visibility = 'visible';
    element.style.transition = `opacity ${duration}ms ease-in`;
    requestAnimationFrame(() => {
        element.style.opacity = '1';
    });
    element.addEventListener('transitionend', function handler() {
        element.style.transition = ''; 
        element.removeEventListener('transitionend', handler);
    }, { once: true });
}

function fadeOut(element, duration = 100) {
    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease-out`;
    requestAnimationFrame(() => {
        element.style.opacity = '0';
    });
    element.addEventListener('transitionend', function handler() {
        element.style.visibility = 'hidden'; 
        element.style.display = 'none';
        element.style.opacity = '';
        element.style.transition = '';
        element.removeEventListener('transitionend', handler);
    }, { once: true });
}


/* === Chức năng Ẩn/Hiện Popup Tài khoản Người dùng (Sử dụng Fade) === */
document.addEventListener('DOMContentLoaded', function() {
    const avatarButton = document.querySelector('.user-profile-details .avatar-user');
    const popupPanel = document.querySelector('.popupShow_accountPanel');
    const body = document.body;
    const FADE_DURATION = 100;

    if (!avatarButton || !popupPanel) return;

    popupPanel.style.display = 'none'; 
    popupPanel.style.visibility = 'hidden';
    popupPanel.style.opacity = '0'; 

    function togglePopup(event) {
        event.stopPropagation();
        const computedStyle = window.getComputedStyle(popupPanel);
        const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

        if (isVisible) {
            fadeOut(popupPanel, FADE_DURATION);
        } else {
            popupPanel.style.display = 'block'; 
            fadeIn(popupPanel, FADE_DURATION);
        }
    }

    avatarButton.addEventListener('click', togglePopup);

    body.addEventListener('click', function(event) {
        const computedStyle = window.getComputedStyle(popupPanel);
        const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

        if (isVisible) {
            const isClickInsidePanel = popupPanel.contains(event.target);
            const isClickOnAvatar = avatarButton.contains(event.target);
            if (!isClickInsidePanel && !isClickOnAvatar) {
                fadeOut(popupPanel, FADE_DURATION);
            }
        }
    });
});

// =========================================================================================
// Tính năng Live Search - Vanilla JS (UI show/hide)
document.addEventListener('DOMContentLoaded', function() {
    const liveSearchTarget = document.getElementById('target_VT_live_search');
    const showTrigger = document.querySelector('.show_liveSearch');
    const closeButtons = document.querySelectorAll('.close_liveSearch, .vt-live-search-wrapper-overlay-background');
    
    if (!liveSearchTarget || !showTrigger || closeButtons.length === 0) return;
    
    liveSearchTarget.style.display = 'none'; 
    liveSearchTarget.style.visibility = 'hidden'; 
    liveSearchTarget.style.opacity = '0';
    
    function openLiveSearch(duration = 300) {
        liveSearchTarget.style.display = 'block';
        fadeIn(liveSearchTarget, duration);
    }
    
    function closeLiveSearch(duration = 300) {
        fadeOut(liveSearchTarget, duration);
    }
    
    showTrigger.addEventListener('click', function(event) {
        event.preventDefault(); 
        openLiveSearch(300);
        event.stopPropagation(); 
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault(); 
            closeLiveSearch(300);
            event.stopPropagation();
        });
    });
    
    document.addEventListener('click', function(event) {
        const target = event.target;
        const computedStyle = window.getComputedStyle(liveSearchTarget);
        const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

        if (isVisible) {
            if (
                target !== liveSearchTarget && 
                !liveSearchTarget.contains(target) &&
                target !== showTrigger &&
                !showTrigger.contains(target) 
            ) {
                closeLiveSearch(300);
            }
        }
    });

    document.addEventListener('keyup', function(e) {
        if (e.key === "Escape" || e.keyCode === 27) {
            const computedStyle = window.getComputedStyle(liveSearchTarget);
            const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';
            if (isVisible) closeLiveSearch(300);
        }
    });
});

// =========================================================================================
// Function Live Search - Core tìm kiếm (dùng jQuery + Blogger API)
$(document).ready(function() {
    let isLiveSearchInitialized = false;

    $('.show_liveSearch').on('click', function() {
        if (isLiveSearchInitialized) return;

        console.log('Nút tìm kiếm được click. Bắt đầu khởi tạo Live Search.');
        
        const searchInput = $('#vt-search-input');
        const resultsBox = $('#vt-live-results');
        let typingTimer;
        const doneTypingInterval = 500;
        
        function fetchSearchResults(keyword) {
            $.ajax({
                url: '/feeds/posts/summary?alt=json&q=' + encodeURIComponent(keyword) + '&max-results=10',
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    renderResults(data);
                },
                error: function() {
                    if (resultsBox.is(':visible')) {
                        resultsBox.html('<div class="vt-search-empty">Lỗi kết nối. Vui lòng thử lại.</div>');
                    }
                }
            });
        }

        function renderResults(json) {
            if (resultsBox.length === 0) return; 
            
            if (!json.feed.entry) {
                resultsBox.html('<div class="vt-search-empty"><i class="fad fa-circle-exclamation me-2"></i>Không tìm thấy kết quả nào, nhập Tiếng Việt có dấu để tìm kiếm chính xác nhất.</div>');
                return;
            }

            let html = '';
            $.each(json.feed.entry, function(i, entry) {
                const fullId = entry.id.$t;
                let displayId = fullId.substring(fullId.lastIndexOf('-') + 1);    
                let title = entry.title.$t;
                let finalTitle = title || 'Bài viết ID: ' + displayId;
                
                let link = '';
                for (let j = 0; j < entry.link.length; j++) {
                    if (entry.link[j].rel == 'alternate') { link = entry.link[j].href; break; }
                }
                
                let img = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi1iPw_w8MsNvluVqo_hgSKU5IoxcSUNJWb-YyjgdBGNyFH9ACIQHLj8g4EXnzHTiQ8D7PiR72qCpICKpVTPhyphenhyphen1Kq6u-GmBf5eJfLY5fmPxMscEdVXzfkXtP_2AFqz2oMaxB-Zm3cysmkl2ukTlqW7dz2BaOnqxUMPdH8wdS49L0snioA/s1600/avatarVT.JPEG'; 
                if (entry.media$thumbnail) {
                    img = entry.media$thumbnail.url.replace('/s72-c/', '/s100/');    
                }

                let label = (entry.category && entry.category.length > 0) ? entry.category[0].term : '';

                html += `
                <a href="${link}" class="vt-search-item ripple">
                    <div class="vt-search-info">
                        <span class="vt-search-title">${finalTitle}</span>
                        ${label ? `<span class="vt-search-label">#${label}</span>` : ''}
                    </div>
                </a>
                `;
            });

            let query = searchInput.val();
            html += `<a href="/search?q=${encodeURIComponent(query)}" class="vt-search-item" style="justify-content:center; color:#007bff; font-size:14px; font-weight:400">Xem tất cả kết quả <i class="fad fa-angle-down ms-1"/></a>`;

            resultsBox.html(html);
        }

        searchInput.on('keyup input', function() {
            clearTimeout(typingTimer);
            const query = $(this).val().trim();
            if (resultsBox.length === 0) return;
            if (query.length > 1) {    
                resultsBox.show().html('<div class="vt-search-loading text-left"><i class="fa-duotone fa-spinner-third fa-spin me-2"></i>Đang tìm kiếm...</div>');
                typingTimer = setTimeout(function() { fetchSearchResults(query); }, doneTypingInterval);
            } else {
                resultsBox.hide().empty();
            }
        });

        $(document).on('click', function(e) {
            if (!$(e.target).closest('.vt-live-search-wrapper').length) resultsBox.hide();
        });
        
        searchInput.on('focus', function() {
            if ($(this).val().length > 1 && resultsBox.html().trim() !== '') resultsBox.show();
        });

        isLiveSearchInitialized = true;
    }); 
});


// =========================================================================================
// Function thay đổi Font chữ trên toàn BODY
// FIX: Bọc trong IIFE để tránh ô nhiễm global scope
(function() {
    const FONT_STORAGE_KEY = 'blogFontPreference';
    const GOOGLE_SANS_CLASS = 'font-google-sans';
    const bodyElement = document.body;
    const togglerElement = document.getElementById('font-toggler');
    const FONT_NAME_1 = 'Roboto';
    const FONT_NAME_2 = 'Google Sans Flex';

    function toggleFont() {
        const isGoogleSans = bodyElement.classList.contains(GOOGLE_SANS_CLASS);
        if (isGoogleSans) {
            bodyElement.classList.remove(GOOGLE_SANS_CLASS);
            localStorage.setItem(FONT_STORAGE_KEY, FONT_NAME_1);
        } else {
            bodyElement.classList.add(GOOGLE_SANS_CLASS);
            localStorage.setItem(FONT_STORAGE_KEY, FONT_NAME_2);
        }
    }

    function applySavedFont() {
        const savedFont = localStorage.getItem(FONT_STORAGE_KEY);
        if (savedFont === FONT_NAME_2) bodyElement.classList.add(GOOGLE_SANS_CLASS);
        if (togglerElement) togglerElement.addEventListener('click', toggleFont);
    }

    applySavedFont();
})();


// =========================================================================================
// === Function Slide Menu ===
"use strict";

class Sidenav {
    constructor(element) {
        this.el = element;
        this.toggleSelector = this.el.getAttribute("data-sidenav-toggle");
        this.init();
    }

    init() {
        this.initToggle();
        this.initDropdown();
    }

    initToggle() {
        document.addEventListener("click", (e) => {
            const target = e.target;
            const toggleBtn = this.toggleSelector ? target.closest(this.toggleSelector) : null;

            if (toggleBtn) {
                this.el.classList.toggle("show");
                document.body.classList.toggle("sidenav-no-scrolls");
                this.toggleOverlay();
            } else if (!target.closest('[data-sidenav]') && this.el.classList.contains("show")) {
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
            const icon = toggle.querySelector("[data-sidenav-dropdown-icon]");

            if (dropdown && dropdown.matches("[data-sidenav-dropdown]")) {
                this.slideToggle(dropdown);
                if (icon) icon.classList.toggle("show");
            }
        });
    }

    toggleOverlay() {
        let overlay = document.querySelector("[data-sidenav-overlay]");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.setAttribute("data-sidenav-overlay", "");
            overlay.className = "sidenav-overlay";
            document.body.appendChild(overlay);
        }
        const isVisible = getComputedStyle(overlay).display !== "none";
        if (isVisible) {
            this.fadeOut(overlay);
        } else {
            this.fadeIn(overlay);
        }
    }

    hideOverlay() {
        const overlay = document.querySelector("[data-sidenav-overlay]");
        if (overlay) this.fadeOut(overlay);
    }

    slideToggle(element) {
        if (window.getComputedStyle(element).display === 'none') {
            return this.slideDown(element);
        } else {
            return this.slideUp(element);
        }
    }

    slideUp(element) {
        element.style.height = element.offsetHeight + 'px';
        element.offsetHeight;
        element.style.height = '0px';
        setTimeout(() => {
            element.style.display = 'none';
            element.style.removeProperty('height');
        }, 300); 
    }

    slideDown(element) {
        element.style.display = 'block';
        let height = element.scrollHeight;
        element.style.height = '0px';
        element.offsetHeight;
        element.style.height = height + 'px';
        setTimeout(() => {
            element.style.removeProperty('height');
        }, 300);
    }

    fadeIn(element) {
        element.style.opacity = 0;
        element.style.display = "block";
        requestAnimationFrame(() => {
            element.style.transition = "opacity 0.3s";
            element.style.opacity = 1;
        });
    }

    fadeOut(element) {
        element.style.transition = "opacity 0.3s";
        element.style.opacity = 0;
        setTimeout(() => { element.style.display = "none"; }, 300);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const sidenavs = document.querySelectorAll("[data-sidenav]");
    sidenavs.forEach(el => new Sidenav(el));
});

// === End Function Slide Menu ===


// =========================================================================================
// === Function auto scroll ===
(function() {
    const path = window.location.pathname;
    const isHomePage = (path === '/' || path === '/index.html');
    const isSearchPage = path.includes('/search');
    const isListView = isHomePage || isSearchPage;

    const targetSelector = isListView ? '.profile-info-section' : '#mainPost';
    const offset = isListView ? 90 : 75;

    const element = document.querySelector(targetSelector);
    if (element) {
        setTimeout(() => {
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        }, 150);
    }
})();


// =========================================================================================
// ========= Function for Featured Story
document.addEventListener("DOMContentLoaded", function() {
    "use strict";

    function getThumbnail(fullUrl) {
        return fullUrl.replace(/\/s\d+\//, '/s250/');
    }

    const track = document.getElementById('vt-carousel-track');
    const btnPrev = document.getElementById('vt-btn-prev');
    const btnNext = document.getElementById('vt-btn-next');

    function renderCarousel() {
        if (!track) return;

        const groupedData = carouselData.reduce((acc, current) => {
            if (!acc[current.title]) acc[current.title] = [];
            acc[current.title].push(current);
            return acc;
        }, {});

        let html = '';
        Object.keys(groupedData).forEach(title => {
            const groupItems = groupedData[title];
            const mainItem = groupItems[0];
            const groupId = `group-${title.replace(/[\s\W]+/g, '-')}`; 
            const thumbnailUrl = getThumbnail(mainItem.link);

            html += `
            <div class="vt-card-item">
                <a href="${mainItem.link}" class="text-decoration-none d-block" data-fancybox="${groupId}">
                    <div class="carousel-div-img position-relative p-0 m-0 overflow-hidden">
                        <img src="${thumbnailUrl}" class="vt-card-img shadow-sm" alt="${title}" loading="lazy">
                        ${groupItems.length > 1 ? `<span class="position-absolute bottom-0 start-0 m-2 bg-dark badge rounded-pill fw-normal opacity-75">+${groupItems.length - 1}</span>` : ''}
                    </div>
                    <div class="text-center fw-medium small text-truncate px-1 d-none">
                        ${title}
                    </div>
                </a>
                ${groupItems.slice(1).map(item => {
                    return `<a class="story-item-hidden d-none" href="${item.link}" data-fancybox="${groupId}"></a>`;
                }).join('')}
            </div>
            `;
        });

        track.innerHTML = html;
    }

    function handleScroll(direction) {
        if (!track) return;
        const scrollAmount = track.clientWidth; 
        const currentScroll = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;

        let target = (direction === 'next') ? currentScroll + scrollAmount : currentScroll - scrollAmount;

        if (direction === 'next' && target >= maxScroll - 10) {
            track.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else if (direction === 'prev' && target <= 10) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            track.scrollTo({ left: target, behavior: 'smooth' });
        }
    }

    function updateButtons() {
        if (!track || !btnPrev || !btnNext) return;
        const scrollLeft = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;
        btnPrev.style.display = (scrollLeft <= 2) ? 'none' : 'flex';
        btnNext.style.display = (scrollLeft >= maxScroll - 2) ? 'none' : 'flex';
    }

    if (btnNext) btnNext.addEventListener('click', () => handleScroll('next'));
    if (btnPrev) btnPrev.addEventListener('click', () => handleScroll('prev'));

    if (track) {
        track.addEventListener('scroll', updateButtons);
        window.addEventListener('resize', updateButtons);
    }

    renderCarousel();
    setTimeout(updateButtons, 100);
});
// === END FEATURED STORIES ===


// === Function Photo Widget - Post by Label
// FIX: Bọc trong IIFE để tránh ô nhiễm global scope
(function() {
    const CONFIG = {
        blogUrl: "https://www.vutruong.vn",
        maxResults: 9,
        labelName: "photo",
        defaultThumb: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    };

    let startIndex = 1;

    document.addEventListener("DOMContentLoaded", () => {
        fetchPosts();
        const loadMoreBtn = document.getElementById('VT_photoPostwidget_btnLoadMore');
        if (loadMoreBtn) {
            loadMoreBtn.onclick = function() {
                this.innerHTML = "<i class='fa-duotone fa-spinner-third fa-spin me-2'></i>";
                fetchPosts();
            };
        }
    });

    function fetchPosts() {
        const script = document.createElement('script');
        const labelPath = CONFIG.labelName ? `/-/${encodeURIComponent(CONFIG.labelName)}` : "";
        script.src = `${CONFIG.blogUrl}/feeds/posts/default${labelPath}?alt=json-in-script&start-index=${startIndex}&max-results=${CONFIG.maxResults}&callback=renderPosts`;
        document.head.appendChild(script);
        script.onload = () => script.remove();
    }

    window.renderPosts = function(json) {
        const wrapper = document.getElementById('VT_photoPostwidgetWrapper');
        const btn = document.getElementById('VT_photoPostwidget_btnLoadMore');
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
        const html = entries.map(post => {
            const id = post.id.$t.split('-').pop();
            const title = post.title.$t.trim();
            const content = post.content?.$t || post.summary?.$t || "";
            
            const doc = parser.parseFromString(content, 'text/html');
            const cleanText = doc.body.textContent.trim().replace(/\s+/g, ' ');
            
            const displayTitle = title || (cleanText ? cleanText.substring(0, 100) + "..." : `#ID: ${id}`);
            const summary = cleanText.substring(0, 100) + (cleanText.length > 100 ? "..." : "");
            
            const link = post.link.find(l => l.rel === 'alternate').href;
            
            let thumb = CONFIG.defaultThumb;
            if (post.media$thumbnail) {
                thumb = post.media$thumbnail.url.replace(/\/s72\-c/, "/s200-c");
            } else {
                const firstImg = doc.querySelector('img');
                if (firstImg) thumb = firstImg.src;
            }

            const date = new Date(post.published.$t).toLocaleDateString('vi-VN');

            return `
                <div class="vtFeed_postItem custom-post-item position-relative">
                    <a class="d-block overflow-hidden w-100 h-100 rounded-3" href="${link}" title="${displayTitle}">
                    	<img class="vtFeed_postThumbnail post-thumb rounded-3 m-0 w-100 h-100" loading="lazy" src="${thumb}" alt="thumb" onerror="this.src='${CONFIG.defaultThumb}'">
                    </a>
                    <div class="vtFeed_postInfo post-content-right rounded-3">
                        <h1 class="vtFeed_postTitle small m-0 px-2"><a class="text-decoration-none text-light fw-normal" href="${link}" title="${displayTitle}">${displayTitle}</a></h1>
                        <small class="vtFeed_postPublish d-none opacity-50">${date}</small>
                        <div class="vtFeed_postSnippet d-none post-summary">${summary}</div>
                    </div>
                </div>`;
        }).join('');

        wrapper.insertAdjacentHTML('beforeend', html);

        const hasMore = entries.length === CONFIG.maxResults;
        if (btn) {
            btn.style.display = hasMore ? "inline-block" : "none";
            btn.innerHTML = "Xem thêm";
        }
        if (hasMore) startIndex += CONFIG.maxResults;
    };
})();

// === END ===


// ===============================================================
// Quyền ADMIN
const VT_ADMIN_UID = 'u9U3j9O63jbipOgai3o88X4008q2';

window.VT_ApplyAdminUI = () => {
    const isAdmin = sessionStorage.getItem('VT_AdminLogged') === 'true';
    const VT_adminTools = document.querySelectorAll('.VT-admin-tools');

    if (isAdmin) {
        VT_adminTools.forEach(el => el.classList.remove('d-none'));
    } else {
        VT_adminTools.forEach(el => el.remove());
    }
};

const VT_InitAdminSystem = () => {
    firebase.auth().onAuthStateChanged((user) => {
        const VT_isAdmin = user && user.uid === VT_ADMIN_UID;
        const VT_wasAdmin = sessionStorage.getItem('VT_AdminLogged') === 'true';

        if (VT_isAdmin && !VT_wasAdmin) {
            sessionStorage.setItem('VT_AdminLogged', 'true');
            window.location.reload();
            return;
        } 
        if (!VT_isAdmin && VT_wasAdmin) {
            sessionStorage.removeItem('VT_AdminLogged');
            window.location.reload();
            return;
        }

        window.VT_ApplyAdminUI();
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_InitAdminSystem);
} else {
    VT_InitAdminSystem();
}
// ===============================================================


// ================================================ VT ================================================
// FUNCTION CONVERT ẢNH SANG .WEBP
document.addEventListener("DOMContentLoaded", function() {
    const processUrl = (url) => {
        if (!url || url.includes('-rw') || !url.match(/bp\.blogspot\.com|googleusercontent\.com/)) return url;
        
        let newUrl = url;
        if (url.includes('=')) {
            newUrl = url.replace(/=([^]*)$/, "=$1-rw");
        } else {
            newUrl = url.replace(/\/(s|w)(\d+)(-[^/]+)?\//, "/$1$2$3-rw/");
        }
        return newUrl;
    };

    const convertAll = (container) => {
        const elements = container.querySelectorAll('img, a[data-fancybox]');
        elements.forEach(el => {
            if (el.tagName === 'IMG') {
                const oldSrc = el.getAttribute('src');
                const newSrc = processUrl(oldSrc);
                if (newSrc !== oldSrc) {
                    el.onerror = function() { this.src = oldSrc; this.onerror = null; };
                    el.src = newSrc;
                }
            } else if (el.tagName === 'A') {
                const oldHref = el.getAttribute('href');
                const newHref = processUrl(oldHref);
                if (newHref !== oldHref) {
                    el.href = newHref;
                    el.setAttribute('data-src', newHref);
                }
            }
        });
    };

    convertAll(document);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'IMG') {
                        const old = node.src; node.src = processUrl(old);
                    } else if (node.tagName === 'A' && node.hasAttribute('data-fancybox')) {
                        const old = node.href; node.href = processUrl(old);
                    }
                    convertAll(node);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
// ================================================ END ================================================


// =========================================================================================
// SIDEBAR STICKY
document.addEventListener("DOMContentLoaded", (() => {
    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) {
        console.log('%c⚠️ Sidebar', 'color: #FBBC04;', 'Không tìm thấy #sidebar');
        return;
    }
    
    console.log('%c✅ Sidebar Sticky', 'color: #34A853;', 'Đã khởi tạo');
    
    let lastScrollY = window.pageYOffset;
    let sidebarOffset = 0;
    let isTicking = false;
    
    function updateSidebarPosition() {
        if (window.innerWidth < 992) {
            sidebar.style.position = '';
            sidebar.style.top = '';
            sidebar.style.width = '';
            return;
        }
        
        const currentScrollY = window.pageYOffset;
        const viewportHeight = window.innerHeight;
        const sidebarHeight = sidebar.offsetHeight;
        const scrollDelta = currentScrollY - lastScrollY;
        
        sidebarOffset -= scrollDelta;
        
        const maxOffset = viewportHeight - sidebarHeight - 20;
        const minOffset = 80;
        
        if (sidebarOffset > minOffset) {
            sidebarOffset = minOffset;
        } else if (sidebarOffset < maxOffset) {
            sidebarOffset = maxOffset;
        }
        
        sidebar.style.position = 'sticky';
        sidebar.style.top = (sidebarHeight <= viewportHeight) ? '80px' : sidebarOffset + 'px';
        
        lastScrollY = currentScrollY;
    }
    
    const requestSidebarTick = () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                updateSidebarPosition();
                isTicking = false;
            });
            isTicking = true;
        }
    };
    
    window.addEventListener('scroll', requestSidebarTick, { passive: true });
    window.addEventListener('resize', requestSidebarTick, { passive: true });
    updateSidebarPosition();
}));


// =========================================================================================
// HIỆU ỨNG MATERIAL DESIGN KHI CLICK .ripple
document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", (event) => {
        const target = event.target.closest(".ripple");
        if (!target) return;

        const button = target;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        const rect = button.getBoundingClientRect();

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add("ripple-effect");

        const oldRipple = button.querySelector(".ripple-effect");
        if (oldRipple) oldRipple.remove();

        button.appendChild(circle);

        circle.addEventListener("animationend", () => {
            circle.remove();
        }, { once: true });
    });
});


// =========================================================================================
// VT ZONE - VUTRUONG.VN
// =========================================================================================
