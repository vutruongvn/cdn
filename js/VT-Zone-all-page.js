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


/* === Chức năng Hiển thị/Ẩn Popup Tài khoản Người dùng (Sử dụng Fade) === */
document.addEventListener('DOMContentLoaded', function() {
    // 1. Lấy các phần tử DOM cần thiết
    const avatarButton = document.querySelector('.user-profile-details .avatar-user');
    const popupPanel = document.querySelector('.popupShow_accountPanel');
    const body = document.body;
    const FADE_DURATION = 300; // Thời gian hiệu ứng (milliseconds)

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




