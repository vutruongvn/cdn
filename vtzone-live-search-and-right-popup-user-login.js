/* === Các hàm Fade (Chỉ dùng JS) === */
// Chức năng đóng mở rightPopupAccount trên topMenu
// Hàm làm hiện dần (Fade In)
function fadeIn(element, duration) {
    element.style.opacity = 0;
    element.style.display = 'block'; // Hiển thị block trước khi fade in
    let opacity = 0;
    const interval = 10;
    const step = interval / duration;

    const fadeInterval = setInterval(() => {
        if (opacity >= 1) {
            clearInterval(fadeInterval);
        } else {
            opacity += step;
            element.style.opacity = opacity;
        }
    }, interval);
}

// Hàm làm ẩn dần (Fade Out)
function fadeOut(element, duration) {
    let opacity = 1;
    const interval = 10;
    const step = interval / duration;

    const fadeInterval = setInterval(() => {
        if (opacity <= 0) {
            clearInterval(fadeInterval);
            element.style.display = 'none'; // Ẩn hoàn toàn sau khi fade out
        } else {
            opacity -= step;
            element.style.opacity = opacity;
        }
    }, interval);
}


/* === Chức năng Hiển thị/Ẩn Popup Tài khoản Người dùng === */
document.addEventListener('DOMContentLoaded', function() {
    // 1. Lấy các phần tử DOM cần thiết
    const avatarButton = document.querySelector('.user-profile-details .avatar-user');
    const popupPanel = document.querySelector('.popupShow_accountPanel');
    const accountLinks = document.querySelectorAll('.popupShow_accountPanel .accountOption a'); // Lấy tất cả các liên kết trong menu
    const body = document.body;
    const FADE_DURATION = 100; // Thời gian hiệu ứng (milliseconds)

    if (!avatarButton || !popupPanel) {
        return;
    }

    // Đảm bảo trạng thái ban đầu là ẩn
    popupPanel.style.display = 'none';
    popupPanel.style.opacity = 0;

    // 2. Định nghĩa hàm bật/tắt Popup
    function togglePopup(event) {
        event.stopPropagation(); // Ngăn sự kiện click lan truyền lên body

        if (popupPanel.style.display === 'block') {
            // Đang hiện -> Ẩn dần (Fade Out)
            fadeOut(popupPanel, FADE_DURATION);
        } else {
            // Đang ẩn -> Hiện dần (Fade In)
            fadeIn(popupPanel, FADE_DURATION);
        }
    }

    // 3. Xử lý sự kiện click vào Avatar
    avatarButton.addEventListener('click', togglePopup);

    // 4. Xử lý sự kiện click ngoài Popup (trên body)
    body.addEventListener('click', function(event) {
        // Chỉ xử lý nếu popup đang hiển thị
        if (popupPanel.style.display === 'block') {

            const isClickInsidePanel = popupPanel.contains(event.target);
            const isClickOnAvatar = avatarButton.contains(event.target);

            // Nếu click không nằm trong popup và không nằm trên avatar, thì ẩn dần popup
            if (!isClickInsidePanel && !isClickOnAvatar) {
                fadeOut(popupPanel, FADE_DURATION);
            }
        }
    });

    // 5. Thêm sự kiện: Ẩn Popup khi nhấp vào bất kỳ tùy chọn nào trong menu
    accountLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Gọi hàm fadeOut khi nhấp vào link trong menu
            fadeOut(popupPanel, FADE_DURATION); 
            // Lưu ý: Nếu link có href='#' thì bạn có thể cần thêm e.preventDefault()
            // nếu không muốn trang cuộn về đầu.
        });
    });
});

// Chức năng liveSearch trên topMenu by VTZone
$(document).ready(function() {
    // 1. Định nghĩa các Selector để dễ dàng quản lý
    const $liveSearchTarget = $('#target_VT_live_search');
    const $showTrigger = $('.show_liveSearch');
    const $closeButton = $('.close_liveSearch,.vt-live-search-wrapper-overlay-background');
    
    // --- Các Hàm Hỗ Trợ ---
    
    // Hàm mở Live Search
    function openLiveSearch() {
        // Sử dụng fadeIn để hiển thị nhẹ nhàng
        $liveSearchTarget.fadeIn(100); 
    }
    
    // Hàm đóng Live Search
    function closeLiveSearch() {
        // Sử dụng fadeOut để ẩn nhẹ nhàng
        $liveSearchTarget.fadeOut(100); 
    }
    
    // -----------------------------------------------------------------
    // A. Xử lý Mở Live Search (Khi click vào .show_liveSearch)
    // -----------------------------------------------------------------
    $showTrigger.on('click', function(event) {
        // Ngăn chặn hành vi mặc định (nếu .show_liveSearch là thẻ <a>)
        event.preventDefault(); 
        
        // Mở Live Search
        openLiveSearch();
        
        // *Tùy chọn*: Ngăn sự kiện lan truyền để tránh bị đóng ngay lập tức
        // do trigger click trên document (nếu có xung đột)
        event.stopPropagation();
    });
    
    // -----------------------------------------------------------------
    // B. Xử lý Đóng Live Search (Khi click vào .close_liveSearch)
    // -----------------------------------------------------------------
    $closeButton.on('click', function(event) {
        event.preventDefault(); // Ngăn hành vi mặc định
        closeLiveSearch();
        event.stopPropagation(); // Ngăn sự kiện lan truyền lên document
    });
    
    // -----------------------------------------------------------------
    // C. Xử lý Đóng Live Search (Khi click bất kỳ đâu bên ngoài)
    // -----------------------------------------------------------------
    $(document).on('click', function(event) {
        const $target = $(event.target);
        
        // Chỉ thực hiện logic đóng nếu Live Search đang hiển thị
        if ($liveSearchTarget.is(':visible')) {
            
            // Điều kiện để đóng:
            // 1. Phần tử click KHÔNG PHẢI là #target_VT_live_search
            // 2. Phần tử click KHÔNG PHẢI là phần tử con của #target_VT_live_search
            // 3. Phần tử click KHÔNG PHẢI là nút mở .show_liveSearch
            
            if (
                !$target.is($liveSearchTarget) && 
                !$target.closest($liveSearchTarget).length &&
                !$target.is($showTrigger) &&
                !$target.closest($showTrigger).length // Trường hợp nút mở có icon bên trong
            ) {
                closeLiveSearch();
            }
        }
    });

    // -----------------------------------------------------------------
    // D. Tùy chọn: Đóng Live Search khi nhấn phím ESC
    // -----------------------------------------------------------------
    $(document).on('keyup', function(e) {
        if (e.key === "Escape" || e.keyCode === 27) {
            closeLiveSearch();
        }
    });
});
