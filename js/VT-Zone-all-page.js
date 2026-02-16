// =========================================================================================
// VT ZONE - ALL PAGE SCRIPTS
// Script chạy trên toàn bộ trang web - vutruong.vn
// =========================================================================================

console.log('%c🚀 VT Zone Scripts', 'color: #4285F4; font-weight: bold; font-size: 14px;', 'Đang khởi tạo...');

// === JS for All Page === JS body
// === VT Zone === vutruong.vn
// Js for all page === Chạy trên toàn hệ thống




// =========================================================================================
// Function bật/tắt VT_darkMode => Ghi nhớ lịch sử
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

// =========================================================================================
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

// =========================================================================================
// Function ẩn hiện .centerMenu khi xem trên Mobile === by VT Zone ===
document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.centerMenu');
    
    // Nếu không có menu thì thoát
    if (!menu) return;

    let lastScrollTop = 0;
    const delta = 5;
    let isTicking = false;

    function handleScrollMenu() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // 1. Nếu cuộn gần sát top, luôn hiện menu
        if (currentScroll < delta) {
            menu.classList.remove('menu-hidden');
            lastScrollTop = currentScroll;
            return;
        }

        // 2. Kiểm tra độ nhạy (delta) để tránh rung lắc menu
        if (Math.abs(lastScrollTop - currentScroll) <= delta) {
            return;
        }

        // 3. Logic ẩn khi cuộn xuống, hiện khi cuộn lên
        if (currentScroll > lastScrollTop) {
            // Cuộn xuống
            menu.classList.add('menu-hidden');
        } else {
            // Cuộn lên
            menu.classList.remove('menu-hidden');
        }

        lastScrollTop = currentScroll;
    }

    // Tối ưu hiệu suất cuộn
    const requestTick = () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                handleScrollMenu();
                isTicking = false;
            });
            isTicking = true;
        }
    };

    // Lắng nghe sự kiện cuộn
    window.addEventListener('scroll', requestTick, { passive: true });
});


// =========================================================================================
// Function xóa ?m=1 trên URL khi xem bằng Mobile
var uri = window.location.toString();
if (uri.indexOf("?m=1", "?m=1") > 0) {
    var clean_uri = uri.substring(0, uri.indexOf("?m=1"));
    window.history.replaceState({}, document.title, clean_uri);
}

// =========================================================================================
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

// =========================================================================================
// ===== Function Post Gallery Layout Auto for Blog Post by VT Zone =====
function VT_homePostLayout() {
    console.log('%c🖼️ Gallery Layout', 'color: #4285F4;', 'Đang xử lý bài viết...');
    
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
            gallery.className = `VT_homePostGallery p-0 m-0 mb-3 layout-${displayCount}`;
            
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
            // Thay vì container.appendChild(gallery);
			// Tìm thẻ đích đã có sẵn trong HTML
			const target = container.querySelector('.postGallery');
				if (target) {
    				target.innerHTML = ''; // Xóa nội dung cũ nếu có (tránh trùng lặp khi re-render)
    				target.appendChild(gallery);
				} else {
    			// Nếu không tìm thấy thẻ đích, có thể fallback (dự phòng) chèn vào cuối container
    			container.appendChild(gallery);
			}
        }

        // Đánh dấu đã xử lý xong
        container.setAttribute('data-layout-processed', 'true');
    });
}
// Chạy lần đầu khi trang tải xong
document.addEventListener('DOMContentLoaded', VT_homePostLayout);

// ========================================================================================================
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
            const isOverflowing = box.scrollHeight > (box.clientHeight + 0);

            if (!isOverflowing) {
                // Ép display: none !important
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

// =========================================================================================
/* === Hàm Fade (Chỉ dùng JS thuần) === */

// Hiệu ứng Hiện dần (Fade In)
function fadeIn(element, duration = 100) {
    // 1. Chuẩn bị cho hiệu ứng
    element.style.opacity = '0';
    element.style.visibility = 'visible'; // Đảm bảo phần tử hiển thị (nhưng vẫn mờ)
    element.style.transition = `opacity ${duration}ms ease-in`; // Tùy chỉnh transition

    // 2. Bắt đầu hiệu ứng (từ opacity 0 đến 1)
    // requestAnimationFrame đảm bảo hoạt ảnh được bắt đầu ngay sau khi trình duyệt render
    requestAnimationFrame(() => {
        element.style.opacity = '1';
    });

    // 3. Xử lý sau khi hiệu ứng hoàn tất
    element.addEventListener('transitionend', function handler() {
        // Sau khi hiệu ứng xong, loại bỏ transition và opacity cố định 
        // để CSS có thể quản lý lại, hoặc để sẵn sàng cho lần fadeOut tiếp theo
        element.style.transition = ''; 
        element.removeEventListener('transitionend', handler);
    }, { once: true });
}

// Hiệu ứng Mờ dần (Fade Out)
function fadeOut(element, duration = 100) {
    // 1. Chuẩn bị cho hiệu ứng
    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease-out`; // Tùy chỉnh transition

    // 2. Bắt đầu hiệu ứng (từ opacity 1 đến 0)
    requestAnimationFrame(() => {
        element.style.opacity = '0';
    });

    // 3. Xử lý sau khi hiệu ứng hoàn tất
    element.addEventListener('transitionend', function handler() {
        // Sau khi mờ xong, ẩn hoàn toàn phần tử bằng visibility: hidden và display: none (hoặc chỉ visibility)
        element.style.visibility = 'hidden'; 
        element.style.display = 'none'; // Thêm display: none để ngăn chiếm không gian
        element.style.opacity = ''; // Reset opacity
        element.style.transition = ''; // Loại bỏ transition
        element.removeEventListener('transitionend', handler);
    }, { once: true });
}


/* === Chức năng Ẩn/Hiện Popup Tài khoản Người dùng (Sử dụng Fade) === */
document.addEventListener('DOMContentLoaded', function() {
    // 1. Lấy các phần tử DOM cần thiết
    const avatarButton = document.querySelector('.user-profile-details .avatar-user');
    const popupPanel = document.querySelector('.popupShow_accountPanel');
    const body = document.body;
    const FADE_DURATION = 100; // Thời gian hiệu ứng (milliseconds)

    if (!avatarButton || !popupPanel) {
        return;
    }

    // Đảm bảo trạng thái ban đầu là ẩn
    // Cần thiết lập visibility: hidden và opacity: 0 trong CSS hoặc tại đây
    popupPanel.style.display = 'none'; 
    popupPanel.style.visibility = 'hidden'; // Đảm bảo phần tử bị ẩn
    popupPanel.style.opacity = '0'; 

    // 2. Định nghĩa hàm bật/tắt Popup
    function togglePopup(event) {
        event.stopPropagation(); // Ngăn sự kiện click lan truyền lên body

        // Kiểm tra trạng thái hiển thị bằng CSS computed style
        const computedStyle = window.getComputedStyle(popupPanel);
        // Kiểm tra dựa trên visibility thay vì height và display như trước
        const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

        if (isVisible) {
            // Đang hiện -> Đóng bằng Fade Out
            fadeOut(popupPanel, FADE_DURATION);
        } else {
            // Đang ẩn -> Mở bằng Fade In
            // Quan trọng: Phải đặt display: block (hoặc flex/grid) trước khi fade In
            popupPanel.style.display = 'block'; 
            fadeIn(popupPanel, FADE_DURATION);
        }
    }

    // 3. Xử lý sự kiện click vào Avatar
    avatarButton.addEventListener('click', togglePopup);

    // 4. Xử lý sự kiện click ngoài Popup (trên body)
    body.addEventListener('click', function(event) {
        // Kiểm tra trạng thái hiển thị bằng CSS computed style
        const computedStyle = window.getComputedStyle(popupPanel);
        const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

        // Chỉ xử lý nếu popup đang hiển thị
        if (isVisible) {
            const isClickInsidePanel = popupPanel.contains(event.target);
            const isClickOnAvatar = avatarButton.contains(event.target);

            // Nếu click không nằm trong popup và không nằm trên avatar, thì đóng popup
            if (!isClickInsidePanel && !isClickOnAvatar) {
                fadeOut(popupPanel, FADE_DURATION);
            }
        }
    });
});

// =========================================================================================
// Tính năng Live Search --- xây dung bằng Javascript thuần --- tối ưu tốc độ
// VT Zone - vutruong.vn

document.addEventListener('DOMContentLoaded', function() {
    // 1. Định nghĩa các Selector JS thuần
    const liveSearchTarget = document.getElementById('target_VT_live_search');
    const showTrigger = document.querySelector('.show_liveSearch');
    // Chú ý: document.querySelectorAll để lấy tất cả phần tử (nút đóng & overlay)
    const closeButtons = document.querySelectorAll('.close_liveSearch, .vt-live-search-wrapper-overlay-background');
    
    // Nếu không tìm thấy phần tử nào thì dừng
    if (!liveSearchTarget || !showTrigger || closeButtons.length === 0) {
        return;
    }
    
    // Đảm bảo trạng thái ban đầu là ẩn
    liveSearchTarget.style.display = 'none'; 
    liveSearchTarget.style.visibility = 'hidden'; 
    liveSearchTarget.style.opacity = '0';
    // Đảm bảo CSS transition đã được thiết lập cho Live Search Target!
    
    // --- Các Hàm Hỗ Trợ (Sử dụng hàm fadeOut/fadeIn ở trên) ---
    
    // Hàm mở Live Search
    function openLiveSearch(duration = 300) {
        liveSearchTarget.style.display = 'block'; // Hiển thị trước khi fade In
        fadeIn(liveSearchTarget, duration);
    }
    
    // Hàm đóng Live Search
    function closeLiveSearch(duration = 300) {
        fadeOut(liveSearchTarget, duration);
    }
    
    // -----------------------------------------------------------------
    // A. Xử lý Mở Live Search (Khi click vào .show_liveSearch)
    // -----------------------------------------------------------------
    showTrigger.addEventListener('click', function(event) {
        event.preventDefault(); 
        openLiveSearch(300); // Tùy chỉnh duration cho Live Search
        event.stopPropagation(); 
    });
    
    // -----------------------------------------------------------------
    // B. Xử lý Đóng Live Search (Khi click vào .close_liveSearch hoặc overlay)
    // -----------------------------------------------------------------
    closeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault(); 
            closeLiveSearch(300);
            event.stopPropagation();
        });
    });
    
    // -----------------------------------------------------------------
    // C. Xử lý Đóng Live Search (Khi click bất kỳ đâu bên ngoài)
    // -----------------------------------------------------------------
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // Kiểm tra trạng thái hiển thị bằng CSS computed style
        const computedStyle = window.getComputedStyle(liveSearchTarget);
        const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

        // Chỉ thực hiện logic đóng nếu Live Search đang hiển thị
        if (isVisible) {
            
            // Điều kiện để đóng (JS thuần):
            // 1. Phần tử click KHÔNG PHẢI là Live Search Target
            // 2. Phần tử click KHÔNG PHẢI là phần tử con của Live Search Target
            // 3. Phần tử click KHÔNG PHẢI là nút mở .show_liveSearch
            
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

    // -----------------------------------------------------------------
    // D. Tùy chọn: Đóng Live Search khi nhấn phím ESC
    // -----------------------------------------------------------------
    document.addEventListener('keyup', function(e) {
        if (e.key === "Escape" || e.keyCode === 27) {
            // Kiểm tra trạng thái trước khi đóng
            const computedStyle = window.getComputedStyle(liveSearchTarget);
            const isVisible = computedStyle.visibility !== 'hidden' && computedStyle.opacity !== '0';

            if (isVisible) {
                 closeLiveSearch(300);
            }
        }
    });
});

// =========================================================================================
// Function Live Search by Jquery
// VT Zone --- vutruong.vn

$(document).ready(function() {
    // Biến cờ để đảm bảo logic tìm kiếm chỉ được khởi tạo (initialize) một lần duy nhất
    let isLiveSearchInitialized = false;

    // Lắng nghe sự kiện click vào nút hiển thị tìm kiếm
    $('.show_liveSearch').on('click', function() {
        
        if (isLiveSearchInitialized) {
            console.log('Live Search đã được khởi tạo.');
            // Nếu bạn có logic hiển thị/ẩn thanh tìm kiếm khi click, hãy đặt ở đây.
            return;
        }

        console.log('Nút tìm kiếm được click. Bắt đầu khởi tạo Live Search.');
        
        // ==========================================================
        // I. TÍNH NĂNG: LIVE SEARCH (TÌM KIẾM TRỰC TIẾP) - ĐƯỢC CHẠY KHI CLICK
        // ==========================================================
        
        // Định nghĩa lại các thành phần (Chắc chắn đã có trên DOM)
        const searchInput = $('#vt-search-input');
        const resultsBox = $('#vt-live-results');
        let typingTimer;
        const doneTypingInterval = 500; // Thời gian chờ sau khi gõ xong (Debounce)
        
        // 2. Hàm gọi API Blogger (Định nghĩa trước)
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

        // 3. Hàm hiển thị kết quả (Render) (Định nghĩa trước)
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
                let finalTitle = title;
                
                if (!title || title.trim() === '') {
                    finalTitle = 'Bài viết ID: ' + displayId;
                }
                
                let link = '';
                for (let j = 0; j < entry.link.length; j++) {
                    if (entry.link[j].rel == 'alternate') {
                        link = entry.link[j].href;
                        break;
                    }
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

        // 1. Lắng nghe sự kiện nhập liệu (Chức năng cốt lõi)
        searchInput.on('keyup input', function() {
            clearTimeout(typingTimer);
            const query = $(this).val().trim();
            
            if (resultsBox.length === 0) return;
            
            if (query.length > 1) {    
                resultsBox.show().html('<div class="vt-search-loading text-left"><i class="fa-duotone fa-spinner-third fa-spin me-2"></i>Đang tìm kiếm...</div>');
                typingTimer = setTimeout(function() {
                    fetchSearchResults(query);
                }, doneTypingInterval);
            } else {
                resultsBox.hide().empty();
            }
        });

        // 4. Đóng kết quả khi click ra ngoài
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.vt-live-search-wrapper').length) {
                resultsBox.hide();
            }
        });
        
        // Mở lại kết quả khi click vào ô input (nếu đã có nội dung)
        searchInput.on('focus', function() {
            if ($(this).val().length > 1 && resultsBox.html().trim() !== '') {
                resultsBox.show();
            }
        });

        // Đặt cờ là true sau khi tất cả đã được gán sự kiện
        isLiveSearchInitialized = true;
    }); 
});


// =========================================================================================
// Function thay đổi Font chữ trên toàn BODY
    const FONT_STORAGE_KEY = 'blogFontPreference';
    const GOOGLE_SANS_CLASS = 'font-google-sans';
    const bodyElement = document.body;
    
    // Tham chiếu đến phần tử ID
    const togglerElement = document.getElementById('font-toggler');
    
    // Giá trị lưu trữ
    const FONT_NAME_1 = 'Roboto';
    const FONT_NAME_2 = 'Google Sans Flex';

    /**
     * Hàm chính để chuyển đổi font chữ (Chỉ thay đổi Class CSS và localStorage)
     */
    function toggleFont() {
        // Kiểm tra trạng thái hiện tại
        const isGoogleSans = bodyElement.classList.contains(GOOGLE_SANS_CLASS);

        if (isGoogleSans) {
            // Đang là Google Sans -> Chuyển về Roboto
            bodyElement.classList.remove(GOOGLE_SANS_CLASS);
            localStorage.setItem(FONT_STORAGE_KEY, FONT_NAME_1);
        } else {
            // Đang là Roboto -> Chuyển sang Google Sans Flex
            bodyElement.classList.add(GOOGLE_SANS_CLASS);
            localStorage.setItem(FONT_STORAGE_KEY, FONT_NAME_2);
        }
    }

    /**
     * Hàm áp dụng font đã lưu trữ ngay khi trang tải
     */
    function applySavedFont() {
        const savedFont = localStorage.getItem(FONT_STORAGE_KEY);
        
        // Chỉ áp dụng class nếu font đã lưu là Google Sans Flex
        if (savedFont === FONT_NAME_2) {
            bodyElement.classList.add(GOOGLE_SANS_CLASS);
        }

        // Gắn sự kiện click vào phần tử
        if (togglerElement) {
            togglerElement.addEventListener('click', toggleFont);
        }
    }
    // Chạy hàm áp dụng font ngay lập tức
    applySavedFont();


// =========================================================================================
// === Function Slide Menu ===
// đã convert qua js by VT Zone
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
            
            // Xử lý nút Toggle (Mở menu)
            // Kiểm tra xem click có trúng vào selector được định nghĩa trong data-sidenav-toggle không
            const toggleBtn = this.toggleSelector ? target.closest(this.toggleSelector) : null;

            if (toggleBtn) {
                this.el.classList.toggle("show");
                document.body.classList.toggle("sidenav-no-scrolls");
                this.toggleOverlay();
            } 
            // Xử lý click ra ngoài (Đóng menu)
            // Nếu không click vào menu và menu đang mở
            else if (!target.closest('[data-sidenav]') && this.el.classList.contains("show")) {
                this.el.classList.remove("show");
                document.body.classList.remove("sidenav-no-scrolls");
                this.hideOverlay();
            }
        });
    }

    initDropdown() {
        // Sử dụng Event Delegation cho dropdown bên trong sidenav
        this.el.addEventListener("click", (e) => {
            const toggle = e.target.closest("[data-sidenav-dropdown_toggle]");
            if (!toggle) return;

            e.preventDefault();
            
            const dropdown = toggle.nextElementSibling; // Tương đương .next()
            const icon = toggle.querySelector("[data-sidenav-dropdown-icon]");

            if (dropdown && dropdown.matches("[data-sidenav-dropdown]")) {
                // Thay thế slideToggle của jQuery
                this.slideToggle(dropdown);
                
                if (icon) {
                    icon.classList.toggle("show");
                }
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

        // Thay thế fadeToggle: Logic hiển thị overlay
        // Chúng ta sẽ dùng class để CSS xử lý transition opacity
        const isVisible = getComputedStyle(overlay).display !== "none";
        
        if (isVisible) {
            this.fadeOut(overlay);
        } else {
            this.fadeIn(overlay);
        }
    }

    hideOverlay() {
        const overlay = document.querySelector("[data-sidenav-overlay]");
        if (overlay) {
            this.fadeOut(overlay);
        }
    }

    // --- Helper Functions để thay thế Animation của jQuery ---

    slideToggle(element) {
        if (window.getComputedStyle(element).display === 'none') {
            return this.slideDown(element);
        } else {
            return this.slideUp(element);
        }
    }

    slideUp(element) {
        element.style.height = element.offsetHeight + 'px';
        element.offsetHeight; // force repaint
        element.style.height = '0px';
        // Sau khi animation xong (giả sử 300ms) thì ẩn hẳn
        setTimeout(() => {
            element.style.display = 'none';
            element.style.removeProperty('height');
        }, 300); 
    }

    slideDown(element) {
        element.style.display = 'block';
        let height = element.scrollHeight;
        element.style.height = '0px';
        element.offsetHeight; // force repaint
        element.style.height = height + 'px';
        // Sau khi animation xong thì xóa height cứng để nội dung co giãn tự nhiên
        setTimeout(() => {
            element.style.removeProperty('height');
        }, 300);
    }

    fadeIn(element) {
        element.style.opacity = 0;
        element.style.display = "block";
        
        // Dùng requestAnimationFrame để đảm bảo transition hoạt động
        requestAnimationFrame(() => {
            element.style.transition = "opacity 0.3s";
            element.style.opacity = 1;
        });
    }

    fadeOut(element) {
        element.style.transition = "opacity 0.3s";
        element.style.opacity = 0;
        
        setTimeout(() => {
            element.style.display = "none";
        }, 300); // Khớp với thời gian transition
    }
}

// Khởi tạo
document.addEventListener("DOMContentLoaded", () => {
    const sidenavs = document.querySelectorAll("[data-sidenav]");
    sidenavs.forEach(el => new Sidenav(el));
});

// === End Function Slide Menu ===


// =========================================================================================
// === Function auto scroll ===
(function() {
    const path = window.location.pathname;
    const search = window.location.search;

    // 1. Phân loại trang
    const isHomePage = (path === '/' || path === '/index.html');
    const isSearchPage = path.includes('/search'); // Bao gồm cả /search/label/ và /search?q=
    
    // Nếu là trang chủ HOẶC trang tìm kiếm/nhãn -> Dùng offset 90
    const isListView = isHomePage || isSearchPage;

    // 2. Thiết lập cấu hình
    const targetSelector = isListView ? '.profile-info-section' : '#mainPost';
    const offset = isListView ? 90 : 75;

    // 3. Thực thi tìm kiếm phần tử
    const element = document.querySelector(targetSelector);

    if (element) {
        // Sử dụng setTimeout để đảm bảo các script rút gọn link/Bootstrap đã chạy xong
        setTimeout(() => {
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            
            window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
            });
        }, 150); // Tăng lên 150ms để độ chính xác cao hơn khi load trang
    }
})();


// =========================================================================================
// ========= Function for Featured Story
// ========= by VT Zone
// ========= vutruong.vn
document.addEventListener("DOMContentLoaded", function() {
    "use strict";

    // 1. Data - trong widget

    // 2. Helper: Tạo URL thumbnail từ link full size
    function getThumbnail(fullUrl) {
        // Chuyển s1600 -> s250 cho Blogger images
        return fullUrl.replace(/\/s\d+\//, '/s250/');
    }

    const track = document.getElementById('vt-carousel-track');
    const btnPrev = document.getElementById('vt-btn-prev');
    const btnNext = document.getElementById('vt-btn-next');

    // 3. Hàm Render HTML - GIỮ NGUYÊN CẤU TRÚC
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

    // 4. Hàm xử lý Scroll (Logic giữ nguyên)
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

    // 5. Hàm cập nhật trạng thái nút
    function updateButtons() {
        if (!track || !btnPrev || !btnNext) return;

        const scrollLeft = track.scrollLeft;
        const maxScroll = track.scrollWidth - track.clientWidth;

        btnPrev.style.display = (scrollLeft <= 2) ? 'none' : 'flex';
        btnNext.style.display = (scrollLeft >= maxScroll - 2) ? 'none' : 'flex';
    }

    // 6. Gán sự kiện (Event Listeners)
    if (btnNext) btnNext.addEventListener('click', () => handleScroll('next'));
    if (btnPrev) btnPrev.addEventListener('click', () => handleScroll('prev'));

    if (track) {
        track.addEventListener('scroll', updateButtons);
        window.addEventListener('resize', updateButtons);
    }

    // Khởi chạy
    renderCarousel();
    setTimeout(updateButtons, 100);
});
// === END FEATURED STORIES ===


// === Function Photo Widget
// === Post by Label
// == By VT Zone == vutruong.vn
    const CONFIG = {
        blogUrl: "https://www.vutruong.vn",
        maxResults: 9,
        labelName: "photo",
        defaultThumb: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    };

    let startIndex = 1;

    document.addEventListener("DOMContentLoaded", () => {
        fetchPosts();
        document.getElementById('VT_photoPostwidget_btnLoadMore').onclick = function() {
            this.innerHTML = "<i class='fa-duotone fa-spinner-third fa-spin me-2'></i>";
            fetchPosts();
        };
    });

    function fetchPosts() {
    const script = document.createElement('script');
    
    // Tạo phân đoạn nhãn nếu có cấu hình labelName
    const labelPath = CONFIG.labelName ? `/-/${encodeURIComponent(CONFIG.labelName)}` : "";
    
    // URL mới có chứa labelPath
    script.src = `${CONFIG.blogUrl}/feeds/posts/default${labelPath}?alt=json-in-script&start-index=${startIndex}&max-results=${CONFIG.maxResults}&callback=renderPosts`;
    
    document.head.appendChild(script);
    script.onload = () => script.remove();
}

    function renderPosts(json) {
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
            
            // Xử lý text thuần từ HTML nội dung
            const doc = parser.parseFromString(content, 'text/html');
            const cleanText = doc.body.textContent.trim().replace(/\s+/g, ' ');
            
            // Logic tiêu đề: Ưu tiên title -> text nội dung -> ID
            const displayTitle = title || (cleanText ? cleanText.substring(0, 100) + "..." : `#ID: ${id}`);
            const summary = cleanText.substring(0, 100) + (cleanText.length > 100 ? "..." : "");
            
            const link = post.link.find(l => l.rel === 'alternate').href;
            
            // Lấy Thumbnail
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

        // Update nút tải thêm
        const hasMore = entries.length === CONFIG.maxResults;
        btn.style.display = hasMore ? "inline-block" : "none";
        btn.innerHTML = "Xem thêm";
        if (hasMore) startIndex += CONFIG.maxResults;
    }

// === END ===


// ===============================================================
// Quyền ADMIN, chỉ hiển thị với VT và chỉ VT mới có thể kiểm soát
const VT_ADMIN_UID = 'u9U3j9O63jbipOgai3o88X4008q2';

// 1. Tách hàm xử lý UI riêng ra để gọi lại khi load AJAX
window.VT_ApplyAdminUI = () => {
    const isAdmin = sessionStorage.getItem('VT_AdminLogged') === 'true';
    const VT_adminTools = document.querySelectorAll('.VT-admin-tools');

    if (isAdmin) {
        // NẾU LÀ ADMIN: Chỉ gỡ class ẩn, TUYỆT ĐỐI không dùng .remove()
        VT_adminTools.forEach(el => el.classList.remove('d-none'));
    } else {
        // NẾU KHÔNG PHẢI ADMIN: Xóa sạch dấu vết khỏi DOM
        VT_adminTools.forEach(el => el.remove());
    }
};

const VT_InitAdminSystem = () => {
    firebase.auth().onAuthStateChanged((user) => {
        const VT_isAdmin = user && user.uid === VT_ADMIN_UID;
        const VT_wasAdmin = sessionStorage.getItem('VT_AdminLogged') === 'true';

        // Logic check quyền để reload
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

        // Chạy lần đầu khi load trang
        window.VT_ApplyAdminUI();
    });
};

// Đảm bảo khởi chạy chuẩn
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', VT_InitAdminSystem);
} else {
    VT_InitAdminSystem();
}
// End
// ===============================================================


// ================================================ VT ================================================
// FUNCTION CONVERT ẢNH SANG .WEBP
document.addEventListener("DOMContentLoaded", function() {
    const processUrl = (url) => {
        if (!url || url.includes('-rw') || !url.match(/bp\.blogspot\.com|googleusercontent\.com/)) return url;
        
        let newUrl = url;
        if (url.includes('=')) {
            // Dạng có dấu bằng: ...=w640 -> ...=w640-rw
            newUrl = url.replace(/=([^]*)$/, "=$1-rw");
        } else {
            // Dạng có dấu gạch chéo: .../s1600/anh.jpg -> .../s1600-rw/anh.jpg
            // Regex này tìm cụm /s(số) hoặc /w(số) và chèn -rw vào sau số đó
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
                    // Cập nhật cả href và data-src cho chắc ăn với các đời Fancybox
                    el.href = newHref;
                    el.setAttribute('data-src', newHref);
                }
            }
        });
    };

    // Chạy lần đầu
    convertAll(document);

    // Theo dõi nội dung mới (quan trọng cho films.vutruong.vn)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'IMG' || (node.tagName === 'A' && node.hasAttribute('data-fancybox'))) {
                        // Nếu chính node đó là ảnh hoặc link
                        const target = node.tagName === 'IMG' ? node : node; // xử lý trực tiếp
                        // Tái sử dụng hàm convert cho node đơn lẻ hoặc con của nó
                        if(node.tagName === 'IMG') {
                           const old = node.src; node.src = processUrl(old);
                        } else {
                           const old = node.href; node.href = processUrl(old);
                        }
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
// SIDEBAR STICKY - Thanh bên dính thông minh khi cuộn trang
// Chỉ hoạt động trên desktop (>= 992px)
// =========================================================================================
document.addEventListener("DOMContentLoaded", (() => {
    const sidebar = document.querySelector("#sidebar");
    
    // Nếu không có sidebar thì thoát
    if (!sidebar) {
        console.log('%c⚠️ Sidebar', 'color: #FBBC04;', 'Không tìm thấy #sidebar');
        return;
    }
    
    console.log('%c✅ Sidebar Sticky', 'color: #34A853;', 'Đã khởi tạo');
    
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
        
        // Điều chỉnh offset khi cuộn
        sidebarOffset -= scrollDelta;
        
        // Giới hạn offset
        const maxOffset = viewportHeight - sidebarHeight - 20;
        const minOffset = 80;
        
        if (sidebarOffset > minOffset) {
            sidebarOffset = minOffset;
        } else if (sidebarOffset < maxOffset) {
            sidebarOffset = maxOffset;
        }
        
        // Áp dụng styles
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
    
    // Khởi tạo vị trí ban đầu
    updateSidebarPosition();
}));


// =========================================================================================
// VT ZONE
// VUTRUONG.VN
// =========================================================================================










