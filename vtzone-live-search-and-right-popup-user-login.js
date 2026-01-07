/* === Hàm Slide (Chỉ dùng JS thuần) === */

// Hiệu ứng Mở (Slide Down)
function slideDown(element, duration = 100) {
    // 1. Thiết lập trạng thái ban đầu để tính toán chiều cao
    element.style.display = 'block';
    // Đặt overflow: hidden để tránh nội dung bị tràn ra ngoài trong quá trình chuyển động
    element.style.overflow = 'hidden';

    // 2. Lưu trữ chiều cao ban đầu của phần tử khi nó hiển thị đầy đủ
    // offsetHeight bao gồm padding và border, nhưng không bao gồm margin
    const targetHeight = element.offsetHeight;

    // 3. Chuẩn bị cho hiệu ứng trượt lên (khởi đầu từ height = 0)
    element.style.height = '0';
    element.style.transitionProperty = 'height';
    element.style.transitionDuration = `${duration}ms`;
    element.style.transitionTimingFunction = 'ease-out';

    // 4. Bắt đầu trượt (chuyển height từ 0 đến chiều cao mục tiêu)
    // requestAnimationFrame đảm bảo hoạt ảnh mượt mà hơn setTimeout
    requestAnimationFrame(() => {
        element.style.height = `${targetHeight}px`;
    });

    // 5. Xử lý sau khi hiệu ứng hoàn tất
    // Lắng nghe sự kiện transitionend
    element.addEventListener('transitionend', function handler() {
        // Sau khi trượt xong, loại bỏ height cố định và overflow để nội dung
        // không bị giới hạn nếu chiều cao thay đổi (ví dụ: responsive)
        element.style.height = '';
        element.style.overflow = '';
        element.style.transition = ''; // Loại bỏ transition để tránh xung đột
        element.removeEventListener('transitionend', handler);
    }, { once: true }); // { once: true } đảm bảo event listener chỉ chạy một lần
}

// Hiệu ứng Đóng (Slide Up)
function slideUp(element, duration = 100) {
    // 1. Thiết lập trạng thái ban đầu để trượt xuống
    element.style.height = `${element.offsetHeight}px`;
    element.style.overflow = 'hidden';
    element.style.transitionProperty = 'height';
    element.style.transitionDuration = `${duration}ms`;
    element.style.transitionTimingFunction = 'ease-in';

    // 2. Bắt đầu trượt lên (chuyển height từ chiều cao hiện tại về 0)
    requestAnimationFrame(() => {
        element.style.height = '0';
    });

    // 3. Xử lý sau khi hiệu ứng hoàn tất
    element.addEventListener('transitionend', function handler() {
        // Sau khi trượt xong (height = 0), ẩn hoàn toàn phần tử
        element.style.display = 'none';
        element.style.height = ''; // Reset height để không ảnh hưởng lần mở tiếp theo
        element.style.overflow = '';
        element.style.transition = '';
        element.removeEventListener('transitionend', handler);
    }, { once: true });
}


/* === Chức năng Hiển thị/Ẩn Popup Tài khoản Người dùng === */
document.addEventListener('DOMContentLoaded', function() {
    // 1. Lấy các phần tử DOM cần thiết
    const avatarButton = document.querySelector('.user-profile-details .avatar-user');
    const popupPanel = document.querySelector('.popupShow_accountPanel');
    const body = document.body;
    const SLIDE_DURATION = 100; // Thời gian hiệu ứng (milliseconds)

    if (!avatarButton || !popupPanel) {
        return;
    }

    // Đảm bảo trạng thái ban đầu là ẩn
    popupPanel.style.display = 'none';

    // 2. Định nghĩa hàm bật/tắt Popup
    function togglePopup(event) {
        event.stopPropagation(); // Ngăn sự kiện click lan truyền lên body

        // Kiểm tra trạng thái hiển thị bằng CSS computed style
        const computedStyle = window.getComputedStyle(popupPanel);
        const isVisible = computedStyle.display !== 'none' && computedStyle.height !== '0px';

        if (isVisible) {
            // Đang hiện -> Đóng bằng Slide Up
            slideUp(popupPanel, SLIDE_DURATION);
        } else {
            // Đang ẩn -> Mở bằng Slide Down
            slideDown(popupPanel, SLIDE_DURATION);
        }
    }

    // 3. Xử lý sự kiện click vào Avatar
    avatarButton.addEventListener('click', togglePopup);

    // 4. Xử lý sự kiện click ngoài Popup (trên body)
    body.addEventListener('click', function(event) {
        const computedStyle = window.getComputedStyle(popupPanel);
        const isVisible = computedStyle.display !== 'none' && computedStyle.height !== '0px';

        // Chỉ xử lý nếu popup đang hiển thị
        if (isVisible) {
            const isClickInsidePanel = popupPanel.contains(event.target);
            const isClickOnAvatar = avatarButton.contains(event.target);

            // Nếu click không nằm trong popup và không nằm trên avatar, thì đóng popup
            if (!isClickInsidePanel && !isClickOnAvatar) {
                slideUp(popupPanel, SLIDE_DURATION);
            }
        }
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


