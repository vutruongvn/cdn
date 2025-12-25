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
// VTZone
// blog.vutruong.vn
