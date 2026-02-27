// ============================================================
// vtfilms-api.js — VT Films · Logic lấy & hiển thị dữ liệu phim
// Nguồn API : phim.nguonc.com
// Website   : films.vutruong.vn
// Version   : 2.0
// ============================================================
//
// MỤC LỤC
//   0.  Lazy Load ảnh (IntersectionObserver)
//   1.  Hằng số & cấu hình toàn cục
//   2.  Fetch Queue (rate limiting — chống bị block API)
//   3.  API Cache (sessionStorage, TTL 5 phút)
//   4.  fetchNguonC — fetch với cache + retry + abort
//   5.  Tiện ích (slugify, getDisplayName, updateURL, updatePageTitle)
//   6.  Render card phim & skeleton
//   7.  Điều hướng SPA (triggerSearch, navigateToMovie, navigateToCategory)
//   8.  Infinite Scroll (loadMoreMovies, updateBottomLoader)
//   9.  Router (checkRoute, setupInfinitePage)
//  10.  Trang chủ — lazy section loading (loadHomePage, loadHomeSection)
//  11.  Phim liên quan (loadRelatedMovies)
//  12.  handleViewAll
//  13.  Chi tiết phim (showMovieDetail, changeServer, playVideo)
//  14.  Khởi chạy (initDynamicMenu, DOMContentLoaded, refreshHome)
// ============================================================
//
// CHANGELOG
//   v1.x  Logic gốc: Promise.all song song toàn bộ section → server block
//   v2.0  ── TỔNG TỐI ƯU ──
//         [FIX] Rate limiting: FetchQueue (tối đa 3 concurrent, 220ms/request)
//               → Ngăn bị block API do burst request đồng loạt
//         [NEW] API Cache: sessionStorage TTL 5 phút
//               → Không re-fetch khi navigate back/forward
//               → Mỗi endpoint chỉ cần 1 request/5 phút
//         [NEW] Retry logic: tự động thử lại tối đa 2 lần khi 429/503
//               với exponential backoff (1s → 2s)
//         [NEW] AbortController: hủy request cũ khi user navigate đi
//               → Không còn race condition, không lãng phí bandwidth
//         [NEW] Trang chủ lazy sections: hiện 3 section đầu ngay lập tức
//               → IntersectionObserver tự động load thêm từng section khi scroll
//               → Delay 300ms giữa mỗi section: không burst, có hiệu ứng mượt
//         [NEW] setupInfinitePage: skeleton delay 600ms trước khi render
//               → Trải nghiệm thị giác tốt hơn, giảm flash trắng
//         [NEW] Search debounce 400ms → không fire request mỗi lần gõ phím
//         [FIX] renderHomeSkeleton: chỉ render 3 skeleton (khớp với lazy load)
//         [OPT] getDisplayName: cache allItems vào biến module (không tạo mới mỗi lần)
//         [OPT] Xóa hằng số không dùng: prefix parameter trong updatePageTitle
//         [OPT] initLazyLoading: single shared IntersectionObserver thay vì
//               tạo mới mỗi lần gọi
//   v2.1  ── CHAIN LAZY LOADING ──
//         [FIX] loadHomePage: CHAIN PATTERN thay vì observe tất cả sentinel cùng lúc
//               Trước (v2.0): observe 15 sentinel → scroll nhanh → trigger nhiều section
//               Sau  (v2.1): chỉ observe đúng 1 sentinel tại 1 thời điểm
//               → Load xong section i → chuyển observe sang section i+1
//               → Tuyệt đối không bao giờ load >1 section cùng lúc
//               → Scroll đến đáy trang: vẫn tuần tự từng section +1
//         [FIX] loadHomeSection: outerHTML → innerHTML để giữ element reference
//               outerHTML destroy element → _homeObserver mất tham chiếu → chain đứt
//         [OPT] rootMargin 400px → 200px: không đón đầu quá sớm
//         [OPT] Placeholder sections: không render skeleton DOM cho section chưa cần
//               → skeleton chỉ render khi sắp load (tiết kiệm DOM nodes ban đầu)
//         [OPT] window._homeObserver (thay let _lazyHomeObserver) → persist qua lần gọi
// ============================================================
(function() {
    const allowed = ['films.vutruong.vn', 'localhost', '127.0.0.1'];
    const host    = location.hostname;
    if (!allowed.includes(host)) {
        console.error('[VTFilms] Unauthorized domain:', host);
        document.body.innerHTML = '';
        throw new Error('Unauthorized');
    }
})();
// ─────────────────────────────────────────────────────────────
// 0. LAZY LOAD ẢNH
//    Dùng 1 IntersectionObserver dùng chung toàn app (không tạo mới mỗi lần).
//    Ảnh cần: class="lazy-img" + data-src="url".
//    Sau load: thêm class "loaded", xóa "lazy-img".
// ─────────────────────────────────────────────────────────────

let _lazyObserver = null;

function initLazyLoading() {
    // Khởi tạo observer một lần duy nhất, tái sử dụng cho các lần gọi sau
    if (!_lazyObserver) {
        _lazyObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img     = entry.target;
                const realSrc = img.getAttribute('data-src');
                if (realSrc) {
                    img.src = realSrc;
                    img.removeAttribute('data-src');
                    img.onload = () => {
                        img.classList.add('loaded');
                        img.classList.remove('lazy-img');
                    };
                }
                observer.unobserve(img);
            });
        }, {
            rootMargin: '200px 0px', // Bắt đầu load trước 200px
            threshold:  0.01
        });
    }

    // Chỉ observe các ảnh chưa được load (còn class lazy-img)
    document.querySelectorAll('.lazy-img').forEach(img => _lazyObserver.observe(img));
}


// ─────────────────────────────────────────────────────────────
// 1. HẰNG SỐ & CẤU HÌNH TOÀN CỤC
// ─────────────────────────────────────────────────────────────

const NGUONC_CONFIG = {
    BASE_API:     'https://phim.nguonc.com/api/films',
    DETAIL_API:   'https://phim.nguonc.com/api/film/',
    ENDPOINTS: {
        new:      '/phim-moi-cap-nhat',
        list:     '/danh-sach/',
        category: '/the-loai/',
        country:  '/quoc-gia/',
        search:   '/search?keyword='
    },
    CONTAINER_ID:  'movieList',
    DEFAULT_TITLE: 'VT Films',

    // Rate limiting
    MAX_CONCURRENT:     3,    // Tối đa 3 request chạy cùng lúc
    MIN_DELAY_MS:       220,  // Delay tối thiểu giữa các request (ms)

    // Cache
    CACHE_TTL_MS:       5 * 60 * 1000,  // 5 phút

    // UX
    HOME_INITIAL_COUNT: 3,    // Số section hiển thị ngay khi load trang chủ
    HOME_SECTION_DELAY: 1000, // Delay trước khi load từng section khi cuộn (ms)
    SKELETON_DELAY_MS:  600,  // Delay skeleton cho trang category/country/search (ms)

    // Retry
    MAX_RETRIES:        2,
    RETRY_BACKOFF_MS:   1000, // 1s → 2s (exponential)
};

const MOVIE_MENU_DATA = {
    genres: [
        'Hành Động', 'Phiêu Lưu', 'Hoạt Hình', 'Hài', 'Hình Sự',
        'Tài Liệu', 'Chính Kịch', 'Gia Đình', 'Giả Tưởng', 'Lịch Sử',
        'Kinh Dị', 'Phim Nhạc', 'Bí Ẩn', 'Lãng Mạn', 'Khoa Học Viễn Tưởng',
        'Gây Cấn', 'Chiến Tranh', 'Tâm Lý', 'Tình Cảm', 'Cổ Trang',
        'Miền Tây', 'Phim 18+'
    ],
    countries: [
        'Âu Mỹ', 'Anh', 'Trung Quốc', 'Indonesia', 'Việt Nam',
        'Pháp', 'Hồng Kông', 'Hàn Quốc', 'Nhật Bản', 'Thái Lan',
        'Đài Loan', 'Nga', 'Hà Lan', 'Philippines', 'Ấn Độ', 'Quốc gia khác'
    ]
};

// Cache nội bộ cho getDisplayName (tính 1 lần, tái sử dụng)
const _ALL_MENU_ITEMS = [
    ...MOVIE_MENU_DATA.genres,
    ...MOVIE_MENU_DATA.countries,
    'Phim Lẻ', 'Phim Bộ', 'Phim Mới'
];

// Trạng thái phân trang cho infinite scroll
const PAGING_STATE = {
    currentPage:      1,
    isLoading:        false,
    hasMore:          true,
    currentEndpoint:  '',
    isInfiniteMode:   false
};


// ─────────────────────────────────────────────────────────────
// 2. FETCH QUEUE — Rate Limiting
//    Vấn đề: 18 request đồng loạt → server block tạm thời.
//    Giải pháp: queue với tối đa MAX_CONCURRENT request song song,
//    delay tối thiểu MIN_DELAY_MS giữa các request.
//
//    Cơ chế:
//      enqueue(fn) → đưa vào hàng đợi, trả về Promise
//      _processQueue() → chạy job tiếp theo nếu còn slot trống
//      Sau mỗi job: delay MIN_DELAY_MS → giải phóng slot → chạy tiếp
// ─────────────────────────────────────────────────────────────

const FetchQueue = (() => {
    const queue   = [];        // Hàng đợi job chờ
    let   running = 0;         // Số job đang chạy hiện tại

    function _processQueue() {
        // Không làm gì nếu hết chỗ hoặc hàng đợi rỗng
        if (running >= NGUONC_CONFIG.MAX_CONCURRENT || queue.length === 0) return;

        running++;
        const { fn, resolve, reject } = queue.shift();

        fn()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                // Sau khi job xong: chờ delay rồi mới nhường slot
                setTimeout(() => {
                    running--;
                    _processQueue(); // Gọi job tiếp theo
                }, NGUONC_CONFIG.MIN_DELAY_MS);
            });

        // Tiếp tục khai thác các slot còn trống (nếu có)
        _processQueue();
    }

    return {
        /**
         * enqueue(fn) — Đưa async function vào queue.
         * @param {Function} fn - async function cần chạy
         * @returns {Promise} - resolve/reject khi fn hoàn thành
         */
        enqueue(fn) {
            return new Promise((resolve, reject) => {
                queue.push({ fn, resolve, reject });
                _processQueue();
            });
        },

        /** Số job đang chờ trong queue */
        get queueLength() { return queue.length; }
    };
})();


// ─────────────────────────────────────────────────────────────
// 3. API CACHE — sessionStorage, TTL 5 phút
//    Tránh re-fetch khi user navigate back/forward hoặc
//    xem lại cùng trang trong 1 phiên.
//
//    Key: URL đầy đủ của request
//    Value: { data: object, ts: timestamp }
//    TTL: CACHE_TTL_MS (default 5 phút)
// ─────────────────────────────────────────────────────────────

const ApiCache = (() => {
    const PREFIX = 'vtf_cache_';

    return {
        /**
         * get(url) — Lấy cache nếu còn hiệu lực.
         * @returns {object|null} — data hoặc null nếu miss/hết TTL
         */
        get(url) {
            try {
                const raw = sessionStorage.getItem(PREFIX + url);
                if (!raw) return null;
                const { data, ts } = JSON.parse(raw);
                if (Date.now() - ts > NGUONC_CONFIG.CACHE_TTL_MS) {
                    sessionStorage.removeItem(PREFIX + url); // Xóa expired
                    return null;
                }
                return data;
            } catch {
                return null;
            }
        },

        /**
         * set(url, data) — Lưu vào cache.
         * Bỏ qua lỗi QuotaExceeded (không crash vì đầy storage).
         */
        set(url, data) {
            try {
                sessionStorage.setItem(PREFIX + url, JSON.stringify({ data, ts: Date.now() }));
            } catch {
                // QuotaExceededError → bỏ qua, không ảnh hưởng chức năng
            }
        },

        /** Xóa toàn bộ cache VTFilms (khi user refresh thủ công) */
        clear() {
            Object.keys(sessionStorage)
                .filter(k => k.startsWith(PREFIX))
                .forEach(k => sessionStorage.removeItem(k));
        }
    };
})();


// ─────────────────────────────────────────────────────────────
// 4. fetchNguonC — Fetch với Cache + Rate Limiting + Retry
//    Thứ tự xử lý:
//      1. Kiểm tra cache → trả về ngay nếu còn hiệu lực
//      2. Đưa vào FetchQueue (chống burst)
//      3. Bên trong queue: fetch với AbortController
//      4. Nếu 429/503: exponential backoff retry (tối đa MAX_RETRIES)
//      5. Lưu kết quả vào cache
//      6. Trả về null nếu lỗi (không throw)
//
//    AbortController: _currentAbortController được reset mỗi khi checkRoute()
//    gọi _resetAbortController() → hủy mọi fetch cũ khi user navigate đi.
// ─────────────────────────────────────────────────────────────

let _currentAbortController = new AbortController();

/** Reset abort controller — gọi trước mỗi navigation mới */
function _resetAbortController() {
    _currentAbortController.abort(); // Hủy tất cả request đang chạy
    _currentAbortController = new AbortController();
}

/**
 * fetchNguonC(endpoint, page) — Fetch dữ liệu từ API với đầy đủ bảo vệ.
 *
 * @param {string}      endpoint  - Path API hoặc URL đầy đủ
 * @param {number|null} page      - Số trang (null = không thêm ?page=N)
 * @param {boolean}     useQueue  - false = bypass queue (dùng cho fetch quan trọng, vd: chi tiết phim)
 * @returns {Promise<object|null>}
 */
async function fetchNguonC(endpoint, page = null, useQueue = true) {
    // Xây dựng URL đầy đủ
    let url = endpoint.startsWith('http')
        ? endpoint
        : `${NGUONC_CONFIG.BASE_API}${endpoint}`;
    if (page !== null) {
        url += (url.includes('?') ? '&' : '?') + `page=${page}`;
    }

    // 1. Cache hit → trả về ngay, không tốn request
    const cached = ApiCache.get(url);
    if (cached) return cached;

    // 2. Hàm fetch thực sự (có retry)
    const doFetch = async () => {
        const signal = _currentAbortController.signal;
        let lastError;

        for (let attempt = 0; attempt <= NGUONC_CONFIG.MAX_RETRIES; attempt++) {
            if (signal.aborted) return null; // Navigation mới → bỏ

            try {
                if (attempt > 0) {
                    // Exponential backoff: 1s, 2s
                    await new Promise(r => setTimeout(r, NGUONC_CONFIG.RETRY_BACKOFF_MS * attempt));
                }

                const res = await fetch(url, { signal });

                // Rate limited hoặc server quá tải → retry
                if (res.status === 429 || res.status === 503) {
                    lastError = new Error(`HTTP ${res.status}`);
                    continue; // Thử lại
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                ApiCache.set(url, data); // Lưu vào cache
                return data;

            } catch (err) {
                if (err.name === 'AbortError') return null; // Navigation → bỏ yên lặng
                lastError = err;
            }
        }

        console.error('[VTFilms API] fetchNguonC thất bại sau retry:', url, lastError?.message);
        return null;
    };

    // 3. Chạy qua queue hoặc trực tiếp
    return useQueue ? FetchQueue.enqueue(doFetch) : doFetch();
}


// ─────────────────────────────────────────────────────────────
// 5. TIỆN ÍCH
// ─────────────────────────────────────────────────────────────

/**
 * getDisplayName(slug) — slug → tên hiển thị có dấu.
 * Dùng _ALL_MENU_ITEMS đã cache thay vì tạo mảng mới mỗi lần.
 */
function getDisplayName(slug) {
    const found = _ALL_MENU_ITEMS.find(item => slugify(item) === slug);
    if (found) return found;
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * slugify(text) — Tiếng Việt → slug URL-safe.
 * Ví dụ: "Hành Động" → "hanh-dong"
 */
function slugify(text) {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

/**
 * updatePageTitle(content, isRaw) — Cập nhật <title> tab.
 * @param {string}  content - Slug hoặc tên thô từ API
 * @param {boolean} isRaw   - true: giữ nguyên (tên phim); false: tra cứu getDisplayName
 */
function updatePageTitle(content = '', isRaw = false) {
    if (!content) { document.title = NGUONC_CONFIG.DEFAULT_TITLE; return; }
    document.title = isRaw ? content : getDisplayName(content);
}

/**
 * updateURL(params) — Cập nhật query string không reload (SPA).
 */
function updateURL(params = {}) {
    const url = new URL(window.location.href);
    url.search = '';
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    window.history.pushState({}, '', url);
}

// Back/Forward trình duyệt → re-render đúng route
window.onpopstate = () => checkRoute();

// Debounce helper — tránh fire event liên tục (vd: search mỗi keystroke)
function _debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}


// ─────────────────────────────────────────────────────────────
// 6. RENDER CARD PHIM & SKELETON
// ─────────────────────────────────────────────────────────────

/** Placeholder GIF 1×1 trong suốt (dùng cho lazy-img) */
const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * renderMovieCard(movie, mode) — HTML card cho 1 phim.
 * @param {object} movie
 * @param {'grid'|'card'} mode
 */
function renderMovieCard(movie, mode = 'grid') {
    const colClass = mode === 'grid' ? 'col' : 'movie-card-item';
    return `
    <div class="${colClass}">
      <div class="movie-item" title="${movie.name}"
           onclick="navigateToMovie('${movie.slug}')" style="cursor:pointer">
        <div class="poster-wrapper">
          <i class="fa-duotone fa-play play-overlay"></i>
          <img data-src="${movie.thumb_url}" src="${BLANK_GIF}"
               class="poster-img lazy-img" alt="${movie.name}">
          <div class="movie-badge position-absolute d-none d-md-block">
            <span class="text-warning fw-bold">${movie.quality || 'HD'}</span>
            <span class="text-white ms-1 border-start ps-2 border-secondary">${movie.language || 'Vietsub'}</span>
          </div>
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

/**
 * renderGridSkeleton(count) — N ô skeleton cho lưới phim.
 * @param {number} count
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
    </div>`).join('');
}

/**
 * renderSectionSkeleton() — Skeleton placeholder cho 1 section trang chủ.
 */
function renderSectionSkeleton() {
    // Trả về INNER content (không có outer .movie-section wrapper).
    // Wrapper là chính element home-section-{i} với class movie-section.
    return `
      <div class="section-title-wrapper pb-3">
        <div class="skeleton-item" style="width:200px; height:25px"></div>
      </div>
      <div class="d-flex gap-2 overflow-hidden">
        ${Array(7).fill(0).map(() => `
          <div class="skeleton-element" style="flex:1;">
            <div class="skeleton-item skeleton-poster"></div>
            <div class="skeleton-item skeleton-text my-2 mx-auto"></div>
            <div class="skeleton-item skeleton-text short mx-auto"></div>
          </div>`).join('')}
      </div>`;
}


// ─────────────────────────────────────────────────────────────
// 7. ĐIỀU HƯỚNG SPA
// ─────────────────────────────────────────────────────────────

function triggerSearch() {
    const sInput  = document.getElementById('searchInput');
    const keyword = sInput ? sInput.value.trim() : '';
    if (keyword.length > 1) {
        updateURL({ search: keyword });
        checkRoute();
        sInput.blur();
    }
}

function navigateToMovie(slug) {
    updateURL({ watch: slug });
    showMovieDetail(slug);
}

function navigateToCategory(type, slug) {
    let params = {};
    if (type === 'quoc-gia')      params.country = slug;
    else if (type === 'the-loai') params.type    = slug;
    else                           params.cat     = slug || type;
    updateURL(params);
    checkRoute();

    const navbarCollapse = document.getElementById('movieNavbar');
    if (navbarCollapse?.classList.contains('show')) {
        bootstrap.Collapse.getInstance(navbarCollapse)?.hide();
    }
}


// ─────────────────────────────────────────────────────────────
// 8. INFINITE SCROLL
// ─────────────────────────────────────────────────────────────

/**
 * loadMoreMovies(isFirstLoad) — Tải 1 trang phim, append vào lưới.
 * Dùng FetchQueue nên tự động được rate-limit.
 */
async function loadMoreMovies(isFirstLoad = false) {
    if (PAGING_STATE.isLoading || !PAGING_STATE.hasMore) return;
    PAGING_STATE.isLoading = true;

    const btnLoadMore = document.getElementById('btnLoadMore');
    if (btnLoadMore) btnLoadMore.style.display = 'none';

    updateBottomLoader(true);

    try {
        // Chạy song song: fetch (qua queue) + delay tối thiểu 500ms
        const [data] = await Promise.all([
            fetchNguonC(PAGING_STATE.currentEndpoint, PAGING_STATE.currentPage),
            new Promise(r => setTimeout(r, 500))
        ]);

        const grid = document.querySelector('.movie-grid-row');

        if (grid && data?.items?.length > 0) {
            const html = data.items.map(m => renderMovieCard(m, 'grid')).join('');
            if (isFirstLoad) grid.innerHTML = html;
            else             grid.insertAdjacentHTML('beforeend', html);

            PAGING_STATE.currentPage++;
            PAGING_STATE.hasMore = PAGING_STATE.currentPage <= (data.paginate?.total_page || 1);
        } else {
            if (isFirstLoad && grid) {
                grid.innerHTML = '<div class="text-danger text-center py-5 w-100">Không tìm thấy phim nào.</div>';
            }
            PAGING_STATE.hasMore = false;
        }

    } catch (err) {
        console.error('[VTFilms API] Lỗi loadMoreMovies:', err);
    } finally {
        PAGING_STATE.isLoading = false;
        updateBottomLoader(false, PAGING_STATE.hasMore ? '' : 'Không còn kết quả nào khác.');
        initLazyLoading();
        if (btnLoadMore && PAGING_STATE.hasMore) btnLoadMore.style.display = 'inline-block';
    }
}

/**
 * updateBottomLoader(show, msg) — Điều khiển skeleton / thông báo cuối trang.
 */
function updateBottomLoader(show, msg = '') {
    const loader = document.getElementById('bottom-loader');
    if (!loader) return;
    if (show) {
        loader.innerHTML = `
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 g-2 mt-1 text-start">
          ${renderGridSkeleton(12)}
      </div>`;
    } else {
        loader.innerHTML = msg
            ? `<div class="py-4 text-center text-secondary fw-bold">${msg}</div>`
            : '';
    }
}


// ─────────────────────────────────────────────────────────────
// 9. ROUTER & INFINITE PAGE
// ─────────────────────────────────────────────────────────────

/**
 * checkRoute() — Router SPA trung tâm.
 * Ưu tiên: ?watch → ?search → ?type → ?country → ?cat → home
 */
async function checkRoute() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    if (!container) return;

    // Hủy tất cả fetch đang chạy từ route cũ
    _resetAbortController();

    const urlParams = new URLSearchParams(window.location.search);
    container.innerHTML = '';
    PAGING_STATE.isInfiniteMode = false;
    window.scrollTo(0, 0);

    if (urlParams.has('watch')) {
        showMovieDetail(urlParams.get('watch'));

    } else if (urlParams.has('search')) {
        const key = urlParams.get('search');
        updatePageTitle(key, true);
        setupInfinitePage(
            `<i class="fa-duotone fa-search me-2"></i>Tìm kiếm: ${key}`,
            `${NGUONC_CONFIG.ENDPOINTS.search}${key}`
        );

    } else if (urlParams.has('type')) {
        const slug = urlParams.get('type');
        updatePageTitle(slug);
        setupInfinitePage(
            `<i class="fa-duotone fa-tags me-2"></i>Thể loại: ${getDisplayName(slug)}`,
            `${NGUONC_CONFIG.ENDPOINTS.category}${slug}`
        );

    } else if (urlParams.has('country')) {
        const slug = urlParams.get('country');
        updatePageTitle(slug);
        setupInfinitePage(
            `<i class="fa-duotone fa-earth-asia me-2"></i>Quốc gia: ${getDisplayName(slug)}`,
            `${NGUONC_CONFIG.ENDPOINTS.country}${slug}`
        );

    } else if (urlParams.has('cat')) {
        const slug     = urlParams.get('cat');
        const endpoint = (slug === 'new')
            ? NGUONC_CONFIG.ENDPOINTS.new
            : `${NGUONC_CONFIG.ENDPOINTS.list}${slug}`;
        updatePageTitle(slug);
        setupInfinitePage(
            `<i class="fa-duotone fa-tags me-2"></i>${getDisplayName(slug)}`,
            endpoint
        );

    } else {
        updatePageTitle('');
        loadHomePage();
    }
}

/**
 * setupInfinitePage(title, endpoint) — Chuẩn bị trang infinite scroll.
 *
 * [v2.0] Thêm skeleton delay SKELETON_DELAY_MS trước khi fetch,
 *        tạo trải nghiệm thị giác mượt mà hơn.
 */
async function setupInfinitePage(title, endpoint) {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    PAGING_STATE.isInfiniteMode  = true;
    PAGING_STATE.currentPage     = 1;
    PAGING_STATE.hasMore         = true;
    PAGING_STATE.currentEndpoint = endpoint;

    // Render skeleton ngay lập tức (không flash trắng)
    container.innerHTML = `
    <div class="infinite-wrapper">
      <h2 class="section-title mb-3 text-danger">${title}</h2>
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 g-2 movie-grid-row">
          ${renderGridSkeleton(12)}
      </div>
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

    // Delay skeleton (hiệu ứng thị giác + giảm flash nội dung)
    await new Promise(r => setTimeout(r, NGUONC_CONFIG.SKELETON_DELAY_MS));

    // Load trang đầu tiên
    await loadMoreMovies(true);

    // Thiết lập sentinel observer cho auto-load khi cuộn
    if (window.movieObserver) window.movieObserver.disconnect();
    const sentinel = document.getElementById('infinite-sentinel');
    if (sentinel) {
        window.movieObserver = new IntersectionObserver(entries => {
            if (
                entries[0].isIntersecting &&
                PAGING_STATE.isInfiniteMode &&
                !PAGING_STATE.isLoading &&
                PAGING_STATE.hasMore
            ) {
                loadMoreMovies();
            }
        }, { rootMargin: '500px' });
        window.movieObserver.observe(sentinel);
    }
}


// ─────────────────────────────────────────────────────────────
// 10. TRANG CHỦ — LAZY SECTION LOADING
//
//  [v2.0] Kiến trúc mới:
//
//    TRƯỚC (v1.x):
//      Promise.all(18 requests đồng thời) → server block
//
//    SAU (v2.0):
//      1. Render 3 skeleton ngay lập tức (HOME_INITIAL_COUNT)
//      2. Load 3 section đầu qua FetchQueue (có rate-limit, cache)
//      3. Render sentinel placeholder cho 15 section còn lại
//      4. IntersectionObserver: khi sentinel sắp vào viewport
//         → load section đó + delay HOME_SECTION_DELAY ms
//      5. Mỗi section lazy: hiện skeleton → fetch → replace bằng nội dung thật
//
//  Lợi ích:
//    - Không bao giờ gửi >3 request đồng thời (FetchQueue)
//    - 15 section cuối không request nếu user không cuộn → tiết kiệm tài nguyên
//    - Delay 300ms giữa sections: không burst, có hiệu ứng stagger đẹp
//    - Cache: navigate back → không re-fetch
// ─────────────────────────────────────────────────────────────

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
 * _buildSectionJob(item) — Chuyển section config → { title, endpoint, navType, slug }.
 */
function _buildSectionJob(item) {
    let endpoint, navType = 'cat';
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
    return { title: item.title, endpoint, navType, slug: item.slug };
}

/**
 * _renderSectionHTML(job, data) — Render HTML hoàn chỉnh cho 1 section.
 */
function _renderSectionHTML(job, data) {
    // Trả về INNER content (không có outer .movie-section wrapper).
    // Wrapper là chính element home-section-{i} với class movie-section.
    const top10 = data.items.slice(0, 10);
    return `
      <div class="section-title-wrapper d-flex justify-content-between align-items-center mb-3">
        <h2 class="section-title bungee h4 mb-0 py-2">${job.title}</h2>
        <button onclick="handleViewAll('${job.navType}', '${job.slug}')"
                class="btn-view-all btn btn-sm btn-dark d-flex align-items-center border-0 shadow-none">
          Xem thêm <i class="ms-1 fa-duotone fa-plus fa-sm"></i>
        </button>
      </div>
      <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0">
        ${top10.map(m => renderMovieCard(m, 'card')).join('')}
      </div>`;
}

/**
 * loadHomeSection(index, containerEl) — Load và render 1 section trang chủ.
 * Thay thế skeleton placeholder bằng nội dung thật.
 *
 * @param {number}      index       - Index trong HOME_SECTIONS_LIST
 * @param {HTMLElement} containerEl - Element placeholder (id="home-section-{index}")
 */
async function loadHomeSection(index, containerEl) {
    const item = HOME_SECTIONS_LIST[index];
    if (!item || containerEl.dataset.loaded === '1') return;
    containerEl.dataset.loaded = '1'; // Guard: không load lại

    const job  = _buildSectionJob(item);
    const data = await fetchNguonC(job.endpoint, 1);

    if (!data?.items?.length) {
        containerEl.innerHTML = ''; // Không có phim → ẩn section
        return;
    }

    // Fade out skeleton → render nội dung thật → fade in
    // QUAN TRỌNG: Dùng innerHTML thay vì outerHTML để giữ nguyên element reference.
    // outerHTML sẽ destroy element → IntersectionObserver chain bị mất tham chiếu.
    containerEl.style.transition = 'opacity .25s ease';
    containerEl.style.opacity    = '0';

    await new Promise(r => setTimeout(r, 260)); // Chờ fade out

    containerEl.innerHTML = _renderSectionHTML(job, data);
    containerEl.style.opacity = '1'; // Fade in

    initLazyLoading();
    if (typeof initDragToScroll === 'function') initDragToScroll();
}

/**
 * loadHomePage() — Tải trang chủ với lazy section loading theo chuỗi.
 *
 * Luồng:
 *   1. Render khung: 3 skeleton trực tiếp + 1 sentinel placeholder (section kế tiếp)
 *   2. Load 3 section đầu ngay lập tức (qua FetchQueue)
 *   3. CHAIN PATTERN: chỉ observe đúng 1 sentinel tại một thời điểm
 *      → Khi user cuộn tới → load section đó → đổi sentinel sang section tiếp theo
 *      → Không bao giờ load nhiều section cùng lúc
 *      → Scroll nhanh đến đáy: vẫn chỉ load tuần tự từng section
 */
async function loadHomePage() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    const initial   = NGUONC_CONFIG.HOME_INITIAL_COUNT;
    const total     = HOME_SECTIONS_LIST.length;

    // Render khung HTML:
    //   - 3 section đầu: skeleton đầy đủ (sẽ thay bằng nội dung thật ngay)
    //   - Mỗi section còn lại: placeholder rỗng (không render skeleton ngay
    //     để tránh DOM bloat — skeleton chỉ render khi section sắp được load)
    let html = '';
    // QUAN TRỌNG: wrapper div phải chính là .movie-section (direct child của #movieList).
    // CSS dùng #movieList > .movie-section (direct child) và nth-of-type để apply gradient.
    // Nếu thêm wrapper div bọc ngoài → .movie-section không còn là direct child → CSS hỏng.
    for (let i = 0; i < initial; i++) {
        html += `<div id="home-section-${i}" class="movie-section mb-3" data-loaded="0">${renderSectionSkeleton()}</div>`;
    }
    for (let i = initial; i < total; i++) {
        // Placeholder ẩn hoàn toàn:
        //   - Vẫn có class movie-section để nth-of-type đếm đúng vị trí gradient
        //   - Inline style override background + xóa padding/gap của CSS @media ≥1200px
        //     (CSS: background:rgba(255,255,255,.05) → làm ô rỗng hiện thành thanh tối)
        //   - min-height:1px để IntersectionObserver vẫn detect được
        //   - overflow:hidden + max-height:0 → không chiếm không gian thị giác
        html += `<div id="home-section-${i}" class="movie-section mb-3"
                      data-loaded="0"
                      style="background:transparent!important;padding:0!important;gap:0!important;min-height:1px;max-height:0;overflow:hidden;margin:0!important;box-shadow:none!important"></div>`;
    }
    container.innerHTML = html;

    // Load 3 section đầu song song (FetchQueue tự rate-limit)
    const initialLoads = [];
    for (let i = 0; i < initial; i++) {
        const el = document.getElementById(`home-section-${i}`);
        if (el) initialLoads.push(loadHomeSection(i, el));
    }
    await Promise.all(initialLoads);

    // ── CHAIN PATTERN ─────────────────────────────────────────────────────────
    // Chỉ observe đúng 1 sentinel tại một thời điểm.
    // Sau khi section i load xong → observer chuyển sang observe section i+1.
    // Đảm bảo tuyệt đối: không bao giờ load >1 section cùng lúc khi cuộn.
    //
    //   nextIndex = index section sắp được load kế tiếp
    //   _isLoadingSection = guard chống trigger khi section đang load
    //   observeNext() = hàm tái sử dụng: unobserve cũ → observe mới
    // ─────────────────────────────────────────────────────────────────────────

    let nextIndex       = initial;        // Section tiếp theo cần load
    let _isLoadingSection = false;        // Guard: không trigger khi đang load

    // Hủy observer cũ nếu user navigate về home rồi lại về home
    if (window._homeObserver) window._homeObserver.disconnect();

    window._homeObserver = new IntersectionObserver(async (entries) => {
        // Chỉ quan tâm sentinel đang được observe (luôn chỉ có 1)
        const entry = entries[0];
        if (!entry.isIntersecting || _isLoadingSection) return;

        _isLoadingSection = true;

        const currentIndex = nextIndex;
        const el = document.getElementById(`home-section-${currentIndex}`);

        // Dừng observe sentinel hiện tại ngay lập tức
        window._homeObserver.unobserve(entry.target);

        if (el) {
            // 1. Xóa inline style "ẩn" → để CSS .movie-section styling hiện ra đúng
            el.removeAttribute('style');

            // 2. Hiện skeleton ngay lập tức (người dùng thấy có gì đó đang load)
            el.innerHTML = renderSectionSkeleton();

            // 3. Delay 1.5s trước khi fetch → section show từng cái, không bị burst
            await new Promise(r => setTimeout(r, NGUONC_CONFIG.HOME_SECTION_DELAY));

            // 4. Load nội dung thật (qua FetchQueue — có rate-limit, cache)
            await loadHomeSection(currentIndex, el);
        }

        nextIndex++;
        _isLoadingSection = false;

        // Nếu còn section tiếp → chuyển sang observe section đó
        if (nextIndex < total) {
            const nextEl = document.getElementById(`home-section-${nextIndex}`);
            if (nextEl) window._homeObserver.observe(nextEl);
        }
        // nextIndex === total → tất cả section đã load, observer ngừng hoạt động

    }, {
        // rootMargin nhỏ hơn (200px) so với v1 (400px):
        // Chờ user cuộn gần tới section mới load, thay vì đón đầu quá sớm
        rootMargin: '50px 0px',
        threshold:  0
    });

    // Bắt đầu: chỉ observe section kế tiếp (index = initial)
    if (nextIndex < total) {
        const firstSentinel = document.getElementById(`home-section-${nextIndex}`);
        if (firstSentinel) window._homeObserver.observe(firstSentinel);
    }
}


// ─────────────────────────────────────────────────────────────
// 11. PHIM LIÊN QUAN
// ─────────────────────────────────────────────────────────────

/**
 * loadRelatedMovies(currentMovie) — Slider phim cùng thể loại.
 * Loại bỏ phim đang xem, hiển thị tối đa 10 phim.
 */
async function loadRelatedMovies(currentMovie) {
    const genres = currentMovie.category?.['2']?.list;
    if (!genres?.length) return;

    const genreSlug = slugify(genres[0].name);
    const container = document.getElementById('relatedMoviesContainer');
    if (!container) return;

    const data = await fetchNguonC(`${NGUONC_CONFIG.ENDPOINTS.category}${genreSlug}`);
    if (!data?.items?.length) { container.innerHTML = ''; return; }

    const related = data.items.filter(m => m.slug !== currentMovie.slug).slice(0, 10);
    if (!related.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
    <div class="related-films-widget bg-dark-custom p-3 rounded-4">
      <div class="section-title-wrapper d-flex justify-content-between align-items-center m-0 p-0">
        <h2 class="section-title m-0 p-0 text-danger fs-6 fw-bold text-uppercase">Có thể bạn quan tâm</h2>
        <a onclick="navigateToCategory('the-loai', '${genreSlug}')"
           class="text-secondary small text-decoration-none cursor-pointer">
          Xem thêm<i class="fa-duotone fa-angle-right ms-1"></i>
        </a>
      </div>
      <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0 mt-3 scrollbar-hide">
        ${related.map(m => renderMovieCard(m, 'card')).join('')}
      </div>
    </div>`;

    initLazyLoading();
    if (typeof initDragToScroll === 'function') initDragToScroll();
}


// ─────────────────────────────────────────────────────────────
// 12. handleViewAll — NÚT "XEM THÊM"
// ─────────────────────────────────────────────────────────────

window.handleViewAll = function(type, slug) {
    if (type === 'search') {
        window.location.href = `?search=${encodeURIComponent(slug)}`;
        return;
    }

    const paramKey = (type === 'quoc-gia') ? 'country' : 'cat';
    window.history.pushState({ type, slug }, '', `?${paramKey}=${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    if (container) container.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-danger"></div></div>';

    checkRoute();
};


// ─────────────────────────────────────────────────────────────
// 13. CHI TIẾT PHIM
// ─────────────────────────────────────────────────────────────

let currentMovieData = null;

/**
 * showMovieDetail(slug) — Render trang chi tiết phim.
 * Fetch không qua queue (useQueue=false) để ưu tiên tốc độ.
 */
async function showMovieDetail(slug) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    // Skeleton
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

    // Fetch không qua queue (ưu tiên cao — user đang chờ)
    const res   = await fetchNguonC(`${NGUONC_CONFIG.DETAIL_API}${slug}`, null, false);
    const movie = res?.movie;
    if (!movie) {
        container.innerHTML = '<div class="text-center py-5 text-danger">Không thể tải phim, vui lòng thử lại.</div>';
        return;
    }

    currentMovieData = movie;
    updatePageTitle(movie.name, true);

    const getCat = id => movie.category?.[id]?.list.map(i => i.name).join(', ') || 'N/A';

    // Lưu lịch sử xem
    if (typeof MovieHistoryManager !== 'undefined') {
        MovieHistoryManager.add({
            slug:      movie.slug,
            name:      movie.name,
            thumb_url: movie.poster_url,
            quality:   movie.quality  || 'HD',
            lang:      movie.language || 'Vietsub',
            category:  getCat('2'),
            url:       window.location.href
        });
    }

    container.innerHTML = `
    <div class="movie-detail-wrapper">
      <div class="detail-content row g-3">
        <div class="leftPlayerContainer col-xl-9 col-lg-8 col-md-7 col-12">
          <div id="playerBox" class="rounded-4 shadow-lg mb-3"></div>
          <div class="rounded-4 text-secondary bg-dark-custom p-3">
            <h1 class="fs-5 text-danger text-uppercase fw-bold mb-2">${movie.name}</h1>
            <h2 class="fs-6 fw-normal text-secondary mb-3">${movie.original_name}</h2>
            <div class="film-description">
              <div class="mb-3 d-flex flex-wrap gap-1 pt-3">
                <span class="badge bg-danger fw-normal">${movie.quality}</span>
                <span class="badge bg-success fw-normal">${movie.current_episode}</span>
                <span class="badge bg-primary fw-normal">${movie.time || 'N/A'}</span>
                <a onclick="shareNative()" class="badge bg-warning text-dark fw-normal" title="Chia sẻ">Chia sẻ</a>
              </div>
              <div class="film-meta-descript" style="text-align:justify">${movie.description}</div>
            </div>
          </div>
        </div>

        <div class="rightSidebar_movieDetail col-xl-3 col-lg-4 col-md-5 col-12">
          <div class="film-thumb mb-3">
            <img class="w-100 rounded-4 shadow lazy-img"
                 src="${BLANK_GIF}" data-src="${movie.thumb_url}" />
          </div>

          <div class="movie-full-info p-3 bg-dark-custom rounded-4">
            <h4 class="text-danger fs-6 fw-bold mb-3 text-uppercase">Thông tin phim</h4>
            <div class="movie-full-info text-secondary">
              <div class="info-item"><i class="fa-duotone fa-calendar me-1"></i>
                <span class="fw-bold">Năm</span><span class="mx-0">•</span>
                <span class="getInfo">${getCat('3')}</span></div>
              <div class="info-item"><i class="fa-duotone fa-earth-asia me-1"></i>
                <span class="fw-bold">Quốc gia</span><span class="mx-0">•</span>
                <span class="getInfo">${getCat('4')}</span></div>
              <div class="info-item"><i class="fa-duotone fa-closed-captioning me-1"></i>
                <span class="fw-bold">Phiên bản</span><span class="mx-0">•</span>
                <span class="getInfo">${movie.language}</span></div>
              <div class="info-item"><i class="fa-duotone fa-tags me-1"></i>
                <span class="fw-bold">Thể loại</span><span class="mx-0">•</span>
                <span class="getInfo" title="${getCat('2')}">${getCat('2')}</span></div>
              <div class="info-item"><i class="fa-duotone fa-film me-1"></i>
                <span class="fw-bold">Phân loại</span><span class="mx-0">•</span>
                <span class="getInfo">${getCat('1')}</span></div>
              <div class="info-item"><i class="fa-duotone fa-user me-1"></i>
                <span class="fw-bold">Đạo diễn</span><span class="mx-0">•</span>
                <span class="getInfo">${movie.director || 'N/A'}</span></div>
              <div class="info-item"><i class="fa-duotone fa-users me-1"></i>
                <span class="fw-bold">Diễn viên</span><span class="mx-0">•</span>
                <span class="getInfo" title="${movie.casts || 'N/A'}">${movie.casts || 'N/A'}</span></div>
            </div>
          </div>

          <div class="rounded-4 bg-dark-custom server-selection text-secondary p-3 my-3 fw-bold">
            <div class="p-0 m-0 fs-6 fw-bold text-danger text-uppercase">Phiên bản</div>
            <div class="d-flex gap-2 mt-3" id="serverList">
              ${movie.episodes.map((server, i) => `
                <button class="outline-0 border-0 bg-transparent btn-change-server rounded-4 ${i === 0 ? 'active' : ''}"
                        onclick="changeServer(${i}, this)">
                  <img class="w-100 h-100 object-fit-cover lazy-img"
                       src="${BLANK_GIF}" data-src="${movie.poster_url}" />
                  <span class="server_name">${server.server_name}</span>
                </button>`).join('')}
            </div>
          </div>

          <div class="rounded-4 episode-selection bg-dark-custom text-secondary p-3">
            <div class="fs-6 fw-bold text-danger text-uppercase">Danh sách Tập</div>
            <div class="episode-list mt-3" id="episodeList"></div>
          </div>

          <div class="film-poster mt-3">
            <img class="w-100 rounded-4 shadow lazy-img"
                 src="${BLANK_GIF}" data-src="${movie.poster_url}" />
          </div>
        </div>
      </div>

      <div id="relatedMoviesContainer" class="mt-3"></div>
    </div>`;

    changeServer(0);
    initLazyLoading();
    loadRelatedMovies(movie);
}

/**
 * changeServer(serverIndex, el) — Đổi phiên bản (Vietsub / Thuyết minh / ...).
 */
function changeServer(serverIndex, el) {
    if (!currentMovieData?.episodes[serverIndex]) return;

    if (el) {
        document.querySelectorAll('#serverList button').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    }

    const episodes  = currentMovieData.episodes[serverIndex].items;
    const epCont    = document.getElementById('episodeList');
    const isSingle  = episodes.length <= 1;

    if (isSingle) {
        epCont.classList.add('single-episode-layout');
        epCont.classList.remove('grid-episode-layout');
        epCont.style.display = 'block';
    } else {
        epCont.classList.add('grid-episode-layout');
        epCont.classList.remove('single-episode-layout');
    }

    epCont.innerHTML = episodes.map((ep, i) => {
        const extra = isSingle ? 'px-4 py-2 w-auto' : '';
        return `
      <button class="btn btn-outline-danger btn-episode ${extra}" id="ep-${i}"
              onclick="window.scrollTo({top:0, behavior:'smooth'}); playVideo('${ep.embed}', this)">
          ${ep.name}
      </button>`;
    }).join('');

    if (episodes.length > 0) {
        const targetTap = new URLSearchParams(window.location.search).get('tap');
        const allBtns   = epCont.querySelectorAll('.btn-episode');
        let   target    = Array.from(allBtns).find(b => b.innerText.trim() === targetTap);
        if (!target) target = document.getElementById('ep-0');
        if (target) playVideo(episodes[target.id.replace('ep-', '')].embed, target);
    }
}

/**
 * playVideo(url, el) — Load iframe vào #playerBox, cập nhật ?tap= trên URL.
 */
function playVideo(url, el) {
    const box = document.getElementById('playerBox');
    if (box) box.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;

    if (el) {
        document.querySelectorAll('.btn-episode').forEach(b => b.classList.remove('active'));
        el.classList.add('active');

        const episode   = el.innerText.trim();
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tap') !== episode) {
            urlParams.set('tap', episode);
            window.history.replaceState({ episode }, '', window.location.pathname + '?' + urlParams.toString());
        }
    }
}


// ─────────────────────────────────────────────────────────────
// 14. KHỞI CHẠY
// ─────────────────────────────────────────────────────────────

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

document.addEventListener('DOMContentLoaded', () => {
    initDynamicMenu();
    checkRoute();

    // Search: debounce 400ms để không fire request mỗi keystroke
    const sInput  = document.getElementById('searchInput');
    const sBtn    = document.getElementById('searchBtn');
    const _search = _debounce(triggerSearch, 400);

    if (sInput && sBtn) {
        sBtn.onclick   = triggerSearch; // Nút bấm → không cần debounce
        sInput.onkeyup = e => { if (e.key === 'Enter') triggerSearch(); else _search(); };
    }

    // Đóng menu mobile khi click ra ngoài
    document.addEventListener('click', e => {
        const navbarCollapse = document.getElementById('movieNavbar');
        const navbarToggler  = document.querySelector('.navbar-toggler');
        if (navbarCollapse?.classList.contains('show') &&
            !navbarCollapse.contains(e.target) &&
            !navbarToggler?.contains(e.target)) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if (bsCollapse) bsCollapse.hide();
            else new bootstrap.Collapse(navbarCollapse).hide();
        }
    });
});

/**
 * refreshHome() — Reset về trang chủ (click logo).
 */
function refreshHome() {
    window.history.pushState({}, '', window.location.pathname);
    document.title = 'VT Films';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const searchInput = document.querySelector('#searchInput');
    if (searchInput) { searchInput.value = ''; searchInput.blur(); }

    const navbarCollapse = document.querySelector('.navbar-collapse.show');
    if (navbarCollapse) {
        const bsc = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsc) bsc.hide();
        else navbarCollapse.classList.remove('show');
    }

    // Clear cache nếu muốn force refresh dữ liệu
    ApiCache.clear(); // Bỏ comment dòng này nếu muốn luôn lấy data mới khi về home

    loadHomePage();
}


// ============================================================
// End · VT Films · films.vutruong.vn
// ============================================================
