/* =========================================================
Các tính năng ngoài lề của VT Films / films.vutruong.vn
========================================================= */

// Tính năng tự động add class .light-mode vào body
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const storageKey = 'vt_theme_mode';

    // 1. Kiểm tra trạng thái đã lưu trong máy người dùng
    const savedMode = localStorage.getItem(storageKey);

    // 2. Thiết lập mặc định là Light Mode nếu chưa từng chọn
    // Nếu chưa có dữ liệu hoặc dữ liệu là 'light', thì thêm class .light-mode
    if (savedMode === 'light' || !savedMode) {
        body.classList.add('light-mode');
    }
});

/**
 * TÍNH NĂNG KÉO CHUỘT ĐỂ CUỘN (DRAG TO SCROLL)
 * Áp dụng cho tất cả các slider có class .movie-slider
 */
function initDragToScroll() {
        const sliders = document.querySelectorAll('.movie-slider');
        sliders.forEach(slider => {
            let isDown = false;
            let startX;
            let scrollLeft;
            let velocity = 0;
            let rafID;
            // Hàm tạo hiệu ứng trượt nhẹ sau khi thả chuột
            const momentumScroll = () => {
                slider.scrollLeft += velocity;
                velocity *= 0.95; // Độ ma sát (càng gần 1 càng trượt lâu)
                if (Math.abs(velocity) > 0.5) {
                    rafID = requestAnimationFrame(momentumScroll);
                }
            };
            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.classList.add('active-drag');
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
                cancelAnimationFrame(rafID); // Dừng trượt nếu đang trượt mà chạm vào
                velocity = 0;
                slider.style.scrollBehavior = 'auto';
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.classList.remove('active-drag');
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.classList.remove('active-drag');
                rafID = requestAnimationFrame(momentumScroll); // Bắt đầu trượt theo quán tính
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 1.05; // Tốc độ di chuyển
                const prevScrollLeft = slider.scrollLeft;
                slider.scrollLeft = scrollLeft - walk;
                velocity = slider.scrollLeft - prevScrollLeft; // Tính vận tốc để tạo quán tính
            });
            // Ngăn chặn việc click nhầm vào phim khi đang kéo
            slider.addEventListener('click', (e) => {
                if (Math.abs(velocity) > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
        });
    }
    // Gọi hàm này sau khi trang web đã load và render xong các slide
    // Bạn hãy chèn hàm này vào trong hàm loadHomePage sau khi các results đã render xong.

let lastScrollY = 0;
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 20;
    // Chỉ thực hiện thay đổi nếu trạng thái cuộn khác với trạng thái trước đó
    if (lastScrollY !== scrolled) {
        const nav = document.querySelector('nav');
        nav.classList.toggle('afterScroll', scrolled);
        nav.classList.toggle('shadow-lg', scrolled);
        lastScrollY = scrolled;
    }
}, {
    passive: true
}); // passive giúp cuộn trang mượt hơn trên mobile

async
function shareNative() {
    // 1. Lấy dữ liệu động: Tên phim (từ Title) và URL hiện tại
    const pageTitle = document.title.split('|')[0].trim();
    const currentUrl = window.location.href;

    // Nội dung chia sẻ theo yêu cầu của bạn
    const shareText = `🎥 Xem phim: "${pageTitle}" miễn phí tại VT Films!\n👉 ${currentUrl}`;

    // 2. Kiểm tra hỗ trợ Web Share API
    if (navigator.share) {
        try {
            await navigator.share({
                title: pageTitle,
                text: shareText, // Gộp cả text và URL vào đây
                url: currentUrl // Một số app mobile yêu cầu thuộc tính url riêng để hiện preview
            });
        } catch (err) {
            console.log('Hủy chia sẻ:', err);
        }
    } else {
        // 3. Fallback cho PC hoặc trình duyệt cũ
        try {
            await navigator.clipboard.writeText(shareText);
            // Bạn có thể thay alert bằng Toast của Bootstrap nếu muốn đẹp hơn
            alert('Đã sao chép nội dung chia sẻ vào bộ nhớ tạm!');
        } catch (err) {
            console.error('Không thể copy:', err);
        }
    }
}

/**
 * VT FILMS LIVE SEARCH - OPTIMIZED VERSION (FINAL)
 */

async
function fetchMovieDetailData(slug) {
    try {
        const res = await fetch(`https://phim.nguonc.com/api/film/${slug}`);
        const data = await res.json();
        if (data && data.status === "success") {
            const m = data.movie;
            const catNames = m.category ? .["2"] ? .list ? .map(c => c.name).join(', ') || 'Phim';
            return {
                quality: m.quality || 'Null',
                language: m.language || 'Null',
                current_episode: m.current_episode || 'Null',
                categories: catNames,
                slug: slug,
                name: m.name,
                thumb_url: m.thumb_url
            };
        }
    } catch (e) {
        console.error("Lỗi lấy chi tiết phim:", slug);
    }
    return null;
}

(function() {
    let debounceTimer;

    // Hàm cực mạnh để highlight bất chấp có dấu hay không
    function highlightVietnamese(text, query) {
        if (!query) return text;

        // Chuyển chuỗi sang dạng không dấu để so sánh vị trí
        const nonAccentText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const nonAccentQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        let startIndex = nonAccentText.indexOf(nonAccentQuery);
        if (startIndex === -1) return text; // Không khớp thì trả về text gốc

        // Nếu khớp, ta lấy đúng đoạn text gốc ở vị trí đó để giữ nguyên dấu
        const originalPart = text.substring(startIndex, startIndex + query.length);
        const regex = new RegExp(originalPart, 'gi');

        return text.replace(regex, '<span class="text-warning fw-bold">$&</span>');
    }

    function getResultBox() {
        let resBox = document.getElementById('live-search-results');
        if (!resBox) {
            const sBox = document.getElementById('searchBox');
            if (sBox) {
                resBox = document.createElement('div');
                resBox.id = 'live-search-results';
                sBox.appendChild(resBox);
            }
        }
        return resBox;
    }

    function hideResultBox() {
        const resBox = document.getElementById('live-search-results');
        if (resBox) resBox.style.display = 'none';
    }

    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'searchInput') {
            const query = e.target.value.trim();
            const resBox = getResultBox();
            if (!resBox) return;

            clearTimeout(debounceTimer);
            if (query.length < 2) {
                hideResultBox();
                return;
            }

            resBox.style.display = 'block';

            // THAY THẾ TEXT/SPINNER BẰNG SKELETON LOADING (5 ITEMS)
            // Giữ nguyên bố cục search-item để tránh giật lag khi dữ liệu đổ về
            const skeletonHtml = Array(5).fill(0).map(() => `
                <div class="search-item placeholder-glow">
                    <div class="placeholder" style="width: 80px; aspect-ratio:2/3; border-radius: 8px;"></div>
                    <div class="search-item-info w-100">
                        <div class="placeholder col-12 rounded"></div>
                        <div class="search-item-meta my-1">
                            <span class="placeholder col-2 me-1 rounded"></span>
                            <span class="placeholder col-3 me-1 rounded"></span>
                            <span class="placeholder col-3 rounded"></span>
                        </div>
                        <div class="m-0">
                            <span class="placeholder col-7 rounded"></span>
                        </div>
                    </div>
                </div>
            `).join('');

            resBox.innerHTML = skeletonHtml;

            debounceTimer = setTimeout(() => {
                fetch(`https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(async(data) => {
                        if (data ? .items ? .length > 0) {
                            const topItems = data.items.slice(0, 5);
                            const detailedMovies = await Promise.all(
                                topItems.map(item => fetchMovieDetailData(item.slug))
                            );

                            let itemsHtml = detailedMovies
                                .filter(m => m !== null)
                                .map(m => {
                                    const highlightedName = highlightVietnamese(m.name, query);

                                    return `
                                        <div class="search-item" onclick="hideResultBox(); navigateToMovie('${m.slug}')">
                                            <img src="${m.thumb_url}" onerror="this.src='https://placehold.co/200x300?text=No+Image'">
                                            <div class="search-item-info">
                                                <div class="search-item-title text-truncate fw-normal">${highlightedName}</div>
                                                <div class="search-item-meta my-1">
                                                    <span class="badge bg-danger fw-normal">${m.quality}</span>
                                                    <span class='badge bg-primary fw-normal'>${m.language}</span>
                                                    <span class='badge bg-success fw-normal'>${m.current_episode}</span>
                                                </div>
                                                <div class="search-item-cat text-truncate text-light">
                                                    <span class="badge bg-dark fw-normal">${m.categories}</span>
                                                </div>
                                            </div>
                                        </div>`;
                                }).join('');

                            if (itemsHtml !== "") {
                                itemsHtml += `
                                    <div class="p-2">
                                        <button class="btn btn-sm btn-dark w-100" onclick="hideResultBox(); window.location.href='?search=${encodeURIComponent(query)}'">
                                            <i class="fa-duotone fa-search me-2"></i>XEM THÊM KẾT QUẢ
                                        </button>
                                    </div>`;
                                resBox.innerHTML = itemsHtml;
                            }
                        } else {
                            resBox.innerHTML = `<div class="p-3 text-center text-secondary">Không thấy phim nào</div>`;
                        }
                    })
                    .catch(() => {
                        hideResultBox();
                    });
            }, 500); // delay sau khi type xong
        }
    });


    // Các sự kiện đóng/mở khung cũ giữ nguyên
    // --- LOGIC ĐÓNG/MỞ KẾT QUẢ TỐI ƯU ---
    document.addEventListener('click', (e) => {
        const sBox = document.getElementById('searchBox');
        const sInput = document.getElementById('searchInput');
        const resBox = document.getElementById('live-search-results');

        // 1. Nếu bấm vào Input: Hiện lại kết quả (nếu đã có nội dung tìm kiếm)
        if (sInput && sInput.contains(e.target)) {
            if (sInput.value.trim().length >= 2) {
                if (resBox) resBox.style.display = 'block';
            }
            return; // Dừng lại để không chạy xuống logic đóng ở dưới
        }

        // 2. Nếu bấm vào một Item kết quả (search-item): Đóng khung kết quả
        // Chúng ta kiểm tra xem phần tử bị click có nằm trong resBox không
        if (resBox && resBox.contains(e.target)) {
            // 1. Tìm phần tử navbar
            const navCollapse = document.querySelector('.navbar-collapse');

            // 2. Xóa class 'show' để ẩn navbar
            if (navCollapse) {
                navCollapse.classList.remove('show');
            }

            // 3. Thực hiện các hàm bổ trợ và kết thúc
            hideResultBox();
            return;
        }

        // 3. Nếu bấm ra ngoài searchBox hoàn toàn: Đóng khung kết quả
        if (sBox && !sBox.contains(e.target)) {
            hideResultBox();
        }
    });

    // Xuất hàm ra global để dùng cho các chỗ khác (như trong chuỗi HTML map)
    window.hideResultBox = hideResultBox;

})();

// TÍNH NĂNG MENU HAMBUGER TRÊN MOBILE: 3 GẠCH CHUYỂN SANG DẤU X
document.addEventListener('DOMContentLoaded', function() {
    const myNavbar = document.getElementById('movieNavbar');
    const icon = document.getElementById('iconToggler');

    if (myNavbar && icon) {
        // 1. Khi bắt đầu MỞ menu
        myNavbar.addEventListener('show.bs.collapse', function() {
            icon.classList.replace('fa-bars', 'fa-xmark');
            icon.style.color = '#dc3545'; // Đổi sang màu đỏ khi hiện X
        });

        // 2. Khi bắt đầu ĐÓNG menu
        myNavbar.addEventListener('hide.bs.collapse', function() {
            icon.classList.replace('fa-xmark', 'fa-bars');
            icon.style.color = ''; // Trả về màu mặc định
        });

        // 3. Quan trọng: Ép icon đúng ngay từ đầu
        if (!myNavbar.classList.contains('show')) {
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-xmark');
        }
    }
});

/**
 * MODULE QUẢN LÝ LỊCH SỬ XEM PHIM
 * Tách biệt hoàn toàn, sử dụng localStorage
 */
const MovieHistoryManager = {
    key: 'vt_watch_history', // Key lưu trong localStorage
    maxItems: 8, // Giới hạn số lượng phim

    // 1. Hàm lấy dữ liệu từ Storage
    getHistory() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : [];
    },

    // 2. Hàm lưu phim mới vào lịch sử (Gọi hàm này khi vào trang xem phim)
    add(movieData) {
        // movieData cần có: { slug, name, thumb_url, quality, lang, category, url }
        let history = this.getHistory();

        // Kiểm tra nếu phim đã tồn tại thì xóa cái cũ đi để đưa lên đầu
        history = history.filter(item => item.slug !== movieData.slug);

        // Thêm phim mới vào đầu mảng
        history.unshift(movieData);

        // Cắt mảng nếu vượt quá giới hạn (max 5)
        if (history.length > this.maxItems) {
            history = history.slice(0, this.maxItems);
        }

        // Lưu lại vào localStorage
        localStorage.setItem(this.key, JSON.stringify(history));

        // Render lại giao diện ngay lập tức
        this.render();
    },

    // 3. Hàm xóa một phim cụ thể - Deleted

    // 4. Hàm xóa tất cả
    clearAll() {
        // Chặn sự kiện click dropdown đóng lại
        if (event) event.stopPropagation();

        localStorage.removeItem(this.key);
        this.render();
    },

    // 5. Hàm hiển thị (Render) ra HTML
    render() {
        const container = document.getElementById('history-items-container');
        if (!container) return; // Không tìm thấy chỗ hiển thị thì thoát

        const history = this.getHistory();

        if (history.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4 text-secondary">
                    <i class="fa-duotone fa-film fa-2x mb-2"></i>
                    <p class="mb-0 small">Bạn chưa xem phim nào gần đây.</p>
                </div>
            `;
            return;
        }

        const html = history.map(item => `
            <a href="${item.url || '#'}" class="history-item d-flex align-items-center p-2 text-decoration-none">
                <img src="${item.thumb_url}" class="history-thumb me-2" alt="${item.name}">
                
                <div class="flex-grow-1" style="min-width: 0;">
                    <h6 class="text-white mb-1 text-truncate">
                        ${item.name}
                    </h6>
                    
                    <div class="d-flex gap-1 my-2">
                        <span class="badge-custom bg-danger text-white">
                            ${item.quality || 'HD'}
                        </span>
                        <span class="badge-custom bg-primary text-white">
                            ${item.lang || 'Vietsub'}
                        </span>
                    </div>

                    <small class="text-secondary d-block text-truncate" style="font-size: 12px;">
                        ${item.category || 'Phim mới'}
                    </small>
                </div>
            </a>
        `).join('');

        container.innerHTML = html;
    },

    // 6. Khởi tạo (Chạy khi load trang)
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.render();
        });
    }
};

// Kích hoạt module
MovieHistoryManager.init();

// LIGHT MODE FUNCTION
function toggleTheme() {
    const body = document.body;
    const isLight = body.classList.toggle('light-mode');

    // Lưu trạng thái vào localStorage
    localStorage.setItem('theme-mode', isLight ? 'light' : 'dark');

    // Cập nhật Icon (nếu có)
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = isLight ? 'fa-duotone fa-moon' : 'fa-duotone fa-sun';
    }
}

// Kiểm tra khi vừa load trang
(function initTheme() {
    const savedTheme = localStorage.getItem('theme-mode');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
})();

// Xóa ?m=1
var uri = window.location.toString();
if (uri.indexOf("?m=1", "?m=1") > 0) {
    var clean_uri = uri.substring(0, uri.indexOf("?m=1"));
    window.history.replaceState({}, document.title, clean_uri);

}

// Thanh bar Loading Effect
(function() {
    const progressBar = document.getElementById('top-progress-bar');
    const progressFill = progressBar.querySelector('.progress-fill');
    let progress = 0;
    let interval;

    // Hàm bắt đầu chạy thanh loading
    function startLoading() {
        progressBar.style.display = 'block';
        progress = 0;
        progressFill.style.width = '0%';

        interval = setInterval(() => {
            // Tăng dần tiến trình nhưng chậm lại khi gần đến 90%
            if (progress < 90) {
                progress += Math.random() * 5; // Tăng ngẫu nhiên cho tự nhiên
                progressFill.style.width = progress + '%';
            }
        }, 1000);
    }

    // Hàm kết thúc khi trang tải xong
    function completeLoading() {
        clearInterval(interval);
        progressFill.style.width = '100%';

        setTimeout(() => {
            progressBar.style.opacity = '0'; // Hiệu ứng mờ dần khi xong
            setTimeout(() => {
                progressBar.style.display = 'none';
                progressBar.style.opacity = '1';
                progressFill.style.width = '0%';
            }, 500);
        }, 1000);
    }

    // Thực thi ngay khi bắt đầu parse HTML
    startLoading();

    // Khi các tài nguyên (ảnh, script, api pexels...) tải xong hoàn toàn
    window.addEventListener('load', completeLoading);
})();

