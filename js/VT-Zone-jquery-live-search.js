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
