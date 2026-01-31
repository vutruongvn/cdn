// JS for All Function
// VT Films
// films.vutruong.vn

/* Lazy Load */
function initLazyLoading() {
    const images = document.querySelectorAll('.lazy-img');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const realSrc = img.getAttribute('data-src');
                if (realSrc) {
                    img.src = realSrc;
                    img.removeAttribute('data-src');
                    // Khi ảnh thực tế đã tải xong thì mới cho hiện rõ dần
                    img.onload = () => {
                        img.classList.add('loaded');
                        img.classList.remove('lazy-img');
                    };
                }
                observer.unobserve(img); // Dừng theo dõi ảnh này sau khi đã load
            }
        });
    }, {
        rootMargin: '200px 0px', // Load trước khi cuộn tới 200px
        threshold: 0.01
    });
    images.forEach(img => imageObserver.observe(img));
}

/**
 * 1. CẤU HÌNH & DỮ LIỆU
 */
const NGUONC_CONFIG = {
    BASE_API: "https://phim.nguonc.com/api/films",
    ENDPOINTS: {
        new: "/phim-moi-cap-nhat",
        list: "/danh-sach/",
        category: "/the-loai/",
        country: "/quoc-gia/",
        search: "/search?keyword="
    },
    CONTAINER_ID: "movieList",
    DEFAULT_TITLE: "VT Films"
};

const MOVIE_MENU_DATA = {
    genres: ["Hành Động", "Phiêu Lưu", "Hoạt Hình", "Hài", "Hình Sự", "Tài Liệu", "Chính Kịch", "Gia Đình", "Giả Tưởng", "Lịch Sử", "Kinh Dị", "Phim Nhạc", "Bí Ẩn", "Lãng Mạn", "Khoa Học Viễn Tưởng", "Gây Cấn", "Chiến Tranh", "Tâm Lý", "Tình Cảm", "Cổ Trang", "Miền Tây", "Phim 18+"],
    countries: ["Âu Mỹ", "Anh", "Trung Quốc", "Indonesia", "Việt Nam", "Pháp", "Hồng Kông", "Hàn Quốc", "Nhật Bản", "Thái Lan", "Đài Loan", "Nga", "Hà Lan", "Philippines", "Ấn Độ", "Quốc gia khác"]
};

const PAGING_STATE = {
    currentPage: 1,
    isLoading: false,
    hasMore: true,
    currentEndpoint: '',
    isInfiniteMode: false
};

/**
 * 2. CÁC HÀM TIỆN ÍCH CHUẨN HÓA
 */
// Hàm tra cứu ngược: slug -> Tên có dấu (Để hiển thị section title)
function getDisplayName(slug) {
    const allItems = [...MOVIE_MENU_DATA.genres, ...MOVIE_MENU_DATA.countries, "Phim Lẻ", "Phim Bộ", "Phim Mới"];
    const found = allItems.find(item => slugify(item) === slug);
    if (found) return found;
    // Nếu không tìm thấy (như từ khóa tìm kiếm), thì format đẹp lại
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function slugify(text) {
    if (!text) return "";
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
}

// Cập nhật Title trình duyệt: Giữ nguyên nếu là tên phim có dấu từ API
function updatePageTitle(prefix, content = "", isRaw = false) {
    if (!content) {
        document.title = NGUONC_CONFIG.DEFAULT_TITLE;
        return;
    }
    let displayContent = content;
    if (!isRaw) {
        // Nếu không phải tên phim raw từ API, thì tra cứu tên có dấu
        displayContent = getDisplayName(content);
    }
    // Cũ:  document.title = `${prefix}: ${displayContent} | VT Films`;
    document.title = `${displayContent}`;
}

async function fetchNguonC(endpoint, page = null) {
    let finalUrl = endpoint.startsWith('http') ? endpoint : `${NGUONC_CONFIG.BASE_API}${endpoint}`;
    if (page !== null) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl += `${separator}page=${page}`;
    }
    try {
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error("Status: " + response.status);
        return await response.json();
    } catch (error) {
        return null;
    }
}

function updateURL(params = {}) {
    const url = new URL(window.location.href);
    url.search = "";
    Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));
    window.history.pushState({}, '', url);
}

window.onpopstate = () => checkRoute();

/**
 * 3. RENDER COMPONENTS
 */
function renderMovieCard(movie, mode = 'grid') {
    const year = movie.category?.["3"]?.list?.[0]?.name || movie.year || '2026';
    const colClass = mode === 'grid' ? 'col' : 'movie-card-item';
    // Sử dụng data-src để lazyload thủ công kết hợp hiệu ứng
    return `
    <div class="${colClass}">
      <div class="movie-item" title="${movie.name}" onclick="navigateToMovie('${movie.slug}')" style="cursor:pointer">
        <div class="poster-wrapper">
          <i class="fa-duotone fa-play play-overlay"></i>
          <img data-src="${movie.thumb_url}" 
               src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
               class="poster-img lazy-img" 
               alt="${movie.name}">
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
 * 4. ĐIỀU HƯỚNG
 */
function triggerSearch() {
    const sInput = document.getElementById('searchInput');
    const keyword = sInput ? sInput.value.trim() : "";
    if (keyword.length > 1) {
        updateURL({
            search: keyword
        });
        checkRoute();
        sInput.blur();
    }
}

function navigateToMovie(slug) {
    updateURL({
        watch: slug
    });
    showMovieDetail(slug);
}

function navigateToCategory(type, slug) {
    let params = {};
    if (type === 'quoc-gia') params.country = slug;
    else if (type === 'the-loai') params.type = slug;
    else params.cat = slug || type;
    updateURL(params);
    checkRoute();
    const navbarCollapse = document.getElementById('movieNavbar');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) bsCollapse.hide();
    }
}

/**
 * 5. INFINITE SCROLL
 */
async function loadMoreMovies(isFirstLoad = false) {
    if (PAGING_STATE.isLoading || !PAGING_STATE.hasMore) return;
    PAGING_STATE.isLoading = true;
    // Ẩn nút "Tải thêm" khi đang load để hiện khung xương cho đẹp
    const btnLoadMore = document.getElementById('btnLoadMore');
    if (btnLoadMore) btnLoadMore.style.display = 'none';
    // 1. Hiển thị loader (chứa 10 khung xương của bạn)
    updateBottomLoader(true);
    try {
        const [data] = await Promise.all([
            fetchNguonC(PAGING_STATE.currentEndpoint, PAGING_STATE.currentPage),
            new Promise(resolve => setTimeout(resolve, 500))
        ]);
        const grid = document.querySelector('.movie-grid-row');
        if (grid && data && data.items && data.items.length > 0) {
            const html = data.items.map(m => renderMovieCard(m, 'grid')).join('');
            if (isFirstLoad) {
                grid.innerHTML = html;
            } else {
                grid.insertAdjacentHTML('beforeend', html);
            }
            PAGING_STATE.currentPage++;
            PAGING_STATE.hasMore = PAGING_STATE.currentPage <= (data.paginate?.total_page || 1);
        } else {
            if (isFirstLoad && grid) grid.innerHTML = '<div class="text-danger text-center py-5 w-100">Không tìm thấy phim nào.</div>';
            PAGING_STATE.hasMore = false;
        }
    } catch (error) {
        console.error("Lỗi khi tải thêm phim:", error);
    } finally {
        PAGING_STATE.isLoading = false;
        // 3. Tắt loader khung xương và kiểm tra hiện nút/thông báo
        const msg = PAGING_STATE.hasMore ? "" : "Không còn kết quả nào khác.";
        updateBottomLoader(false, msg);
        initLazyLoading(); // Kích hoạt cho các card phim mới
        // Nếu vẫn còn phim, hiện lại nút "Tải thêm" làm dự phòng
        if (btnLoadMore && PAGING_STATE.hasMore) {
            btnLoadMore.style.display = 'inline-block';
        }
    }
}

function updateBottomLoader(show, msg = "") {
    let loader = document.getElementById('bottom-loader');
    if (!loader) return;
    if (show) {
        // TRẢ LẠI ĐÚNG 10 CÁI KHUNG XƯƠNG CỦA BẠN ĐÂY
        loader.innerHTML = `
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 g-2 mt-1 text-start">
          ${renderGridSkeleton(12)}
      </div><div class="py-3 text-center d-none"><div class="spinner-border spinner-border-sm text-danger"></div> Đang tải thêm...</div>
    `;
    } else {
        // Hiện thông báo kết thúc hoặc làm trống
        loader.innerHTML = msg ? `<div class="py-4 text-center text-secondary fw-bold">${msg}</div>` : "";
    }
}

/**
 * 6. ROUTING (FIX HIỂN THỊ TIÊU ĐỀ SECTION)
 */
async function checkRoute() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    const urlParams = new URLSearchParams(window.location.search);
    container.innerHTML = '';
    PAGING_STATE.isInfiniteMode = false;
    window.scrollTo(0, 0);
    if (urlParams.has('watch')) {
        showMovieDetail(urlParams.get('watch'));
    } else if (urlParams.has('search')) {
        const key = urlParams.get('search');
        updatePageTitle("Tìm kiếm", key, true); // Search key giữ nguyên format người dùng nhập
        setupInfinitePage(`<i class="fa-duotone fa-search me-2"></i>Tìm kiếm: ${key}`, `${NGUONC_CONFIG.ENDPOINTS.search}${key}`);
    } else if (urlParams.has('type')) {
        const slug = urlParams.get('type');
        updatePageTitle("Thể loại", slug);
        setupInfinitePage(`<i class="fa-duotone fa-tags me-2"></i>Thể loại: ${getDisplayName(slug)}`, `${NGUONC_CONFIG.ENDPOINTS.category}${slug}`);
    } else if (urlParams.has('country')) {
        const slug = urlParams.get('country');
        updatePageTitle("Quốc gia", slug);
        setupInfinitePage(`<i class="fa-duotone fa-earth-asia me-2"></i>Quốc gia: ${getDisplayName(slug)}`, `${NGUONC_CONFIG.ENDPOINTS.country}${slug}`);
    } else if (urlParams.has('cat')) {
        const slug = urlParams.get('cat');
        updatePageTitle("Danh mục", slug);
        const endpoint = (slug === 'new') ? NGUONC_CONFIG.ENDPOINTS.new : `${NGUONC_CONFIG.ENDPOINTS.list}${slug}`;
        setupInfinitePage(`<i class="fa-duotone fa-tags me-2"></i>${getDisplayName(slug)}`, endpoint);
    } else {
        updatePageTitle("");
        loadHomePage();
    }
}

async function setupInfinitePage(title, endpoint) {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    PAGING_STATE.isInfiniteMode = true;
    PAGING_STATE.currentPage = 1;
    PAGING_STATE.hasMore = true;
    PAGING_STATE.currentEndpoint = endpoint;
    container.innerHTML = `
    <div class="infinite-wrapper">
      <h2 class="section-title mb-3 text-danger">${title}</h2>
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 g-2 movie-grid-row">
          ${renderGridSkeleton(12)}
      </div>
      <div id="pagination-area" class="text-center py-3">
        <div id="bottom-loader"></div>
        <div id="infinite-sentinel" style="height: 20px;"></div>
        <button id="btnLoadMore" class="btn btn-outline-danger px-5 py-2 fw-bold mt-3" style="display:none;" onclick="loadMoreMovies()">
          TẢI THÊM
        </button>
      </div>
    </div>`;
    await loadMoreMovies(true);
    // THIẾT LẬP OBSERVER (Tự động)
    if (window.movieObserver) window.movieObserver.disconnect();
    const sentinel = document.getElementById('infinite-sentinel');
    window.movieObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && PAGING_STATE.isInfiniteMode && !PAGING_STATE.isLoading && PAGING_STATE.hasMore) {
            loadMoreMovies();
        }
    }, {
        rootMargin: '500px'
    }); // Đón đầu trước 500px
    window.movieObserver.observe(sentinel);
}

// Ske loading trang Grids
function renderGridSkeleton(count = 12) {
    return Array(count).fill(0).map(() => `
    <div class="col mb-4">
      <div class="skeleton-item skeleton-poster mb-2" style="width: 100%; aspect-ratio: 2/3; border-radius:12px;"></div>
      <div class="skeleton-item my-2 mx-auto" style="width: 80%; height: 16px; border-radius:4px;"></div>
      <div class="skeleton-item mx-auto" style="width: 50%; height: 12px; border-radius:4px;"></div>
    </div>
  `).join('');
}

/**
 * 7. TRANG CHỦ & CAROUSEL
 */
const HOME_SECTIONS_LIST = [{
        title: 'Phim mới cập nhật',
        slug: 'new',
        type: 'new'
    },
    {
        title: 'Phim đang chiếu',
        slug: 'phim-dang-chieu',
        type: 'list'
    },
    {
        title: 'Việt Nam',
        slug: 'viet-nam',
        type: 'country'
    },
    {
        title: 'Mèo Ú Doraemon',
        slug: 'Doraemon',
        type: 'search'
    },
    {
        title: 'Thám tử lừng danh Conan',
        slug: 'Conan',
        type: 'search'
    },
    {
        title: 'Phim lẻ',
        slug: 'phim-le',
        type: 'list'
    },
    {
        title: 'Phim bộ',
        slug: 'phim-bo',
        type: 'list'
    },
    {
        title: 'Hành động',
        slug: 'hanh-dong',
        type: 'list'
    },
    {
        title: 'Hoạt hình',
        slug: 'hoat-hinh',
        type: 'list'
    },
    {
        title: 'Kinh dị',
        slug: 'kinh-di',
        type: 'list'
    },
    {
        title: 'Tình cảm',
        slug: 'tinh-cam',
        type: 'list'
    },
    {
        title: 'Chính kịch',
        slug: 'chinh-kich',
        type: 'list'
    },
    {
        title: '18+',
        slug: 'phim-18',
        type: 'list'
    },
    {
        title: 'Hài',
        slug: 'phim-hai',
        type: 'list'
    },
    {
        title: 'Cổ trang',
        slug: 'co-trang',
        type: 'list'
    },
    {
        title: 'Lãng mạn',
        slug: 'lang-man',
        type: 'list'
    },
    {
        title: 'Khoa học viễn tưởng',
        slug: 'khoa-hoc-vien-tuong',
        type: 'list'
    },
    {
        title: 'TV Shows',
        slug: 'tv-shows',
        type: 'list'
    },
];

async function loadHomePage() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    // 1. Hiển thị Skeleton ngay lập tức
    renderHomeSkeleton();

    // 2. Tạo danh sách công việc (jobs) đã hỗ trợ type: 'search'
    const jobs = HOME_SECTIONS_LIST.map(item => {
        let endpoint = '';
        let navType = 'cat'; // Mặc định là category

        if (item.type === 'new') {
            endpoint = NGUONC_CONFIG.ENDPOINTS.new;
        } else if (item.type === 'search') {
            // API tìm kiếm: phim.nguonc.com/api/films/search?keyword=...
            endpoint = `${NGUONC_CONFIG.ENDPOINTS.search}${item.slug}`;
            navType = 'search';
        } else if (item.type === 'country') {
            endpoint = `${NGUONC_CONFIG.ENDPOINTS.country}${item.slug}`;
            navType = 'quoc-gia';
        } else {
            // Mặc định cho type 'list' hoặc các loại khác
            endpoint = `${NGUONC_CONFIG.ENDPOINTS.list}${item.slug}`;
        }

        return {
            title: item.title,
            endpoint,
            type: navType,
            slug: item.slug
        };
    });

    try {
        // 3. Chạy song song: API + Delay để Skeleton nháy mượt
        const [results] = await Promise.all([
            Promise.all(jobs.map(job => fetchNguonC(job.endpoint, 1))),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);
        // 4. Xóa Skeleton và đổ dữ liệu
        container.replaceChildren();

        results.forEach((data, i) => {
            if (!data?.items) return;

            const {
                title,
                type,
                slug
            } = jobs[i];
            const sectionId = `section-${i}`;
            const top10 = data.items.slice(0, 10);

            // Chúng ta truyền trực tiếp type và slug vào hàm xử lý
            // Không cần nối chuỗi URL ở đây nữa cho đỡ rối
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
      <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0" id="slider-${sectionId}">
        ${top10.map(m => renderMovieCard(m, 'card')).join('')}
      </div>
    </div>
  `;
            container.insertAdjacentHTML('beforeend', sectionHtml);
        });




        // 5. QUAN TRỌNG: Kích hoạt Lazy Load và Kéo chuột sau khi HTML đã lên
        setTimeout(() => {
            initLazyLoading();
            if (typeof initDragToScroll === 'function') initDragToScroll();
        }, 100);
    } catch (error) {
        console.error("Lỗi tải trang chủ:", error);
        container.innerHTML = '<div class="text-center py-5 text-white">Không thể tải dữ liệu, vui lòng thử lại sau.</div>';
    }
}

function renderHomeSkeleton() {
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    let html = '';
    for (let i = 0; i < 10; i++) {
        html += `
      <div class="movie-section mb-3">
        <div class="section-title-wrapper pb-3">
          <div class="skeleton-item" style="width: 200px; height: 25px"></div>
          <div class="d-none d-lg-block skeleton-item my-2" style="width: 160px; height: 25px;"></div>
          <div class="d-none d-xl-block skeleton-item" style="width: 120px; height: 25px;"></div>
        </div>
        <div class="d-flex gap-2 overflow-hidden">
          ${Array(7).fill(0).map(() => `
            <div class="skeleton-element" style="flex: 1;">
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

/**
 * HÀM GỢI Ý PHIM LIÊN QUAN (TRANG XEM PHIM)
 */
async function loadRelatedMovies(currentMovie) {
    // 1. Lấy thông tin thể loại (Category ID 2)
    const genres = currentMovie.category?.["2"]?.list;

    // Nếu phim không có thể loại, dừng lại
    if (!genres || genres.length === 0) return;

    // Lấy thể loại đầu tiên để tìm kiếm (Ví dụ: "Phim Hài" -> slug: "phim-hai")
    const firstGenre = genres[0];
    const genreSlug = slugify(firstGenre.name);
    const container = document.getElementById('relatedMoviesContainer');

    try {
        // 2. Gọi API lấy danh sách phim theo thể loại
        // Endpoint: /the-loai/slug-the-loai
        const data = await fetchNguonC(`${NGUONC_CONFIG.ENDPOINTS.category}${genreSlug}`);

        if (data && data.items && data.items.length > 0) {
            // 3. Lọc bỏ phim đang xem (Dựa trên slug hoặc id)
            // Loại bỏ phim có slug trùng với phim hiện tại
            const relatedItems = data.items.filter(item => item.slug !== currentMovie.slug);

            // Nếu sau khi lọc mà không còn phim nào thì ẩn khung đi
            if (relatedItems.length === 0) {
                return;
            }

            // Giới hạn hiển thị 10 phim
            const limitedItems = relatedItems.slice(0, 10);

            // 4. Render HTML (Dùng lại cấu trúc Slider của trang chủ)
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
          
          <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0 mt-3 scrollbar-hide">
            ${limitedItems.map(m => renderMovieCard(m, 'card')).join('')}
          </div>
        </div>
      `;

            // 5. Kích hoạt Lazy Load và hiệu ứng kéo chuột (nếu có)
            initLazyLoading();
            if (typeof initDragToScroll === 'function') {
                initDragToScroll(); // Hàm hỗ trợ kéo chuột trên PC cho slider (nếu bạn đã có)
            }
        } else {
            container.innerHTML = ''; // Không có dữ liệu thì ẩn
        }
    } catch (e) {
        console.error("Lỗi tải phim liên quan:", e);
        container.innerHTML = '';
    }
}



// Hàm xử lý chuyển trang: Search dùng reload, Category/Country dùng SPA
window.handleViewAll = function(type, slug) {
    // TRƯỜNG HỢP SEARCH: Dùng window.location để load lại trang
    if (type === 'search') {
        window.location.href = `?search=${encodeURIComponent(slug)}`;
        return; // Thoát hàm luôn, không chạy các lệnh SPA bên dưới
    }

    // TRƯỜNG HỢP CÒN LẠI: Chạy SPA mode
    let paramKey = 'cat';
    if (type === 'quoc-gia') {
        paramKey = 'country';
    }

    // 1. Cập nhật thanh địa chỉ không reload
    const newUrl = `?${paramKey}=${slug}`;
    window.history.pushState({
        type,
        slug
    }, '', newUrl);

    // 2. Cuộn lên đầu
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // 3. Reset nội dung và hiện Spinner
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);
    if (container) {
        container.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-danger"></div></div>';
    }

    // 4. Gọi hàm Router hoặc Load dữ liệu SPA
    if (typeof checkRoute === 'function') {
        checkRoute();
    } else if (typeof loadCategoryPage === 'function') {
        loadCategoryPage(slug);
    }
};


/**
 * 8. CHI TIẾT PHIM (Hỗ trợ nhiều Server: Vietsub, Thuyết minh...)
 * Đã tích hợp tính năng lưu lịch sử xem phim
 */
let currentMovieData = null;
async function showMovieDetail(slug) {
    // Đưa trang web về vị trí đầu tiên (top: 0)
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    const container = document.getElementById(NGUONC_CONFIG.CONTAINER_ID);

    // HIỂN THỊ SKELETON LOADING --- SKELETON LOADING TRANG XEM PHIM
    container.innerHTML = `
    <div class="movie-detail-wrapper">
      <div class="detail-content row g-3">
        <div class="leftPlayerContainer col-xl-9 col-lg-8 col-md-7 col-12">
          <div class="skeleton-item skeleton-player mb-3"></div>
          <div class="rounded-4 bg-dark-custom p-3">
            <div class="skeleton-item skeleton-text w-50 mb-3" style="height: 25px;"></div>
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

    const res = await fetchNguonC(`https://phim.nguonc.com/api/film/${slug}`);
    const movie = res?.movie;
    if (!movie) return;
    currentMovieData = movie;
    updatePageTitle("", movie.name, true);
    const getCat = (id) => movie.category?.[id]?.list.map(i => i.name).join(', ') || 'N/A';

    // --- BẮT ĐẦU PHẦN TÍCH HỢP LƯU LỊCH SỬ ---
    if (typeof MovieHistoryManager !== 'undefined') {
        const movieToSave = {
            slug: movie.slug, // Slug phim
            name: movie.name, // Tên phim tiếng Việt
            thumb_url: movie.poster_url, // Link ảnh poster
            quality: movie.quality || 'HD', // Chất lượng phim
            lang: movie.language || 'Vietsub', // Ngôn ngữ/Phiên bản
            category: getCat("2"), // Thể loại phim (id "2" theo code của bạn)
            url: window.location.href // Link hiện tại để khi bấm vào lịch sử sẽ quay lại đúng trang này
        };
        MovieHistoryManager.add(movieToSave);
    }
    // --- KẾT THÚC PHẦN TÍCH HỢP ---

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
              <a onclick="shareNative()" class="badge bg-warning text-dark fw-normal" title="Chia sẻ phim">Chia sẻ</a>
            </div>
            <div class='film-meta-descript' style='text-align:justify'>${movie.description}</div>
          </div>
        </div>
      </div>
    </div>
    <div class='rightSidebar_movieDetail col-xl-3 col-lg-4 col-md-5 col-12'>
      <div class="film-thumb mb-3">
        <img class="w-100 rounded-4 shadow lazy-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${movie.thumb_url}" />
      </div>
      <div class="movie-full-info p-3 bg-dark-custom rounded-4">
        <h4 class='text-danger fs-6 fw-bold mb-3 text-uppercase'>Thông tin phim</h4>
        <div class="movie-full-info text-secondary">
          <div class="info-item">
            <i class="fa-duotone fa-calendar me-1"></i>
            <span class="fw-bold">Năm</span>
            <span class='mx-0'>•</span>
            <span class='getInfo'>${getCat("3")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-earth-asia me-1"></i>
            <span class="fw-bold">Quốc gia</span>
            <span class='mx-0'>•</span>
            <span class='getInfo'>${getCat("4")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-closed-captioning me-1"></i>
            <span class="fw-bold">Phiên bản</span>
            <span class='mx-0'>•</span>
            <span class='getInfo'>${movie.language}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-tags me-1"></i>
            <span class="fw-bold">Thể loại</span>
            <span class='mx-0'>•</span>
            <span class='getInfo' title='${getCat("2")}'>${getCat("2")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-film me-1"></i>
            <span class="fw-bold">Phân loại</span>
            <span class='mx-0'>•</span>
            <span class='getInfo'>${getCat("1")}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-user me-1"></i>
            <span class="fw-bold">Đạo diễn</span>
            <span class='mx-0'>•</span>
            <span class='getInfo'>${movie.director || 'N/A'}</span>
          </div>
          <div class="info-item">
            <i class="fa-duotone fa-users me-1"></i>
            <span class="fw-bold">Diễn viên</span>
            <span class='mx-0'>•</span>
            <span class='getInfo' title='${movie.casts || ' N/A'}'>${movie.casts || 'N/A'}</span>
          </div>
        </div>
      </div>
      <div class="rounded-4 bg-dark-custom server-selection text-secondary p-3 my-3 fw-bold">
        <div class="p-0 m-0 fs-6 fw-bold text-danger text-uppercase">Phiên bản</div>
        <div class="d-flex gap-2 mt-3" id="serverList"> ${movie.episodes.map((server, index) => ` <button class="outline-0 border-0 bg-transparent btn-change-server rounded-4 ${index === 0 ? 'active' : ''}" onclick="changeServer(${index}, this)">
            <img class="w-100 h-100 object-fit-cover lazy-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${movie.poster_url}" />
            <span class="server_name">${server.server_name}</span>
          </button> `).join('')} </div>
      </div>
      <div class="rounded-4 episode-selection bg-dark-custom text-secondary p-3">
        <div class="fs-6 fw-bold text-danger text-uppercase">Danh sách Tập</div>
        <div class="episode-list mt-3" id="episodeList"></div>
      </div>
      <div class="film-poster mt-3">
        <img class="w-100 rounded-4 shadow lazy-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src="${movie.poster_url}" />
      </div>
    </div>
  </div>
    <div id="relatedMoviesContainer" class="mt-3"></div>
</div>`;
    changeServer(0);
    initLazyLoading();
    loadRelatedMovies(movie);
}



function changeServer(serverIndex, el) {
    if (!currentMovieData || !currentMovieData.episodes[serverIndex]) return;
    if (el) {
        document.querySelectorAll('#serverList button').forEach(btn => btn.classList.remove('active'));
        el.classList.add('active');
    }
    const episodes = currentMovieData.episodes[serverIndex].items;
    const episodeContainer = document.getElementById('episodeList');
    const isSingleEpisode = episodes.length <= 1;

    if (isSingleEpisode) {
        episodeContainer.classList.add('single-episode-layout');
        episodeContainer.classList.remove('grid-episode-layout');
        episodeContainer.style.display = 'block';
    } else {
        episodeContainer.classList.add('grid-episode-layout');
        episodeContainer.classList.remove('single-episode-layout');
    }

    episodeContainer.innerHTML = episodes.map((ep, i) => {
        const extraClass = isSingleEpisode ? 'px-4 py-2 w-auto' : '';
        return `
      <button class="btn btn-outline-danger btn-episode ${extraClass}" 
              id="ep-${i}" 
              onclick="window.scrollTo({top: 0, behavior: 'smooth'}); playVideo('${ep.embed}', this)">
          ${ep.name}
      </button>
    `;
    }).join('');

    // --- ĐOẠN SỬA QUAN TRỌNG Ở ĐÂY ---
    if (episodes.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const targetTap = urlParams.get('tap');

        // Tìm nút có số tập khớp với URL
        const allButtons = episodeContainer.querySelectorAll('.btn-episode');
        let targetButton = Array.from(allButtons).find(btn => btn.innerText.trim() === targetTap);

        // Nếu không tìm thấy tập trên URL (hoặc reload lần đầu), mặc định chọn tập 1
        if (!targetButton) {
            targetButton = document.getElementById('ep-0');
        }

        if (targetButton) {
            // Lấy URL từ dữ liệu episodes tương ứng với nút đã tìm thấy
            const btnIndex = targetButton.id.replace('ep-', '');
            const correctEmbed = episodes[btnIndex].embed;

            // Gọi hàm playVideo để load phim vào iframe
            playVideo(correctEmbed, targetButton);

            // ĐÃ XÓA DÒNG scrollIntoView TẠI ĐÂY ĐỂ TRÁNH TỰ ĐỘNG CUỘN XUỐNG
        }
    }
}


function playVideo(url, el) {
    const box = document.getElementById('playerBox');
    if (box) box.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;

    if (el) {
        // 1. Quản lý class active (giữ nguyên logic của bạn)
        document.querySelectorAll('.btn-episode').forEach(b => b.classList.remove('active'));
        el.classList.add('active');

        // 2. Cập nhật URL khi chọn tập phim
        const episode = el.innerText.trim(); // Lấy số tập (vd: 5)
        const urlParams = new URLSearchParams(window.location.search);

        // Nếu tập hiện tại khác với tập trên URL thì mới cập nhật
        if (urlParams.get('tap') !== episode) {
            urlParams.set('tap', episode);

            // Tạo URL mới với tham số tập phim
            const newUrl = window.location.pathname + '?' + urlParams.toString();

            // Sử dụng replaceState để không làm rối lịch sử trình duyệt (nút Back)
            window.history.replaceState({
                episode: episode
            }, '', newUrl);
        }
    }
}

/**
 * 10. KHỞI CHẠY (Giữ nguyên)
 */
function initDynamicMenu() {
    const genreMenu = document.getElementById('menu-the-loai');
    const countryMenu = document.getElementById('menu-quoc-gia');
    if (genreMenu) {
        genreMenu.innerHTML = MOVIE_MENU_DATA.genres.map(name => `<li><a class="dropdown-item rounded" href="javascript:void(0)" onclick="navigateToCategory('the-loai', '${slugify(name)}')">${name}</a></li>`).join('');
    }
    if (countryMenu) {
        countryMenu.innerHTML = MOVIE_MENU_DATA.countries.map(name => `<li><a class="dropdown-item rounded" href="javascript:void(0)" onclick="navigateToCategory('quoc-gia', '${slugify(name)}')">${name}</a></li>`).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDynamicMenu();
    checkRoute();
    const sInput = document.getElementById('searchInput');
    const sBtn = document.getElementById('searchBtn');
    if (sInput && sBtn) {
        sBtn.onclick = () => triggerSearch();
        sInput.onkeyup = (e) => {
            if (e.key === 'Enter') triggerSearch();
        };
    }
    document.addEventListener('click', function(event) {
        const navbarCollapse = document.getElementById('movieNavbar'); // ID container menu của bạn
        const navbarToggler = document.querySelector('.navbar-toggler'); // Nút bấm mở menu

        // Kiểm tra nếu menu đang hiển thị (có class 'show' của Bootstrap)
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {

            // Nếu vị trí click KHÔNG nằm trong navbarCollapse và KHÔNG phải là nút toggler
            if (!navbarCollapse.contains(event.target) && !navbarToggler.contains(event.target)) {

                // Sử dụng API của Bootstrap 5 để thu gọn
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                } else {
                    // Trường hợp instance chưa được khởi tạo, tạo mới và ẩn ngay
                    new bootstrap.Collapse(navbarCollapse).hide();
                }
            }
        }
    });
});

function refreshHome() {
    // 1. Cập nhật URL sạch (SPA mode)
    window.history.pushState({}, '', window.location.pathname);

    // 2. Reset Title web về mặc định và cuộn lên đầu
    document.title = "VT Films";
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // 3. Reset thanh tìm kiếm
    const searchInput = document.querySelector('#searchInput') || document.querySelector('input[name="q"]');
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
    }

    // 4. Đóng Menu Mobile
    const navbarCollapse = document.querySelector('.navbar-collapse.show');
    if (navbarCollapse) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) {
            bsCollapse.hide();
        } else {
            navbarCollapse.classList.remove('show');
        }
    }

    // 5. Thực hiện load lại dữ liệu trang chủ
    if (typeof loadHomePage === 'function') {
        loadHomePage();
    }
}

// End
// VT Films
// films.vutruong.vn