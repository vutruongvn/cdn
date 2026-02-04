// === JS for All Page === JS body
// === VT Zone === vutruong.vn
// Js for all page === Chạy trên tất cả trang
// Function bật/tắt VT_darkMode => Ghi nhớ lịch sử
    const toggleButtons = document.querySelectorAll('.theme-toggle');
    const htmlElement = document.documentElement;
    function toggleTheme() {
      const isDark = htmlElement.classList.toggle('VT_darkMode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    toggleButtons.forEach(button => {
      button.addEventListener('click', toggleTheme);
    });

// js lấy ảnh đại diện
    document.addEventListener("DOMContentLoaded", function() {
    // Kiểm tra biến authorAvatarUrl từ Blogger
    if (typeof authorAvatarUrl !== 'undefined' && authorAvatarUrl !== "") {
        
        // 1. URL đã resize (s180-c)
        const optimizedUrl = authorAvatarUrl.replace(/\/s\d+(-c)?\//, '/s200/').replace(/\/w\d+(-h\d+)?(-c)?\//, '/s200/');

        // 2. URL ảnh gốc (s1600)
        const originalUrl = authorAvatarUrl.replace(/\/s\d+(-c)?\//, '/s1600/').replace(/\/w\d+(-h\d+)?(-c)?\//, '/s1600/');

        // --- Hàm xử lý gán dữ liệu ---
        const updateElements = (selector, url) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const tagName = el.tagName.toLowerCase();
                
                if (tagName === 'img') {
                    el.src = url; // Gán cho thẻ ảnh
                } else if (tagName === 'a') {
                    el.href = url; // Gán link vào thẻ a theo yêu cầu của bạn
                } else {
                    el.style.backgroundImage = `url('${url}')`; // Gán nền cho div/span
                }
            });
        };

        // Chạy gán cho các class tương ứng
        updateElements('.set-author-avatar', optimizedUrl);
        updateElements('.set-author-avatar-original', originalUrl);
    }
});

// js share native
document.addEventListener('click', async function(event) {
  const btn = event.target.closest('.btn-share-native');
  if (!btn) return;

  const title = btn.getAttribute('data-title');
  const url = btn.getAttribute('data-url');
  // Blogger thường trả về ảnh mặc định nếu không có ảnh, ta xử lý chuỗi ở đây nếu cần
  const img = btn.getAttribute('data-image'); 

  const shareData = {
    title: title,
    text: `${title}`, // Thêm dòng dẫn dắt
    url: url
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Nếu máy tính bàn không hỗ trợ Web Share, ta copy link vào bộ nhớ
      await navigator.clipboard.writeText(url);
      alert('Đã copy link: ' + title);
    }
  } catch (err) {
    console.log('User cancelled or error:', err);
  }
});
// Function ẩn hiện .centerMenu khi xem trên Mobile
$(window).on('load', function() {
    let lastScrollTop = 0;
    const $menu = $('.centerMenu');
    const delta = 5;
    $(window).scroll(function(event) {
        const currentScroll = $(this).scrollTop();
        if (currentScroll < delta) {
            $menu.removeClass('menu-hidden');
            return;
        }
        if (Math.abs(lastScrollTop - currentScroll) <= delta) {
            return;
        }
        if (currentScroll > lastScrollTop) {
            $menu.addClass('menu-hidden');
        } else {
            $menu.removeClass('menu-hidden');
        }
        lastScrollTop = currentScroll;
    });
});

// Function xóa ?m=1 trên URL khi xem bằng Mobile
var uri = window.location.toString();
if (uri.indexOf("?m=1", "?m=1") > 0) {
    var clean_uri = uri.substring(0, uri.indexOf("?m=1"));
    window.history.replaceState({}, document.title, clean_uri);
}

// Function lấy dữ liệu từ .reportPost => điền vào input trang /report
document.addEventListener('click', function(e) {
    // Kiểm tra nếu click vào đúng thẻ reportPost
    const reportBtn = e.target.closest('.reportPost');
    
    if (reportBtn) {
        e.preventDefault();
        
        const postTitle = reportBtn.getAttribute('data-post-title');
        const postUrl = reportBtn.getAttribute('data-post-url');

        // Lưu thông tin vào sessionStorage
        const reportData = {
            title: postTitle,
            url: postUrl
        };
        sessionStorage.setItem('pendingReport', JSON.stringify(reportData));

        // Chuyển hướng đến trang báo lỗi
        window.location.href = '//vutruong.vn/report'; 
    }
});

// Function RC bên dưới mỗi bài viết trang Index
const VT_PostComments = {
    // 1. Cấu hình
    config: {
        defaultAvatar: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi-KgeTskqBUEMrGKXdyXDY-UoKDfmGAnlIITmiGc0bWYAcmkKlJuM1GacV-7OjlKUaIN8dK7WhkhRI3Z2NtgnfdJw3bDQtsMu7FOCnezYZYnoRxoTZhNtJ-WGY54pILgR8K6HsqhaWdXpkoD4l4Uoex11TA8yoEXY71MqG1e_8OiqXAEHhlGBJX1RyHEw/s40/vtzone-default-avatar.jpg',
        adminId: '06242775367226739172',
        verifiedIcon: `<svg class='Admin_verifiedIcon' data-bs-placement='right' data-bs-toggle='tooltip' fill='none' height='1rem' title='Admin' viewBox='0 0 24 24' width='16px' xmlns='http://www.w3.org/2000/svg'><g><path clip-rule='evenodd' d='M9.5924 3.20027C9.34888 3.4078 9.22711 3.51158 9.09706 3.59874C8.79896 3.79854 8.46417 3.93721 8.1121 4.00672C7.95851 4.03705 7.79903 4.04977 7.48008 4.07522C6.6787 4.13918 6.278 4.17115 5.94371 4.28923C5.17051 4.56233 4.56233 5.17051 4.28923 5.94371C4.17115 6.278 4.13918 6.6787 4.07522 7.48008C4.04977 7.79903 4.03705 7.95851 4.00672 8.1121C3.93721 8.46417 3.79854 8.79896 3.59874 9.09706C3.51158 9.22711 3.40781 9.34887 3.20027 9.5924C2.67883 10.2043 2.4181 10.5102 2.26522 10.8301C1.91159 11.57 1.91159 12.43 2.26522 13.1699C2.41811 13.4898 2.67883 13.7957 3.20027 14.4076C3.40778 14.6511 3.51158 14.7729 3.59874 14.9029C3.79854 15.201 3.93721 15.5358 4.00672 15.8879C4.03705 16.0415 4.04977 16.201 4.07522 16.5199C4.13918 17.3213 4.17115 17.722 4.28923 18.0563C4.56233 18.8295 5.17051 19.4377 5.94371 19.7108C6.278 19.8288 6.6787 19.8608 7.48008 19.9248C7.79903 19.9502 7.95851 19.963 8.1121 19.9933C8.46417 20.0628 8.79896 20.2015 9.09706 20.4013C9.22711 20.4884 9.34887 20.5922 9.5924 20.7997C10.2043 21.3212 10.5102 21.5819 10.8301 21.7348C11.57 22.0884 12.43 22.0884 13.1699 21.7348C13.4898 21.5819 13.7957 21.3212 14.4076 20.7997C14.6511 20.5922 14.7729 20.4884 14.9029 20.4013C15.201 20.2015 15.5358 20.0628 15.8879 19.9933C16.0415 19.963 16.201 19.9502 16.5199 19.9248C17.3213 19.8608 17.722 19.8288 18.0563 19.7108C18.8295 19.4377 19.4377 18.8295 19.7108 18.0563C19.8288 17.722 19.8608 17.3213 19.9248 16.5199C19.9502 16.201 19.963 16.0415 19.9933 15.8879C20.0628 15.5358 20.2015 15.201 20.4013 14.9029C20.4884 14.7729 20.5922 14.6511 20.7997 14.4076C21.3212 13.7957 21.5819 13.4898 21.7348 13.1699C22.0884 12.43 22.0884 11.57 21.7348 10.8301C21.5819 10.5102 21.3212 10.2043 20.7997 9.5924C20.5922 9.34887 20.4884 9.22711 20.4013 9.09706C20.2015 8.79896 20.0628 8.46417 19.9933 8.1121C19.963 7.95851 19.9502 7.79903 19.9248 7.48008C19.8608 6.6787 19.8288 6.278 19.7108 5.94371C19.4377 5.17051 18.8295 4.56233 18.0563 4.28923C17.722 4.17115 17.3213 4.13918 16.5199 4.07522C16.201 4.04977 16.0415 4.03705 15.8879 4.00672C15.5358 3.93721 15.201 3.79854 14.9029 3.59874C14.7729 3.51158 14.6511 3.40781 14.4076 3.20027C13.7957 2.67883 13.4898 2.41811 13.1699 2.26522C12.43 1.91159 11.57 1.91159 10.8301 2.26522C10.5102 2.4181 10.2043 2.67883 9.5924 3.20027ZM16.3735 9.86314C16.6913 9.5453 16.6913 9.03 16.3735 8.71216C16.0557 8.39433 15.5403 8.39433 15.2225 8.71216L10.3723 13.5624L8.77746 11.9676C8.45963 11.6498 7.94432 11.6498 7.62649 11.9676C7.30866 12.2854 7.30866 12.8007 7.62649 13.1186L9.79678 15.2889C10.1146 15.6067 10.6299 15.6067 10.9478 15.2889L16.3735 9.86314Z' fill='#4285F4' fill-rule='evenodd'/></g></svg>`,
        // Danh sách tên random cho người ẩn danh
        anonymousNames: [
            'Binz',
            'Sơn Tùng M-TP',
            'HIEUTHUHAI',
            'Trịnh Trần Phương Tuấn',
            'Mỹ Tâm',
            'Phan Mạnh Quỳnh',
            'Jack',
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
            <li class="m-0 p-0">
                <a href="${commentLink}" class="text-decoration-none" title="Xem hoặc trả lời bình luận này">
                    <div class="comment-wrapper d-flex align-items-start gap-2">
                        <img loading="lazy" class="comment-avatar rounded-pill m-0" src="${avatar}" alt="${authorName}">
                        <div class="comment-info py-2 px-3 rounded-4">
                            <span class="comment-author fw-medium">
                                ${authorName} ${isAdmin ? this.config.verifiedIcon : ''}
                            </span>
                            <span class="comment-text">
                                ${content}
                            </span>
                        </div>
                    </div>
                    <div class="comment-meta d-flex align-items-center gap-2 ms-5 mt-1 small" style="font-size:12px">
                        <span class="comment-time ms-3">${timeDisplay}</span> 
                        <span class="text-decoration-none fw-medium" title="Trả lời">Trả lời</span>
                    </div>
                </a>
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

// ===== Function Post Gallery Layout Auto for Blog Post by VT Zone =====
function VT_homePostLayout() {
    // 1. Quét các container bài viết chưa được xử lý layout
    const postContainers = document.querySelectorAll('.postBody_multipleItems:not([data-layout-processed]), .postBody_singleItem:not([data-layout-processed])');

    postContainers.forEach((container) => {
        // Tìm tất cả ảnh gốc trong nội dung bài viết
        const imgs = container.querySelectorAll('img');
        const count = imgs.length;

        if (count > 0) {
            // Tạo container gallery mới
            const gallery = document.createElement('div');
            const displayCount = count > 5 ? 5 : count;
            gallery.className = `VT_homePostGallery mb-3 layout-${displayCount}`;
            
            // Lấy ID bài viết để nhóm ảnh cho Fancybox
            const postId = container.closest('.post')?.id || 'album-' + Math.random().toString(36).substr(2, 5);

            imgs.forEach((img, idx) => {
                // TÌM PHẦN TỬ BAO QUANH GỐC (như .separator) ĐỂ XỬ LÝ SAU KHI DI CHUYỂN
                const parentSep = img.closest('.separator');

                const link = document.createElement('a');
                link.href = img.src;
                link.setAttribute('data-fancybox', 'gallery-' + postId);
                
                // Hiển thị Overlay số lượng ảnh còn lại (+N) ở ảnh thứ 5
                if (idx === 4 && count > 5) {
                    const overlay = document.createElement('div');
                    overlay.className = 'vt-gallery-overlay';
                    overlay.innerHTML = `<span>+${count - 5}</span>`;
                    link.appendChild(overlay);
                }

                // Từ ảnh thứ 6 trở đi sẽ ẩn (nhưng vẫn có trong Gallery để Fancybox quét được)
                if (idx >= 5) link.style.display = 'none';

                // --- TỐI ƯU TÀI NGUYÊN TẠI ĐÂY ---
                // Xóa bỏ style inline của Blogger trước khi di chuyển
                img.removeAttribute('style'); 
                
                // appendChild sẽ DI CHUYỂN node img gốc vào thẻ link, KHÔNG TẠO MỚI
                link.appendChild(img);
                gallery.appendChild(link);
                
                // Sau khi di chuyển img, nếu separator cũ bị trống thì xóa nó đi cho sạch DOM
                if (parentSep && parentSep.innerHTML.trim() === "") {
                    parentSep.remove();
                } else if (parentSep) {
                    parentSep.style.display = 'none'; // Nếu vẫn còn nội dung khác thì ẩn đi
                }
                // ---------------------------------
            });

            // Chèn gallery vào cuối nội dung bài viết
            container.appendChild(gallery);
        }

        // Đánh dấu đã xử lý xong
        container.setAttribute('data-layout-processed', 'true');
    });
}

// Chạy lần đầu khi trang tải xong
document.addEventListener('DOMContentLoaded', VT_homePostLayout);

// Function kiểm tra trạng thái data:post.body và ẩn nút v-fullPost
function VT_checkReadMore() {
    // 1. Chỉ quét những hộp nội dung chưa được kiểm tra
    const limitedBoxes = document.querySelectorAll('.postBodyLimited:not([data-readmore-checked])');
    
    limitedBoxes.forEach(box => {
        // Tìm nút "Xem thêm" nằm cùng cấp hoặc trong cùng container bài viết
        const container = box.closest('.postBody_multipleItems, .postBody_singleItem');
        if (!container) return;
        
        const btn = container.querySelector('.v-fullPost');
        if (btn) {
            /**
             * So sánh chiều cao thực tế (scrollHeight) và chiều cao hiển thị (clientHeight).
             * Cộng thêm 5px tolerance để xử lý sai số rendering trên các trình duyệt khác nhau.
             */
            const isOverflowing = box.scrollHeight > (box.clientHeight + 5);

            if (!isOverflowing) {
                // Ép kiểu display: none !important để đè class d-inline-block của Bootstrap
                btn.style.setProperty('display', 'none', 'important');
            }
        }

        // Đánh dấu đã kiểm tra xong để lần gọi hàm sau không xử lý lại bài này
        box.setAttribute('data-readmore-checked', 'true');
    });
}

// Chạy lần đầu khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(VT_checkReadMore, 200); // Đợi layout ổn định rồi mới đo
});
