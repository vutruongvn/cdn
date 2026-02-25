// ============================================================
// vtfilms-api.js — VT Films · Logic lấy & hiển thị dữ liệu phim
// Nguồn API : phim.nguonc.com
// Website   : films.vutruong.vn
// ============================================================
//
// MỤC LỤC
//   0.  Lazy Load ảnh (IntersectionObserver)
//   1.  Hằng số & cấu hình toàn cục
//   2.  Tiện ích (slugify, displayName, fetchNguonC, updateURL)
//   3.  Render card phim
//   4.  Điều hướng SPA (triggerSearch, navigateToMovie, navigateToCategory)
//   5.  Infinite Scroll (loadMoreMovies, updateBottomLoader)
//   6.  Router (checkRoute, setupInfinitePage, renderGridSkeleton)
//   7.  Trang chủ (HOME_SECTIONS_LIST, loadHomePage, renderHomeSkeleton)
//   8.  Phim liên quan (loadRelatedMovies)
//   9.  handleViewAll — điều hướng "Xem thêm"
//  10.  Chi tiết phim (showMovieDetail, changeServer, playVideo)
//  11.  Khởi chạy (initDynamicMenu, DOMContentLoaded, refreshHome)
// ============================================================


// ─────────────────────────────────────────────────────────────
// 0. LAZY LOAD ẢNH
//    Dùng IntersectionObserver để load ảnh khi sắp cuộn tới.
//    Ảnh cần có class="lazy-img" và thuộc tính data-src="url".
//    Sau khi load xong: thêm class "loaded", xóa class "lazy-img"
//    để tránh bị observe lại ở lần gọi initLazyLoading() tiếp theo.
// ─────────────────────────────────────────────────────────────
function initLazyLoading() {
    // Chỉ chọn những ảnh chưa được load (vẫn còn class lazy-img)
    const images = document.querySelectorAll('.lazy-img');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const realSrc = img.getAttribute('data-src');
                if (realSrc) {
                    img.src = realSrc;
                    img.removeAttribute('data-src'); // Xóa để không bị xử lý lại
                    img.onload = () => {
                        img.classList.add('loaded');    // Trigger CSS fade-in
                        img.classList.remove('lazy-img'); // Loại khỏi vòng quan sát tiếp theo
                    };
                }
                observer.unobserve(img); // Dừng theo dõi ảnh sau khi đã xử lý
            }
        });
    }, {
        rootMargin: '200px 0px', // Bắt đầu load trước khi cuộn tới 200px
        threshold: 0.01
    });
    images.forEach(img => imageObserver.observe(img));
}


// ─────────────────────────────────────────────────────────────
// 1. HẰNG SỐ & CẤU HÌNH TOÀN CỤC
// ─────────────────────────────────────────────────────────────

/**
 * NGUONC_CONFIG — Cấu hình trung tâm cho API NguonC.
 * Thay đổi BASE_API tại đây nếu nguồn API đổi domain.
 */
const NGUONC_CONFIG = {
    BASE_API: "https://phim.nguonc.com/api/films",   // Base URL của tất cả endpoint danh sách
    ENDPOINTS: {
        new:      "/phim-moi-cap-nhat",              // Phim mới cập nhật
        list:     "/danh-sach/",                     // Danh sách theo slug (phim-le, phim-bo, ...)
        category: "/the-loai/",                      // Theo thể loại
        country:  "/quoc-gia/",                      // Theo quốc gia
        search:   "/search?keyword="                 // Tìm kiếm theo từ khóa
    },
    CONTAINER_ID: "movieList",   // ID của div chứa toàn bộ nội dung chính
    DEFAULT_TITLE: "VT Films"    // Tiêu đề tab mặc định khi ở trang chủ
};

/**
 * MOVIE_MENU_DATA — Dữ liệu thể loại và quốc gia để render menu nav động.
 * Thêm/xóa mục tại đây, menu sẽ tự cập nhật qua initDynamicMenu().
 */
const MOVIE_MENU_DATA = {
    genres: [
        "Hành Động", "Phiêu Lưu", "Hoạt Hình", "Hài", "Hình Sự",
        "Tài Liệu", "Chính Kịch", "Gia Đình", "Giả Tưởng", "Lịch Sử",
        "Kinh Dị", "Phim Nhạc", "Bí Ẩn", "Lãng Mạn", "Khoa Học Viễn Tưởng",
        "Gây Cấn", "Chiến Tranh", "Tâm Lý", "Tình Cảm", "Cổ Trang",
        "Miền Tây", "Phim 18+"
    ],
    countries: [
        "Âu Mỹ", "Anh", "Trung Quốc", "Indonesia", "Việt Nam",
        "Pháp", "Hồng Kông", "Hàn Quốc", "Nhật Bản", "Thái Lan",
        "Đài Loan", "Nga", "Hà Lan", "Philippines", "Ấn Độ", "Quốc gia khác"
    ]
};

/**
 * PAGING_STATE — Trạng thái phân trang cho chế độ Infinite Scroll.
 * Được reset mỗi khi setupInfinitePage() được gọi.
 *
 * @property {number}  currentPage     - Trang hiện tại (bắt đầu từ 1)
 * @property {boolean} isLoading       - Đang fetch API? → ngăn gọi chồng chất
 * @property {boolean} hasMore         - Còn trang tiếp theo?
 * @property {string}  currentEndpoint - Endpoint đang dùng cho infinite scroll
 * @property {boolean} isInfiniteMode  - Đang ở chế độ infinite scroll?
 */
const PAGING_STATE = {
    currentPage:      1,
    isLoading:        false,
    hasMore:          true,
    currentEndpoint:  '',
    isInfiniteMode:   false
};


// ─────────────────────────────────────────────────────────────
// 2. HÀM TIỆN ÍCH CHUẨN HÓA
// ─────────────────────────────────────────────────────────────

/**
 * getDisplayName(slug) — Tra cứu ngược: slug → tên hiển thị có dấu.
 * Dùng để hiển thị tiêu đề section (vd: "hanh-dong" → "Hành Động").
 * Nếu không tìm thấy trong danh sách, tự format slug thành Title Case.
 *
 * @param {string} slug - Slug cần tra cứu
 * @returns {string} Tên hiển thị đẹp
 */
function getDisplayName(slug) {
    // Gộp tất cả mục: thể loại + quốc gia + các slug đặc biệt
    const allItems = [
        ...MOVIE_MENU_DATA.genres,
        ...MOVIE_MENU_DATA.countries,
        "Phim Lẻ", "Phim Bộ", "Phim Mới"
    ];
    const found = allItems.find(item => slugify(item) === slug);
    if (found) return found;
    // Fallback: format slug thành Title Case cho đẹp
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * slugify(text) — Chuyển chuỗi tiếng Việt → slug URL-safe.
 * Ví dụ: "Hành Động" → "hanh-dong"
 *
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
    if (!text) return "";
    return text.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu thanh
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

/**
 * updatePageTitle(prefix, content, isRaw) — Cập nhật <title> tab trình duyệt.
 *
 * @param {string}  prefix  - Tiền tố (không dùng trong output hiện tại, giữ lại để tương thích)
 * @param {string}  content - Nội dung (slug hoặc tên thô từ API)
 * @param {boolean} isRaw   - true: giữ nguyên content (tên phim từ API),
 *                            false: tra cứu tên đẹp qua getDisplayName()
 */
function updatePageTitle(prefix, content = "", isRaw = false) {
    if (!content) {
        document.title = NGUONC_CONFIG.DEFAULT_TITLE;
        return;
    }
    // isRaw=true (tên phim từ API) → giữ nguyên; false (slug) → tra cứu tên có dấu
    const displayContent = isRaw ? content : getDisplayName(content);
    document.title = `${displayContent}`;
}

/**
 * fetchNguonC(endpoint, page) — Fetch dữ liệu từ API NguonC.
 * Tự động gắn BASE_API nếu endpoint không phải URL đầy đủ.
 * Tự động thêm query ?page=N nếu có.
 * Trả về null nếu lỗi (không throw) để caller tự xử lý graceful.
 *
 * @param {string}      endpoint - Đường dẫn API hoặc URL đầy đủ
 * @param {number|null} page     - Số trang (null = không thêm param page)
 * @returns {Promise<object|null>}
 */
async function fetchNguonC(endpoint, page = null) {
    let finalUrl = endpoint.startsWith('http')
        ? endpoint
        : `${NGUONC_CONFIG.BASE_API}${endpoint}`;

    if (page !== null) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl += `${separator}page=${page}`;
    }

    try {
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error("HTTP Status: " + response.status);
        return await response.json();
    } catch (error) {
        // Trả null thay vì throw để tránh crash toàn bộ luồng
        console.error('[VTFilms API] fetchNguonC lỗi:', finalUrl, error.message);
        return null;
    }
}

/**
 * updateURL(params) — Cập nhật query string trên URL mà không reload trang (SPA).
 * Xóa toàn bộ params cũ trước khi ghi params mới.
 *
 * @param {Object} params - Key-value pairs cần ghi vào URL
 */
function updateURL(params = {}) {
    const url = new URL(window.location.href);
    url.search = ""; // Reset hết query cũ
    Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));
    window.history.pushState({}, '', url);
}

// Xử lý nút Back/Forward của trình duyệt → re-render đúng route
window.onpopstate = () => checkRoute();


// ─────────────────────────────────────────────────────────────
// 3. RENDER CARD PHIM
// ─────────────────────────────────────────────────────────────

/**
 * renderMovieCard(movie, mode) — Render HTML card cho 1 phim.
 *
 * @param {object} movie - Object phim từ API NguonC
 * @param {string} mode  - 'grid' (trang lưới) | 'card' (slider trang chủ)
 * @returns {string} HTML string
 *
 * Ảnh dùng kỹ thuật lazy-load:
 *   - src = placeholder GIF 1x1 trong suốt (base64)
 *   - data-src = URL thật → initLazyLoading() sẽ hoán đổi khi vào viewport
 */
function renderMovieCard(movie, mode = 'grid') {
    const year     = movie.category?.["3"]?.list?.[0]?.name || movie.year || '2026';
    const colClass = mode === 'grid' ? 'col' : 'movie-card-item';

    return `
    <div class="${colClass}">
      <div class="movie-item" title="${movie.name}"
           onclick="navigateToMovie('${movie.slug}')" style="cursor:pointer">

        <div class="poster-wrapper">
          <i class="fa-duotone fa-play play-overlay"></i>

          <!-- Placeholder trong suốt → lazy load đổi thành ảnh thật -->
          <img data-src="${movie.thumb_url}"
               src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
               class="poster-img lazy-img"
               alt="${movie.name}">

          <!-- Badge chất lượng & ngôn ngữ (ẩn trên mobile) -->
          <div class="movie-badge position-absolute d-none d-md-block">
            <span class="text-warning fw-bold">${movie.quality || 'HD'}</span>
            <span class="text-white ms-1 border-start ps-2 border-secondary">${movie.language || 'Vietsub'}</span>
          </div>

          <!-- Badge số tập hiện tại (ẩn trên mobile) -->
          <div class="movie-ep position-absolute d-none d-md-block">
            <span class="text-warning fw-normal">${movie.current_episode}</span>
          </div>
        </div>

        <div class="movie-info mt-2 text-center">
          <div class="movie-name text-truncate">${movie.name}</div>
          <div class="movie-origin text-secondary small text-truncate">${movie.original_name}</div>
        </div>

      </div>
    </div>`;
}


// ─────────────────────────────────────────────────────────────
// 4. ĐIỀU HƯỚNG SPA
// ─────────────────────────────────────────────────────────────

/**
 * triggerSearch() — Đọc input tìm kiếm → cập nhật URL → gọi checkRoute().
 * Yêu cầu tối thiểu 2 ký tự để tránh tìm kiếm không có nghĩa.
 */
function triggerSearch() {
    const sInput  = document.getElementById('searchInput');
    const keyword = sInput ? sInput.value.trim() : "";
    if (keyword.length > 1) {
        updateURL({ search: keyword });
        checkRoute();
        sInput.blur(); // Đóng bàn phím mobile
    }
}

/**
 * navigateToMovie(slug) — Điều hướng đến trang chi tiết phim.
 * Cập nhật URL với param ?watch=slug rồi gọi showMovieDetail().
 *
 * @param {string} slug - Slug phim
 */
function navigateToMovie(slug) {
    updateURL({ watch: slug });
    showMovieDetail(slug);
}

/**
 * navigateToCategory(type, slug) — Điều hướng đến danh sách theo loại/quốc gia/danh mục.
 * Tự động đóng menu mobile sau khi điều hướng.
 *
 * @param {string} type - 'quoc-gia' | 'the-loai' | (slug danh mục khác)
 * @param {string} slug - Slug của mục đích đến
 */
function navigateToCategory(type, slug) {
    let params = {};
    if (type === 'quoc-gia')     params.country = slug;
    else if (type === 'the-loai') params.type   = slug;
    else                          params.cat     = slug || type;

    updateURL(params);
    checkRoute();

    // Đóng menu mobile Bootstrap 5 nếu đang mở
    const navbarCollapse = document.getElementById('movieNavbar');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) bsCollapse.hide();
    }
}


// ─────────────────────────────────────────────────────────────
// 5. INFINITE SCROLL
// ─────────────────────────────────────────────────────────────

/**
 * loadMoreMovies(isFirstLoad) — Tải 1 trang phim và append vào lưới.
 * Guard: thoát ngay nếu đang loading hoặc không còn trang nào.
 * Dùng Promise.all để delay tối thiểu 500ms (tránh flash skeleton quá nhanh).
 *
 * @param {boolean} isFirstLoad - true: ghi đè lưới; false: append thêm vào cuối
 */
async function loadMoreMovies(isFirstLoad = false) {
    if (PAGING_STATE.isLoading || !PAGING_STATE.hasMore) return;
    PAGING_STATE.isLoading = true;

    // Ẩn nút dự phòng "Tải thêm" trong khi đang fetch
    const btnLoadMore = document.getElementById('btnLoadMore');
    if (btnLoadMore) btnLoadMore.style.display = 'none';

    // Hiện skeleton loading
    updateBottomLoader(true);

    try {
        // Chạy song song: fetch API + delay 500ms để skeleton không nháy quá nhanh
        const [data] = await Promise.all([
            fetchNguonC(PAGING_STATE.currentEndpoint, PAGING_STATE.currentPage),
            new Promise(resolve => setTimeout(resolve, 500))
        ]);

        const grid = document.querySelector('.movie-grid-row');

        if (grid && data?.items?.length > 0) {
            const html = data.items.map(m => renderMovieCard(m, 'grid')).join('');

            if (isFirstLoad) {
                grid.innerHTML = html; // Lần đầu: ghi đè skeleton
            } else {
                grid.insertAdjacentHTML('beforeend', html); // Tải thêm: append
            }

            PAGING_STATE.currentPage++;
            // Kiểm tra còn trang tiếp theo không (dựa trên total_page từ API)
            PAGING_STATE.hasMore = PAGING_STATE.currentPage <= (data.paginate?.total_page || 1);

        } else {
            // Không có dữ liệu
            if (isFirstLoad && grid) {
                grid.innerHTML = '<div class="text-danger text-center py-5 w-100">Không tìm thấy phim nào.</div>';
            }
            PAGING_STATE.hasMore = false;
        }

    } catch (error) {
        console.error('[VTFilms API] Lỗi loadMoreMovies:', error);
    } finally {
        PAGING_STATE.isLoading = false;

        // Tắt skeleton, hiện thông báo hết kết quả nếu cần
        const endMsg = PAGING_STATE.hasMore ? "" : "Không còn kết quả nào khác.";
        updateBottomLoader(false, endMsg);
        initLazyLoading(); // Kích hoạt lazy-load cho các card mới chèn vào

        // Hiện lại nút dự phòng nếu còn trang
        if (btnLoadMore && PAGING_STATE.hasMore) {
            btnLoadMore.style.display = 'inline-block';
        }
    }
}

/**
 * updateBottomLoader(show, msg) — Điều khiển hiển thị skeleton / thông báo cuối trang.
 *
 * @param {boolean} show - true: hiện skeleton 12 ô; false: hiện thông báo hoặc trống
 * @param {string}  msg  - Thông báo hiện khi show=false (rỗng = ẩn luôn)
 */
function updateBottomLoader(show, msg = "") {
    const loader = document.getElementById('bottom-loader');
    if (!loader) return;

    if (show) {
        loader.innerHTML = `
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 g-2 mt-1 text-start">
          ${renderGridSkeleton(12)}
      </div>
      <div class="py-3 text-center d-none">
        <div class="spinner-border spinner-border-sm text-danger"></div> Đang tải thêm...
      </div>`;
    } else {
        loader.innerHTML = msg
            ? `<div class="py-4 text-center text-secondary fw-bold">${msg}</div>`
            : "";
    }
}


// ─────────────────────────────────────────────────────────────
// 6. ROUTER & INFINITE PAGE
// ─────────────────────────────────────────────────────────────

/**
 * checkRoute() — Router SPA trung tâm.
 * Đọc query string trên URL → quyết định render trang nào.
 *
 * Ưu tiên xử lý (theo thứ tự):
 *   ?watch=slug   → Chi tiết phim
 *   ?search=key   → Trang tìm kiếm
 *   ?type=slug    → Danh sách thể loại
 *   ?country=slug → Danh sách quốc gia
 *   ?cat=slug     → Danh sách danh mục (phim-le, phim-bo, new, ...)
 *   (none)        → Trang chủ
 */
async function checkRoute() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    if (!container) return; // Guard: container chưa có trong DOM

    const urlParams = new URLSearchParams(window.location.search);
    container.innerHTML = '';          // Xóa nội dung cũ
    PAGING_STATE.isInfiniteMode = false;
    window.scrollTo(0, 0);

    if (urlParams.has('watch')) {
        // ── Trang chi tiết phim ──
        showMovieDetail(urlParams.get('watch'));

    } else if (urlParams.has('search')) {
        // ── Kết quả tìm kiếm ──
        const key = urlParams.get('search');
        updatePageTitle("Tìm kiếm", key, true); // Giữ nguyên keyword người dùng nhập
        setupInfinitePage(
            `<i class="fa-duotone fa-search me-2"></i>Tìm kiếm: ${key}`,
            `${NGUONC_CONFIG.ENDPOINTS.search}${key}`
        );

    } else if (urlParams.has('type')) {
        // ── Danh sách theo thể loại ──
        const slug = urlParams.get('type');
        updatePageTitle("Thể loại", slug);
        setupInfinitePage(
            `<i class="fa-duotone fa-tags me-2"></i>Thể loại: ${getDisplayName(slug)}`,
            `${NGUONC_CONFIG.ENDPOINTS.category}${slug}`
        );

    } else if (urlParams.has('country')) {
        // ── Danh sách theo quốc gia ──
        const slug = urlParams.get('country');
        updatePageTitle("Quốc gia", slug);
        setupInfinitePage(
            `<i class="fa-duotone fa-earth-asia me-2"></i>Quốc gia: ${getDisplayName(slug)}`,
            `${NGUONC_CONFIG.ENDPOINTS.country}${slug}`
        );

    } else if (urlParams.has('cat')) {
        // ── Danh sách theo danh mục (phim-le, phim-bo, new, ...) ──
        const slug = urlParams.get('cat');
        updatePageTitle("Danh mục", slug);
        const endpoint = (slug === 'new')
            ? NGUONC_CONFIG.ENDPOINTS.new
            : `${NGUONC_CONFIG.ENDPOINTS.list}${slug}`;
        setupInfinitePage(
            `<i class="fa-duotone fa-tags me-2"></i>${getDisplayName(slug)}`,
            endpoint
        );

    } else {
        // ── Trang chủ ──
        updatePageTitle("");
        loadHomePage();
    }
}

/**
 * setupInfinitePage(title, endpoint) — Chuẩn bị trang infinite scroll.
 * Reset PAGING_STATE, render khung HTML, load trang đầu, khởi tạo sentinel observer.
 *
 * @param {string} title    - Tiêu đề section (HTML string, có thể có icon)
 * @param {string} endpoint - API endpoint để fetch phim
 */
async function setupInfinitePage(title, endpoint) {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    // Reset trạng thái phân trang
    PAGING_STATE.isInfiniteMode  = true;
    PAGING_STATE.currentPage     = 1;
    PAGING_STATE.hasMore         = true;
    PAGING_STATE.currentEndpoint = endpoint;

    container.innerHTML = `
    <div class="infinite-wrapper">
      <h2 class="section-title mb-3 text-danger">${title}</h2>

      <!-- Lưới phim (skeleton sẽ được thay bằng card thật) -->
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 g-2 movie-grid-row">
          ${renderGridSkeleton(12)}
      </div>

      <!-- Khu vực phân trang: skeleton cuối + sentinel + nút dự phòng -->
      <div id="pagination-area" class="text-center py-3">
        <div id="bottom-loader"></div>
        <div id="infinite-sentinel" style="height: 20px;"></div>
        <button id="btnLoadMore"
                class="btn btn-outline-danger px-5 py-2 fw-bold mt-3"
                style="display:none;"
                onclick="loadMoreMovies()">
          TẢI THÊM
        </button>
      </div>
    </div>`;

    // Load trang đầu tiên
    await loadMoreMovies(true);

    // Thiết lập Intersection Observer cho sentinel (tự động load khi cuộn gần cuối)
    if (window.movieObserver) window.movieObserver.disconnect(); // Hủy observer cũ trước
    const sentinel = document.getElementById('infinite-sentinel');
    window.movieObserver = new IntersectionObserver((entries) => {
        if (
            entries[0].isIntersecting &&
            PAGING_STATE.isInfiniteMode &&
            !PAGING_STATE.isLoading &&
            PAGING_STATE.hasMore
        ) {
            loadMoreMovies();
        }
    }, { rootMargin: '500px' }); // Đón đầu 500px trước khi sentinel vào viewport

    window.movieObserver.observe(sentinel);
}

/**
 * renderGridSkeleton(count) — Render N ô skeleton placeholder cho lưới phim.
 * Dùng khi đang chờ API phản hồi để tránh layout shift.
 *
 * @param {number} count - Số ô skeleton cần render (mặc định 12)
 * @returns {string} HTML string
 */
function renderGridSkeleton(count = 12) {
    return Array(count).fill(0).map(() => `
    <div class="col mb-4">
      <div class="skeleton-item skeleton-poster mb-2"
           style="width:100%; aspect-ratio:2/3; border-radius:12px;"></div>
      <div class="skeleton-item my-2 mx-auto"
           style="width:80%; height:16px; border-radius:4px;"></div>
      <div class="skeleton-item mx-auto"
           style="width:50%; height:12px; border-radius:4px;"></div>
    </div>
  `).join('');
}


// ─────────────────────────────────────────────────────────────
// 7. TRANG CHỦ & CAROUSEL
// ─────────────────────────────────────────────────────────────

/**
 * HOME_SECTIONS_LIST — Danh sách các section hiển thị trên trang chủ.
 * Mỗi section là 1 slider nằm ngang với tối đa 10 phim.
 *
 * Các type hợp lệ:
 *   'new'     → endpoint: /phim-moi-cap-nhat
 *   'search'  → endpoint: /search?keyword=slug
 *   'country' → endpoint: /quoc-gia/slug
 *   'list'    → endpoint: /danh-sach/slug (mặc định)
 */
const HOME_SECTIONS_LIST = [
    { title: 'Phim mới cập nhật',          slug: 'new',                  type: 'new'     },
    { title: 'Phim đang chiếu',            slug: 'phim-dang-chieu',      type: 'list'    },
    { title: 'Việt Nam',                   slug: 'viet-nam',             type: 'country' },
    { title: 'Mèo Ú Doraemon',             slug: 'Doraemon',             type: 'search'  },
    { title: 'Thám tử lừng danh Conan',    slug: 'Conan',                type: 'search'  },
    { title: 'Phim lẻ',                    slug: 'phim-le',              type: 'list'    },
    { title: 'Phim bộ',                    slug: 'phim-bo',              type: 'list'    },
    { title: 'Hành động',                  slug: 'hanh-dong',            type: 'list'    },
    { title: 'Hoạt hình',                  slug: 'hoat-hinh',            type: 'list'    },
    { title: 'Kinh dị',                    slug: 'kinh-di',              type: 'list'    },
    { title: 'Tình cảm',                   slug: 'tinh-cam',             type: 'list'    },
    { title: 'Chính kịch',                 slug: 'chinh-kich',           type: 'list'    },
    { title: '18+',                        slug: 'phim-18',              type: 'list'    },
    { title: 'Hài',                        slug: 'phim-hai',             type: 'list'    },
    { title: 'Cổ trang',                   slug: 'co-trang',             type: 'list'    },
    { title: 'Lãng mạn',                   slug: 'lang-man',             type: 'list'    },
    { title: 'Khoa học viễn tưởng',        slug: 'khoa-hoc-vien-tuong',  type: 'list'    },
    { title: 'TV Shows',                   slug: 'tv-shows',             type: 'list'    },
];

/**
 * loadHomePage() — Tải toàn bộ trang chủ.
 * Chạy song song tất cả API requests + delay 1000ms (giữ skeleton đủ thời gian hiện).
 * Mỗi section hiển thị tối đa 10 phim dạng slider nằm ngang.
 */
async function loadHomePage() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    // Hiện skeleton tức thì để không flash trắng
    renderHomeSkeleton();

    // Xây dựng danh sách jobs: mỗi job = 1 section với endpoint tương ứng
    const jobs = HOME_SECTIONS_LIST.map(item => {
        let endpoint = '';
        let navType  = 'cat'; // Param URL mặc định khi bấm "Xem thêm"

        if (item.type === 'new') {
            endpoint = NGUONC_CONFIG.ENDPOINTS.new;
        } else if (item.type === 'search') {
            endpoint = `${NGUONC_CONFIG.ENDPOINTS.search}${item.slug}`;
            navType  = 'search';
        } else if (item.type === 'country') {
            endpoint = `${NGUONC_CONFIG.ENDPOINTS.country}${item.slug}`;
            navType  = 'quoc-gia';
        } else {
            endpoint = `${NGUONC_CONFIG.ENDPOINTS.list}${item.slug}`;
        }

        return { title: item.title, endpoint, type: navType, slug: item.slug };
    });

    try {
        // Tất cả API calls song song + đảm bảo skeleton hiện tối thiểu 1 giây
        const [results] = await Promise.all([
            Promise.all(jobs.map(job => fetchNguonC(job.endpoint, 1))),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);

        container.replaceChildren(); // Xóa skeleton

        results.forEach((data, i) => {
            if (!data?.items) return; // Section không có dữ liệu → bỏ qua

            const { title, type, slug } = jobs[i];
            const sectionId  = `section-${i}`;
            const top10      = data.items.slice(0, 10); // Tối đa 10 phim mỗi section

            const sectionHtml = `
    <div class="movie-section mb-3" id="${sectionId}">
      <div class="section-title-wrapper d-flex justify-content-between align-items-center mb-3">
        <h2 class="section-title bungee h4 mb-0 py-2">${title}</h2>
        <div class="d-flex align-items-center gap-3">
          <button onclick="handleViewAll('${type}', '${slug}')"
                  class="btn-view-all btn btn-sm btn-dark d-flex align-items-center border-0 shadow-none">
            Xem thêm
            <i class="ms-1 fa-duotone fa-plus fa-sm"></i>
          </button>
        </div>
      </div>

      <!-- Slider nằm ngang, cuộn ngang, ẩn scrollbar -->
      <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0"
           id="slider-${sectionId}">
        ${top10.map(m => renderMovieCard(m, 'card')).join('')}
      </div>
    </div>`;

            container.insertAdjacentHTML('beforeend', sectionHtml);
        });

        // Kích hoạt lazy-load và kéo chuột trên PC sau khi HTML đã render xong
        setTimeout(() => {
            initLazyLoading();
            if (typeof initDragToScroll === 'function') initDragToScroll();
        }, 100);

    } catch (error) {
        console.error('[VTFilms API] Lỗi loadHomePage:', error);
        container.innerHTML = '<div class="text-center py-5 text-white">Không thể tải dữ liệu, vui lòng thử lại sau.</div>';
    }
}

/**
 * renderHomeSkeleton() — Render skeleton placeholder cho trang chủ (10 section).
 * Gọi ngay lập tức trước khi fetch API để tránh layout trắng.
 */
function renderHomeSkeleton() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    let html = '';
    for (let i = 0; i < 10; i++) {
        html += `
      <div class="movie-section mb-3">
        <div class="section-title-wrapper pb-3">
          <div class="skeleton-item" style="width:200px; height:25px"></div>
          <div class="d-none d-lg-block skeleton-item my-2"
               style="width:160px; height:25px;"></div>
          <div class="d-none d-xl-block skeleton-item"
               style="width:120px; height:25px;"></div>
        </div>
        <div class="d-flex gap-2 overflow-hidden">
          ${Array(7).fill(0).map(() => `
            <div class="skeleton-element" style="flex:1;">
              <div class="skeleton-item skeleton-poster"></div>
              <div class="skeleton-item skeleton-text my-2 mx-auto"></div>
              <div class="skeleton-item skeleton-text short mx-auto"></div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }
    container.innerHTML = html;
}


// ─────────────────────────────────────────────────────────────
// 8. PHIM LIÊN QUAN (trang xem phim)
// ─────────────────────────────────────────────────────────────

/**
 * loadRelatedMovies(currentMovie) — Tải và hiển thị slider phim liên quan.
 * Tìm phim cùng thể loại đầu tiên (category ID "2"), loại bỏ phim đang xem.
 * Hiển thị tối đa 10 phim trong #relatedMoviesContainer.
 *
 * @param {object} currentMovie - Object phim đang xem (từ API chi tiết)
 */
async function loadRelatedMovies(currentMovie) {
    const genres = currentMovie.category?.["2"]?.list;
    if (!genres || genres.length === 0) return; // Không có thể loại → bỏ qua

    const firstGenre = genres[0];
    const genreSlug  = slugify(firstGenre.name);
    const container  = document.getElementById('relatedMoviesContainer');

    try {
        const data = await fetchNguonC(`${NGUONC_CONFIG.ENDPOINTS.category}${genreSlug}`);

        if (data?.items?.length > 0) {
            // Lọc bỏ phim đang xem để không lặp lại trong gợi ý
            const relatedItems = data.items.filter(item => item.slug !== currentMovie.slug);
            if (relatedItems.length === 0) return;

            const limitedItems = relatedItems.slice(0, 10); // Tối đa 10

            container.innerHTML = `
        <div class="related-films-widget bg-dark-custom p-3 rounded-4">
          <div class="section-title-wrapper d-flex justify-content-between align-items-center m-0 p-0">
             <h2 class="section-title m-0 p-0 text-danger fs-6 fw-bold text-uppercase">
                Có thể bạn quan tâm
             </h2>
             <a onclick="navigateToCategory('the-loai', '${genreSlug}')"
                class="text-secondary small text-decoration-none cursor-pointer">
                Xem thêm<i class="fa-duotone fa-angle-right ms-1"></i>
             </a>
          </div>
          
          <!-- Slider phim liên quan -->
          <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0 mt-3 scrollbar-hide">
            ${limitedItems.map(m => renderMovieCard(m, 'card')).join('')}
          </div>
        </div>
      `;

            initLazyLoading();
            if (typeof initDragToScroll === 'function') initDragToScroll();

        } else {
            container.innerHTML = ''; // Không có dữ liệu → ẩn container
        }
    } catch (e) {
        console.error('[VTFilms API] Lỗi loadRelatedMovies:', e);
        container.innerHTML = '';
    }
}


// ─────────────────────────────────────────────────────────────
// 9. handleViewAll — NÚT "XEM THÊM" TRÊN TRANG CHỦ
// ─────────────────────────────────────────────────────────────

/**
 * handleViewAll(type, slug) — Xử lý click nút "Xem thêm" của mỗi section.
 *
 * Logic:
 *   - type === 'search' → Dùng window.location (full reload) vì SPA không hỗ trợ
 *                         tốt keyword tìm kiếm khi back/forward.
 *   - type khác        → SPA mode: pushState + checkRoute() (không reload).
 *
 * @param {string} type - 'cat' | 'quoc-gia' | 'search'
 * @param {string} slug - Slug đích
 */
window.handleViewAll = function(type, slug) {
    // Search: dùng hard reload để URL sạch và back/forward hoạt động đúng
    if (type === 'search') {
        window.location.href = `?search=${encodeURIComponent(slug)}`;
        return;
    }

    // SPA mode cho category và country
    const paramKey = (type === 'quoc-gia') ? 'country' : 'cat';
    const newUrl   = `?${paramKey}=${slug}`;

    window.history.pushState({ type, slug }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hiện spinner tạm thời trong container
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    if (container) {
        container.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-danger"></div></div>';
    }

    checkRoute();
};


// ─────────────────────────────────────────────────────────────
// 10. CHI TIẾT PHIM
// ─────────────────────────────────────────────────────────────

/** currentMovieData — Lưu object phim đang xem (dùng bởi changeServer, playVideo). */
let currentMovieData = null;

/**
 * showMovieDetail(slug) — Tải và render trang chi tiết phim.
 * Luồng:
 *   1. Hiện skeleton loading
 *   2. Fetch chi tiết phim từ API
 *   3. Lưu lịch sử xem (nếu MovieHistoryManager tồn tại)
 *   4. Render HTML đầy đủ (player + info + server list + danh sách tập)
 *   5. Kích hoạt lazy-load + tải phim liên quan
 *
 * @param {string} slug - Slug phim
 */
async function showMovieDetail(slug) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    // ── Skeleton loading chi tiết phim ──
    container.innerHTML = `
    <div class="movie-detail-wrapper">
      <div class="detail-content row g-3">
        <div class="leftPlayerContainer col-xl-9 col-lg-8 col-md-7 col-12">
          <div class="skeleton-item skeleton-player mb-3"></div>
          <div class="rounded-4 bg-dark-custom p-3">
            <div class="skeleton-item skeleton-text w-50 mb-3" style="height:25px;"></div>
            <div class="skeleton-item skeleton-text w-25 mb-4"></div>
            <div class="d-flex gap-2 mb-4">
               <div class="skeleton-item" style="width:60px; height:25px;"></div>
               <div class="skeleton-item" style="width:60px; height:25px;"></div>
               <div class="skeleton-item" style="width:60px; height:25px;"></div>
            </div>
            <div class="skeleton-item skeleton-text w-100"></div>
            <div class="skeleton-item skeleton-text w-100"></div>
            <div class="skeleton-item skeleton-text w-75"></div>
          </div>
        </div>
        
        <div class="rightSidebar_movieDetail col-xl-3 col-lg-4 col-md-5 col-12">
          <div class="skeleton-item skeleton-poster shadow-sm"></div>
          <div class="bg-dark-custom p-3 rounded-4 mb-3">
            <div class="skeleton-item skeleton-text w-75 mb-3" style="height:20px"></div>
            <div class="skeleton-item skeleton-text w-100 mb-2"></div>
            <div class="skeleton-item skeleton-text w-100 mb-2"></div>
            <div class="skeleton-item skeleton-text w-100"></div>
          </div>
          <div class="bg-dark-custom p-3 rounded-4">
             <div class="skeleton-item skeleton-text w-50 mb-3"></div>
             <div class="row g-2">
                ${Array(8).fill('<div class="col-3"><div class="skeleton-item" style="height:35px"></div></div>').join('')}
             </div>
          </div>
        </div>
      </div>
    </div>`;

    // ── Fetch chi tiết phim ──
    const res   = await fetchNguonC(`https://phim.nguonc.com/api/film/${slug}`);
    const movie = res?.movie;
    if (!movie) return; // API không trả về phim → giữ skeleton (không crash)

    currentMovieData = movie;
    updatePageTitle("", movie.name, true); // Tên phim từ API → isRaw=true

    // Helper: lấy tên danh mục theo ID
    const getCat = (id) => movie.category?.[id]?.list.map(i => i.name).join(', ') || 'N/A';

    // ── Lưu lịch sử xem (nếu module MovieHistoryManager đã tải) ──
    if (typeof MovieHistoryManager !== 'undefined') {
        MovieHistoryManager.add({
            slug:      movie.slug,
            name:      movie.name,
            thumb_url: movie.poster_url,
            quality:   movie.quality  || 'HD',
            lang:      movie.language || 'Vietsub',
            category:  getCat("2"),
            url:       window.location.href
        });
    }

    // ── Render HTML chi tiết phim ──
    container.innerHTML = `
    <div class="movie-detail-wrapper">
  <div class="detail-content row g-3">
    <div class='leftPlayerContainer col-xl-9 col-lg-8 col-md-7 col-12'>
      <div id="playerBox" class="rounded-4 shadow-lg mb-3"></div>
      <div class="">
        <div class="rounded-4 text-secondary bg-dark-custom p-3">
          <h1 class="fs-5 text-danger text-uppercase fw-bold mb-2">${movie.name}</h1>
          <h2 class="fs-6 fw-normal text-secondary mb-3">${movie.original_name}</h2>
          <div class='film-description'>
            <div class='mb-3 d-flex flex-wrap gap-1 pt-3'>
              <span class="badge bg-danger fw-normal chat-luong">${movie.quality}</span>
              <span class="badge bg-success fw-normal trang-thai">${movie.current_episode}</span>
              <span class="badge bg-primary fw-normal thoi-luong">${movie.time || 'N/A'}</span>
              <a onclick="shareNative()" class="badge bg-warning text-dark fw-normal"
                 title="Chia sẻ phim">Chia sẻ</a>
            </div>
            <div class='film-meta-descript' style='text-align:justify'>${movie.description}</div>
          </div>
        </div>
      </div>
    </div>

    <div class='rightSidebar_movieDetail col-xl-3 col-lg-4 col-md-5 col-12'>
      <div class="film-thumb mb-3">
        <img class="w-100 rounded-4 shadow lazy-img"
             src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
             data-src="${movie.thumb_url}" />
      </div>

      <div class="movie-full-info p-3 bg-dark-custom rounded-4">
        <h4 class='text-danger fs-6 fw-bold mb-3 text-uppercase'>Thông tin phim</h4>
        <div class="movie-full-info text-secondary">
          <div class="info-item">
            <i class="fa-duotone fa-calendar me-1"></i>
            <span class="fw-bold">Năm</span><span class='mx-0'>•</span>
            <span class='getInfo'>${getCat("3")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-earth-asia me-1"></i>
            <span class="fw-bold">Quốc gia</span><span class='mx-0'>•</span>
            <span class='getInfo'>${getCat("4")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-closed-captioning me-1"></i>
            <span class="fw-bold">Phiên bản</span><span class='mx-0'>•</span>
            <span class='getInfo'>${movie.language}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-tags me-1"></i>
            <span class="fw-bold">Thể loại</span><span class='mx-0'>•</span>
            <span class='getInfo' title='${getCat("2")}'>${getCat("2")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-film me-1"></i>
            <span class="fw-bold">Phân loại</span><span class='mx-0'>•</span>
            <span class='getInfo'>${getCat("1")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-user me-1"></i>
            <span class="fw-bold">Đạo diễn</span><span class='mx-0'>•</span>
            <span class='getInfo'>${movie.director || 'N/A'}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-users me-1"></i>
            <span class="fw-bold">Diễn viên</span><span class='mx-0'>•</span>
            <span class='getInfo' title='${movie.casts || 'N/A'}'>${movie.casts || 'N/A'}</span>
          </div>
        </div>
      </div>

      <!-- Chọn phiên bản (Vietsub, Thuyết minh, ...) -->
      <div class="rounded-4 bg-dark-custom server-selection text-secondary p-3 my-3 fw-bold">
        <div class="p-0 m-0 fs-6 fw-bold text-danger text-uppercase">Phiên bản</div>
        <div class="d-flex gap-2 mt-3" id="serverList">
          ${movie.episodes.map((server, index) => `
            <button class="outline-0 border-0 bg-transparent btn-change-server rounded-4 ${index === 0 ? 'active' : ''}"
                    onclick="changeServer(${index}, this)">
              <img class="w-100 h-100 object-fit-cover lazy-img"
                   src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                   data-src="${movie.poster_url}" />
              <span class="server_name">${server.server_name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Danh sách tập -->
      <div class="rounded-4 episode-selection bg-dark-custom text-secondary p-3">
        <div class="fs-6 fw-bold text-danger text-uppercase">Danh sách Tập</div>
        <div class="episode-list mt-3" id="episodeList"></div>
      </div>

      <!-- Poster lớn -->
      <div class="film-poster mt-3">
        <img class="w-100 rounded-4 shadow lazy-img"
             src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
             data-src="${movie.poster_url}" />
      </div>
    </div>
  </div>

    <!-- Container phim liên quan (được điền bởi loadRelatedMovies) -->
    <div id="relatedMoviesContainer" class="mt-3"></div>
</div>`;

    // Kích hoạt server đầu tiên (cũng tự động chọn tập theo URL nếu có ?tap=N)
    changeServer(0);
    initLazyLoading();
    loadRelatedMovies(movie);
}


/**
 * changeServer(serverIndex, el) — Chuyển đổi phiên bản phim (Vietsub / Thuyết minh / ...).
 * Render lại danh sách tập tương ứng với server đã chọn.
 * Tự động chọn đúng tập từ URL (?tap=N) hoặc mặc định tập 1.
 *
 * @param {number}      serverIndex - Index server trong mảng episodes
 * @param {HTMLElement} el          - Nút server được click (để cập nhật class active)
 */
function changeServer(serverIndex, el) {
    if (!currentMovieData || !currentMovieData.episodes[serverIndex]) return;

    // Cập nhật class active trên nút server
    if (el) {
        document.querySelectorAll('#serverList button').forEach(btn => btn.classList.remove('active'));
        el.classList.add('active');
    }

    const episodes         = currentMovieData.episodes[serverIndex].items;
    const episodeContainer = document.getElementById('episodeList');
    const isSingleEpisode  = episodes.length <= 1;

    // Layout khác nhau cho phim lẻ vs phim bộ
    if (isSingleEpisode) {
        episodeContainer.classList.add('single-episode-layout');
        episodeContainer.classList.remove('grid-episode-layout');
        episodeContainer.style.display = 'block';
    } else {
        episodeContainer.classList.add('grid-episode-layout');
        episodeContainer.classList.remove('single-episode-layout');
    }

    // Render các nút chọn tập
    episodeContainer.innerHTML = episodes.map((ep, i) => {
        const extraClass = isSingleEpisode ? 'px-4 py-2 w-auto' : '';
        return `
      <button class="btn btn-outline-danger btn-episode ${extraClass}"
              id="ep-${i}"
              onclick="window.scrollTo({top:0, behavior:'smooth'}); playVideo('${ep.embed}', this)">
          ${ep.name}
      </button>`;
    }).join('');

    // Chọn đúng tập từ URL (?tap=N) hoặc mặc định tập đầu
    if (episodes.length > 0) {
        const urlParams  = new URLSearchParams(window.location.search);
        const targetTap  = urlParams.get('tap');
        const allButtons = episodeContainer.querySelectorAll('.btn-episode');

        // Tìm nút có tên tập khớp với URL
        let targetButton = Array.from(allButtons).find(btn => btn.innerText.trim() === targetTap);
        if (!targetButton) targetButton = document.getElementById('ep-0'); // Fallback: tập 1

        if (targetButton) {
            const btnIndex    = targetButton.id.replace('ep-', '');
            const correctEmbed = episodes[btnIndex].embed;
            playVideo(correctEmbed, targetButton);
            // Không scrollIntoView để tránh tự động cuộn xuống khi mới vào trang
        }
    }
}


/**
 * playVideo(url, el) — Load URL embed vào #playerBox và cập nhật URL với ?tap=N.
 * Dùng replaceState (không pushState) để không làm rối lịch sử trình duyệt.
 *
 * @param {string}      url - URL embed của tập phim
 * @param {HTMLElement} el  - Nút tập được click (để cập nhật class active + lấy tên tập)
 */
function playVideo(url, el) {
    const box = document.getElementById('playerBox');
    if (box) box.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;

    if (el) {
        // Cập nhật class active trên danh sách tập
        document.querySelectorAll('.btn-episode').forEach(b => b.classList.remove('active'));
        el.classList.add('active');

        // Cập nhật ?tap=N trên URL (replaceState để không push vào lịch sử)
        const episode   = el.innerText.trim();
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('tap') !== episode) {
            urlParams.set('tap', episode);
            const newUrl = window.location.pathname + '?' + urlParams.toString();
            window.history.replaceState({ episode }, '', newUrl);
        }
    }
}


// ─────────────────────────────────────────────────────────────
// 11. KHỞI CHẠY
// ─────────────────────────────────────────────────────────────

/**
 * initDynamicMenu() — Render động menu Thể loại và Quốc gia từ MOVIE_MENU_DATA.
 * Gọi 1 lần duy nhất khi trang load xong.
 * Mục tiêu: không hardcode HTML menu, chỉ cần sửa MOVIE_MENU_DATA để cập nhật.
 */
function initDynamicMenu() {
    const genreMenu   = document.getElementById('menu-the-loai');
    const countryMenu = document.getElementById('menu-quoc-gia');

    if (genreMenu) {
        genreMenu.innerHTML = MOVIE_MENU_DATA.genres.map(name =>
            `<li><a class="dropdown-item rounded" href="javascript:void(0)"
                    onclick="navigateToCategory('the-loai', '${slugify(name)}')">${name}</a></li>`
        ).join('');
    }

    if (countryMenu) {
        countryMenu.innerHTML = MOVIE_MENU_DATA.countries.map(name =>
            `<li><a class="dropdown-item rounded" href="javascript:void(0)"
                    onclick="navigateToCategory('quoc-gia', '${slugify(name)}')">${name}</a></li>`
        ).join('');
    }
}

/**
 * DOMContentLoaded — Entry point khởi chạy toàn bộ ứng dụng.
 * Thứ tự: render menu → check route → gắn event listener tìm kiếm + đóng menu mobile.
 */
document.addEventListener('DOMContentLoaded', () => {
    initDynamicMenu(); // Render menu nav động
    checkRoute();      // Xác định trang cần hiện dựa trên URL hiện tại

    // Gắn event tìm kiếm
    const sInput = document.getElementById('searchInput');
    const sBtn   = document.getElementById('searchBtn');
    if (sInput && sBtn) {
        sBtn.onclick         = () => triggerSearch();
        sInput.onkeyup       = (e) => { if (e.key === 'Enter') triggerSearch(); };
    }

    // Đóng menu mobile khi click ra ngoài (Bootstrap 5)
    document.addEventListener('click', function(event) {
        const navbarCollapse = document.getElementById('movieNavbar');
        const navbarToggler  = document.querySelector('.navbar-toggler');

        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            if (
                !navbarCollapse.contains(event.target) &&
                !navbarToggler.contains(event.target)
            ) {
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                } else {
                    // Fallback nếu instance Bootstrap chưa khởi tạo
                    new bootstrap.Collapse(navbarCollapse).hide();
                }
            }
        }
    });
});

/**
 * refreshHome() — Reset toàn bộ UI về trang chủ.
 * Gọi khi user click logo hoặc nút "Trang chủ".
 * Thực hiện: xóa query URL → reset title → scroll lên → xóa search → đóng menu → load home.
 */
function refreshHome() {
    // Xóa query string, giữ lại pathname (SPA mode)
    window.history.pushState({}, '', window.location.pathname);

    document.title = "VT Films";
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset ô tìm kiếm
    const searchInput = document.querySelector('#searchInput') || document.querySelector('input[name="q"]');
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
    }

    // Đóng menu mobile nếu đang mở
    const navbarCollapse = document.querySelector('.navbar-collapse.show');
    if (navbarCollapse) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) {
            bsCollapse.hide();
        } else {
            navbarCollapse.classList.remove('show'); // Fallback
        }
    }

    // Load lại dữ liệu trang chủ
    if (typeof loadHomePage === 'function') loadHomePage();
}


// ============================================================
// End · VT Films · films.vutruong.vn
// ============================================================
