// =========================================================================================
// VT ZONE - MULTIPLE ITEMS PAGE SCRIPTS - PURE JAVASCRIPT
// No jQuery Required - 100% Vanilla JS
// vutruong.vn
// =========================================================================================

console.log('%c📄 [VT Zone] Multiple Items Scripts Loading...', 'color: #4285F4; font-weight: bold;');

// =========================================================================================
// FIREBASE INITIALIZATION CHECK
// =========================================================================================
(() => {
    try {
        const { getApp, getApps, initializeApp } = window.FirebaseApp || {};
        const { getFirestore, initializeFirestore } = window.FirebaseFirestore || {};
        
        if (typeof window.db === 'undefined') {
            const app = (window.getApps && window.getApps().length) ? window.getApp() : null;
            if (app) {
                window.db = window.getFirestore ? window.getFirestore(app) : undefined;
            }
        }
        console.log('%c🔥 [Firebase] Instance check complete', 'color: #34A853;');
    } catch (err) {
        console.warn('%c⚠️ [Firebase] Not ready in multiple-items:', 'color: #FBBC04;', err);
    }
})();

// =========================================================================================
// POST COMMENTS DISPLAY - Hiển thị comments cho từng bài viết
// =========================================================================================
const VT_PostComments = {
    // Cấu hình
    config: {
        defaultAvatar: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-KgeTskqBUEMrGKXdyXDY-UoKDfmGAnlIITmiGc0bWYAcmkKlJuM1GacV-7OjlKUaIN8dK7WhkhRI3Z2NtgnfdJw3bDQtsMu7FOCnezYZYnoRxoTZhNtJ-WGY54pILgR8K6HsqhaWdXpkoD4l4Uoex11TA8yoEXY71MqG1e_8OiqXAEHhlGBJX1RyHEw/s40/vtzone-default-avatar.jpg',
        adminId: '06242775367226739172',
        verifiedIcon: `<svg class='Admin_verifiedIcon' data-bs-placement='right' data-bs-toggle='tooltip' fill='none' height='1rem' title='Admin' viewBox='0 0 24 24' width='16px' xmlns='http://www.w3.org/2000/svg'><g><path clip-rule='evenodd' d='M9.5924 3.20027C9.34888 3.4078 9.22711 3.51158 9.09706 3.59874C8.79896 3.79854 8.46417 3.93721 8.1121 4.00672C7.95851 4.03705 7.79903 4.04977 7.48008 4.07522C6.6787 4.13918 6.278 4.17115 5.94371 4.28923C5.17051 4.56233 4.56233 5.17051 4.28923 5.94371C4.17115 6.278 4.13918 6.6787 4.07522 7.48008C4.04977 7.79903 4.03705 7.95851 4.00672 8.1121C3.93721 8.46417 3.79854 8.79896 3.59874 9.09706C3.51158 9.22711 3.40781 9.34887 3.20027 9.5924C2.67883 10.2043 2.4181 10.5102 2.26522 10.8301C1.91159 11.57 1.91159 12.43 2.26522 13.1699C2.41811 13.4898 2.67883 13.7957 3.20027 14.4076C3.40778 14.6511 3.51158 14.7729 3.59874 14.9029C3.79854 15.201 3.93721 15.5358 4.00672 15.8879C4.03705 16.0415 4.04977 16.201 4.07522 16.5199C4.13918 17.3213 4.17115 17.722 4.28923 18.0563C4.56233 18.8295 5.17051 19.4377 5.94371 19.7108C6.278 19.8288 6.6787 19.8608 7.48008 19.9248C7.79903 19.9502 7.95851 19.963 8.1121 19.9933C8.46417 20.0628 8.79896 20.2015 9.09706 20.4013C9.22711 20.4884 9.34887 20.5922 9.5924 20.7997C10.2043 21.3212 10.5102 21.5819 10.8301 21.7348C11.57 22.0884 12.43 22.0884 13.1699 21.7348C13.4898 21.5819 13.7957 21.3212 14.4076 20.7997C14.6511 20.5922 14.7729 20.4884 14.9029 20.4013C15.201 20.2015 15.5358 20.0628 15.8879 19.9933C16.0415 19.963 16.201 19.9502 16.5199 19.9248C17.3213 19.8608 17.722 19.8288 18.0563 19.7108C18.8295 19.4377 19.4377 18.8295 19.7108 18.0563C19.8288 17.722 19.8608 17.3213 19.9248 16.5199C19.9502 16.201 19.963 16.0415 19.9933 15.8879C20.0628 15.5358 20.2015 15.201 20.4013 14.9029C20.4884 14.7729 20.5922 14.6511 20.7997 14.4076C21.3212 13.7957 21.5819 13.4898 21.7348 13.1699C22.0884 12.43 22.0884 11.57 21.7348 10.8301C21.5819 10.5102 21.3212 10.2043 20.7997 9.5924C20.5922 9.34887 20.4884 9.22711 20.4013 9.09706C20.2015 8.79896 20.0628 8.46417 19.9933 8.1121C19.963 7.95851 19.9502 7.79903 19.9248 7.48008C19.8608 6.6787 19.8288 6.278 19.7108 5.94371C19.4377 5.17051 18.8295 4.56233 18.0563 4.28923C17.722 4.17115 17.3213 4.13918 16.5199 4.07522C16.201 4.04977 16.0415 4.03705 15.8879 4.00672C15.5358 3.93721 15.201 3.79854 14.9029 3.59874C14.7729 3.51158 14.6511 3.40781 14.4076 3.20027C13.7957 2.67883 13.4898 2.41811 13.1699 2.26522C12.43 1.91159 11.57 1.91159 10.8301 2.26522C10.5102 2.4181 10.2043 2.67883 9.5924 3.20027ZM16.3735 9.86314C16.6913 9.5453 16.6913 9.03 16.3735 8.71216C16.0557 8.39433 15.5403 8.39433 15.2225 8.71216L10.3723 13.5624L8.77746 11.9676C8.45963 11.6498 7.94432 11.6498 7.62649 11.9676C7.30866 12.2854 7.30866 12.8007 7.62649 13.1186L9.79678 15.2889C10.1146 15.6067 10.6299 15.6067 10.9478 15.2889L16.3735 9.86314Z' fill='#4285F4' fill-rule='evenodd'/></g></svg>`,
        anonymousNames: [
            'Binz', 'M-TP', 'HIEUTHUHAI', 'Trịnh Trần Phương Tuấn',
            'Nguyễn Thanh Tùng', 'Phan Mạnh Quỳnh', 'Jack - J97', 
            'Trấn Thành', 'Mono'
        ]
    },
    
    // Resize avatar
    resizeAvatar(url, size) {
        if (!url || url.includes('blank.gif')) return this.config.defaultAvatar;
        return url.replace(/\/s\d+(-c)?\//g, `/s${size}-c/`);
    },
    
    // Đổi tên ẩn danh random
    renameAnonymous(name) {
        const checkNames = ['Anonymous', 'Ẩn danh'];
        if (checkNames.includes(name)) {
            const names = this.config.anonymousNames;
            const randomIndex = Math.floor(Math.random() * names.length);
            return names[randomIndex];
        }
        return name;
    },
    
    // Tính thời gian
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
    
    // Render HTML
    renderItem(entry) {
        const author = entry.author[0];
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
    
    // Fetch và đổ dữ liệu
    async load(container) {
        const postId = container.getAttribute('data-post-id');
        if (!postId || container.classList.contains('loaded')) return;
        
        try {
            const response = await fetch(`/feeds/${postId}/comments/default?alt=json&max-results=3`);
            if (!response.ok) throw new Error('Network response error');
            
            const data = await response.json();
            const entries = data.feed.entry;
            
            if (entries && entries.length > 0) {
                let html = '<ul class="post-comment-list list-unstyled p-0 px-3 m-0 mt-3 d-flex flex-column gap-2">';
                entries.forEach(entry => html += this.renderItem(entry));
                html += '</ul>';
                container.innerHTML = html;
                console.log(`%c💬 [Comments] Loaded ${entries.length} comments for post ${postId}`, 'color: #34A853;');
            } else {
                container.innerHTML = '<div class="py-2 px-3 m-3 mb-0 rounded-3 d-none" style="background:#f2f3f5"><i class="fa-regular fa-duotone fa-user me-2"></i>Bình luận</div>';
            }
            container.classList.add('loaded');
            
        } catch (error) {
            console.error(`%c❌ [Comments] Error loading comments for ${postId}:`, 'color: #EA4335;', error);
            container.innerHTML = '';
        }
    },
    
    // Khởi tạo
    init() {
        const containers = document.querySelectorAll('.multipleItems-rc:not(.loaded)');
        console.log(`%c💬 [Comments] Initializing ${containers.length} containers`, 'color: #4285F4;');
        containers.forEach(el => this.load(el));
    }
};

document.addEventListener('DOMContentLoaded', () => VT_PostComments.init());

// =========================================================================================
// COMMENT MANAGER - Lazy load iframe comments
// =========================================================================================
const VT_CommentManager = (() => {
    const BLOG_ID = '3049740051705190505';
    
    console.log('%c📝 [Comment Manager] Initializing...', 'color: #4285F4;');
    
    /**
     * LAZY LOAD IFRAME
     */
    const VT_InitLazyLoad = () => {
        const commentContainers = document.querySelectorAll('[id^="comment-box-"]:not(.vt-initialized)');
        const observerOptions = { root: null, rootMargin: '10px 0px', threshold: 0.01 };
        
        const VT_CreateIframe = (container) => {
            const postId = container.id.replace('comment-box-', '');
            if (!postId) return;
            
            container.classList.add('vt-initialized');
            container.innerHTML = `<div class="loading-status d-flex align-items-center justify-content-center position-absolute w-100 start-50 translate-middle-x" style="height:70px;font-size:1.2rem"><i class="fa-pro fa-duotone fa-spinner-third fa-spin"></i></div>`;
            
            const iframe = document.createElement('iframe');
            const src = `https://www.blogger.com/comment-iframe.g?blogID=${BLOG_ID}&postID=${postId}&skin=contempo`;
            
            iframe.src = src;
            iframe.width = '100%';
            iframe.height = '70px';
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('frameborder', '0');
            iframe.style.border = 'none';
            iframe.style.overflow = 'hidden';
            iframe.style.display = 'block';
            
            iframe.onload = () => {
                const loading = container.querySelector('.loading-status');
                if (loading) loading.remove();
                console.log(`%c✅ [Comment Manager] Iframe loaded for post ${postId}`, 'color: #34A853;');
            };
            
            container.appendChild(iframe);
        };
        
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    VT_CreateIframe(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        commentContainers.forEach(container => observer.observe(container));
        console.log(`%c📝 [Comment Manager] Observing ${commentContainers.length} containers`, 'color: #34A853;');
    };
    
    return { init: VT_InitLazyLoad };
})();

// Init comment manager
document.addEventListener('DOMContentLoaded', () => VT_CommentManager.init());

// =========================================================================================
// FIRST VISIT MESSAGE - Thông báo lần đầu
// =========================================================================================
(() => {
    const storageKey = 'hasVisitedBlog';
    const welcomeMessage = document.getElementById('first-visit-message');
    
    function checkFirstVisit() {
        if (localStorage.getItem(storageKey) === null) {
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
                console.log('%c👋 [First Visit] Welcome message shown', 'color: #FBBC04;');
            }
            localStorage.setItem(storageKey, 'true');
        }
    }
    
    window.closeWelcomeMessage = function() {
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
            console.log('%c👋 [First Visit] Message closed', 'color: #34A853;');
        }
    };
    
    document.addEventListener('DOMContentLoaded', checkFirstVisit);
})();

// =========================================================================================
// LAZY LOAD IMAGES - Tối ưu tải ảnh
// =========================================================================================
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            
            if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                img.onload = () => {
                    img.style.opacity = '1';
                };
            }
            
            observer.unobserve(img);
        }
    });
}, {
    root: null,
    rootMargin: '0px 0px 300px 0px',
    threshold: 0.01
});

function VT_LazyLoad() {
    const images = document.querySelectorAll('.VT_homePostGallery img:not(.lazy-processed)');
    
    images.forEach(img => {
        const currentSrc = img.getAttribute('src');
        
        if (!currentSrc || currentSrc.startsWith('data:') || img.classList.contains('no-lazy')) return;
        
        img.classList.add('lazy-processed');
        img.setAttribute('data-src', currentSrc);
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        img.style.opacity = '0';
        img.style.transition = 'transform .3s ease, opacity 1s ease';
        img.style.backgroundColor = '#f2f3f5';
        
        imageObserver.observe(img);
    });
    
    console.log(`%c🖼️ [Lazy Load] Processed ${images.length} images`, 'color: #34A853;');
}

// Init lazy load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_LazyLoad);
} else {
    VT_LazyLoad();
}

// =========================================================================================
console.log('%c✅ [VT Zone] Multiple items scripts loaded successfully!', 'color: #34A853; font-weight: bold;');
// =========================================================================================
