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


// ===================================================
// ===========  Function Featured Story ==============
// ===================================================
document.addEventListener("DOMContentLoaded", function() {
    // 1. Dữ liệu cấu hình
    const carouselData = [

// Hình ảnh
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi1-HL289aG5FcNvMbS61KHFGUz9lK9VgvbFpP0A6wO7XMLTucg9yF4DzXn8IaXpWoU8wf3p0GHTG3pqKuXbh3FZIEIIpUXlux4BiyeadLbtY-D8cvKuic_NMWARpuIJXOPsAES0d_RrBcC4_O1ZGB3wGS6ZWz_c-F0bJd0a_4RpaDuujksaSWMjq8GJuw/s250/vt-nbt.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi1-HL289aG5FcNvMbS61KHFGUz9lK9VgvbFpP0A6wO7XMLTucg9yF4DzXn8IaXpWoU8wf3p0GHTG3pqKuXbh3FZIEIIpUXlux4BiyeadLbtY-D8cvKuic_NMWARpuIJXOPsAES0d_RrBcC4_O1ZGB3wGS6ZWz_c-F0bJd0a_4RpaDuujksaSWMjq8GJuw/s1600/vt-nbt.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhWVx8TKGg17K4Iy3w5GDFuI3l8NSAAxzxJ7PFtOMQtNm9ARIwqMW1uVIFnEpZp4exjfBVqbvlPXwVnS0LrxqhIvPoxtzVSWvWCBVbCcXMOnc9AC0NgwKOz6N_EhezhEQK6o3bS0pl5wzm9yWwqHAIYFuQx8ryjXP0GS1DxtP9hrH1sWNnHCPDLmiARZlI/s250/vt.JPEG", title: "TP. Hồ Chí Minh", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhWVx8TKGg17K4Iy3w5GDFuI3l8NSAAxzxJ7PFtOMQtNm9ARIwqMW1uVIFnEpZp4exjfBVqbvlPXwVnS0LrxqhIvPoxtzVSWvWCBVbCcXMOnc9AC0NgwKOz6N_EhezhEQK6o3bS0pl5wzm9yWwqHAIYFuQx8ryjXP0GS1DxtP9hrH1sWNnHCPDLmiARZlI/s1600/vt.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjAk1nu5Pv4R5nRitY3VibRBtVYO53ku5t_oqernOy54KUt85TW6KQYtcaOXTSJNP7JoHtvjhx9Oxb_mBwmkZllPMgsnQETmGV5I_ZUcX60D5Kz3AzfF3ctiRgTKl1NK3IhTMDe_v65xAE9iz06aipqit9lAC7fMdkKBG9s3XJGknX-HUl53drxQBvs71g/s250/VT-SG.JPEG", title: "TP. Hồ Chí Minh", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjAk1nu5Pv4R5nRitY3VibRBtVYO53ku5t_oqernOy54KUt85TW6KQYtcaOXTSJNP7JoHtvjhx9Oxb_mBwmkZllPMgsnQETmGV5I_ZUcX60D5Kz3AzfF3ctiRgTKl1NK3IhTMDe_v65xAE9iz06aipqit9lAC7fMdkKBG9s3XJGknX-HUl53drxQBvs71g/s1600/VT-SG.JPEG" },

        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjMrspMsE1_epGRETFZNw9pB0hOirXYnP2zoRELgGaXkSUiJcDj2ME_Nfp1WqfBn4iEqjh4krxMqrbGdY-Qi5a0o_dYqEkKq9c4Yoikgg6SMm9GGV-k54kGoTUnmV5fRXYnF4Vkg-oxNSzUdWXyKIEcTU4BIGd2-OxmclvFMPpGIXBc9U6Z3R8PMv0Cq84/s250/vtzzz.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjMrspMsE1_epGRETFZNw9pB0hOirXYnP2zoRELgGaXkSUiJcDj2ME_Nfp1WqfBn4iEqjh4krxMqrbGdY-Qi5a0o_dYqEkKq9c4Yoikgg6SMm9GGV-k54kGoTUnmV5fRXYnF4Vkg-oxNSzUdWXyKIEcTU4BIGd2-OxmclvFMPpGIXBc9U6Z3R8PMv0Cq84/s1600/vtzzz.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhoUW0aAkts8tR_n_0LjobVl-6uBzm7sot417pkIW4AouW38jnyQ1eJwCvyyYRVrUdI8Phyphenhyphen18MCGjMMoS1C6Q_TmSk62pnExEGZxzCLpbP9LM2M3VRhNHHrBcQZfFwyCDcxqFFkw7D_KOjWDOX59j-Ao_t0Qy2NftN2Ta38c2KYHyGvF1A3H6_OAAaCqEo/s250/vt-tt.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhoUW0aAkts8tR_n_0LjobVl-6uBzm7sot417pkIW4AouW38jnyQ1eJwCvyyYRVrUdI8Phyphenhyphen18MCGjMMoS1C6Q_TmSk62pnExEGZxzCLpbP9LM2M3VRhNHHrBcQZfFwyCDcxqFFkw7D_KOjWDOX59j-Ao_t0Qy2NftN2Ta38c2KYHyGvF1A3H6_OAAaCqEo/s1600/vt-tt.JPEG" },

        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgxYHE5ym89FfwL8g24drUMXFl00tWn7gtVh2YhPWm7q8DVm3thyphenhyphendZGc3D-l6lt7J5ausgoYNZa10DvemmyAJYeYNR27KIidwJf17-25CjDC0TvOvtaJr2VMgGURpLy8jyjoSBexlwDLor6sTJK6yeMECMSrCTBNYAOBv63wSry3AIkquUPb-MH-L8Bu-s/s250/VT-AG.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgxYHE5ym89FfwL8g24drUMXFl00tWn7gtVh2YhPWm7q8DVm3thyphenhyphendZGc3D-l6lt7J5ausgoYNZa10DvemmyAJYeYNR27KIidwJf17-25CjDC0TvOvtaJr2VMgGURpLy8jyjoSBexlwDLor6sTJK6yeMECMSrCTBNYAOBv63wSry3AIkquUPb-MH-L8Bu-s/s1600/VT-AG.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgOj1U2uahK4Ep1Mn5cnPLhnMJHvfsJnO0akXOP6cNphWwk52cNA72ymTBlVIZANr1ClaK2QGuYMOSWz2oR-AhLBBQoKNQFYe5xb9r2iRhnp7eYjpd9ZlpqSyX834-vb-I56J_XLuhu35oe9k94Cw7x5Hc6d57do-WHx6XxZFxUNfMCU8CJoPmpKBOo7GA/s250/IMG_0120.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgOj1U2uahK4Ep1Mn5cnPLhnMJHvfsJnO0akXOP6cNphWwk52cNA72ymTBlVIZANr1ClaK2QGuYMOSWz2oR-AhLBBQoKNQFYe5xb9r2iRhnp7eYjpd9ZlpqSyX834-vb-I56J_XLuhu35oe9k94Cw7x5Hc6d57do-WHx6XxZFxUNfMCU8CJoPmpKBOo7GA/s1600/IMG_0120.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjPtb9ZB8DQoTIRd_RDXR0l1W1-dXjzpBCURMn9hZsbzIp09rhaQ0RddO9ty_syY5eYRTdWzL0Dcqmu4oyuqu9qFFKrj3X2fhXZQhiWcmx9Ta7V54GYtDPWL_BwZuf4Rvi2nKcrCF3VvoV-ddCp1olDFYXu6BmKfBiOgyeCbcn8hI1BZuLrqSe5CJn_Jso/s250/vtdz.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjPtb9ZB8DQoTIRd_RDXR0l1W1-dXjzpBCURMn9hZsbzIp09rhaQ0RddO9ty_syY5eYRTdWzL0Dcqmu4oyuqu9qFFKrj3X2fhXZQhiWcmx9Ta7V54GYtDPWL_BwZuf4Rvi2nKcrCF3VvoV-ddCp1olDFYXu6BmKfBiOgyeCbcn8hI1BZuLrqSe5CJn_Jso/s1600/vtdz.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgF5yCagcjZGDIFWRljrJhPDukxbC4ciYYujSHHT0IwwprchAjRrKtQpRmkspzupd3vfls7oeWyvqG2It39N5ZLuu-RMbL3hwopSB0v-M-yu3pW_-q0DvoxQaGwGJSU5Kk-LzCFM2SLmj1Uymd-kYJGXKAFTp171eGI0PADvRe1z2cvgjPoohHBo_gqfsc/s250/vutruong.JPEG", title: "Kiên Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgF5yCagcjZGDIFWRljrJhPDukxbC4ciYYujSHHT0IwwprchAjRrKtQpRmkspzupd3vfls7oeWyvqG2It39N5ZLuu-RMbL3hwopSB0v-M-yu3pW_-q0DvoxQaGwGJSU5Kk-LzCFM2SLmj1Uymd-kYJGXKAFTp171eGI0PADvRe1z2cvgjPoohHBo_gqfsc/s1600/vutruong.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh1lV7_M1i3IPGFdLJAcaoW4zuGz_CzHF1nxj0vUNzDaF9PSK3O_z34LzG_Z_sD0aIO0mparkuNQwqFypqXZTt22iyX1U1bOcfwApKogOiiNZ54XX4sKatqIHBfj_ZzrctkKpyZDd3Dx_N3YggzilW1-609kl9MGNA7kMjsoWGsDeiVbWX65mS5KtOPQBM/s250/vt-tt2.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh1lV7_M1i3IPGFdLJAcaoW4zuGz_CzHF1nxj0vUNzDaF9PSK3O_z34LzG_Z_sD0aIO0mparkuNQwqFypqXZTt22iyX1U1bOcfwApKogOiiNZ54XX4sKatqIHBfj_ZzrctkKpyZDd3Dx_N3YggzilW1-609kl9MGNA7kMjsoWGsDeiVbWX65mS5KtOPQBM/s1600/vt-tt2.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgYogfANw_vBEIeDhsFKsQQrMGFnn9Kzil5JJbk89gGa0ZBkZRTFySveAnbaZ4y-RH5Z_FQ-pNKZZmYYi0B24IqtVIOFzNHwD3NcM8i2_RNQy1helreOvF9vzNE9g0L78U3YrjIPnm8o13dh6ikuZjIKeYIZOCYaGAyRTLdecbRGiP92cwN0k2bqeGl0Hc/s250/vt-ha-tien.JPEG", title: "Kiên Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgYogfANw_vBEIeDhsFKsQQrMGFnn9Kzil5JJbk89gGa0ZBkZRTFySveAnbaZ4y-RH5Z_FQ-pNKZZmYYi0B24IqtVIOFzNHwD3NcM8i2_RNQy1helreOvF9vzNE9g0L78U3YrjIPnm8o13dh6ikuZjIKeYIZOCYaGAyRTLdecbRGiP92cwN0k2bqeGl0Hc/s1600/vt-ha-tien.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjTE6VXusIwWQKjotEEhe7ASX8p0Dl6alvNXPg-WH0eLIkKaEHlfsuEnG3aSkEce5S61jep630t7zePVa2_DDIIpcZ6utKCU1aDXJHPMaw6efdSruiOSm1WAmqNnSm2dzFlgW1qyk005i-RQWEpe7e4aWW3b_aBO5eZdVEfolEwtNaHubNDXuy42HR18LM/s250/vt-room.jpg", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjTE6VXusIwWQKjotEEhe7ASX8p0Dl6alvNXPg-WH0eLIkKaEHlfsuEnG3aSkEce5S61jep630t7zePVa2_DDIIpcZ6utKCU1aDXJHPMaw6efdSruiOSm1WAmqNnSm2dzFlgW1qyk005i-RQWEpe7e4aWW3b_aBO5eZdVEfolEwtNaHubNDXuy42HR18LM/s1600/vt-room.jpg" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjgvnG2oF8rn3rqk6Kr8qoh55-_wWxjrNFBMJdebE44JBSWmEIybebT-tKo7NBcgH7Yohs4eh9fZMg72ozmozTwQbymGsrTz25BN48TAFB9i2vab9Hdad7qNoDoTjBmj9T_NQ6W5_K7sSrc5cvbO5_4LtxkEdHQnjpV3lRoRbIkTJt3Ev55NraY6ewZhIw/s250/vtrg.JPEG", title: "Vũng Tàu", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjgvnG2oF8rn3rqk6Kr8qoh55-_wWxjrNFBMJdebE44JBSWmEIybebT-tKo7NBcgH7Yohs4eh9fZMg72ozmozTwQbymGsrTz25BN48TAFB9i2vab9Hdad7qNoDoTjBmj9T_NQ6W5_K7sSrc5cvbO5_4LtxkEdHQnjpV3lRoRbIkTJt3Ev55NraY6ewZhIw/s1600/vtrg.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiyjQFqgdq8nH2s9MCtt2Q2-JjyNbGfgjSQ56y_x5j1r2hIfX36fsZcN7c0F4sY0pO24ZTN84Sg29IIdbugtuUf-VQOveVtcRq9CBR5N02rCyjKOSAm54RA5aAz19p-2MX9ruMC34zwWfhfx2Yvg2U0XSl-WI2LeSVxTVxbRDa1KICMLCDCGchV73J71jg/s250/VT-VUNGTAU.JPEG", title: "Vũng Tàu", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiyjQFqgdq8nH2s9MCtt2Q2-JjyNbGfgjSQ56y_x5j1r2hIfX36fsZcN7c0F4sY0pO24ZTN84Sg29IIdbugtuUf-VQOveVtcRq9CBR5N02rCyjKOSAm54RA5aAz19p-2MX9ruMC34zwWfhfx2Yvg2U0XSl-WI2LeSVxTVxbRDa1KICMLCDCGchV73J71jg/s1600/VT-VUNGTAU.JPEG" },

        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh9yEP5KJaQXPXPWLMctqihAueOpuf-Pj28bqwpZgU87WkIc8xj1vxxUmOiT_pDUFZH6Kd96vR5_-CHm7jXZaG7U9ewaCRgKrOaFDISFs71eu94yX-QMknZG5iK4HQhD4KwJQWRmznvpMThyP2cJ3fVJWBO46JOT-GD-uQOuScysz0uGEjAZaJe3KaaSMQ/s250/vtr.JPEG", title: "Bình Thuận", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh9yEP5KJaQXPXPWLMctqihAueOpuf-Pj28bqwpZgU87WkIc8xj1vxxUmOiT_pDUFZH6Kd96vR5_-CHm7jXZaG7U9ewaCRgKrOaFDISFs71eu94yX-QMknZG5iK4HQhD4KwJQWRmznvpMThyP2cJ3fVJWBO46JOT-GD-uQOuScysz0uGEjAZaJe3KaaSMQ/s1600/vtr.JPEG" },

        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjCl5mPdMAAWtdTy9cz4qk3PBrvOKM26wq8yPD1e8OzsA3fyv5QfaK0hjDSk3U1xbUqyQSAX19-iPyAXIZ2gTSH-G4RIiowb5tlIQYlK07gkspmruIbJJDQd8WwCjwh6JV87sh5T69SaShSXQCVwtYl4GNHs2_FZGg4QWPDf5eKxqXINbuDXBWLgHeAbA8/s250/VT-PT.JPEG", title: "Bình Thuận", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjCl5mPdMAAWtdTy9cz4qk3PBrvOKM26wq8yPD1e8OzsA3fyv5QfaK0hjDSk3U1xbUqyQSAX19-iPyAXIZ2gTSH-G4RIiowb5tlIQYlK07gkspmruIbJJDQd8WwCjwh6JV87sh5T69SaShSXQCVwtYl4GNHs2_FZGg4QWPDf5eKxqXINbuDXBWLgHeAbA8/s1600/VT-PT.JPEG" },

        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgj3gcYQX69HGzCrab7BnErz354v4EWoQUOjB-5YPmf-imABzALpgV5jwNHHKPmnOBCCmIeAewrDoT7-Ifm5WciEuI-YKe5A5ZED5jqPZQrvI7XMbZhBxRF_HGSns9BYuVGNAUZ1VR3RM-Q1TQ82HCyPixKcIKz67uNU3p5MetvFcOKOv1fpwI4rgnJdlI/s250/VT-PT-BT.JPEG", title: "Bình Thuận", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgj3gcYQX69HGzCrab7BnErz354v4EWoQUOjB-5YPmf-imABzALpgV5jwNHHKPmnOBCCmIeAewrDoT7-Ifm5WciEuI-YKe5A5ZED5jqPZQrvI7XMbZhBxRF_HGSns9BYuVGNAUZ1VR3RM-Q1TQ82HCyPixKcIKz67uNU3p5MetvFcOKOv1fpwI4rgnJdlI/s1600/VT-PT-BT.JPEG" },


        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhTJXyL805mJMR9bME3jIlWRXjYD3qqmoGf2sxHmxWQnl7jgargCSMuvc5lmgQbvdKcssNzuaU81B168UlVy6RwB3a2zEDMDJrTzDK0w0whcF6QLFFYtZur4TW2e9bS2c5jMzwR9Vs80_E0Z1KyoMrggiwvWP-WiMqjw3-szUcOQCz0byycVfmFAUwd8uo/s250/VT_HT.JPEG", title: "Kiên Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhTJXyL805mJMR9bME3jIlWRXjYD3qqmoGf2sxHmxWQnl7jgargCSMuvc5lmgQbvdKcssNzuaU81B168UlVy6RwB3a2zEDMDJrTzDK0w0whcF6QLFFYtZur4TW2e9bS2c5jMzwR9Vs80_E0Z1KyoMrggiwvWP-WiMqjw3-szUcOQCz0byycVfmFAUwd8uo/s1600/VT_HT.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjD0_nTBvYcZ3ch78jjHAMM3NXTCZICgIzTyF58a5wOHx6pyvLEpNBacCqDE9tmVhSih1svtw1hKD3fOORsSwReJqK7dcOljYwoYoPBMk4Tp8lWcCfrbD79bTUKiyKf3OqZOon6W5GOR4Fhy6ogQoYbmYuqCmO4BZsmr1CrTqfasg8FL16AsyxL0FNn_U4/s250/vt-hatien.JPEG", title: "Kiên Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjD0_nTBvYcZ3ch78jjHAMM3NXTCZICgIzTyF58a5wOHx6pyvLEpNBacCqDE9tmVhSih1svtw1hKD3fOORsSwReJqK7dcOljYwoYoPBMk4Tp8lWcCfrbD79bTUKiyKf3OqZOon6W5GOR4Fhy6ogQoYbmYuqCmO4BZsmr1CrTqfasg8FL16AsyxL0FNn_U4/s1600/vt-hatien.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEionv4qMJjjHaHMJ-kj6sxre8JWh9FrfRYG0Be34JwxlEPdDKXJqFxQM8jw7x1kFTR2WZ1fz3hyphenhyphenzFDWMHQhG0lsQ2Gz_SRMeOHZYKksmvYLiMQ7oDWuXsZDlSTR92Rq09CudlgvH9SzqKJ6AUAT5fMfjlrwbIZjOiZN2_SFzOKxYcXkNvJdZS5yDbsNcbg/s250/vt-ht.JPEG", title: "Kiên Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEionv4qMJjjHaHMJ-kj6sxre8JWh9FrfRYG0Be34JwxlEPdDKXJqFxQM8jw7x1kFTR2WZ1fz3hyphenhyphenzFDWMHQhG0lsQ2Gz_SRMeOHZYKksmvYLiMQ7oDWuXsZDlSTR92Rq09CudlgvH9SzqKJ6AUAT5fMfjlrwbIZjOiZN2_SFzOKxYcXkNvJdZS5yDbsNcbg/s1600/vt-ht.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgigZxvUbJrrVmWPRUL2RdtBPnbDwQW1KVPOvu657pNz9j-z9ezKG4-aivp04-BDbQHNzgMnzCFCeNNPCbwmeo_11VqZanZUwwrsSzVQU-KPQ3HXZHMIkqU83s_J0sSSu20qggjY0s883kBCIM7z6sQLpcGSZNINTYXAFC4BpfnARjJF-Xk0QwnQn9UPUE/s250/VT-CT.JPEG", title: "Cần Thơ", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgigZxvUbJrrVmWPRUL2RdtBPnbDwQW1KVPOvu657pNz9j-z9ezKG4-aivp04-BDbQHNzgMnzCFCeNNPCbwmeo_11VqZanZUwwrsSzVQU-KPQ3HXZHMIkqU83s_J0sSSu20qggjY0s883kBCIM7z6sQLpcGSZNINTYXAFC4BpfnARjJF-Xk0QwnQn9UPUE/s1600/VT-CT.JPEG" },
        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhTUl-QrDS3R7SigfmBP_ak4QCNDCwJXHQSMAGQQ7nJ_2Fs2ic_Mfw9HU3YgKsOWF717H8YoNSU1k3D9LvLIaDJK70xdKP1gift-vZYpSmN9XqkVqa-AYN2a9Nnuiejr15aBpquLdGI1CratJZpnFfMZjha-jO5REenyhIYrwdg0KbR3UQhlaRu5QvQK_s/s250/CHUA-VINH-NGHIEM-TPHCM.jpg", title: "TP. Hồ Chí Minh", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhTUl-QrDS3R7SigfmBP_ak4QCNDCwJXHQSMAGQQ7nJ_2Fs2ic_Mfw9HU3YgKsOWF717H8YoNSU1k3D9LvLIaDJK70xdKP1gift-vZYpSmN9XqkVqa-AYN2a9Nnuiejr15aBpquLdGI1CratJZpnFfMZjha-jO5REenyhIYrwdg0KbR3UQhlaRu5QvQK_s/s1600/CHUA-VINH-NGHIEM-TPHCM.jpg" },

        { img: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjrfxG2EPZCUYRuUBs0fy5VgiXLl-ErW2CpEteC4LUG2JHO5s8O4P0NQtKo6ipn0R6AwjoKLsDXp5s4js70Mb216G7th4IpsLBN9ntuA7X1UP17vhpR5pijm1uZUCbVR68Fjackg-2iVpbv0l1rVwls23GdrN6WUn0dGLfxRQwIaPhXEuWBAkpZ83qxoBo/s250/VT-LX-AG.JPEG", title: "An Giang", link: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjrfxG2EPZCUYRuUBs0fy5VgiXLl-ErW2CpEteC4LUG2JHO5s8O4P0NQtKo6ipn0R6AwjoKLsDXp5s4js70Mb216G7th4IpsLBN9ntuA7X1UP17vhpR5pijm1uZUCbVR68Fjackg-2iVpbv0l1rVwls23GdrN6WUn0dGLfxRQwIaPhXEuWBAkpZ83qxoBo/s1600/VT-LX-AG.JPEG" },
// Video
        { 
            img: "https://img.youtube.com/vi/lnNs93Lvyls/maxresdefault.jpg", 
            title: "Test", 
            link: "https://www.youtube.com/watch?v=lnNs93Lvyls",
            type: "video",
            ratio: "16/9"
        },
		{ 
            img: "https://img.youtube.com/vi/TGHFVePEnDY/maxresdefault.jpg", 
            title: "Test", 
            link: "https://www.youtube.com/watch?v=TGHFVePEnDY",
            type: "video",
            ratio: "9/16"
        },

    ];

const track = document.getElementById('vt-carousel-track');
    const btnPrev = document.getElementById('vt-btn-prev');
    const btnNext = document.getElementById('vt-btn-next');

    // 2. Hàm Helper: Chỉ xử lý Video và Ratio
// 2. Hàm Helper: Chỉ lấy Ratio nếu là Video
const getFancyboxAttrs = (item) => {
    if (item.type === 'video' && item.ratio) {
        let attrs = [`data-aspect-ratio="${item.ratio}"`];

        if (item.ratio === '9/16') {
            // Ép kích thước ảo cực lớn để Fancybox chiếm trọn viewport chiều dọc
            // 2500 là con số an toàn để nó to bằng hoặc hơn ảnh
            attrs.push(`data-width="1406"`); 
            attrs.push(`data-height="2500"`);
            
            // Ép thêm options để bỏ qua các khoảng cách đệm (padding) mặc định của video
            attrs.push(`data-options='{"compact": true, "placeFocusBack": false}'`);
        } else if (item.ratio === '16/9') {
            attrs.push(`data-width="1920"`);
            attrs.push(`data-height="1080"`);
        }

        return attrs.join(' ');
    }
    // Nếu là ảnh, Fancybox tự lo rất tốt nên ko cần thêm gì
    return ''; 
};

    // 3. Hàm Render HTML từ Data
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
            const groupId = `group-${title.replace(/\s+/g, '-')}`;
            
            const mainAttrs = getFancyboxAttrs(mainItem);

            html += `
            <div class="vt-card-item">
                <a href="${mainItem.link}" 
                   class="text-decoration-none d-block" 
                   data-fancybox="${groupId}" 
                   ${mainAttrs}
                   data-caption="${title}">
                    <div class="carousel-div-img position-relative mb-2 overflow-hidden">
                        <img src="${mainItem.img}" class="vt-card-img shadow-sm" alt="${title}" loading="lazy">
                        
                        ${mainItem.type === 'video' ? `<div class="position-absolute top-50 start-50 translate-middle text-white opacity-75"><i class="fa-solid fa-circle-play fa-2xl"></i></div>` : ''}
                        
                        ${groupItems.length > 1 ? `<span class="position-absolute bottom-0 start-0 m-2 bg-dark badge rounded-pill fw-normal opacity-75">+${groupItems.length - 1}</span>` : ''}
                    </div>
                    <div class="text-center fw-medium small text-truncate px-1">
                        ${title}
                    </div>
                </a>
                
                <div class="d-none">
                    ${groupItems.slice(1).map(item => {
                        const subAttrs = getFancyboxAttrs(item);
                        return `<a href="${item.link}" data-fancybox="${groupId}" ${subAttrs} data-caption="${title}"></a>`;
                    }).join('')}
                </div>
            </div>
            `;
        });

        track.innerHTML = html;
    }

    // 4. Hàm xử lý Scroll
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
	// Hàm cập nhật trạng thái ẩn/hiện của nút Prev/Next
function updateButtons() {
    if (!track || !btnPrev || !btnNext) return;

    const scrollLeft = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;

    // 1. Kiểm tra nếu đang ở đầu slide (cho phép sai số 5px)
    if (scrollLeft <= 5) {
        btnPrev.style.display = 'none';
    } else {
        btnPrev.style.display = 'flex'; // Hoặc 'block' tùy CSS của bạn
    }

    // 2. Kiểm tra nếu đang ở cuối slide (cho phép sai số 5px)
    if (scrollLeft >= maxScroll - 5) {
        btnNext.style.display = 'none';
    } else {
        btnNext.style.display = 'flex';
    }
}


// 6. Gán sự kiện Click và Scroll
if (btnNext) btnNext.addEventListener('click', () => handleScroll('next'));
if (btnPrev) btnPrev.addEventListener('click', () => handleScroll('prev'));

// Lắng nghe sự kiện cuộn để ẩn/hiện nút
if (track) {
    track.addEventListener('scroll', updateButtons);
}

// Chạy hàm kiểm tra lần đầu ngay khi render xong
renderCarousel();
updateButtons();

});
