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