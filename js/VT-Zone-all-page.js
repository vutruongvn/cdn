// =========================================================================================
// VT ZONE - ALL PAGE SCRIPTS - PURE JAVASCRIPT
// No jQuery Required - 100% Vanilla JS
// vutruong.vn
// =========================================================================================

console.log('%c🚀 [VT Zone] All Page Scripts Loading...', 'color: #4285F4; font-weight: bold;');

// =========================================================================================
// THEME TOGGLE - Bật/tắt Dark Mode với ghi nhớ
// =========================================================================================
(() => {
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    const htmlElement = document.documentElement;
    
    function toggleTheme() {
        const isDark = htmlElement.classList.toggle('VT_darkMode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        console.log(`%c🌓 [Theme] Switched to ${isDark ? 'dark' : 'light'} mode`, 'color: #FBBC04;');
    }
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', toggleTheme);
    });
    
    console.log('%c✅ [Theme] Toggle initialized', 'color: #34A853;');
})();

// =========================================================================================
// AUTHOR AVATAR - Auto lấy và chèn avatar tác giả
// =========================================================================================
document.addEventListener("DOMContentLoaded", function() {
    if (typeof authorAvatarUrl === 'undefined' || authorAvatarUrl === "") return;
    
    console.log('%c👤 [Avatar] Processing author avatar...', 'color: #4285F4;');
    
    // URL đã resize (s200)
    const optimizedUrl = authorAvatarUrl
        .replace(/\/s\d+(-c)?\//, '/s200/')
        .replace(/\/w\d+(-h\d+)?(-c)?\//, '/s200/');
    
    // URL gốc (s1600)
    const originalUrl = authorAvatarUrl
        .replace(/\/s\d+(-c)?\//, '/s1600/')
        .replace(/\/w\d+(-h\d+)?(-c)?\//, '/s1600/');
    
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
    
    console.log('%c✅ [Avatar] Author avatar updated', 'color: #34A853;');
});

// =========================================================================================
// SHARE NATIVE - Chia sẻ qua hệ thống
// =========================================================================================
document.addEventListener('click', async function(event) {
    const btn = event.target.closest('.btn-share-native');
    if (!btn) return;
    
    const title = btn.getAttribute('data-title');
    const url = btn.getAttribute('data-url');
    const img = btn.getAttribute('data-image');
    
    const shareData = {
        title: title,
        text: `${title}`,
        url: url
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            console.log('%c📤 [Share] Shared successfully', 'color: #34A853;');
        } else {
            await navigator.clipboard.writeText(url);
            alert('Đã copy link: ' + title);
            console.log('%c📋 [Share] Link copied', 'color: #34A853;');
        }
    } catch (err) {
        console.log('%c⚠️ [Share] User cancelled or error:', 'color: #FBBC04;', err);
    }
});

// =========================================================================================
// MOBILE MENU - Ẩn/hiện menu khi scroll trên mobile
// =========================================================================================
document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.centerMenu');
    if (!menu) return;
    
    console.log('%c📱 [Menu] Mobile menu scroll handler initialized', 'color: #4285F4;');
    
    let lastScrollTop = 0;
    const delta = 5;
    let isTicking = false;
    
    function handleScrollMenu() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        // Luôn hiện menu khi ở top
        if (currentScroll < delta) {
            menu.classList.remove('menu-hidden');
            lastScrollTop = currentScroll;
            return;
        }
        
        // Kiểm tra delta để tránh rung
        if (Math.abs(lastScrollTop - currentScroll) <= delta) {
            return;
        }
        
        // Ẩn khi cuộn xuống, hiện khi cuộn lên
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
// SIDEBAR STICKY - Sidebar dính thông minh khi scroll
// =========================================================================================
document.addEventListener("DOMContentLoaded", (() => {
    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) return;
    
    console.log('%c📌 [Sidebar] Sticky sidebar initialized', 'color: #4285F4;');
    
    let lastScrollY = window.pageYOffset;
    let sidebarOffset = 0;
    let isTicking = false;
    
    function updateSidebarPosition() {
        // Chỉ hoạt động trên desktop (>= 992px)
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
        
        // Điều chỉnh offset khi scroll
        sidebarOffset -= scrollDelta;
        
        // Giới hạn offset
        const maxOffset = viewportHeight - sidebarHeight - 20;
        const minOffset = 80;
        
        if (sidebarOffset > minOffset) {
            sidebarOffset = minOffset;
        } else if (sidebarOffset < maxOffset) {
            sidebarOffset = maxOffset;
        }
        
        // Apply styles
        sidebar.style.position = 'sticky';
        
        if (sidebarHeight <= viewportHeight) {
            sidebar.style.top = '80px';
        } else {
            sidebar.style.top = sidebarOffset + 'px';
        }
        
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
    
    // Init
    updateSidebarPosition();
}));

// =========================================================================================
// URL CLEANUP - Xóa ?m=1 trên URL mobile
// =========================================================================================
(() => {
    const uri = window.location.toString();
    if (uri.indexOf("?m=1") > 0) {
        const cleanUri = uri.substring(0, uri.indexOf("?m=1"));
        window.history.replaceState({}, document.title, cleanUri);
        console.log('%c🔗 [URL] Cleaned mobile parameter', 'color: #34A853;');
    }
})();

// =========================================================================================
// REPORT POST - Lưu thông tin bài viết để báo lỗi
// =========================================================================================
document.addEventListener('click', function(e) {
    const reportBtn = e.target.closest('.reportPost');
    if (!reportBtn) return;
    
    e.preventDefault();
    
    const postTitle = reportBtn.getAttribute('data-post-title');
    const postUrl = reportBtn.getAttribute('data-post-url');
    
    const reportData = {
        title: postTitle,
        url: postUrl
    };
    
    sessionStorage.setItem('pendingReport', JSON.stringify(reportData));
    console.log('%c📝 [Report] Post data saved', 'color: #FBBC04;');
    
    window.location.href = '//vutruong.vn/report';
});

// =========================================================================================
// POST GALLERY LAYOUT - Auto layout cho ảnh trong bài viết
// =========================================================================================
function VT_homePostLayout() {
    console.log('%c🖼️ [Gallery] Processing post galleries...', 'color: #4285F4;');
    
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
                
                // Overlay cho ảnh thứ 5 nếu có nhiều hơn 5 ảnh
                if (idx === 4 && count > 5) {
                    const overlay = document.createElement('div');
                    overlay.className = 'vt-gallery-overlay';
                    overlay.innerHTML = `<div class="vt-gallery-overlay-text">+${count - 5}</div>`;
                    link.appendChild(overlay);
                }
                
                const clonedImg = img.cloneNode(true);
                clonedImg.loading = 'lazy';
                link.appendChild(clonedImg);
                
                // Chỉ append 5 ảnh đầu
                if (idx < 5) {
                    gallery.appendChild(link);
                }
                
                // Xóa separator gốc sau khi xử lý
                if (parentSep) {
                    parentSep.remove();
                }
            });
            
            container.appendChild(gallery);
            container.setAttribute('data-layout-processed', 'true');
        }
    });
    
    console.log(`%c✅ [Gallery] Processed ${postContainers.length} galleries`, 'color: #34A853;');
}

// Export để các file khác có thể gọi
window.VT_homePostLayout = VT_homePostLayout;

// Auto run khi DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_homePostLayout);
} else {
    VT_homePostLayout();
}

// =========================================================================================
// PHOTO POST WIDGET - Widget hiển thị bài viết có ảnh
// =========================================================================================
window.VT_photoPostWidget = (() => {
    const CONFIG = {
        blogUrl: 'https://vutruong.vn',
        label: 'Image',
        maxResults: 9,
        defaultThumb: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhK6tO1OLUl7L_G8TVqmMIJpZA1I0mZ2qh7BtNwYqZN5fFuPDWvCl8zJbmQUg-SIkT4iGxqiXVLFqFgWTFaOXX5pW-M2eSlv7DdUi-v8DjFgJCF_YJvB4SDuwLOXxNGc9aE4CHl9ioMZtpPx_9t2Dkx0hWCTVxPiU9_J03k2bkuCTK7E_NU72hy4Q/s1600/no-img-min.png'
    };
    
    let startIndex = 1;
    
    function load() {
        const url = `${CONFIG.blogUrl}/feeds/posts/default/-/${encodeURIComponent(CONFIG.label)}?alt=json&start-index=${startIndex}&max-results=${CONFIG.maxResults}`;
        const script = document.createElement('script');
        script.src = url + '&callback=VT_photoPostWidget.render';
        document.body.appendChild(script);
        script.onload = () => script.remove();
    }
    
    function render(json) {
        const wrapper = document.getElementById('VT_photoPostwidgetWrapper');
        const btn = document.getElementById('VT_photoPostwidget_btnLoadMore');
        const loading = wrapper.querySelector('.VT_photoPostwidget_loadingText');
        
        if (loading) loading.remove();
        
        const entries = json.feed.entry;
        if (!entries || entries.length === 0) {
            if (startIndex === 1) wrapper.innerHTML = '<p class="m-0 p-0">Không có bài viết.</p>';
            btn.style.display = "none";
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
        btn.style.display = hasMore ? "inline-block" : "none";
        btn.innerHTML = "Xem thêm";
        
        if (hasMore) startIndex += CONFIG.maxResults;
    }
    
    return { load, render };
})();

// =========================================================================================
// ADMIN SYSTEM - Quyền admin chỉ cho VT
// =========================================================================================
const VT_ADMIN_UID = 'u9U3j9O63jbipOgai3o88X4008q2';

// Hàm apply UI (export để AJAX có thể gọi lại)
window.VT_ApplyAdminUI = () => {
    const isAdmin = sessionStorage.getItem('VT_AdminLogged') === 'true';
    const adminTools = document.querySelectorAll('.VT-admin-tools');
    
    if (isAdmin) {
        adminTools.forEach(el => el.classList.remove('d-none'));
        console.log('%c👑 [Admin] Admin UI visible', 'color: #FBBC04;');
    } else {
        adminTools.forEach(el => el.remove());
    }
};

const VT_InitAdminSystem = () => {
    // Kiểm tra Firebase Auth có sẵn không
    if (typeof window.firebase === 'undefined' || !window.firebase.auth) {
        console.warn('%c⚠️ [Admin] Firebase Auth not available', 'color: #FBBC04;');
        return;
    }
    
    console.log('%c👑 [Admin] Checking admin status...', 'color: #4285F4;');
    
    window.firebase.auth().onAuthStateChanged((user) => {
        const isAdmin = user && user.uid === VT_ADMIN_UID;
        const wasAdmin = sessionStorage.getItem('VT_AdminLogged') === 'true';
        
        if (isAdmin && !wasAdmin) {
            sessionStorage.setItem('VT_AdminLogged', 'true');
            console.log('%c👑 [Admin] Admin logged in, reloading...', 'color: #34A853;');
            window.location.reload();
            return;
        }
        
        if (!isAdmin && wasAdmin) {
            sessionStorage.removeItem('VT_AdminLogged');
            console.log('%c👑 [Admin] Admin logged out, reloading...', 'color: #EA4335;');
            window.location.reload();
            return;
        }
        
        window.VT_ApplyAdminUI();
    });
};

// Init admin system
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_InitAdminSystem);
} else {
    VT_InitAdminSystem();
}

// =========================================================================================
// WEBP CONVERSION - Convert ảnh sang WebP
// =========================================================================================
document.addEventListener("DOMContentLoaded", function() {
    console.log('%c🖼️ [WebP] Converting images to WebP...', 'color: #4285F4;');
    
    const processUrl = (url) => {
        if (!url || url.includes('-rw') || !url.match(/bp\.blogspot\.com|googleusercontent\.com/)) {
            return url;
        }
        
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
                    el.onerror = function() {
                        this.src = oldSrc;
                        this.onerror = null;
                    };
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
    
    // Chạy lần đầu
    convertAll(document);
    
    // Theo dõi nội dung mới
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'IMG') {
                        const old = node.src;
                        node.src = processUrl(old);
                    } else if (node.tagName === 'A' && node.hasAttribute('data-fancybox')) {
                        const old = node.href;
                        node.href = processUrl(old);
                    }
                    convertAll(node);
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log('%c✅ [WebP] Image conversion active', 'color: #34A853;');
});

// =========================================================================================
console.log('%c✅ [VT Zone] All page scripts loaded successfully!', 'color: #34A853; font-weight: bold;');
// =========================================================================================
