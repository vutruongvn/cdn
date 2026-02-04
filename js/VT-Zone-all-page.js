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

// Function auto lấy url ảnh đại diện tác giả => chèn vào profile-wrapper avatar
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

// Function share native gán vào .btn-share-native sử dụng trình chia sẻ của hệ thống
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

// Function kiểm tra trạng thái data:post.body và ẩn nút v-fullPost (ẩn khi bài viết quá ngắn, dưới 2 hàng)
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

