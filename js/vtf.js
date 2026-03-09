  window.__VTF_READY = (function() {
      var cache = null, status = null;
      try { cache = JSON.parse(localStorage.getItem('VTFilms_userCache')); } catch (_) {}
      if (!cache) return false;
      if (cache.role === 'admin') return true;
      try {
          var sv = JSON.parse(localStorage.getItem('VTFilms_verifyStatus'));
          status = (sv && sv.uid === cache.uid) ? sv.status : null;
      } catch (_) {}
      return status === 'approved';
  })();

/* ============================================================
   VT FILMS v4.3.0
   Platform : Blogger | API: OPhim1
   UI Stack : Bootstrap 5.3.8 + Font Awesome Pro 7.2.0
   Language : Vanilla JavaScript (ES2020+)
   Auth     : Firebase Auth v9.0 (new-user fix, no debounce, no getDoc race)
   Changes  : Auth v9.0 new-user setDoc fix (xóa getDoc race + debounce),
              href=/ → nav(home) SPA fix.
   ============================================================ */

/* ── CONFIG ─────────────────────────────────── */
const CONFIG = {
    API:  'https://ophim1.com/v1/api',
    IMG:  'https://img.ophim.live/uploads/movies/',
    TMDB: 'https://image.tmdb.org/t/p/',
    ROOT: null
};

/* ── HOME SECTIONS (20 lazy sections) ───────── */
const HOME_SECTIONS = [
    { id:'VTFsl_hanh-dong',   ti:'Phim', hi:'Hành Động',    api:'/the-loai/hanh-dong',   type:'the-loai', slug:'hanh-dong'   },
    { id:'VTFsl_tinh-cam',    ti:'Phim', hi:'Tình Cảm',     api:'/the-loai/tinh-cam',    type:'the-loai', slug:'tinh-cam'    },
    { id:'VTFsl_kinh-di',     ti:'Phim', hi:'Kinh Dị',      api:'/the-loai/kinh-di',     type:'the-loai', slug:'kinh-di'     },
    { id:'VTFsl_hai-huoc',    ti:'Phim', hi:'Hài Hước',     api:'/the-loai/hai-huoc',    type:'the-loai', slug:'hai-huoc'    },
    { id:'VTFsl_co-trang',    ti:'Phim', hi:'Cổ Trang',     api:'/the-loai/co-trang',    type:'the-loai', slug:'co-trang'    },
    { id:'VTFsl_chinh-kich',  ti:'Phim', hi:'Chính Kịch',   api:'/the-loai/chinh-kich',  type:'the-loai', slug:'chinh-kich'  },
    { id:'VTFsl_phieu-luu',   ti:'Phim', hi:'Phiêu Lưu',    api:'/the-loai/phieu-luu',   type:'the-loai', slug:'phieu-luu'   },
    { id:'VTFsl_tam-ly',      ti:'Phim', hi:'Tâm Lý',       api:'/the-loai/tam-ly',      type:'the-loai', slug:'tam-ly'      },
    { id:'VTFsl_hoat-hinh',   ti:'Phim', hi:'Hoạt Hình',    api:'/the-loai/hoat-hinh',   type:'the-loai', slug:'hoat-hinh'   },
    { id:'VTFsl_vien-tuong',  ti:'Phim', hi:'Viễn Tưởng',   api:'/the-loai/vien-tuong',  type:'the-loai', slug:'vien-tuong'  },
    { id:'VTFsl_bi-an',       ti:'Phim', hi:'Bí Ẩn',        api:'/the-loai/bi-an',       type:'the-loai', slug:'bi-an'       },
    { id:'VTFsl_gia-dinh',    ti:'Phim', hi:'Gia Đình',     api:'/the-loai/gia-dinh',    type:'the-loai', slug:'gia-dinh'    },
    { id:'VTFsl_hoc-duong',   ti:'Phim', hi:'Học Đường',    api:'/the-loai/hoc-duong',   type:'the-loai', slug:'hoc-duong'   },
    { id:'VTFsl_vo-thuat',    ti:'Phim', hi:'Võ Thuật',     api:'/the-loai/vo-thuat',    type:'the-loai', slug:'vo-thuat'    },
    { id:'VTFsl_than-thoai',  ti:'Phim', hi:'Thần Thoại',   api:'/the-loai/than-thoai',  type:'the-loai', slug:'than-thoai'  },
    { id:'VTFsl_han-quoc',    ti:'Phim', hi:'Hàn Quốc',     api:'/quoc-gia/han-quoc',    type:'quoc-gia', slug:'han-quoc'    },
    { id:'VTFsl_trung-quoc',  ti:'Phim', hi:'Trung Quốc',   api:'/quoc-gia/trung-quoc',  type:'quoc-gia', slug:'trung-quoc'  },
    { id:'VTFsl_viet-nam',    ti:'Phim', hi:'Việt Nam',     api:'/quoc-gia/viet-nam',    type:'quoc-gia', slug:'viet-nam'    },
    { id:'VTFsl_au-my',       ti:'Phim', hi:'Âu Mỹ',        api:'/quoc-gia/au-my',       type:'quoc-gia', slug:'au-my'       },
    { id:'VTFsl_nhat-ban',    ti:'Phim', hi:'Nhật Bản',     api:'/quoc-gia/nhat-ban',    type:'quoc-gia', slug:'nhat-ban'    },
];

/* ─────────────────────────────────────────────
   LAZY IMAGE FADE-IN (MutationObserver)
───────────────────────────────────────────── */
function initImgLazy() {
    if (!CONFIG.ROOT) return;
    const fade = (img) => requestAnimationFrame(() => img.classList.add('VTFilms_img-loaded'));
    const process = (img) => {
        if (img.dataset.vtlazy) return;
        img.dataset.vtlazy = '1';
        if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
        img.onerror = function() { this.src = 'https://placehold.co/300x450?text=No+Image'; this.onerror = null; };
        img.complete ? fade(img) : img.addEventListener('load', () => fade(img), { once: true });
    };
    new MutationObserver((muts) => {
        for (const m of muts)
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                const imgs = node.tagName === 'IMG' ? [node] : node.querySelectorAll('img');
                imgs.forEach(process);
            }
    }).observe(CONFIG.ROOT, { childList: true, subtree: true });
}

/* ─────────────────────────────────────────────
   SCROLL FADE-IN (IntersectionObserver, global)
   Pattern: JS adds --pending to newly added FadeIn elements to hide them,
   then removes --pending when they enter the viewport (CSS transition fires).
───────────────────────────────────────────── */
function initScrollFadeIn() {
    if (!CONFIG.ROOT) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.remove('VTFilms_FadeIn--pending');
            obs.unobserve(e.target);
        });
    }, { threshold: 0.04, rootMargin: '80px 0px 0px 0px' });
    new MutationObserver((muts) => {
        for (const m of muts)
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                const els = node.classList?.contains('VTFilms_FadeIn')
                    ? [node]
                    : (node.querySelectorAll?.('.VTFilms_FadeIn') || []);
                els.forEach(el => {
                    el.classList.add('VTFilms_FadeIn--pending');
                    obs.observe(el);
                });
            }
    }).observe(CONFIG.ROOT, { childList: true, subtree: true });
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fetchJson = async (url) => {
    try { const r = await fetch(url, { headers: { accept: 'application/json' } }); return await r.json(); }
    catch { return null; }
};

const getImgUrl = (path, base = CONFIG.IMG) => {
    if (!path || typeof path !== 'string') return 'https://placehold.co/300x450?text=No+Image';
    return path.startsWith('http') ? path : base + path;
};

const getTmdbImg = (path, size = 'w185') => {
    if (!path || typeof path !== 'string') return null;
    return `${CONFIG.TMDB}${size}${path.startsWith('/') ? path : '/' + path}`;
};

const stripHtml = (html) => html ? html.replace(/<[^>]+>/g, '') : '';

const nav = (view, value = '', slug = '', ep = '', page = 1) => {
    let url = window.location.pathname;
    if (view === 'watch')       url += `?watch=${value}${ep ? '&ep=' + ep : ''}`;
    else if (view === 'search') url += `?search=${encodeURIComponent(value)}&page=${page}`;
    else if (view === 'type')   url += `?${value}=${slug}&page=${page}`;
    window.history.pushState({}, '', url);
    appRouter();
    window.scrollTo(0, 0);
};

const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) nav('search', e.target.value.trim());
};

/* Scroll slider by 4 cards at a time */
window.slide = (id, dir) => {
    const el = document.getElementById(id);
    if (!el) return;
    const card = el.querySelector('.VTFilms_HomeCard, .VTFilms_ActorCard, .VTFilms_GalleryCard');
    if (!card) { el.scrollBy({ left: dir * el.clientWidth * 0.55, behavior: 'smooth' }); return; }
    const gap = parseFloat(window.getComputedStyle(el).columnGap) || 11;
    el.scrollBy({ left: dir * (card.offsetWidth + gap) * 4, behavior: 'smooth' });
};

/**
 * [v4.1.0] vtfInitSliderArrows(trackEl)
 * Attach scroll listener to a .VTFilms_Slider-track element.
 * Hides --prev arrow at start (scrollLeft≈0), hides --next at end.
 */
function vtfInitSliderArrows(trackEl) {
    if (!trackEl) return;
    const outer   = trackEl.closest('.VTFilms_Slider-outer');
    if (!outer) return;
    const prevBtn = outer.querySelector('.VTFilms_Slider-arrow--prev');
    const nextBtn = outer.querySelector('.VTFilms_Slider-arrow--next');
    if (!prevBtn && !nextBtn) return;

    const update = () => {
        const atStart = trackEl.scrollLeft <= 2;
        const atEnd   = trackEl.scrollLeft + trackEl.clientWidth >= trackEl.scrollWidth - 2;
        if (prevBtn) prevBtn.classList.toggle('VTFilms_Slider-arrow--hidden', atStart);
        if (nextBtn) nextBtn.classList.toggle('VTFilms_Slider-arrow--hidden', atEnd);
    };

    trackEl.addEventListener('scroll', update, { passive: true });
    // Run immediately (rAF so widths are computed) — Prev hidden at index 0
    requestAnimationFrame(update);
}

/**
 * [v4.1.0] Init edge detection for ALL .VTFilms_Slider-track in CONFIG.ROOT.
 * Call after any full-page render.
 */
function vtfInitAllSliderArrows() {
    CONFIG.ROOT.querySelectorAll('.VTFilms_Slider-track').forEach(vtfInitSliderArrows);
}

/* ─────────────────────────────────────────────
   THEME SYSTEM — Dark mode only (no toggle)
───────────────────────────────────────────── */
document.documentElement.setAttribute('data-theme', 'dark');

/* ─────────────────────────────────────────────
   MENU SCROLL EFFECT
   Adds --scrolled class after 50px scroll
───────────────────────────────────────────── */
(function initMenuScroll() {
    const applyScroll = () => {
        const menu = document.querySelector('.VTFilms_Menu');
        if (!menu) return;
        menu.classList.toggle('VTFilms_Menu--scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', applyScroll, { passive: true });
    applyScroll();
})();

/* ─────────────────────────────────────────────
   MOBILE DRAWER
───────────────────────────────────────────── */
window.vtDrawerOpen = () => {
    document.getElementById('vtDrawer')?.classList.add('open');
    document.getElementById('vtDrawerOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
};
window.vtDrawerClose = () => {
    document.getElementById('vtDrawer')?.classList.remove('open');
    document.getElementById('vtDrawerOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
};
window.vtDrawerSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
        vtDrawerClose();
        nav('search', e.target.value.trim());
    }
};

/* ═══════════════════════════════════════════════════════════════
   ██ VTF FANCYBOX — Gallery Lightbox (ISOLATED BLOCK)
   ─────────────────────────────────────────────────────────────
   Scoped exclusively to #VTFilms_galleryTrack [data-fancybox]
   Do NOT edit code outside this block for lightbox behaviour.
   Fancybox v5 CDN is loaded in <head>.
   Entry point: window.vtfBindFancybox() — called after gallery
   images are injected into DOM by initGalleryLazy().
═══════════════════════════════════════════════════════════════ */
(function initVTFancybox() {
    window.vtfBindFancybox = function () {
        if (typeof Fancybox === 'undefined') {
            /* Fancybox not yet loaded — retry after short delay */
            setTimeout(window.vtfBindFancybox, 200);
            return;
        }
        /* Unbind any previous instances on this container */
        Fancybox.unbind('#VTFilms_galleryTrack a[data-fancybox="vtf-gallery"]');
        /* Bind only to anchors inside the gallery slider track */
        Fancybox.bind('#VTFilms_galleryTrack a[data-fancybox="vtf-gallery"]', {
            groupAll: false,
            Hash: false,          /* ← Disable URL hash changes entirely */
            Toolbar: {
                display: {
                    left: [],
                    middle: ['infobar'],
                    right: ['close']
                }
            },
            Carousel: { infinite: true },
            Images: { zoom: false }
        });
    };
})();
/* ── END VTF FANCYBOX BLOCK ── */

/* ─────────────────────────────────────────────
   FANCYBOX GLOBAL DEFAULTS
   Disable URL hash / browser history manipulation
   so lightbox never changes or clears the URL
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Fancybox !== 'undefined') {
        Fancybox.defaults.Hash = false;
    }
});

/* HTML helpers */
const pageLoaderHtml = () => `
<div id="vtf-page-loader" class="VTFilms_PageLoader">
    <div class="VTFilms_PageLoader-spinner">
        <svg fill='var(--vtf-primary)' enable-background='new 0 0 992 992' id='Layer_1' version='1.1' viewBox='0 0 992 992' width='99' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'> <path d=' M537.072266,790.994934   C518.384460,823.271484 499.881897,855.232605 481.546600,886.904846   C478.881500,886.932983 478.519226,885.252380 477.814240,884.032715   C449.972229,835.864990 422.152496,787.684387 394.315430,739.513794   C390.315125,732.591492 386.319824,725.663940 382.164368,718.834900   C380.506805,716.110901 380.462708,713.887695 382.125458,711.018250   C426.808105,633.910156 471.397614,556.748169 516.004395,479.596100   C524.258179,465.320282 532.502258,451.038788 540.782654,436.778381   C545.431152,428.772736 544.592163,427.275574 535.083252,427.237640   C518.919495,427.173157 502.752899,427.023346 486.593201,427.275269   C481.969421,427.347321 479.380280,425.745056 477.107635,421.790588   C447.725372,370.664581 418.193115,319.624817 388.704956,268.559662   C386.049835,263.961761 383.438019,259.338867 379.894104,253.129639   C385.960632,253.129639 390.803619,253.110168 395.646393,253.132751   C431.301971,253.299011 466.956360,252.964279 502.614929,253.440689   C531.431396,253.825653 560.260315,253.186874 589.083862,253.148209   C638.565613,253.081833 688.054443,252.618851 737.526855,253.301346   C772.849670,253.788635 808.158020,252.737198 843.472717,253.321091   C846.685547,253.374207 848.234192,254.640961 849.695862,257.176147   C881.311340,312.012695 912.985779,366.815247 944.634949,421.632355   C945.440491,423.027618 946.591370,424.321869 946.523254,426.153778   C944.361511,427.828064 941.948669,427.139038 939.723450,427.140350   C877.900391,427.176880 816.077271,427.210663 754.254578,427.063690   C749.389282,427.052124 746.563293,428.368378 743.998535,432.817963   C682.519409,539.473328 620.854248,646.021362 559.227478,752.591614   C551.890320,765.279602 544.580139,777.983154 537.072266,790.994934  M819.889526,322.563171   C819.395142,321.694672 818.778259,320.872894 818.426147,319.950104   C816.044861,313.709869 811.857849,311.803955 804.977356,311.842102   C744.648071,312.176819 684.316345,312.063019 623.985291,312.061981   C579.153809,312.061188 534.322266,312.028320 489.490753,312.015198   C482.944855,312.013306 482.075104,313.355286 485.232697,318.848877   C493.949249,334.014130 502.731812,349.141418 511.469452,364.294556   C512.931519,366.830078 514.423218,368.791748 517.951172,368.753387   C558.773682,368.309479 599.602661,369.267975 640.423889,368.212158   C642.548523,368.157196 644.742676,367.995361 646.466614,369.508209   C646.796143,370.938385 645.950256,371.853851 645.381775,372.839539   C635.644958,389.723267 625.897766,406.600983 616.147461,423.476898   C576.307068,492.433197 536.462280,561.386963 496.624573,630.344788   C481.206879,657.032288 465.843597,683.751404 450.341980,710.390015   C448.438293,713.661377 448.402344,716.329529 450.331238,719.611450   C459.192932,734.689331 467.808929,749.911377 476.610535,765.024963   C479.793884,770.491150 481.213623,770.492065 484.345154,765.150940   C490.243134,755.091309 496.025574,744.963806 501.852203,734.862366   C537.729919,672.662231 573.562988,610.436157 609.496277,548.268127   C642.844788,490.571930 676.359741,432.971771 709.598022,375.212311   C712.350708,370.428802 715.243408,368.482300 720.894104,368.520233   C760.057373,368.783051 799.223328,368.673859 838.388367,368.649750   C844.888184,368.645752 845.635620,367.338776 842.437500,361.751801   C835.071777,348.884094 827.663818,336.040588 819.889526,322.563171  z' opacity='1.000000' stroke='none'/> <path d=' M188.102264,382.835175   C163.279175,339.887726 138.642349,297.257141 113.141380,253.131256   C119.858635,253.131256 125.113457,253.120575 130.368240,253.132904   C190.193649,253.273224 250.019073,253.456223 309.844482,253.465607   C313.559967,253.466187 315.126831,255.231369 316.719513,257.989685   C342.292236,302.279297 367.915436,346.539734 393.532959,390.803467   C410.804230,420.645935 428.072968,450.489929 445.383789,480.309418   C446.696198,482.570129 447.637421,484.512726 446.072235,487.195251   C435.997070,504.463043 426.061462,521.812195 416.063263,539.125000   C415.576385,539.968079 415.156158,540.937561 413.884003,541.255676   C411.952515,541.072021 411.607605,539.190308 410.826355,537.837036   C378.762604,482.292603 346.731018,426.729584 314.677948,371.178986   C304.187378,352.997955 293.581360,334.883057 283.194855,316.642944   C281.313202,313.338501 279.077026,311.939941 275.252472,311.976196   C258.088135,312.138824 240.921509,312.038818 223.755890,312.090637   C216.543533,312.112396 215.631409,313.705109 219.267776,320.001587   C240.013321,355.923126 260.782440,391.831055 281.564423,427.731537   C313.944000,483.666565 346.337646,539.593506 378.738495,595.516235   C380.138489,597.932495 380.874237,600.095947 379.222107,602.916992   C369.035461,620.311523 359.021393,637.807129 348.929565,655.257324   C348.610321,655.809326 348.069458,656.233154 346.872345,657.556152   C293.847748,565.805542 241.068130,474.478760 188.102264,382.835175  z' opacity='1.000000' stroke='none'/> </svg>
        <span class="VTFilms_PageLoader-text fw-bold d-none" style="color:var(--vtf-primary)">VT Films</span>
    </div>
</div>`;

const sectionLoaderHtml = (id) =>
    `<div id="${id}" class="VTFilms_SectionPlaceholder VTFilms_FadeIn">
        <div class="VTFilms_SectionLoader">
            <i class="fa-duotone fa-spinner-third fa-spin"></i>
        </div>
     </div>`;

/* ─────────────────────────────────────────────
   FADE-OUT PAGE LOADER
   Waits for CSS transition to complete before
   the render function replaces content.
───────────────────────────────────────────── */
function vtfFadeOutLoader() {
    return new Promise(resolve => {
        const loader = document.getElementById('vtf-page-loader');
        if (!loader) { resolve(); return; }
        loader.classList.add('VTFilms_PageLoader--exit');
        setTimeout(resolve, 0);
    });
}

/* ─────────────────────────────────────────────
   FOOTER HTML
───────────────────────────────────────────── */
function footerHtml() {
    const year = new Date().getFullYear();
    return `
    <footer class="VTFilms_Footer">
        <div class="VTFilms_Footer-top">
            <!-- Brand -->
            <div class="VTFilms_Footer-brand">
                <div class="VTFilms_Footer-logo" onclick="nav('home')">
                    <i class="fa-duotone fa-circle-play"></i>
                    <span>VT Films</span>
                </div>
                <p class="VTFilms_Footer-tagline">
                    Xem phim online miễn phí, chất lượng cao. Phim bộ, phim lẻ, phim chiếu rạp với phụ đề và thuyết minh tiếng Việt.
                </p>
                <div class="VTFilms_Footer-socials">
                    <a class="VTFilms_Footer-social VTFilms_Footer-social--fb" href="//fb.me/admin.vutruong.vn" target="_blank" title="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
                    <a class="VTFilms_Footer-social VTFilms_Footer-social--yt" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
                    <a class="VTFilms_Footer-social VTFilms_Footer-social--tg" title="Telegram"><i class="fa-brands fa-telegram"></i></a>
                    <a class="VTFilms_Footer-social VTFilms_Footer-social--tiktok" href="//tiktok.com/@vutruong.vn" target="_blank" title="TikTok"><i class="fa-brands fa-tiktok"></i></a>
                </div>
            </div>

            <!-- Danh sách -->
            <div>
                <div class="VTFilms_Footer-col-title">Danh Sách</div>
                <div class="VTFilms_Footer-links">
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','danh-sach','phim-moi')"><i class="fa-duotone fa-fire-flame-curved"></i> Phim Mới</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','danh-sach','phim-le')"><i class="fa-duotone fa-film"></i> Phim Lẻ</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','danh-sach','phim-bo')"><i class="fa-duotone fa-tv-retro"></i> Phim Bộ</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','danh-sach','hoat-hinh')"><i class="fa-duotone fa-wand-magic-sparkles"></i> Hoạt Hình</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','danh-sach','phim-vietsub')"><i class="fa-duotone fa-subtitles"></i> Vietsub</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','danh-sach','phim-thuyet-minh')"><i class="fa-duotone fa-microphone"></i> Thuyết Minh</a>
                </div>
            </div>

            <!-- Thể loại -->
            <div>
                <div class="VTFilms_Footer-col-title">Thể Loại</div>
                <div class="VTFilms_Footer-links">
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','the-loai','hanh-dong')"><i class="fa-duotone fa-burst"></i> Hành Động</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','the-loai','tinh-cam')"><i class="fa-duotone fa-heart"></i> Tình Cảm</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','the-loai','kinh-di')"><i class="fa-duotone fa-ghost"></i> Kinh Dị</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','the-loai','hai-huoc')"><i class="fa-duotone fa-face-laugh"></i> Hài Hước</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','the-loai','co-trang')"><i class="fa-duotone fa-torii-gate"></i> Cổ Trang</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','the-loai','vien-tuong')"><i class="fa-duotone fa-rocket"></i> Viễn Tưởng</a>
                </div>
            </div>

            <!-- Quốc gia -->
            <div>
                <div class="VTFilms_Footer-col-title">Quốc Gia</div>
                <div class="VTFilms_Footer-links">
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','quoc-gia','han-quoc')"><i class="fa-duotone fa-flag"></i> Hàn Quốc</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','quoc-gia','trung-quoc')"><i class="fa-duotone fa-flag"></i> Trung Quốc</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','quoc-gia','au-my')"><i class="fa-duotone fa-flag"></i> Âu Mỹ</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','quoc-gia','viet-nam')"><i class="fa-duotone fa-flag"></i> Việt Nam</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','quoc-gia','nhat-ban')"><i class="fa-duotone fa-flag"></i> Nhật Bản</a>
                    <a class="VTFilms_Footer-link" href="javascript:nav('type','quoc-gia','thai-lan')"><i class="fa-duotone fa-flag"></i> Thái Lan</a>
                </div>
            </div>
        </div>

        <hr class="VTFilms_Footer-divider">

        <div class="VTFilms_Footer-bottom">
            <div class="VTFilms_Footer-copy">
                &copy; ${year} <strong>VT Films</strong>
            </div>
            <div class="VTFilms_Footer-badges">
                <span class="VTFilms_Footer-badge VTFilms_Footer-badge--free"><i class="fad fa-circle-check"></i> Miễn phí</span>
                <span class="VTFilms_Footer-badge VTFilms_Footer-badge--api"><i class="fad fa-gauge-max"></i> Tốc độ cao</span>
                <span class="VTFilms_Footer-badge VTFilms_Footer-badge--bs"><i class="fad fa-ban"></i> Không quảng cáo</span>
            </div>
        </div>
    </footer>`;
}

/* ─────────────────────────────────────────────
   NAVBAR — 3-zone layout
   Left: logo + search | Center: nav | Right: actions
───────────────────────────────────────────── */
async function buildNavbar() {
    const [catRes, cntRes] = await Promise.all([
        fetchJson(`${CONFIG.API}/the-loai`),
        fetchJson(`${CONFIG.API}/quoc-gia`)
    ]);

    const buildDropItems = (res, type) =>
        res?.data?.items?.map(i =>
            `<a href="javascript:nav('type','${type}','${i.slug}')" class="VTFilms_Menu-dropdown-item">${i.name}</a>`
        ).join('') || '';

    /* Danh Sách items (static predefined list) */
    const danhSachItems = [
        { label:'Phim Mới',              slug:'phim-moi'          },
        { label:'Phim Bộ',               slug:'phim-bo'           },
        { label:'Phim Lẻ',               slug:'phim-le'           },
        { label:'TV Shows',              slug:'tv-shows'          },
        { label:'Hoạt Hình',             slug:'hoat-hinh'         },
        { label:'Phim Vietsub',          slug:'phim-vietsub'      },
        { label:'Phim Thuyết Minh',      slug:'phim-thuyet-minh'  },
        { label:'Phim Lồng Tiếng',       slug:'phim-long-tieng'   },
        { label:'Phim Bộ Đang Chiếu',    slug:'phim-bo-dang-chieu'},
        { label:'Phim Bộ Đã Hoàn Thành', slug:'phim-bo-da-hoan-thanh'},
        { label:'Phim Sắp Chiếu',        slug:'phim-sap-chieu'    },
        { label:'Subteam',               slug:'subteam'           },
        { label:'Phim Chiếu Rạp',        slug:'phim-chieu-rap'    },
    ];
    const danhSachHtml = danhSachItems.map(i =>
        `<a href="javascript:nav('type','danh-sach','${i.slug}')" class="VTFilms_Menu-dropdown-item">${i.label}</a>`
    ).join('');

    return `
    <nav class="VTFilms_Menu">

        <!-- Left: logo + search -->
        <div class="VTFilms_Menu-left">
            <a href="javascript:nav('home')" class="VTFilms_Menu-logo">
                <i class="fa-duotone fa-circle-play VTFilms_Menu-logo-icon"></i>
                <span>VT Films</span>
            </a>
            <div class="VTFilms_Menu-search">
                <i class="fad fa-magnifying-glass VTFilms_Menu-search-icon"></i>
                <input type="text" class="VTFilms_Menu-search-input"
                       placeholder="Tìm kiếm phim..."
                       onkeypress="handleSearch(event)">
            </div>
        </div>

        <!-- Center: nav links (hidden on mobile) -->
        <div class="VTFilms_Menu-center d-none d-xl-flex">
            <a href="javascript:nav('home')" class="VTFilms_Menu-link">
                <i class="fa-duotone fa-house-chimney"></i> Trang chủ
            </a>
            <a href="javascript:nav('type','danh-sach','phim-moi')" class="VTFilms_Menu-link">
                <i class="fa-duotone fa-fire-flame-curved"></i> Phim Mới
            </a>
            <a href="javascript:nav('type','danh-sach','phim-le')" class="VTFilms_Menu-link">
                <i class="fa-duotone fa-film"></i> Phim Lẻ
            </a>
            <a href="javascript:nav('type','danh-sach','phim-bo')" class="VTFilms_Menu-link">
                <i class="fa-duotone fa-tv-retro"></i> Phim Bộ
            </a>

            <!-- Danh Sách dropdown -->
            <div class="dropdown">
                <span class="VTFilms_Menu-link dropdown-toggle dropdown-menu-end"
                      data-bs-toggle="dropdown" data-bs-auto-close="outside"
                      role="button" aria-expanded="false">
                    <i class="fa-duotone fa-list-ul"></i> Danh Sách <i class="fa-duotone fa-angle-down" style="font-size:0.7rem;opacity:.7"></i>
                </span>
                <div class="dropdown-menu VTFilms_Menu-dropdown">
                    ${danhSachHtml}
                </div>
            </div>

            <!-- Thể Loại dropdown -->
            <div class="dropdown">
                <span class="VTFilms_Menu-link dropdown-toggle dropdown-menu-end"
                      data-bs-toggle="dropdown" data-bs-auto-close="outside"
                      role="button" aria-expanded="false">
                    <i class="fa-duotone fa-layer-group"></i> Thể Loại <i class="fa-duotone fa-angle-down" style="font-size:0.7rem;opacity:.7"></i>
                </span>
                <div class="dropdown-menu VTFilms_Menu-dropdown">
                    ${buildDropItems(catRes, 'the-loai')}
                </div>
            </div>

            <!-- Quốc Gia dropdown -->
            <div class="dropdown">
                <span class="VTFilms_Menu-link dropdown-toggle"
                      data-bs-toggle="dropdown" data-bs-auto-close="outside"
                      role="button" aria-expanded="false">
                    <i class="fa-duotone fa-globe"></i> Quốc Gia <i class="fa-duotone fa-angle-down" style="font-size:0.7rem;opacity:.7"></i>
                </span>
                <div class="dropdown-menu VTFilms_Menu-dropdown dropdown-menu-end">
                    ${buildDropItems(cntRes, 'quoc-gia')}
                </div>
            </div>
        </div>

        <!-- Right: user avatar/dropdown -->
        <div class="VTFilms_Menu-right d-none d-xl-flex align-items-center gap-1">
            <div id="vt-user-info" class="VTFilms_Menu-avatar">
                <i class="fa-duotone fa-user"></i>
            </div>
        </div>

        <!-- Hamburger (mobile only) -->
        <button class="VTFilms_Hamburger" onclick="vtDrawerOpen()" title="Menu">
            <i class="fad fa-bars"></i>
        </button>

    </nav>

    <!-- Mobile Drawer -->
    <div class="VTFilms_Drawer-overlay" id="vtDrawerOverlay" onclick="vtDrawerClose()"></div>
    <div class="VTFilms_Drawer" id="vtDrawer">
        <div class="VTFilms_Drawer-header">
            <div class="VTFilms_Drawer-logo">
                <i class="fa-duotone fa-circle-play"></i> VT Films
            </div>
            <button class="VTFilms_Drawer-close" onclick="vtDrawerClose()">
                <i class="fad fa-xmark"></i>
            </button>
        </div>
        <div class="VTFilms_Drawer-search">
            <div class="VTFilms_Drawer-search-wrap">
                <i class="fad fa-magnifying-glass"></i>
                <input type="text" class="VTFilms_Drawer-search-input"
                       placeholder="Tìm kiếm phim..."
                       onkeypress="vtDrawerSearch(event)">
            </div>
        </div>
        <div class="VTFilms_Drawer-nav">
            <div class="VTFilms_Drawer-section">Điều hướng</div>
            <div class="VTFilms_Drawer-link" onclick="nav('home');vtDrawerClose()">
                <i class="fa-duotone fa-house-chimney"></i> Trang chủ
            </div>
            <div class="VTFilms_Drawer-link" onclick="nav('type','danh-sach','phim-moi');vtDrawerClose()">
                <i class="fa-duotone fa-fire-flame-curved"></i> Phim Mới
            </div>
            <div class="VTFilms_Drawer-link" onclick="nav('type','danh-sach','phim-le');vtDrawerClose()">
                <i class="fa-duotone fa-film"></i> Phim Lẻ
            </div>
            <div class="VTFilms_Drawer-link" onclick="nav('type','danh-sach','phim-bo');vtDrawerClose()">
                <i class="fa-duotone fa-tv-retro"></i> Phim Bộ
            </div>

            <div class="VTFilms_Drawer-section">Danh sách</div>
            ${danhSachItems.map(i => `
            <div class="VTFilms_Drawer-link" onclick="nav('type','danh-sach','${i.slug}');vtDrawerClose()">
                <i class="fa-duotone fa-chevron-right" style="font-size:.7rem;opacity:.5"></i> ${i.label}
            </div>`).join('')}

            <div class="VTFilms_Drawer-section">Thể loại</div>
            ${catRes?.data?.items?.map(c => `
            <div class="VTFilms_Drawer-link" onclick="nav('type','the-loai','${c.slug}');vtDrawerClose()">
                <i class="fa-duotone fa-chevron-right" style="font-size:.7rem;opacity:.5"></i> ${c.name}
            </div>`).join('') || ''}

            <div class="VTFilms_Drawer-section">Quốc gia</div>
            ${cntRes?.data?.items?.map(c => `
            <div class="VTFilms_Drawer-link" onclick="nav('type','quoc-gia','${c.slug}');vtDrawerClose()">
                <i class="fa-duotone fa-chevron-right" style="font-size:.7rem;opacity:.5"></i> ${c.name}
            </div>`).join('') || ''}
        </div>
        <div class="VTFilms_Drawer-footer">
            VT Films &copy; 2025
        </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   MOVIE CARD (slider / related)
───────────────────────────────────────────── */
function movieCardHtml(m, cdnBase = CONFIG.IMG) {
    const img = getImgUrl(m.thumb_url, cdnBase);
    return `
    <div class="VTFilms_HomeCard VTFilms_FadeIn" onclick="nav('watch','${m.slug}')">
        <div class="VTFilms_HomeCard-poster-wrap">
            <img src="${img}" alt="${m.name}" class="VTFilms_HomeCard-poster" loading="lazy">
            <span class="VTFilms_HomeCard-badge">${m.episode_current || m.year || ''}</span>
        </div>
        <div class="VTFilms_HomeCard-title">${m.name}</div>
        <div class="VTFilms_HomeCard-sub">${m.origin_name || ''}</div>
    </div>`;
}

/* ─────────────────────────────────────────────
   SLIDER SECTION HTML
───────────────────────────────────────────── */
function sliderSectionHtml(id, title, highlight, movies, type, slug, cdnBase = CONFIG.IMG) {
    if (!movies?.length) return '';
    return `
    <div class="VTFilms_Slider VTFilms_FadeIn">
        <div class="VTFilms_Slider-header">
            <h2 class="VTFilms_Slider-title">${title} <span class="VTFilms_Slider-title-hi">${highlight}</span></h2>
            <a href="javascript:nav('type','${type}','${slug}')" class="VTFilms_Slider-viewall">
                Xem toàn bộ <i class="fad fa-arrow-right VTFilms_Slider-viewall-icon"></i>
            </a>
        </div>
        <div class="VTFilms_Slider-outer">
            <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--prev" onclick="slide('${id}',-1)">
                <i class="fad fa-arrow-left"></i>
            </button>
            <div class="VTFilms_Slider-track" id="${id}">
                ${movies.map(m => movieCardHtml(m, cdnBase)).join('')}
            </div>
            <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--next" onclick="slide('${id}',1)">
                <i class="fad fa-arrow-right"></i>
            </button>
        </div>
    </div>`;
}

/* ─────────────────────────────────────────────
   PAGINATION
───────────────────────────────────────────── */
function paginationHtml(type, slug, keyword, totalPages, current) {
    if (totalPages <= 1) return '';
    const link = (p) => keyword
        ? `javascript:nav('search','${keyword.replace(/'/g, "\\'")}','','',${p})`
        : `javascript:nav('type','${type}','${slug}','',${p})`;
    const max = 5;
    let s = Math.max(1, current - 2);
    let e = Math.min(totalPages, s + max - 1);
    if (e - s + 1 < max) s = Math.max(1, e - max + 1);

    let h = `<div class="VTFilms_Pagination">
        <a href="${current > 1 ? link(current-1) : '#'}" class="VTFilms_Pagination-btn ${current===1?'VTFilms_Pagination-btn--disabled':''}">
            <i class="fad fa-arrow-left"></i>
        </a>`;
    if (s > 1) { h += `<a href="${link(1)}" class="VTFilms_Pagination-btn">1</a>`; if (s > 2) h += `<span class="VTFilms_Pagination-ellipsis">…</span>`; }
    for (let i = s; i <= e; i++) h += `<a href="${link(i)}" class="VTFilms_Pagination-btn ${i===current?'VTFilms_Pagination-btn--active':''}">${i}</a>`;
    if (e < totalPages) { if (e < totalPages - 1) h += `<span class="VTFilms_Pagination-ellipsis">…</span>`; h += `<a href="${link(totalPages)}" class="VTFilms_Pagination-btn">${totalPages}</a>`; }
    h += `<a href="${current < totalPages ? link(current+1) : '#'}" class="VTFilms_Pagination-btn ${current===totalPages?'VTFilms_Pagination-btn--disabled':''}">
              <i class="fad fa-arrow-right"></i>
          </a></div>`;
    return h;
}

/* ─────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────── */
async function renderHome() {
    if (!CONFIG.ROOT) return;
    document.title = 'VT Films';
    CONFIG.ROOT.innerHTML = pageLoaderHtml();

    const [navbar, home] = await Promise.all([
        buildNavbar(),
        fetchJson(`${CONFIG.API}/home`)
    ]);

    const newestItems = home?.data?.items?.slice(0, 10) || []; // số lượng phim mới hiển thị ở slider Newest
    const cdn = (home?.data?.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live') + '/uploads/movies/';

    /* ── Batch-fetch individual film details to get landscape poster_url ──
       Home API only returns portrait thumbs. The /phim/:slug endpoint returns
       the actual landscape poster (poster_url) used on the detail hero.
    ── */
    const detailResults = await Promise.all(
        newestItems.map(item => fetchJson(`${CONFIG.API}/phim/${item.slug}`).catch(() => null))
    );

    /* Merge: enrich each newest item with full detail data */
    const enrichedItems = newestItems.map((item, idx) => {
        const detail = detailResults[idx]?.data?.item || {};
        const detailCdn = (detailResults[idx]?.data?.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live') + '/uploads/movies/';
        /* Use landscape poster from detail — falls back to item's own fields */
        const bgUrl    = getImgUrl(detail.poster_url || detail.thumb_url || item.poster_url || item.thumb_url, detailCdn);
        const thumbUrl = getImgUrl(item.thumb_url || item.poster_url, cdn);
        return { ...item, ...detail, _bgUrl: bgUrl, _thumbUrl: thumbUrl, _detailCdn: detailCdn };
    });

    /* ── Featured Newest Slider ── */
    const homeNewestHtml = `
    <div id="VTFilms_homeNewestWrap" class="VTFilms_HomeNewest">
        <!-- Progress bar — tiến trình tự động chuyển slide [v4.2.0] -->
        <div class="VTFilms_HN-progress"><div class="VTFilms_HN-progress-bar" id="vtHN-progress"></div></div>
        ${enrichedItems.map((item, i) => {
            const genres  = (item.category || []).map(c =>
                `<span class="VTFilms_HN-genre-chip" onclick="nav('type','the-loai','${c.slug}')">${c.name}</span>`
            ).join('');
            const country = (item.country || []).map(c => c.name).join(' · ');
            const desc    = stripHtml(item.content || '').slice(0, 260);
            const score   = item.imdb?.vote_average || item.tmdb?.vote_average || '';
            const season  = item.tmdb?.season || '';
            const isActive = i === 0;
            return `
            <div class="VTFilms_HN-slide${isActive ? ' VTFilms_HN-slide--active' : ''}" data-idx="${i}">
                <div class="VTFilms_HN-bg" style="background-image:url('${item._bgUrl}')"></div>
                <div class="VTFilms_HN-gradient-bottom"></div>
                <div class="VTFilms_HN-overlay">
                    <div class="VTFilms_HN-content">
      					<div class="VTFilms_HN-newestBadge opacity-50">Phim mới cập nhật</div>
                        <h1 class="VTFilms_HN-title">${item.name}</h1>
                        ${item.origin_name ? `<p class="VTFilms_HN-subtitle">${item.origin_name}</p>` : ''}

                        <!-- Info badges row -->
                        <div class="VTFilms_HN-info-row">
                            ${score ? `<span class="VTFilms_HN-badge VTFilms_HN-badge--imdb"><i class="fad fa-star"></i> IMDb ${score}</span>` : ''}
                            ${item.episode_current ? `<span class="VTFilms_HN-badge VTFilms_HN-badge--ep">${item.episode_current}</span>` : ''}
                            ${item.quality ? `<span class="VTFilms_HN-badge VTFilms_HN-badge--qual">${item.quality}</span>` : ''}
                            ${item.lang ? `<span class="VTFilms_HN-badge VTFilms_HN-badge--lang">${item.lang}</span>` : ''}
                            ${item.year ? `<span class="VTFilms_HN-badge VTFilms_HN-badge--year">${item.year}</span>` : ''}
							${country ? `<span class="VTFilms_HN-badge VTFilms_HN-badge--country">${country}</span>` : ''}
                        </div>

                        <!-- Genre chips -->
                        ${genres ? `<div class="VTFilms_HN-genres">${genres}</div>` : ''}

                        <!-- Description -->
                        ${desc ? `<p class="VTFilms_HN-desc">${desc}${desc.length >= 200 ? '...' : ''}</p>` : ''}

                        <!-- Action buttons -->
                        <div class="VTFilms_HN-actions">
                            <button class="VTFilms_HN-btn-play" onclick="nav('watch','${item.slug}')">
                                <i class="fad fa-play"></i> Xem phim
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('')}

        <!-- Poster thumbnail strip (portrait, bottom-right) -->
        <div class="VTFilms_HN-thumbs">
            ${enrichedItems.map((item, i) =>
                `<img src="${item._thumbUrl}"
                      class="VTFilms_HN-thumb${i === 0 ? ' VTFilms_HN-thumb--active' : ''}"
                      onclick="vtHNGo(${i})" loading="lazy" alt="${item.name}">`
            ).join('')}
        </div>

        <!-- Dot indicators -->
        <div class="VTFilms_HN-dots">
            ${enrichedItems.map((_, i) =>
                `<button class="VTFilms_HN-dot${i === 0 ? ' VTFilms_HN-dot--active' : ''}" onclick="vtHNGo(${i})"></button>`
            ).join('')}
        </div>

        <!-- Prev / Next navigation [v4.1.0] -->
        <button class="VTFilms_HN-arrow VTFilms_HN-arrow--prev VTFilms_HN-arrow--hidden"
                id="vtHN-prev" onclick="vtHNStep(-1)" aria-label="Phim trước">
            <i class="fad fa-arrow-left"></i>
        </button>
        <button class="VTFilms_HN-arrow VTFilms_HN-arrow--next${enrichedItems.length <= 1 ? ' VTFilms_HN-arrow--hidden' : ''}"
                id="vtHN-next" onclick="vtHNStep(1)" aria-label="Phim kế tiếp">
            <i class="fad fa-arrow-right"></i>
        </button>
    </div>`;

    /* Topics */
    const topicItems = [
        { label:'Thuyết Minh', 			 type:'danh-sach',  slug:'phim-thuyet-minh',  cls:'VTFilms_topic-1' },
        { label:'Lồng Tiếng Cực Mạnh',   type:'danh-sach',  slug:'phim-long-tieng',   cls:'VTFilms_topic-2' },
        { label:'Vietsub',   			 type:'danh-sach',  slug:'phim-vietsub',  cls:'VTFilms_topic-3' },
        { label:'Xuyên Không',           type:'the-loai',  slug:'vien-tuong', cls:'VTFilms_topic-4' },
        { label:'Cổ Trang',              type:'the-loai',  slug:'co-trang',   cls:'VTFilms_topic-5' },
        { label:'Phim Chiếu Rạp',        type:'danh-sach', slug:'phim-chieu-rap',    cls:'VTFilms_topic-6' },
        { label:'Phim Việt Nam',         type:'quoc-gia',  slug:'viet-nam',    cls:'VTFilms_topic-7' },
        { label:'TV Shows',         type:'danh-sach',  slug:'tv-shows',    cls:'VTFilms_topic-8' },
    ];
    const topicsHtml = `
    <div class="VTFilms_Topics VTFilms_FadeIn">
        <h3 class="VTFilms_Topics-heading">Bạn đang quan tâm gì?</h3>
        <div class="VTFilms_Topics-grid">
            ${topicItems.map(t => `
            <div class="VTFilms_Topic-card ${t.cls} VTFilms_FadeIn" onclick="nav('type','${t.type}','${t.slug}')">
                <span>${t.label}</span>
                <span class="VTFilms_Topic-card-sub">Xem chủ đề &rsaquo;</span>
            </div>`).join('')}
        </div>
    </div>`;

    /* Section placeholders */
    const sectionsHtml = HOME_SECTIONS.map(s => sectionLoaderHtml(s.id)).join('');

    await vtfFadeOutLoader();
    CONFIG.ROOT.innerHTML = navbar + homeNewestHtml + topicsHtml + sectionsHtml + footerHtml();

    /* ── HomeNewest auto-rotate ─────────────────────────────────────────────
       [v5.2.0] FIX: setInterval orphan + configurable timing + progress sync
       ─────────────────────────────────────────────────────────────────────
       THAY ĐỔI THỜI GIAN CHUYỂN SLIDE TẠI ĐÂY (milliseconds):         */
    const HN_SLIDE_MS = 4000; /* ◄── 8 giây, đổi số này để điều chỉnh  */
    /* ───────────────────────────────────────────────────────────────────── */

    // [v5.2.0] Dọn dẹp interval/timer của lần renderHome() trước (SPA re-enter)
    // Nếu không clear, mỗi lần về trang chủ sẽ tích lũy thêm 1 interval mới,
    // các interval cũ chạy với closure stale → slider nhảy loạn.
    if (window._vtHNInterval)    { clearInterval(window._vtHNInterval);  window._vtHNInterval    = null; }
    if (window._vtHNResumeTimer) { clearTimeout(window._vtHNResumeTimer); window._vtHNResumeTimer = null; }

    let hnIdx    = 0;
    let hnPaused = false;
    const hnSlides = CONFIG.ROOT.querySelectorAll('.VTFilms_HN-slide');
    const hnThumbs = CONFIG.ROOT.querySelectorAll('.VTFilms_HN-thumb');
    const hnDots   = CONFIG.ROOT.querySelectorAll('.VTFilms_HN-dot');
    const hnTotal  = hnSlides.length;

    /* Restart progress bar — duration khớp với HN_SLIDE_MS */
    function _hnResetProgress() {
        const pb = document.getElementById('vtHN-progress');
        if (!pb) return;
        pb.style.animation = 'none';
        void pb.offsetWidth;                               // force reflow
        pb.style.animation = `vtfHNProgress ${HN_SLIDE_MS / 1000}s linear forwards`;
    }

    /* Update HN prev/next arrow visibility based on current index */
    function vtfUpdateHNArrows(idx) {
        const prev = document.getElementById('vtHN-prev');
        const next = document.getElementById('vtHN-next');
        if (prev) prev.classList.toggle('VTFilms_HN-arrow--hidden', idx === 0);
        if (next) next.classList.toggle('VTFilms_HN-arrow--hidden', idx >= hnTotal - 1);
    }

    window.vtHNGo = (idx) => {
        hnSlides.forEach(s => s.classList.remove('VTFilms_HN-slide--active'));
        hnThumbs.forEach(t => t.classList.remove('VTFilms_HN-thumb--active'));
        hnDots.forEach(d => d.classList.remove('VTFilms_HN-dot--active'));
        hnSlides[idx]?.classList.add('VTFilms_HN-slide--active');
        hnThumbs[idx]?.classList.add('VTFilms_HN-thumb--active');
        hnDots[idx]?.classList.add('VTFilms_HN-dot--active');
        hnIdx = idx;
        vtfUpdateHNArrows(idx);
        _hnResetProgress(); // [v5.2.0] dùng helper — đồng bộ HN_SLIDE_MS
    };

    /* Step ±1 — clamped (no wrap) for manual navigation */
    window.vtHNStep = (dir) => {
        const next = Math.min(Math.max(hnIdx + dir, 0), hnTotal - 1);
        if (next === hnIdx) return;
        vtHNGo(next);
        hnPaused = true;
        clearTimeout(window._vtHNResumeTimer);
        window._vtHNResumeTimer = setTimeout(() => { hnPaused = false; }, HN_SLIDE_MS * 2);
    };

    const hnWrap = document.getElementById('VTFilms_homeNewestWrap');
    if (hnWrap) {
        let _tx = 0, _ty = 0;
        hnWrap.addEventListener('touchstart', e => { _tx = e.touches[0].clientX; _ty = e.touches[0].clientY; }, { passive: true });
        hnWrap.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - _tx;
            const dy = e.changedTouches[0].clientY - _ty;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) vtHNStep(dx < 0 ? 1 : -1);
        }, { passive: true });
    }

    if (hnTotal > 1) {
        // [v5.2.0] Khởi động slide 0 + progress bar, lưu interval ID để clear sau
        vtHNGo(0);
        window._vtHNInterval = setInterval(() => {
            if (!hnPaused) vtHNGo((hnIdx + 1) % hnTotal);
        }, HN_SLIDE_MS);
    }

    // [v4.1.0] Init edge detection for all film sliders after home content renders
    vtfInitAllSliderArrows();

    /* Section lazy loader via IntersectionObserver */
    const sectionObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            if (el.dataset.loaded) return;
            el.dataset.loaded = '1';
            sectionObs.unobserve(el);
            const s = HOME_SECTIONS.find(x => x.id === el.id);
            if (s) vtLoadHomeSection(el, s);
        });
    }, { rootMargin: '300px 0px' });

    HOME_SECTIONS.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) sectionObs.observe(el);
    });
}

async function vtLoadHomeSection(el, s) {
    const data  = await fetchJson(`${CONFIG.API}${s.api}?page=1`);
    const items = data?.data?.items || [];
    if (!items.length) { el.style.display = 'none'; return; }
    el.outerHTML = sliderSectionHtml(`${s.id}_t`, s.ti, s.hi, items, s.type, s.slug);
    // [v4.1.0] Init edge-detection arrows for the freshly rendered slider
    requestAnimationFrame(() => {
        const track = document.getElementById(`${s.id}_t`);
        if (track) vtfInitSliderArrows(track);
    });
}

/* ─────────────────────────────────────────────
   GRID PAGE
───────────────────────────────────────────── */
async function renderGrid(type, slug, keyword) {
    if (!CONFIG.ROOT) return;
    document.title = 'VT Films';
    CONFIG.ROOT.innerHTML = pageLoaderHtml();
    const params  = new URLSearchParams(window.location.search);
    const page    = parseInt(params.get('page')) || 1;
    const isSearch = !slug && !!keyword;

    let items = [], total = 0, totalPages = 1, baseTitle = 'Danh sách phim';

    if (!isSearch) {
        // ── Danh sách thường ─────────────────────────────────────────────────
        const endpoint = `/${type}/${slug}?page=${page}`;
        const [navbar, data] = await Promise.all([buildNavbar(), fetchJson(`${CONFIG.API}${endpoint}`)]);
        items      = data?.data?.items || [];
        const pag  = data?.data?.params?.pagination;
        total      = pag?.totalItems || 0;
        totalPages = Math.ceil(total / (pag?.totalItemsPerPage || 24));
        baseTitle  = data?.data?.titlePage || 'Danh sách phim';
        document.title = `${baseTitle} — VT Films`;
        await vtfFadeOutLoader();
        const navbar2 = await buildNavbar();
        CONFIG.ROOT.innerHTML = navbar2 + `
        <div class="VTFilms_Breadcrumb">
            <span class="VTFilms_Breadcrumb-item" onclick="nav('home')"><i class="fad fa-house" style="font-size:.75rem"></i> Trang chủ</span>
            <i class="fad fa-arrow-right VTFilms_Breadcrumb-sep"></i>
            <span class="VTFilms_Breadcrumb-current">${baseTitle}</span>
        </div>
        <div class="VTFilms_Grids">
            <div class="VTFilms_Grids-topbar">
                <div>
                    <h2 class="VTFilms_Grids-title">${baseTitle}</h2>
                    <span class="VTFilms_Grids-meta">Trang ${page}/${totalPages} &bull; ${total.toLocaleString('vi-VN')} kết quả</span>
                </div>
                <button class="VTFilms_Grids-filter-btn"><i class="fa-duotone fa-sliders"></i> Bộ lọc</button>
            </div>
            <div class="VTFilms_Grids-grid">
                ${items.map(m => `
                <div class="VTFilms_GridCard VTFilms_FadeIn" onclick="nav('watch','${m.slug}')">
                    <div class="VTFilms_GridCard-poster-wrap">
                        <img src="${CONFIG.IMG}${m.thumb_url}" alt="${m.name}" class="VTFilms_GridCard-poster" loading="lazy">
                        <span class="VTFilms_GridCard-badge">${m.episode_current || m.year || ''}</span>
                    </div>
                    <div class="VTFilms_GridCard-title">${m.name}</div>
                    <div class="VTFilms_GridCard-sub">${m.origin_name || ''} ${m.year ? '('+m.year+')' : ''}</div>
                </div>`).join('')}
            </div>
            ${paginationHtml(type, slug, keyword, totalPages, page)}
        </div>` + footerHtml();
        return;
    }

    // ── Tìm kiếm (chỉ theo tên phim) ────────────────────────────────────────
    const data = await fetchJson(`${CONFIG.API}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
    const displayItems = data?.data?.items || [];
    const pag  = data?.data?.params?.pagination;
    total      = pag?.totalItems || 0;
    totalPages = Math.ceil(total / (pag?.totalItemsPerPage || 24));
    const metaText = `${total.toLocaleString('vi-VN')} kết quả &bull; Trang ${page}/${totalPages}`;

    baseTitle = `Tìm kiếm: "${keyword}"`;
    document.title = `${baseTitle} — VT Films`;

    const emptyHtml = displayItems.length === 0 ? `
    <div class="VTFilms_Search-empty">
        <i class="fad fa-film-slash"></i>
        Không tìm thấy phim "<strong>${keyword}</strong>".
    </div>` : '';

    await vtfFadeOutLoader();
    const navbar = await buildNavbar();
    CONFIG.ROOT.innerHTML = navbar + `
    <div class="VTFilms_Breadcrumb">
        <span class="VTFilms_Breadcrumb-item" onclick="nav('home')"><i class="fad fa-house" style="font-size:.75rem"></i> Trang chủ</span>
        <i class="fad fa-arrow-right VTFilms_Breadcrumb-sep"></i>
        <span class="VTFilms_Breadcrumb-current">${baseTitle}</span>
    </div>
    <div class="VTFilms_Grids">
        <div class="VTFilms_Grids-topbar">
            <div>
                <h2 class="VTFilms_Grids-title">${baseTitle}</h2>
                <span class="VTFilms_Grids-meta">${metaText}</span>
            </div>
        </div>
        ${emptyHtml}
        <div class="VTFilms_Grids-grid">
            ${displayItems.map(m => `
            <div class="VTFilms_GridCard VTFilms_FadeIn" onclick="nav('watch','${m.slug}')">
                <div class="VTFilms_GridCard-poster-wrap">
                    <img src="${CONFIG.IMG}${m.thumb_url}" alt="${m.name}" class="VTFilms_GridCard-poster" loading="lazy">
                    <span class="VTFilms_GridCard-badge">${m.episode_current || m.year || ''}</span>
                </div>
                <div class="VTFilms_GridCard-title">${m.name}</div>
                <div class="VTFilms_GridCard-sub">${m.origin_name || ''} ${m.year ? '(' + m.year + ')' : ''}</div>
            </div>`).join('')}
        </div>
        ${totalPages > 1 ? paginationHtml('search', '', keyword, totalPages, page) : ''}
    </div>` + footerHtml();
}

/* ─────────────────────────────────────────────
   DETAIL PAGE — v3.2.0
───────────────────────────────────────────── */
async function renderDetail(slug) {
    if (!CONFIG.ROOT) return;
    document.title = 'Đang tải... — VT Films';
    CONFIG.ROOT.innerHTML = pageLoaderHtml();

    const [navbar, data, peopleData] = await Promise.all([
        buildNavbar(),
        fetchJson(`${CONFIG.API}/phim/${slug}`),
        fetchJson(`${CONFIG.API}/phim/${slug}/peoples`)
    ]);

    if (!data || data.status !== 'success') { nav('home'); return; }

    const m       = data.data.item;
    const cdn     = (data.data.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live') + '/uploads/movies/';
    const eps     = m.episodes?.[0]?.server_data || [];
    const startEp = eps[0];

    document.title = `${m.name} — VT Films`;

    const urlP = new URLSearchParams(window.location.search);
    if (urlP.has('ep')) { urlP.delete('ep'); window.history.replaceState({}, '', `${window.location.pathname}?${urlP}`); }

    const score    = m.imdb?.vote_average || m.tmdb?.vote_average || 'N/A';
    const director = m.director?.filter(Boolean).join(', ') || 'Đang cập nhật';
    const actNames = m.actor?.join(', ') || 'Đang cập nhật';
    const ctries   = m.country?.map(c => c.name).join(', ') || '';
    const altNames = m.alternative_names?.join(', ') || '';
    const genres   = m.category?.map(c =>
        `<span class="VTFilms_Genre-tag" onclick="nav('type','the-loai','${c.slug}')">${c.name}</span>`
    ).join('') || '';

    /* Build actor cards */
    const peoples     = peopleData?.data?.peoples || [];
    const profileSize = peopleData?.data?.profile_sizes?.w185 ? 'w185' : 'original';

    const buildActorCard = (name, character, dept, profilePath) => {
        const img = profilePath
            ? getTmdbImg(profilePath, profileSize) || `https://placehold.co/185x278?text=${encodeURIComponent((name||'?')[0])}`
            : `https://placehold.co/185x278?text=${encodeURIComponent((name||'?')[0])}`;
        return `
        <div class="VTFilms_Actor-card VTFilms_FadeIn">
            <div class="VTFilms_Actor-img-wrap">
                <img src="${img}" alt="${name||''}" class="VTFilms_Actor-img" loading="lazy">
            </div>
            <div class="VTFilms_Actor-info">
                <div class="VTFilms_Actor-name">${name || ''}</div>
                ${character ? `<div class="VTFilms_Actor-char">${character}</div>` : ''}
                ${dept ? `<div class="VTFilms_Actor-dept">${dept}</div>` : ''}
            </div>
        </div>`;
    };

    const actorsHtml = peoples.length > 0
        ? peoples.map(p => buildActorCard(p.name, p.character, p.known_for_department, p.profile_path)).join('')
        : (m.actor?.map(a => buildActorCard(a, '', 'Acting', null)).join('') || '');

    const posterUrl = getImgUrl(m.poster_url || m.thumb_url, cdn);
    const thumbUrl  = getImgUrl(m.thumb_url, cdn);
    const catSlug   = m.category?.[0]?.slug || '';

    /* Check if movie has actual episodes or only trailer */
    const hasEpisodes = eps.length > 0 && !!startEp?.link_embed;

    const html = navbar + `
    <!-- ── Breadcrumb ── -->
    <div class="VTFilms_Breadcrumb">
        <span class="VTFilms_Breadcrumb-item" onclick="nav('home')"><i class="fad fa-house" style="font-size:.75rem"></i> Trang chủ</span>
        <i class="fad fa-arrow-right VTFilms_Breadcrumb-sep"></i>
        ${catSlug ? `<span class="VTFilms_Breadcrumb-item" onclick="nav('type','the-loai','${catSlug}')">${m.category?.[0]?.name || 'Phim'}</span>` : `<span class="VTFilms_Breadcrumb-item">Phim</span>`}
        <i class="fad fa-arrow-right VTFilms_Breadcrumb-sep"></i>
        <span class="VTFilms_Breadcrumb-current">${m.name}</span>
    </div>

    <!-- ── Detail Hero ── -->
    <div class="VTFilms_Detail-hero" id="VTFilms_detailHero">
        <div class="VTFilms_Detail-hero-bg" style="background-image:url('${posterUrl}')"></div>
        <div class="VTFilms_Detail-hero-gradient"></div>
    </div>

    <!-- ── Player (hidden by default) ── -->
    <div class="VTFilms_Player-section" id="VTFilms_playerSection">
        <div class="VTFilms_Player-inner">
            <div class="VTFilms_Player-ratio ratio ratio-21x9">
                <iframe id="VTFilms_iframe" class="VTFilms_Player-iframe"
                        src="" allow="autoplay; fullscreen"></iframe>
            </div>
        </div>
    </div>

    <!-- ── Detail Body ── -->
    <div class="VTFilms_Detail-body" id="VTFilms_detailBody">
        <div class="VTFilms_Detail-layout">

            <!-- Poster + Meta below -->
            <div class="VTFilms_Detail-poster-col">
                <img src="${thumbUrl}" alt="${m.name}" class="VTFilms_Detail-poster pe-none">

                <!-- Meta table below poster — all data unified -->
                <div class="VTFilms_PosterMeta">
                    <div class="VTFilms_PosterMeta-table">
                        ${score !== 'N/A' ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">IMDb</span>
                            <div class="VTFilms_PosterMeta-value">
                                <span class="VTFilms_Meta-chip VTFilms_Meta-chip--yellow">${score}</span>
                            </div>
                        </div>` : ''}
                        ${m.year ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Năm</span>
                            <div class="VTFilms_PosterMeta-value">
        						<span class="VTFilms_Meta-chip VTFilms_Meta-chip--yellow">${m.year}</span>
							</div>
                        </div>` : ''}
                        ${m.time ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Thời lượng</span>
                            <div class="VTFilms_PosterMeta-value">
                                <span class="VTFilms_Meta-chip VTFilms_Meta-chip--purple"><i class="fa-regular fa-clock"></i> ${m.time}</span>
                            </div>
                        </div>` : ''}
                        ${m.lang ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Ngôn ngữ</span>
                            <div class="VTFilms_PosterMeta-value">
                                <span class="VTFilms_Meta-chip VTFilms_Meta-chip--pink">${m.lang}</span>
                            </div>
                        </div>` : ''}
                        ${m.quality ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Chất lượng</span>
                            <div class="VTFilms_PosterMeta-value">
                                <span class="VTFilms_Meta-chip VTFilms_Meta-chip--green">${m.quality}</span>
                            </div>
                        </div>` : ''}
                        ${m.episode_current ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Tập phim</span>
                            <div class="VTFilms_PosterMeta-value">
                                <span class="VTFilms_Meta-chip VTFilms_Meta-chip--orange">${m.episode_current}${m.episode_total ? ' / ' + m.episode_total : ''}</span>
                            </div>
                        </div>` : ''}
                        ${m.type ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Định dạng</span>
                            <div class="VTFilms_PosterMeta-value">
                                <span class="VTFilms_Meta-chip VTFilms_Meta-chip--blue" onclick="nav('type','danh-sach','${m.type==='single'?'phim-le':'phim-bo'}')">${m.type==='single'?'Phim Lẻ':'Phim Bộ'}</span>
                            </div>
                        </div>` : ''}
                        ${director !== 'Đang cập nhật' ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Đạo diễn</span>
                            <div class="VTFilms_PosterMeta-value">
                                ${m.director?.filter(Boolean).map(d =>
                                    `<span class="VTFilms_Meta-chip" onclick="nav('search','${d}')">${d}</span>`
                                ).join('') || director}
                            </div>
                        </div>` : ''}
                        ${ctries ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Quốc gia</span>
                            <div class="VTFilms_PosterMeta-value">
                                ${m.country?.map(c =>
                                    `<span class="VTFilms_Meta-chip VTFilms_Meta-chip--blue" onclick="nav('type','quoc-gia','${c.slug}')">${c.name}</span>`
                                ).join('') || ''}
                            </div>
                        </div>` : ''}
                        ${m.category?.length ? `
                        <div class="VTFilms_PosterMeta-row">
                            <span class="VTFilms_PosterMeta-label">Thể loại</span>
                            <div class="VTFilms_PosterMeta-value">
                                ${m.category.map(c =>
                                    `<span class="VTFilms_Meta-chip VTFilms_Meta-chip--purple" onclick="nav('type','the-loai','${c.slug}')">${c.name}</span>`
                                ).join('')}
                            </div>
                        </div>` : ''}
                    </div>
                    <!-- External links -->
                    <div class="VTFilms_PosterMeta-links">
                        ${m.tmdb?.id ? `<a href="https://www.themoviedb.org/${m.tmdb.type||'movie'}/${m.tmdb.id}" target="_blank" class="VTFilms_Btn-ext"><i class="fad fa-database"></i> TMDB</a>` : ''}
                        ${m.imdb?.id ? `<a href="https://www.imdb.com/title/${m.imdb.id}" target="_blank" class="VTFilms_Btn-ext"><i class="fad fa-star"></i> IMDb</a>` : ''}
                        ${m.trailer_url ? `<a href="${m.trailer_url}" target="_blank" class="VTFilms_Btn-ext"><i class="fad fa-play"></i> Trailer</a>` : ''}
                    </div>
                </div>
            </div>

            <!-- Info -->
            <div class="VTFilms_Detail-info-col">

                <h1 class="VTFilms_Detail-title">${m.name}</h1>
                <p class="VTFilms_Detail-origin">${m.origin_name || ''}</p>

                <!-- Action buttons -->
                <div class="VTFilms_Detail-actions">
                    ${hasEpisodes
                        ? `<button class="VTFilms_Btn-watch"
                                   data-embed="${(startEp?.link_embed||'').replace(/"/g,'&quot;')}"
                                   data-movie="${m.slug}"
                                   data-ep="${(startEp?.slug||'').replace(/"/g,'&quot;')}"
                                   onclick="vtWatchFirst(this)">
                               <i class="fad fa-play"></i> Xem phim
                           </button>`
                        : (m.trailer_url
                            ? `<a class="VTFilms_Btn-watch" href="${m.trailer_url}"
                                  data-fancybox="vtf-trailer"
                                  data-width="1800"
                                  data-height="900">
                                   <i class="fad fa-film"></i> Xem Trailer
                               </a>`
                            : `<button class="VTFilms_Btn-watch" disabled>
                                   <i class="fad fa-clock"></i> Sắp ra mắt
                               </button>`)
                    }
                    <button class="VTFilms_Btn-action"><i class="fad fa-heart"></i> Yêu thích</button>
                    <button class="VTFilms_Btn-action"><i class="fad fa-share"></i> Chia sẻ</button>
                </div>

                <!-- ── Sections: Episodes → Info → Actors → Gallery ── -->

                <!-- Section 1: Tập phim -->
                <div class="VTFilms_Detail-section">
                    <h3 class="VTFilms_Detail-section-title"><i class="fa-duotone fa-list-ol"></i> Tập phim</h3>
                    ${(m.episodes||[]).length > 1 ? `
                    <div class="VTFilms_Server-tabs" id="VTFilms_serverTabs">
                        ${(m.episodes||[]).map((srv, si) => `
                        <button class="VTFilms_Server-tab${si===0?' VTFilms_Server-tab--active':''}"
                                onclick="vtSwitchServer(${si},this)">
                            <i class="fad fa-server"></i> ${srv.server_name || 'Server '+(si+1)}
                        </button>`).join('')}
                    </div>` : ''}
                    <div class="VTFilms_Ep-section-label" id="VTFilms_serverLabel">
                        ${(m.episodes||[])[0]?.server_name ? `Server: ${m.episodes[0].server_name}` : 'Danh sách tập'}
                    </div>
                    <div class="VTFilms_Ep-grid" id="VTFilms_epGrid">
                        ${eps.map(ep => {
                            const label = m.type === 'single' ? (m.episode_current || 'Full') : `Tập ${ep.name}`;
                            return `<button class="VTFilms_Ep-btn"
                                            data-embed="${(ep.link_embed||'').replace(/"/g,'&quot;')}"
                                            data-movie="${m.slug}"
                                            data-ep="${(ep.slug||'').replace(/"/g,'&quot;')}">
                                        ${label}
                                    </button>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Section 2: Thông tin phim -->
                <div class="VTFilms_Detail-section">
                    <h3 class="VTFilms_Detail-section-title"><i class="fa-duotone fa-circle-info"></i> Thông tin phim</h3>
                    <div class="VTFilms_InfoCard VTFilms_InfoCard--flat">
                        <div class="VTFilms_InfoContent">${m.content || 'Đang cập nhật...'}</div>
                        ${altNames ? `<p class="VTFilms_InfoAltNames m-0 mt-3"><strong>Tên khác:</strong> ${altNames}</p>` : ''}
                    </div>
                </div>

                <!-- Section 3: Diễn viên (slider) -->
                ${peoples.length > 0 || m.actor?.length ? `
                <div class="VTFilms_Detail-section">
                    <h3 class="VTFilms_Detail-section-title"><i class="fa-duotone fa-users"></i> Diễn viên</h3>
                    <div class="VTFilms_Slider-outer" id="VTFilms_actorOuter">
                        <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--prev" onclick="slide('VTFilms_actorTrack',-1)">
                            <i class="fad fa-arrow-left"></i>
                        </button>
                        <div class="VTFilms_Slider-track" id="VTFilms_actorTrack">
                            ${peoples.length > 0
                                ? peoples.map(p => {
                                    const img = p.profile_path
                                        ? getTmdbImg(p.profile_path, profileSize)
                                        : `https://placehold.co/185x278?text=${encodeURIComponent((p.name||'?')[0])}`;
                                    return `<div class="VTFilms_ActorCard VTFilms_FadeIn">
                                        <div class="VTFilms_ActorCard-img-wrap">
                                            <img src="${img}" alt="${p.name||''}" class="VTFilms_ActorCard-img" loading="lazy">
                                        </div>
                                        <div class="VTFilms_ActorCard-name fs-6">${p.name||''}</div>
                                        ${p.character ? `<div class="VTFilms_ActorCard-char small">${p.character}</div>` : ''}
                                        ${p.known_for_department ? `<div class="VTFilms_ActorCard-dept small">${p.known_for_department}</div>` : ''}
                                    </div>`;
                                }).join('')
                                : (m.actor||[]).map(a => `
                                    <div class="VTFilms_ActorCard VTFilms_FadeIn">
                                        <div class="VTFilms_ActorCard-img-wrap">
                                            <img src="https://placehold.co/185x278?text=${encodeURIComponent((a||'?')[0])}" alt="${a}" class="VTFilms_ActorCard-img" loading="lazy">
                                        </div>
                                        <div class="VTFilms_ActorCard-name">${a}</div>
                                    </div>`).join('')
                            }
                        </div>
                        <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--next" onclick="slide('VTFilms_actorTrack',1)">
                            <i class="fad fa-arrow-right"></i>
                        </button>
                    </div>
                </div>` : ''}

                <!-- Section 4: Hình ảnh (gallery slider, lazy) -->
                <div class="VTFilms_Detail-section" id="VTFilms_gallerySection">
                    <h3 class="VTFilms_Detail-section-title"><i class="fa-duotone fa-images"></i> Hình ảnh</h3>
                    <div class="VTFilms_Slider-outer" id="VTFilms_galleryOuter">
                        <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--prev" onclick="slide('VTFilms_galleryTrack',-1)">
                            <i class="fad fa-arrow-left"></i>
                        </button>
                        <div class="VTFilms_Slider-track" id="VTFilms_galleryTrack">
                            <div class="VTFilms_SectionLoader">
                                <i class="fa-duotone fa-spinner-third fa-spin"></i>
                            </div>
                        </div>
                        <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--next" onclick="slide('VTFilms_galleryTrack',1)">
                            <i class="fad fa-arrow-right"></i>
                        </button>
                    </div>
                </div>

		<div id="VTFilms_relatedSection" class="VTFilms_Related-wrap p-0 mt-5"
             data-cat="${catSlug}" data-cur="${slug}">
            <div class="VTFilms_Slider p-0 m-0">
                <div class="VTFilms_Slider-header">
                    <h2 class="VTFilms_Slider-title">Phim <span class="VTFilms_Slider-title-hi">cùng thể loại</span></h2>
                    ${catSlug ? `<a href="javascript:nav('type','the-loai','${catSlug}')" class="VTFilms_Slider-viewall">Xem tất cả <i class="fad fa-arrow-right VTFilms_Slider-viewall-icon"></i></a>` : ''}
                </div>
                <div class="VTFilms_Slider-outer">
                    <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--prev" onclick="slide('VTFilms_relatedTrack',-1)">
                        <i class="fad fa-arrow-left"></i>
                    </button>
                    <div id="VTFilms_relatedTrack" class="VTFilms_Slider-track">
                        <div class="VTFilms_SectionLoader">
                            <i class="fa-duotone fa-spinner-third fa-spin"></i>
                        </div>
                    </div>
                    <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--next" onclick="slide('VTFilms_relatedTrack',1)">
                        <i class="fad fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- ── Phim cùng quốc gia (lazy) ── -->
        <div id="VTFilms_countrySection" class="VTFilms_Related-wrap p-0 mt-5"
             data-country="${m.country?.[0]?.slug || ''}" data-cur="${slug}">
            <div class="VTFilms_Slider p-0 m-0">
                <div class="VTFilms_Slider-header">
                    <h2 class="VTFilms_Slider-title">Phim <span class="VTFilms_Slider-title-hi">cùng quốc gia</span></h2>
                    ${m.country?.[0]?.slug ? `<a href="javascript:nav('type','quoc-gia','${m.country[0].slug}')" class="VTFilms_Slider-viewall">Xem tất cả <i class="fad fa-arrow-right VTFilms_Slider-viewall-icon"></i></a>` : ''}
                </div>
                <div class="VTFilms_Slider-outer">
                    <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--prev" onclick="slide('VTFilms_countryTrack',-1)">
                        <i class="fad fa-arrow-left"></i>
                    </button>
                    <div id="VTFilms_countryTrack" class="VTFilms_Slider-track">
                        <div class="VTFilms_SectionLoader">
                            <i class="fa-duotone fa-spinner-third fa-spin"></i>
                        </div>
                    </div>
                    <button class="VTFilms_Slider-arrow VTFilms_Slider-arrow--next" onclick="slide('VTFilms_countryTrack',1)">
                        <i class="fad fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>

            </div>
        </div>

        <!-- ── Phim Liên Quan (standalone, lazy) ── -->
        
    </div>`;

    await vtfFadeOutLoader();
    CONFIG.ROOT.innerHTML = html + footerHtml();

    /* Bind Fancybox for trailer button (data-fancybox="vtf-trailer") */
    if (typeof Fancybox !== 'undefined') {
        Fancybox.bind('[data-fancybox="vtf-trailer"]', {
            Hash: false,
            Toolbar: { display: { right: ['close'] } }
        });
    }

    /* vtWatchFirst — play first episode via the "Xem phim" hero button */
    window.vtWatchFirst = (heroBtnOrEl) => {
        // [v5.2.0] Đọc URL từ data-* thay vì inline params → tránh lỗi ký tự đặc biệt
        const embed = heroBtnOrEl?.dataset?.embed || '';
        const movie = heroBtnOrEl?.dataset?.movie || '';
        const ep    = heroBtnOrEl?.dataset?.ep    || '';
        if (!embed) return;
        // Highlight ep-btn tương ứng trong grid (nếu có)
        const firstEpBtn = document.querySelector('#VTFilms_epGrid .VTFilms_Ep-btn');
        vtShowPlayer(embed, movie, ep, firstEpBtn || null);
    };

    /* vtWatchTrailer — load trailer URL into player (no episode tracking) */
    window.vtWatchTrailer = (trailerUrl, movieSlug) => {
        if (!trailerUrl) return;
        const hero   = document.getElementById('VTFilms_detailHero');
        const player = document.getElementById('VTFilms_playerSection');
        const iframe = document.getElementById('VTFilms_iframe');
        const body   = document.getElementById('VTFilms_detailBody');
        window.history.pushState({}, '', `?watch=${movieSlug}`);
        if (hero)   hero.style.display   = 'none';
        if (player) player.style.display = 'block';
        if (iframe) iframe.src = trailerUrl;
        if (body)   { body.style.marginTop = '0'; body.style.paddingTop = '20px'; }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* Actor slider — [v4.1.0] use scroll-based edge detection (replaces count<=8 static check) */
    (function initActorSliderArrows() {
        const track = document.getElementById('VTFilms_actorTrack');
        if (track) requestAnimationFrame(() => vtfInitSliderArrows(track));
    })();

    /* Gallery lazy loader via IntersectionObserver */
    (function initGalleryLazy() {
        const track = document.getElementById('VTFilms_galleryTrack');
        if (!track) return;
        const obs = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting) return;
            obs.disconnect();
            const res  = await fetchJson(`${CONFIG.API}/phim/${slug}/images`);
            const imgs = res?.data?.images || [];
            if (!imgs.length) {
                track.innerHTML = `<p class="VTFilms_EmptyMsg" style="padding:16px 0">Chưa có gallery cho phim này.</p>`;
                /* [v4.1.0] Hide arrows via hidden class (edge detection) */
                const outer = document.getElementById('VTFilms_galleryOuter');
                if (outer) outer.querySelectorAll('.VTFilms_Slider-arrow').forEach(a => a.classList.add('VTFilms_Slider-arrow--hidden'));
                return;
            }
            const size    = res?.data?.image_sizes?.backdrop?.w780 ? 'w780' : 'original';
            const imgBase = `${CONFIG.TMDB}${size}`;
            const srcs = imgs.map(i => {
                const fp = i.file_path;
                if (!fp || typeof fp !== 'string') return null;
                return `${imgBase}${fp.startsWith('/') ? fp : '/' + fp}`;
            }).filter(Boolean);

            /* Render gallery cards with Fancybox anchors — scoped to #VTFilms_galleryTrack */
            track.innerHTML = srcs.map(src =>
                `<div class="VTFilms_GalleryCard VTFilms_FadeIn">
                    <a data-fancybox="vtf-gallery" href="${src}">
                        <img src="${src}" loading="lazy" class="VTFilms_GalleryCard-img" alt="">
                    </a>
                </div>`
            ).join('');

            /* Bind Fancybox to the gallery track only */
            setTimeout(() => { if (typeof vtfBindFancybox === 'function') vtfBindFancybox(); }, 50);

            // [v4.1.0] Init scroll-based edge detection (Prev hidden at start, Next hidden at end)
            requestAnimationFrame(() => vtfInitSliderArrows(track));
        }, { rootMargin: '300px 0px' });
        obs.observe(track);
    })();

    /* ── Episode grid event delegation ─────────────────────────────────────
       [v5.2.0] Thay inline onclick="vtShowPlayer('url',...)" bằng data-*
       attrs + event delegation để tránh lỗi URL có ký tự đặc biệt ('&/?#).   */
    const epGridEl = document.getElementById('VTFilms_epGrid');
    if (epGridEl) {
        epGridEl.addEventListener('click', e => {
            const btn = e.target.closest('.VTFilms_Ep-btn');
            if (!btn) return;
            vtShowPlayer(btn.dataset.embed, btn.dataset.movie, btn.dataset.ep, btn);
        });
    }

    /* Multi-server switcher */
    window.vtSwitchServer = (serverIdx, btn) => {
        CONFIG.ROOT.querySelectorAll('.VTFilms_Server-tab').forEach(b => b.classList.remove('VTFilms_Server-tab--active'));
        btn.classList.add('VTFilms_Server-tab--active');
        const srv = m.episodes?.[serverIdx];
        if (!srv) return;
        const label = document.getElementById('VTFilms_serverLabel');
        const grid  = document.getElementById('VTFilms_epGrid');
        if (label) label.textContent = `Server: ${srv.server_name || 'Server ' + (serverIdx + 1)}`;
        if (grid) {
            // [v5.2.0] data-* attributes thay inline onclick
            grid.innerHTML = (srv.server_data || []).map(ep => {
                const lbl = m.type === 'single' ? (m.episode_current || 'Full') : `Tập ${ep.name}`;
                return `<button class="VTFilms_Ep-btn"
                                data-embed="${(ep.link_embed || '').replace(/"/g, '&quot;')}"
                                data-movie="${m.slug}"
                                data-ep="${(ep.slug || '').replace(/"/g, '&quot;')}">
                            ${lbl}
                        </button>`;
            }).join('');
            // [v5.2.0] Highlight tập đầu sau khi đổi server (không auto-play)
            const firstBtn = grid.querySelector('.VTFilms_Ep-btn');
            if (firstBtn) firstBtn.classList.add('VTFilms_Ep-btn--active');
        }
    };

    /* Related section — "Phim cùng thể loại" — IntersectionObserver lazy load */
    const relatedEl = document.getElementById('VTFilms_relatedSection');
    if (relatedEl) {
        const relObs = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting) return;
            relObs.disconnect();
            const track = document.getElementById('VTFilms_relatedTrack');
            if (!track) return;
            const cat = relatedEl.dataset.cat;
            const cur = relatedEl.dataset.cur;
            if (!cat) { track.innerHTML = `<p class="VTFilms_EmptyMsg">Không có phim cùng thể loại.</p>`; return; }
            const res   = await fetchJson(`${CONFIG.API}/the-loai/${cat}?page=1`);
            const items = (res?.data?.items || []).filter(i => i.slug !== cur).slice(0, 24);
            track.innerHTML = items.map(i => movieCardHtml(i)).join('')
                || `<p class="VTFilms_EmptyMsg">Không có phim cùng thể loại.</p>`;
            // [v4.1.0] Init edge detection after content renders
            requestAnimationFrame(() => vtfInitSliderArrows(track));
        }, { rootMargin: '300px 0px' });
        relObs.observe(relatedEl);
    }

    /* Country section — "Phim cùng quốc gia" — IntersectionObserver lazy load */
    const countryEl = document.getElementById('VTFilms_countrySection');
    if (countryEl) {
        const cntObs = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting) return;
            cntObs.disconnect();
            const track   = document.getElementById('VTFilms_countryTrack');
            if (!track) return;
            const country = countryEl.dataset.country;
            const cur     = countryEl.dataset.cur;
            if (!country) { track.innerHTML = `<p class="VTFilms_EmptyMsg">Không có phim cùng quốc gia.</p>`; return; }
            const res   = await fetchJson(`${CONFIG.API}/quoc-gia/${country}?page=1`);
            const items = (res?.data?.items || []).filter(i => i.slug !== cur).slice(0, 24);
            track.innerHTML = items.map(i => movieCardHtml(i)).join('')
                || `<p class="VTFilms_EmptyMsg">Không có phim cùng quốc gia.</p>`;
            // [v4.1.0] Init edge detection after content renders
            requestAnimationFrame(() => vtfInitSliderArrows(track));
        }, { rootMargin: '300px 0px' });
        cntObs.observe(countryEl);
    }
}

/* ─────────────────────────────────────────────
   PLAYER
───────────────────────────────────────────── */
window.vtShowPlayer = (url, movieSlug, epSlug, btn = null) => {
    if (!url) return;
    const hero   = document.getElementById('VTFilms_detailHero');
    const player = document.getElementById('VTFilms_playerSection');
    const iframe = document.getElementById('VTFilms_iframe');
    const body   = document.getElementById('VTFilms_detailBody');

    window.history.pushState({}, '', `?watch=${movieSlug}${epSlug ? '&ep=' + epSlug.toLowerCase() : ''}`);
    const title = CONFIG.ROOT.querySelector('.VTFilms_Detail-title')?.innerText || '';
    document.title = `${title}${epSlug ? ' — Tập ' + epSlug.toUpperCase() : ''} — VT Films`;

    const src = url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    if (hero)   hero.style.display   = 'none';
    if (player) player.style.display = 'block';
    if (iframe) iframe.src = src;
    if (body)   { body.style.marginTop = '0'; body.style.paddingTop = '20px'; }

    if (btn) {
        CONFIG.ROOT.querySelectorAll('.VTFilms_Ep-btn').forEach(b => b.classList.remove('VTFilms_Ep-btn--active'));
        btn.classList.add('VTFilms_Ep-btn--active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ─────────────────────────────────────────────
   ROUTER
───────────────────────────────────────────── */
function appRouter() {
    if (!CONFIG.ROOT) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get('watch'))  return renderDetail(p.get('watch'));
    if (p.get('search')) return renderGrid('search', '', p.get('search'));
    for (const t of ['quoc-gia', 'the-loai', 'danh-sach']) {
        const s = p.get(t);
        if (s) return renderGrid(t, s);
    }
    renderHome();
}

window.onpopstate = function() {
    if (window.__VTF_READY && CONFIG.ROOT) appRouter();
};

function VTFilms_initApp(appEl) {
    if (appEl) CONFIG.ROOT = appEl;
    if (!CONFIG.ROOT) return;
    if (CONFIG.ROOT.dataset.vtfInited) return;
    CONFIG.ROOT.dataset.vtfInited = '1';
    initImgLazy();
    initScrollFadeIn();
    appRouter();
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.__VTF_READY) {
        const appEl = document.getElementById('vtfilms-app');
        if (appEl) {
            appEl.classList.remove('d-none');
            VTFilms_initApp(appEl);
        }
    }
});

/**
 * vtfilms-module — VT Films Firebase Auth (gộp chung với app)
 * films.vutruong.vn  (Blogger SPA embed, dynamic-import async IIFE)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGELOG:
 *  v6.0   Verification Gate, admin panel
 *  v6.1   verifiedUser:'revoked', 3 admin tabs
 *  v6.2   Unified listener, overlay transition mượt
 *  v6.3   SPA security: remove() thay d-none, Layer A/B pattern
 *  v6.3.1 Fix reload vô hạn: verifyStatus guard trong syncUserDoc
 *  v6.4   Cleanup & optimize
 *  v6.5   Fix force signout + Bootstrap Modal xóa user
 *  v7.0   Single persistent overlay; !snap.exists() → force signOut;
 *         Admin panel → standalone tại admin.vutruong.vn
 *  v7.5   Debounce null guard (FAILED — race condition gây auto-logout)
 *  v8.0   Xóa debounce, thêm getDoc safety (FAILED — getDoc delay gây bug user mới)
 *
 *  v9.0  ── DEFINITIVE REWRITE ──  2026-03-07
 *        Cơ sở: old-vtfilms-module.js v7.0 (phiên bản ổn định nhất trong production).
 *        Thích nghi cho Blogger SPA: dynamic import, lowercase app ID.
 *
 *        [FIX CRITICAL] User mới không đăng nhập được / trang reload ngay:
 *          ROOT CAUSE: v7.5/v8.0 thêm getDoc() trong syncUserDoc.
 *          getDoc() tạo network round-trip ~100-400ms. Trong thời gian đó,
 *          onSnapshot đã được attach và bắn "doc không tồn tại" với _lastStatus='pending'
 *          (≠ null) → trigger force signOut → reload trước khi setDoc kịp chạy.
 *          FIX: Xóa getDoc (revert về v6.3.1). setDoc() call Firestore local write
 *          ngay khi gọi (optimistic) → onSnapshot nhận được local write trước
 *          khi callback bắn lần đầu → snap.exists()=true → không trigger signOut.
 *          Guard bổ sung: verifyStatus cache (v6.3.1) ngăn overwrite doc cũ.
 *
 *        [FIX CRITICAL] Auto-logout ngẫu nhiên:
 *          ROOT CAUSE: Debounce timer (v7.5) race condition — _doSignedOut()
 *          có thể chạy sau khi user đã recovered, xóa session hợp lệ.
 *          FIX: Xóa hoàn toàn debounce. Dynamic import() tạo delay ~200-400ms
 *          đủ để Firebase đọc xong IndexedDB → first onAuthStateChanged callback
 *          = user thật, không cần debounce.
 *
 *        [FIX] startUnifiedListener: truyền verifyStatus (không ép 'pending').
 *          User mới: verifyStatus=null → _lastStatus=null → "doc chưa tồn tại" = chờ.
 *          Nếu có bất kỳ race nào còn sót: _lastStatus=null an toàn hơn _lastStatus='pending'.
 *
 *        [KEEP] Persistent SPA dropdown guard (MutationObserver liên tục, v7.0)
 *        [KEEP] Single persistent overlay / no-flicker realtime (v7.0)
 *        [KEEP] 2-layer transition: Layer A (antiFlash) / Layer B (listener)
 *        [NOTE] Admin panel: standalone tại admin.vutruong.vn
 * ─────────────────────────────────────────────────────────────────────────────
 */

(async () => {


// ── 1. FIREBASE DYNAMIC IMPORT ────────────────────────────────────────────────
// Dynamic import() tạo delay ~200-400ms (network/cache validation).
// Firebase đọc xong IndexedDB trong thời gian đó → first onAuthStateChanged = thật.
// Không cần debounce, không cần setPersistence.
const [
    { initializeApp },
    { getAnalytics },
    {
        getAuth,
        GoogleAuthProvider,
        signInWithCredential,
        signInWithPopup,
        signOut: VTFilms_fbSignOut,
        onAuthStateChanged,
    },
    {
        getFirestore,
        doc,
        setDoc,
        updateDoc,
        onSnapshot,
        serverTimestamp,
    },
] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js'),
]);


// ── 2. HẰNG SỐ & CẤU HÌNH ────────────────────────────────────────────────────
const VTFilms_VERSION = '9.0';
const VTFilms_DEBUG   = true; // false khi production

const VTFilms_ADMIN_UIDS = [
    'KU6FC2SAsmaE8qIu4EGU9J422On1', // admin@vutruong.vn
];

// Storage keys
const VTFilms_CACHE_KEY   = 'VTFilms_userCache';
const VTFilms_PROFILE_KEY = 'VTFilms_profileSaved';
const VTFilms_VERIFY_KEY  = 'VTFilms_verifyStatus';
const VTFilms_TAB_KEY     = 'VTFilms_tabActive';

const VTFilms_CLIENT_ID = '891750241616-234jksd5e2b301g838gr6t650hdobptk.apps.googleusercontent.com';

const VTFilms_log = {
    info:  (m, ...a) => VTFilms_DEBUG && console.log( `%c[VTFilms v${VTFilms_VERSION}]`,   'color:#dc3545;font-weight:bold', '→', m, ...a),
    ok:    (m, ...a) => VTFilms_DEBUG && console.log( `%c[VTFilms v${VTFilms_VERSION}] ✓`, 'color:#28a745;font-weight:bold', m, ...a),
    warn:  (m, ...a) => console.warn( `[VTFilms v${VTFilms_VERSION}] ⚠`, m, ...a),
    error: (m, ...a) => console.error(`[VTFilms v${VTFilms_VERSION}] ✗`, m, ...a),
};


// ── 3. FIREBASE INIT ──────────────────────────────────────────────────────────
VTFilms_log.info('Firebase v12.9.0 khởi tạo...');

const VTFilms_fbApp = initializeApp({
    apiKey:            'AIzaSyCyTqNXos2w80W9o6XHj7QkLaSoSU5MiOM',
    authDomain:        'vt-films-pj.firebaseapp.com',
    projectId:         'vt-films-pj',
    storageBucket:     'vt-films-pj.firebasestorage.app',
    messagingSenderId: '891750241616',
    appId:             '1:891750241616:web:78a48d2ee8d2fd71dd0855',
    measurementId:     'G-G8QD7CEKDF'
});

getAnalytics(VTFilms_fbApp);
const VTFilms_auth = getAuth(VTFilms_fbApp);
const VTFilms_db   = getFirestore(VTFilms_fbApp);

VTFilms_log.ok('Firebase sẵn sàng.');


// ── 4. HELPERS: PHÂN QUYỀN ───────────────────────────────────────────────────
function VTFilms_getRole(uid) {
    return VTFilms_ADMIN_UIDS.includes(uid) ? 'admin' : 'user';
}


// ── 5. STORAGE: localStorage ──────────────────────────────────────────────────
function VTFilms_saveCache(user) {
    try {
        localStorage.setItem(VTFilms_CACHE_KEY, JSON.stringify({
            uid: user.uid, name: user.name, email: user.email,
            avatar: user.avatar, role: user.role,
        }));
        VTFilms_log.info(`Cache UI lưu OK (${user.name} · ${user.role}).`);
    } catch (e) { VTFilms_log.warn('Lưu cache thất bại:', e.message); }
}

function VTFilms_getCache() {
    try { return JSON.parse(localStorage.getItem(VTFilms_CACHE_KEY)); } catch (_) { return null; }
}

function VTFilms_clearCache() {
    try { localStorage.removeItem(VTFilms_CACHE_KEY); } catch (_) {}
    VTFilms_log.info('Cache UI đã xóa.');
}

function VTFilms_isProfileSaved(uid) {
    try { return localStorage.getItem(VTFilms_PROFILE_KEY) === uid; } catch (_) { return false; }
}

function VTFilms_markProfileSaved(uid) {
    try { localStorage.setItem(VTFilms_PROFILE_KEY, uid); } catch (_) {}
    VTFilms_log.info(`Profile flag lưu OK (uid: ${uid}).`);
}

function VTFilms_clearProfileFlag() {
    try { localStorage.removeItem(VTFilms_PROFILE_KEY); } catch (_) {}
    VTFilms_log.info('Profile flag đã xóa.');
}


// ── 6. STORAGE: VERIFY STATUS CACHE ──────────────────────────────────────────
function VTFilms_getVerifyStatus(uid) {
    try {
        const raw = localStorage.getItem(VTFilms_VERIFY_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data.uid === uid ? data.status : null;
    } catch (_) { return null; }
}

function VTFilms_saveVerifyStatus(uid, status) {
    try {
        localStorage.setItem(VTFilms_VERIFY_KEY, JSON.stringify({ uid, status }));
        VTFilms_log.info(`Verify status lưu: ${status} (uid: ${uid}).`);
    } catch (e) { VTFilms_log.warn('Lưu verify status thất bại:', e.message); }
}

function VTFilms_clearVerifyStatus() {
    try { localStorage.removeItem(VTFilms_VERIFY_KEY); } catch (_) {}
    VTFilms_log.info('Verify status đã xóa.');
}


// ── 7. STORAGE: sessionStorage ────────────────────────────────────────────────
function VTFilms_isTabActive() {
    try { return !!sessionStorage.getItem(VTFilms_TAB_KEY); } catch (_) { return false; }
}

function VTFilms_markTabActive() {
    try { sessionStorage.setItem(VTFilms_TAB_KEY, '1'); } catch (_) {}
}

function VTFilms_clearTabGuard() {
    try { sessionStorage.removeItem(VTFilms_TAB_KEY); } catch (_) {}
    VTFilms_log.info('Tab guard đã xóa.');
}


// ── 8. FIRESTORE: SYNC USER DOCUMENT ─────────────────────────────────────────
//
// [v9.0] REVERTED TO v6.3.1 APPROACH — XÓA getDoc().
//
// Lý do xóa getDoc (đã có từ v7.2):
//   getDoc() thêm network round-trip ~100-400ms TRƯỚC khi setDoc được gọi.
//   Trong thời gian đó:
//     1. startUnifiedListener đã attach onSnapshot
//     2. Firestore bắn initial snapshot: "doc không tồn tại"
//     3. _lastStatus = verifyStatus (từ cache) = không phải null với user mới
//     4. → Trigger force signOut + reload → user mới không bao giờ được tạo document!
//
//   Với setDoc() KHÔNG có getDoc trước:
//     - setDoc() ghi LOCAL ngay khi gọi (Firestore optimistic/offline write)
//     - onSnapshot callback bắn TRONG event loop tiếp theo
//     - Tại thời điểm callback bắn: local write đã có → snap.exists() = true ✓
//
// [v6.3.1] Guard: verifyStatus cache != null → user cũ, profileSaved bị mất → skip setDoc.
//   Đây là bảo vệ chính chống overwrite document của user cũ.
//
async function VTFilms_syncUserDoc(fbUser) {
    const uid  = fbUser.uid;
    const role = VTFilms_getRole(uid);
    const ref  = doc(VTFilms_db, 'users', uid);

    if (VTFilms_isTabActive()) {
        VTFilms_log.info('syncUserDoc: tab guard → skip Firestore write.');
        return;
    }

    if (!VTFilms_isProfileSaved(uid)) {
        // [v6.3.1] verifyStatus cache là tín hiệu đáng tin cậy:
        // nếu != null → user cũ đã có document → profileSaved bị mất → chỉ restore flag.
        const cachedVerifyStatus = VTFilms_getVerifyStatus(uid);
        if (cachedVerifyStatus !== null) {
            VTFilms_log.info(`syncUserDoc: verifyStatus='${cachedVerifyStatus}' (user cũ, profileSaved mất) → restore flag, skip setDoc.`);
            VTFilms_markProfileSaved(uid);
            // Fall through → updateDoc lastLoginAt
        } else {
            // User mới thực sự: không có document lẫn verifyStatus cache
            const isAdmin = role === 'admin';
            VTFilms_log.info(`syncUserDoc: user MỚI (${fbUser.email}) → tạo document (verifiedUser: ${isAdmin})...`);
            try {
                // setDoc() ghi LOCAL ngay (optimistic write) trước khi await resolve.
                // onSnapshot sẽ nhận local write → snap.exists()=true trước force-signout guard.
                await setDoc(ref, {
                    uid,
                    email:        fbUser.email,
                    displayName:  fbUser.displayName || 'Người dùng',
                    photoURL:     fbUser.photoURL    || null,
                    provider:     'google',
                    role,
                    verifiedUser: isAdmin ? true : false,
                    createdAt:    serverTimestamp(),
                    lastLoginAt:  serverTimestamp(),
                });
                VTFilms_markProfileSaved(uid);
                VTFilms_markTabActive();
                VTFilms_log.ok(`syncUserDoc: document tạo OK: users/${uid} (role: ${role})`);
            } catch (err) {
                VTFilms_log.error('syncUserDoc: setDoc thất bại:', err.message);
            }
            return; // Không updateDoc thêm — lastLoginAt đã có trong setDoc
        }
    }

    // User cũ, tab mới → chỉ cập nhật lastLoginAt
    VTFilms_log.info(`syncUserDoc: user cũ (${fbUser.email}) → updateDoc lastLoginAt...`);
    try {
        await updateDoc(ref, { lastLoginAt: serverTimestamp() });
        VTFilms_markTabActive();
        VTFilms_log.ok(`syncUserDoc: lastLoginAt cập nhật OK: users/${uid}`);
    } catch (err) {
        VTFilms_log.warn('syncUserDoc: updateDoc thất bại (bỏ qua):', err.message);
    }
}


// ── 9. QUẢN LÝ DOM ───────────────────────────────────────────────────────────
let _VTF_appElRef = null;

/** [v6.3] Xóa #vtfilms-app khỏi DOM — bảo mật SPA. Giữ ref để có thể gắn lại khi user hợp lệ. */
function VTFilms_removeApp() {
    const el = document.getElementById('vtfilms-app');
    if (!el) return;
    _VTF_appElRef = el;
    el.remove();
    window.__VTF_READY = false;
    VTFilms_log.ok('#vtfilms-app đã xóa khỏi DOM (bảo mật SPA).');
}

/** Hiện #vtfilms-app — chỉ gọi khi user là admin hoặc đã approved. Tạo lại nếu đã bị remove. */
function VTFilms_showApp() {
    let el = document.getElementById('vtfilms-app');
    if (!el && _VTF_appElRef) {
        document.body.appendChild(_VTF_appElRef);
        el = _VTF_appElRef;
        _VTF_appElRef = null;
    }
    if (!el) {
        el = document.createElement('div');
        el.id = 'vtfilms-app';
        document.body.appendChild(el);
    }
    if (typeof CONFIG !== 'undefined') CONFIG.ROOT = el;
    el.classList.remove('d-none');
    window.__VTF_READY = true;
    VTFilms_log.ok('#vtfilms-app hiển thị, __VTF_READY = true.');
    if (typeof VTFilms_initApp === 'function') VTFilms_initApp();
}


// ── 10. OVERLAY ĐĂNG NHẬP ────────────────────────────────────────────────────
function VTFilms_showOverlay() {
    if (document.getElementById('VTFilms-overlay')) return;
    VTFilms_log.info('Tạo overlay đăng nhập...');

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-overlay';
    overlay.className = 'VTFilms-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.cssText = 'z-index:99999;background:var(--vtf-bg) url(https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEha0fNQ6dXNQNDIkusqFi64oz4eOTaUXR3t8tjxxRYqKcZGU51QZC_lwJ1iGLbLXEWSHAMQfOZpqEY0TcaivkTsL9XhNiZMymqmM8HvrdW_K0oNpPes1OOG86VtONZwG9-dEbQq4xQLHOgSWesmKKNWXg2c6_6bhOhCQ1HxNGxl6RMPeFsqa4nVUOBDaZY/s3000-rw/vtfilms-overlayBg.jpg) no-repeat center fixed;background-size:cover';

    overlay.innerHTML = `
        <div class="text-center position-relative" style="width:min(480px,calc(100vw - 28px));z-index:3">
            <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px;backdrop-filter:blur(24px);padding:36px 28px">
            <div class="mb-4 d-flex align-items-center justify-content-center gap-3">
                <svg fill='var(--vtf-primary)' enable-background='new 0 0 992 992' id='Layer_1' version='1.1' viewBox='0 0 992 992' width='70' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'> <path d=' M537.072266,790.994934   C518.384460,823.271484 499.881897,855.232605 481.546600,886.904846   C478.881500,886.932983 478.519226,885.252380 477.814240,884.032715   C449.972229,835.864990 422.152496,787.684387 394.315430,739.513794   C390.315125,732.591492 386.319824,725.663940 382.164368,718.834900   C380.506805,716.110901 380.462708,713.887695 382.125458,711.018250   C426.808105,633.910156 471.397614,556.748169 516.004395,479.596100   C524.258179,465.320282 532.502258,451.038788 540.782654,436.778381   C545.431152,428.772736 544.592163,427.275574 535.083252,427.237640   C518.919495,427.173157 502.752899,427.023346 486.593201,427.275269   C481.969421,427.347321 479.380280,425.745056 477.107635,421.790588   C447.725372,370.664581 418.193115,319.624817 388.704956,268.559662   C386.049835,263.961761 383.438019,259.338867 379.894104,253.129639   C385.960632,253.129639 390.803619,253.110168 395.646393,253.132751   C431.301971,253.299011 466.956360,252.964279 502.614929,253.440689   C531.431396,253.825653 560.260315,253.186874 589.083862,253.148209   C638.565613,253.081833 688.054443,252.618851 737.526855,253.301346   C772.849670,253.788635 808.158020,252.737198 843.472717,253.321091   C846.685547,253.374207 848.234192,254.640961 849.695862,257.176147   C881.311340,312.012695 912.985779,366.815247 944.634949,421.632355   C945.440491,423.027618 946.591370,424.321869 946.523254,426.153778   C944.361511,427.828064 941.948669,427.139038 939.723450,427.140350   C877.900391,427.176880 816.077271,427.210663 754.254578,427.063690   C749.389282,427.052124 746.563293,428.368378 743.998535,432.817963   C682.519409,539.473328 620.854248,646.021362 559.227478,752.591614   C551.890320,765.279602 544.580139,777.983154 537.072266,790.994934  M819.889526,322.563171   C819.395142,321.694672 818.778259,320.872894 818.426147,319.950104   C816.044861,313.709869 811.857849,311.803955 804.977356,311.842102   C744.648071,312.176819 684.316345,312.063019 623.985291,312.061981   C579.153809,312.061188 534.322266,312.028320 489.490753,312.015198   C482.944855,312.013306 482.075104,313.355286 485.232697,318.848877   C493.949249,334.014130 502.731812,349.141418 511.469452,364.294556   C512.931519,366.830078 514.423218,368.791748 517.951172,368.753387   C558.773682,368.309479 599.602661,369.267975 640.423889,368.212158   C642.548523,368.157196 644.742676,367.995361 646.466614,369.508209   C646.796143,370.938385 645.950256,371.853851 645.381775,372.839539   C635.644958,389.723267 625.897766,406.600983 616.147461,423.476898   C576.307068,492.433197 536.462280,561.386963 496.624573,630.344788   C481.206879,657.032288 465.843597,683.751404 450.341980,710.390015   C448.438293,713.661377 448.402344,716.329529 450.331238,719.611450   C459.192932,734.689331 467.808929,749.911377 476.610535,765.024963   C479.793884,770.491150 481.213623,770.492065 484.345154,765.150940   C490.243134,755.091309 496.025574,744.963806 501.852203,734.862366   C537.729919,672.662231 573.562988,610.436157 609.496277,548.268127   C642.844788,490.571930 676.359741,432.971771 709.598022,375.212311   C712.350708,370.428802 715.243408,368.482300 720.894104,368.520233   C760.057373,368.783051 799.223328,368.673859 838.388367,368.649750   C844.888184,368.645752 845.635620,367.338776 842.437500,361.751801   C835.071777,348.884094 827.663818,336.040588 819.889526,322.563171  z' opacity='1.000000' stroke='none'/> <path d=' M188.102264,382.835175   C163.279175,339.887726 138.642349,297.257141 113.141380,253.131256   C119.858635,253.131256 125.113457,253.120575 130.368240,253.132904   C190.193649,253.273224 250.019073,253.456223 309.844482,253.465607   C313.559967,253.466187 315.126831,255.231369 316.719513,257.989685   C342.292236,302.279297 367.915436,346.539734 393.532959,390.803467   C410.804230,420.645935 428.072968,450.489929 445.383789,480.309418   C446.696198,482.570129 447.637421,484.512726 446.072235,487.195251   C435.997070,504.463043 426.061462,521.812195 416.063263,539.125000   C415.576385,539.968079 415.156158,540.937561 413.884003,541.255676   C411.952515,541.072021 411.607605,539.190308 410.826355,537.837036   C378.762604,482.292603 346.731018,426.729584 314.677948,371.178986   C304.187378,352.997955 293.581360,334.883057 283.194855,316.642944   C281.313202,313.338501 279.077026,311.939941 275.252472,311.976196   C258.088135,312.138824 240.921509,312.038818 223.755890,312.090637   C216.543533,312.112396 215.631409,313.705109 219.267776,320.001587   C240.013321,355.923126 260.782440,391.831055 281.564423,427.731537   C313.944000,483.666565 346.337646,539.593506 378.738495,595.516235   C380.138489,597.932495 380.874237,600.095947 379.222107,602.916992   C369.035461,620.311523 359.021393,637.807129 348.929565,655.257324   C348.610321,655.809326 348.069458,656.233154 346.872345,657.556152   C293.847748,565.805542 241.068130,474.478760 188.102264,382.835175  z' opacity='1.000000' stroke='none'/> </svg>
                <div style="color:var(--vtf-primary,#dc3636);font-size:2rem;font-weight:800;margin-top:10px">Films</div>
            </div>
                <p style="color:#e4e8ff" class="mb-1 fw-bold">Đăng nhập để tiếp tục</p>
                <p style="color:#7b84a8" class="mb-4 small fw-medium">Tài khoản được phê duyệt mới có thể sử dụng</p>
                <div id="VTFilms-g-btn" class="d-flex align-items-center justify-content-center mb-4" style="min-height:44px"></div>
                <div id="VTFilms-loading" class="d-none mt-3">
                    <div class="d-inline-flex align-items-center gap-2 small"
                         style="color:#7b84a8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 20px">
                        <i class="fad fa-spinner-third fa-spin me-1"></i>Đang kiểm tra
                    </div>
                </div>
                <div id="VTFilms-error" class="d-none mt-3 small"
                     style="color:#f87171;background:rgba(220,54,54,.1);border:1px solid rgba(220,54,54,.2);border-radius:10px;padding:10px 14px"></div>
            <p class="m-0 mt-4 small" style="color:#4a5170">Miễn phí • Tốc độ cao • Cập nhật liên tục</p>
            </div>
            <button id="VTFilms-popup-btn"
                    class="d-none btn btn-sm mt-2 d-flex align-items-center justify-content-center gap-2 fw-semibold mx-auto"
                    style="background:rgba(255,255,255,.08);color:#e4e8ff;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:8px 20px"
                    onclick="window.VTFilms_Auth._openPopup()">
                <svg width="16" height="16" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
                Chọn tài khoản Google
            </button>
        </div>`;

    document.body.appendChild(overlay);
    VTFilms_log.ok('Overlay đăng nhập đã render.');
}

function VTFilms_hideOverlay() {
    const el = document.getElementById('VTFilms-overlay');
    if (!el) return;
    el.style.transition = 'opacity .3s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 350);
    VTFilms_log.info('Overlay đăng nhập ẩn dần...');
}

function VTFilms_setLoading(show, errorMsg = '') {
    const popup   = document.getElementById('VTFilms-popup-btn');
    const gBtn    = document.getElementById('VTFilms-g-btn');
    const loading = document.getElementById('VTFilms-loading');
    const errEl   = document.getElementById('VTFilms-error');
    if (show) {
        popup?.classList.add('disabled');
        if (gBtn) gBtn.style.pointerEvents = 'none';
        loading?.classList.remove('d-none');
        errEl?.classList.add('d-none');
    } else {
        popup?.classList.remove('disabled');
        if (gBtn) gBtn.style.pointerEvents = '';
        loading?.classList.add('d-none');
        if (errEl && errorMsg) { errEl.textContent = errorMsg; errEl.classList.remove('d-none'); }
    }
}


// ── 11. OVERLAY CHỜ XÁC MINH ─────────────────────────────────────────────────
// [v7.0] Single persistent overlay.
// Phần TĨNH (avatar, tên, email, nút đăng xuất) không thay đổi khi admin update.
// Phần ĐỘNG (#VTFilms-pending-status-area) fade khi transition — không nhấp nháy.
function VTFilms_showPendingOverlay(user) {
    if (document.getElementById('VTFilms-pending-overlay')) return;
    VTFilms_log.info(`Hiện pending overlay: ${user?.email || 'unknown'}`);

    const name   = user?.name   || 'Người dùng';
    const email  = user?.email  || '';
    const avatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3636&color=fff&size=80`;

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-pending-overlay';
    overlay.className = 'VTFilms-pending-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.cssText = 'z-index:99998;background:var(--vtf-bg) url(https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEha0fNQ6dXNQNDIkusqFi64oz4eOTaUXR3t8tjxxRYqKcZGU51QZC_lwJ1iGLbLXEWSHAMQfOZpqEY0TcaivkTsL9XhNiZMymqmM8HvrdW_K0oNpPes1OOG86VtONZwG9-dEbQq4xQLHOgSWesmKKNWXg2c6_6bhOhCQ1HxNGxl6RMPeFsqa4nVUOBDaZY/s3000-rw/vtfilms-overlayBg.jpg) no-repeat center fixed;background-size:cover';

    overlay.innerHTML = `
        <div class="text-center position-relative" style="width:min(480px,calc(100vw - 28px));z-index:3">
            <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px;backdrop-filter:blur(28px);padding:40px 28px">

                <!-- PHẦN TĨNH: avatar, tên, email, nút đăng xuất — không bao giờ thay đổi -->
                <img loading="lazy" src="${avatar}" class="rounded-circle mb-3 mx-auto d-block"
                     width="88" height="88" style="object-fit:cover;border:2px solid rgba(255,255,255,.1)"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3636&color=fff&size=80'"
                     alt="${name}">
                <div style="color:#e4e8ff;font-weight:700;font-size:1.05rem">${name}</div>
                <div style="color:#7b84a8;font-size:.85rem;margin-bottom:24px">${email}</div>

                <!-- PHẦN ĐỘNG: [v7.0] chỉ vùng này fade khi admin thay đổi trạng thái -->
                <div id="VTFilms-pending-status-area" style="transition:opacity .22s ease">
                    <div id="VTFilms-pending-icon" class="mb-3">
                        <i class="fa-duotone fa-solid fa-hourglass-clock fa-2x text-warning fa-fade"
                           style="--fa-animation-duration:2s"></i>
                    </div>
                    <div id="VTFilms-pending-title"
                         style="color:#fbbf24;font-size:1.05rem;font-weight:700;margin-bottom:8px">
                        Tài khoản đang chờ xác thực
                    </div>
                    <p id="VTFilms-pending-msg" style="color:#7b84a8;font-size:.88rem;margin-bottom:20px">
                        Liên hệ <b style="color:#e4e8ff">Vũ Trường</b> để được cấp quyền sử dụng
                    </p>
                    <div id="VTFilms-pending-spinner"
                         class="d-inline-flex align-items-center gap-2 small mb-4"
                         style="color:#7b84a8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 20px">
                        <i class="fad fa-spinner-third fa-spin me-1"></i>Đang chờ xác thực
                    </div>
                </div><!-- /#VTFilms-pending-status-area -->

                <!-- Nút đăng xuất — nằm NGOÀI status-area, không bị fade -->
                <div>
                    <button onclick="window.VTFilms_Auth.signOut()"
                            style="background:transparent;border:1px solid rgba(255,255,255,.12);color:#7b84a8;border-radius:999px;padding:7px 18px;font-size:.82rem;cursor:pointer">
                        <i class="fad fa-right-from-bracket me-1"></i>Đăng xuất
                    </button>
                </div>

            </div>
        </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => { overlay.style.opacity = '1'; }));
    VTFilms_log.ok('Pending overlay đã chèn (fade-in).');
}

/**
 * [v7.0] Smooth transition — chỉ fade #VTFilms-pending-status-area.
 * Avatar, tên, email, nút đăng xuất không bị ảnh hưởng.
 */
function VTFilms_overlayTransition(updateFn, fadeDuration = 220) {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    if (!overlay) { updateFn(null); return; }
    const statusArea = overlay.querySelector('#VTFilms-pending-status-area');
    if (!statusArea) { updateFn(overlay); return; }
    statusArea.style.opacity = '0';
    setTimeout(() => {
        updateFn(overlay);
        statusArea.style.opacity = '1';
    }, fadeDuration);
}

function VTFilms_hidePendingOverlay() {
    const el = document.getElementById('VTFilms-pending-overlay');
    if (!el) return;
    el.style.transition = 'opacity .35s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 380);
    VTFilms_log.info('Pending overlay ẩn dần...');
}


// ── 12. OVERLAY CONTENT TRANSITIONS ──────────────────────────────────────────
// Kiến trúc 2 layer — tránh vòng lặp reload:
//   Layer A — applyOverlayContent(state): chỉ update DOM, KHÔNG reload.
//             Dùng bởi antiFlash().
//   Layer B — onTransition*: full transition (remove app + update overlay).
//             Dùng bởi unified listener khi admin thay đổi realtime.

const VTFilms_overlayConfigs = {
    pending: {
        icon:    '<i class="fa-duotone fa-spinner-third fa-2x text-warning fa-spin" style="--fa-animation-duration:2s"></i>',
        title:   'Tài khoản đang chờ xác thực',
        titleClr:'#fbbf24',
        msg:     'Liên hệ admin để được cấp quyền sử dụng',
        spinner: 'admin@vutruong.vn',
    },
    rejected: {
        icon:    '<i class="fad fa-ban fa-2x" style="color:#f87171"></i>',
        title:   'Tài khoản bị từ chối',
        titleClr:'#f87171',
        msg:     'Liên hệ admin để được hỗ trợ',
        spinner: 'admin@vutruong.vn',
    },
    revoked: {
        icon:    '<i class="fad fa-lock-keyhole fa-2x text-warning"></i>',
        title:   'Quyền truy cập bị thu hồi',
        titleClr:'#fbbf24',
        msg:     'Liên hệ admin để được hỗ trợ',
        spinner: 'admin@vutruong.vn',
    },
};

/** Layer A: cập nhật overlay DOM, không reload — dùng trong antiFlash. */
function VTFilms_applyOverlayContent(state) {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    if (!overlay) return;
    const cfg = VTFilms_overlayConfigs[state] || VTFilms_overlayConfigs.pending;
    VTFilms_overlayTransition((ov) => {
        if (!ov) return;
        const icon    = ov.querySelector('#VTFilms-pending-icon');
        const title   = ov.querySelector('#VTFilms-pending-title');
        const msg     = ov.querySelector('#VTFilms-pending-msg');
        const spinner = ov.querySelector('#VTFilms-pending-spinner');
        if (icon)    icon.innerHTML    = cfg.icon;
        if (title)   { title.innerHTML = cfg.title; title.style.color = cfg.titleClr; }
        if (msg)     msg.innerHTML     = cfg.msg;
        if (spinner) spinner.innerHTML = cfg.spinner;
    });
    VTFilms_log.info(`applyOverlayContent: "${state}" applied.`);
}

/**
 * Layer B: Transition → APPROVED.
 * Hiện success overlay → reload sau 2.5s.
 * Reload bắt buộc để SPA load sạch từ HTML gốc (bảo mật).
 */
function VTFilms_onTransitionApproved() {
    VTFilms_log.ok('Transition → APPROVED: hiện success overlay, reload sau 2.5s...');

    if (!document.getElementById('VTFilms-pending-overlay')) {
        VTFilms_showPendingOverlay(VTFilms_getCache() || {});
    }

    VTFilms_overlayTransition((overlay) => {
        if (!overlay) return;
        const icon    = overlay.querySelector('#VTFilms-pending-icon');
        const title   = overlay.querySelector('#VTFilms-pending-title');
        const msg     = overlay.querySelector('#VTFilms-pending-msg');
        const spinner = overlay.querySelector('#VTFilms-pending-spinner');
        if (icon)    icon.innerHTML    = '<i class="fad fa-circle-check fa-2x" style="color:#34d399"></i>';
        if (title)   { title.textContent = 'Xác thực thành công!'; title.style.color = '#34d399'; }
        if (msg)     msg.innerHTML     = 'Tài khoản của bạn đã được phê duyệt';
        if (spinner) spinner.innerHTML = '<i class="fad fa-spinner-third fa-spin me-1"></i>Đang tải dữ liệu';
    });

    setTimeout(() => {
        const el = document.getElementById('VTFilms-pending-overlay');
        if (el) {
            el.style.transition = 'opacity .4s ease';
            el.style.opacity    = '0';
            setTimeout(() => window.location.reload(), 420);
        } else {
            window.location.reload();
        }
    }, 2500);
}

/**
 * [v7.0] Layer B: Transition → REJECTED hoặc REVOKED.
 * Không reload — remove app + update overlay in-place.
 */
function VTFilms_onTransitionBlocked(state) {
    VTFilms_log.warn(`[v7.0] Transition → ${state.toUpperCase()}: remove app, update overlay (no reload).`);
    VTFilms_removeApp();
    if (!document.getElementById('VTFilms-pending-overlay')) {
        VTFilms_showPendingOverlay(VTFilms_getCache() || {});
        setTimeout(() => VTFilms_applyOverlayContent(state), 50);
    } else {
        VTFilms_applyOverlayContent(state);
    }
}

function VTFilms_onTransitionRejected() { VTFilms_onTransitionBlocked('rejected'); }
function VTFilms_onTransitionRevoked()  { VTFilms_onTransitionBlocked('revoked');  }

/**
 * [v7.0] Layer B: Transition → PENDING.
 * Không reload — update overlay in-place.
 */
function VTFilms_onTransitionPending() {
    VTFilms_log.info('[v7.0] Transition → PENDING: remove app, update overlay (no reload).');
    VTFilms_removeApp();
    if (!document.getElementById('VTFilms-pending-overlay')) {
        VTFilms_showPendingOverlay(VTFilms_getCache() || {});
    } else {
        VTFilms_applyOverlayContent('pending');
    }
}


// ── 13. UNIFIED REALTIME LISTENER ────────────────────────────────────────────
// [v6.2] 1 onSnapshot duy nhất — không tự hủy khi nhận trạng thái.
// [v6.3.1] pure compare: _lastStatus = initialStatus. Skip khi không đổi.
// [v7.0] !snap.exists() + _lastStatus!=null → admin xóa document → force signOut.
//
// [v9.0] FIX QUAN TRỌNG: _lastStatus = initialStatus || null.
//   User mới: startUnifiedListener(fbUser, null) → _lastStatus = null.
//   "Doc chưa tồn tại" (init) + _lastStatus=null → return và chờ syncUserDoc.
//   Sau khi setDoc tạo doc: snapshot bắn với exists=true → process bình thường.
//
let VTFilms_verifyUnsubscribe = null;

function VTFilms_startUnifiedListener(fbUser, initialStatus) {
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
    }

    VTFilms_log.info(`Unified listener START uid: ${fbUser.uid}, initialStatus: ${initialStatus ?? 'null'}`);
    const ref = doc(VTFilms_db, 'users', fbUser.uid);
    let _lastStatus = initialStatus || null;

    VTFilms_verifyUnsubscribe = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
            if (_lastStatus === null) {
                // _lastStatus=null: user mới, doc chưa được tạo bởi syncUserDoc → chờ
                VTFilms_log.warn(`Unified listener: users/${fbUser.uid} chưa tồn tại (init) → chờ syncUserDoc.`);
                return;
            }
            // _lastStatus != null: user đang dùng app, doc bị xóa → admin đã xóa
            VTFilms_log.warn(`Unified listener: users/${fbUser.uid} bị XÓA bởi admin → force signOut...`);
            VTFilms_clearCache();
            VTFilms_clearProfileFlag();
            VTFilms_clearVerifyStatus();
            VTFilms_clearTabGuard();
            if (VTFilms_verifyUnsubscribe) { VTFilms_verifyUnsubscribe(); VTFilms_verifyUnsubscribe = null; }
            VTFilms_fbSignOut(VTFilms_auth).then(() => {
                VTFilms_log.ok('Force signOut sau khi document bị xóa → redirect...');
                window.location.href = window.location.pathname;
            }).catch(err => {
                VTFilms_log.error('Force signOut thất bại:', err.message);
                window.location.reload();
            });
            return;
        }

        const v = snap.data().verifiedUser;
        let newStatus;
        if      (v === true)        newStatus = 'approved';
        else if (v === false)       newStatus = 'pending';
        else if (v === 'rejected')  newStatus = 'rejected';
        else if (v === 'revoked')   newStatus = 'revoked';
        else                        newStatus = 'pending';

        VTFilms_log.info(`Unified listener: verifiedUser=${JSON.stringify(v)} → newStatus=${newStatus}, lastStatus=${_lastStatus}`);

        if (newStatus === _lastStatus) {
            VTFilms_saveVerifyStatus(fbUser.uid, newStatus); // refresh cache
            VTFilms_log.info(`Unified listener: status không đổi (${newStatus}) → skip.`);
            return;
        }

        _lastStatus = newStatus;
        VTFilms_saveVerifyStatus(fbUser.uid, newStatus);
        VTFilms_log.ok(`Unified listener: transition → ${newStatus}`);

        if      (newStatus === 'approved')  VTFilms_onTransitionApproved();
        else if (newStatus === 'rejected')  VTFilms_onTransitionRejected();
        else if (newStatus === 'revoked')   VTFilms_onTransitionRevoked();
        else                                VTFilms_onTransitionPending();

    }, (err) => {
        VTFilms_log.error('Unified listener lỗi:', err.message);
    });
}

function VTFilms_stopVerifyListener() {
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
        VTFilms_log.info('Unified listener đã dừng.');
    }
}


// ── 15. GOOGLE IDENTITY SERVICES (One Tap) ────────────────────────────────────
function VTFilms_initGSI() {
    if (!window.google?.accounts?.id) {
        setTimeout(VTFilms_initGSI, 600);
        return;
    }
    VTFilms_log.info('Khởi tạo Google GSI One Tap...');
    google.accounts.id.initialize({
        client_id:             VTFilms_CLIENT_ID,
        callback:              VTFilms_onGSICallback,
        auto_select:           false,
        cancel_on_tap_outside: false,
        language:              'vi',
        context:               'signin',
        ux_mode:               'popup',
    });
    const btnEl = document.getElementById('VTFilms-g-btn');
    if (btnEl) {
        google.accounts.id.renderButton(btnEl, {
            type: 'standard', theme: 'filled_black', size: 'large',
            text: 'signin_with', shape: 'pill', logo_alignment: 'left',
        });
    }
    VTFilms_log.ok('Google GSI Button đã render.');
}

async function VTFilms_onGSICallback(response) {
    VTFilms_log.info('One Tap callback → signInWithCredential...');
    VTFilms_setLoading(true);
    try {
        const credential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(VTFilms_auth, credential);
    } catch (err) {
        VTFilms_log.error('signInWithCredential thất bại:', err.code);
        VTFilms_setLoading(false, `Đăng nhập thất bại (${err.code}).`);
    }
}

async function VTFilms_openPopup() {
    VTFilms_log.info('Mở Google Popup...');
    VTFilms_setLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(VTFilms_auth, provider);
    } catch (err) {
        VTFilms_log.error('Popup Sign-In thất bại:', err.code);
        const msg = err.code === 'auth/popup-closed-by-user'
            ? 'Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.'
            : `Đăng nhập thất bại (${err.code}).`;
        VTFilms_setLoading(false, msg);
    }
}


// ── 16. ĐĂNG XUẤT ────────────────────────────────────────────────────────────
async function VTFilms_signOut() {
    VTFilms_log.info('Bắt đầu đăng xuất...');
    try {
        window.google?.accounts?.id?.disableAutoSelect();
        VTFilms_stopDropdownGuard();
        VTFilms_stopVerifyListener();
        VTFilms_clearCache();
        VTFilms_clearProfileFlag();
        VTFilms_clearVerifyStatus();
        VTFilms_clearTabGuard();
        VTFilms_hidePendingOverlay();
        const appEl = document.getElementById('vtfilms-app');
        if (appEl) appEl.remove();
        window.__VTF_READY = false;
        await VTFilms_fbSignOut(VTFilms_auth);
        VTFilms_log.ok('Đăng xuất thành công → redirect...');
        window.location.href = window.location.pathname;
    } catch (err) {
        VTFilms_log.error('Đăng xuất thất bại:', err.message);
    }
}


// ── 17. QUẢN LÝ USER OBJECT ───────────────────────────────────────────────────
function VTFilms_buildUser(fbUser) {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'U')}&background=dc3636&color=fff&size=128`;
    return {
        uid:       fbUser.uid,
        name:      fbUser.displayName || 'Người dùng',
        email:     fbUser.email,
        avatar:    fbUser.photoURL || fallback,
        provider:  fbUser.providerData?.[0]?.providerId || 'google.com',
        role:      VTFilms_getRole(fbUser.uid),
        loginTime: Date.now(),
    };
}

function VTFilms_setUser(user) {
    window.VTFilms_USER = user;
    if (user) {
        VTFilms_saveCache(user);
        VTFilms_log.ok(`User set: ${user.name} <${user.email}> · role: ${user.role}`);
    } else {
        VTFilms_clearCache();
        VTFilms_log.info('User set: null.');
    }
    window.dispatchEvent(new CustomEvent('vtfilms:auth-ready', { detail: { user } }));
}


// ── 17b. SPA DROPDOWN GUARD — Persistent MutationObserver ────────────────────
// [v7.0] Thay thế VTFilms_renderDropdown (one-shot).
// Observer chạy LIÊN TỤC suốt session → re-inject dropdown sau mỗi SPA navigation.
// tryInject() chỉ làm việc khi #vt-user-info có mặt và chưa có .dropdown con.

let _VTF_spaDropdownGuard = null;

function VTFilms_stopDropdownGuard() {
    if (_VTF_spaDropdownGuard) {
        _VTF_spaDropdownGuard.disconnect();
        _VTF_spaDropdownGuard = null;
        VTFilms_log.info('SPA dropdown guard đã dừng.');
    }
}

function _injectDropdownContent(el, user) {
    const fallback   = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=dc3636&color=fff`;
    const adminBadge = user.role === 'admin'
        ? `<i class="fa-solid fa-badge-check ms-1" style="color:#3b82f6;font-size:.85em"></i>`
        : '';

    el.innerHTML = `
        <div class="dropdown">
            <a class="nav-link p-0 m-0 d-flex align-items-center justify-content-center"
               style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,.12);transition:border-color .2s"
               role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside"
               onmouseenter="this.style.borderColor='var(--vtf-primary,#dc3636)'"
               onmouseleave="this.style.borderColor='rgba(255,255,255,.12)'">
                <img src="${user.avatar}" width="38" height="38"
                     style="object-fit:cover;width:100%;height:100%" alt="${user.name}"
                     onerror="this.src='${fallback}'">
            </a>
            <ul class="dropdown-menu dropdown-menu-end p-0 mt-2"
                style="min-width:220px;background:#131526;border:1px solid #1e2238;border-radius:14px;box-shadow:0 14px 52px rgba(0,0,0,.6);overflow:hidden">
                <li>
                    <div class="px-4 py-3 d-flex align-items-center gap-3"
                         style="border-bottom:1px solid #1e2238">
                        <img src="${user.avatar}" class="rounded-circle flex-shrink-0"
                             width="44" height="44" style="object-fit:cover;border:2px solid rgba(255,255,255,.1)"
                             alt="${user.name}" onerror="this.src='${fallback}'">
                        <div class="overflow-hidden">
                            <div class="d-inline-flex align-items-center gap-1 fw-bold"
                                 style="color:#e4e8ff">
                                <span class="text-truncate">${user.name}</span>${adminBadge}
                            </div>
                            <div class="small fw-normal" style="color:#7b84a8">
                                ${user.email}
                            </div>
                        </div>
                    </div>
                </li>
                <li>
                    <a class="dropdown-item d-flex align-items-center gap-2 py-2 px-4 small fw-semibold"
                       style="color:#f87171;transition:background .15s"
                       onmouseenter="this.style.background='rgba(220,54,54,.1)'"
                       onmouseleave="this.style.background=''"
                       onclick="window.VTFilms_Auth.signOut()" role="button">
                        <i class="fa-duotone fa-right-from-bracket fa-fw"></i>Đăng xuất
                    </a>
                </li>
            </ul>
        </div>`;

    VTFilms_log.ok(`Dropdown inject OK (${user.name} · ${user.role}).`);
}

function VTFilms_startDropdownGuard(user) {
    VTFilms_stopDropdownGuard();

    function tryInject() {
        const el = document.getElementById('vt-user-info');
        if (el && !el.querySelector('.dropdown')) {
            _injectDropdownContent(el, user);
        }
    }

    tryInject(); // Fast path: inject ngay nếu element đã có

    _VTF_spaDropdownGuard = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes.length > 0) { tryInject(); break; }
        }
    });
    _VTF_spaDropdownGuard.observe(document.body, { childList: true, subtree: true });
    VTFilms_log.info('SPA dropdown guard đang chạy.');
}


// ── 18. ANTI-FLASH ───────────────────────────────────────────────────────────
// Chạy đồng bộ ngay khi module load — đọc localStorage cache, hiện UI đúng.
// [v6.3] Tất cả trạng thái non-approved → remove() app (bảo mật SPA).
// [v6.3] Dùng Layer A — KHÔNG gọi onTransition* (tránh reload loop).

function VTFilms_antiFlash() {
    const cache = VTFilms_getCache();

    if (!cache) {
        VTFilms_log.info('Anti-flash: no cache → remove app, show login overlay.');
        const appEl = document.getElementById('vtfilms-app');
        if (appEl) appEl.remove();
        window.__VTF_READY = false;
        VTFilms_showOverlay();
        return;
    }

    if (cache.role === 'admin') {
        VTFilms_log.info(`Anti-flash: admin (${cache.name}) → giữ UI, chờ Firebase...`);
        return;
    }

    const verifyStatus = VTFilms_getVerifyStatus(cache.uid);
    VTFilms_log.info(`Anti-flash: user (${cache.name}), verifyStatus=${verifyStatus}`);

    if (verifyStatus === 'approved') {
        VTFilms_log.info('Anti-flash: approved → giữ UI, chờ Firebase...');
        return;
    }

    // Non-approved: remove app ngay (bảo mật SPA)
    const appEl = document.getElementById('vtfilms-app');
    if (appEl) { appEl.remove(); window.__VTF_READY = false; }

    VTFilms_showPendingOverlay(cache);

    if (verifyStatus === 'rejected') {
        VTFilms_log.warn('Anti-flash: rejected → applyOverlayContent...');
        setTimeout(() => VTFilms_applyOverlayContent('rejected'), 50);
    } else if (verifyStatus === 'revoked') {
        VTFilms_log.warn('Anti-flash: revoked → applyOverlayContent...');
        setTimeout(() => VTFilms_applyOverlayContent('revoked'), 50);
    }
    // 'pending' hoặc null → content mặc định đã là pending ✓
}


// ── 19. AUTH STATE LISTENER ───────────────────────────────────────────────────
//
// [v9.0] KHÔNG còn debounce null guard (đã xóa từ v7.5).
//
// Lý do an toàn:
//   Dynamic import() tạo delay ~200-400ms trước khi onAuthStateChanged được đăng ký.
//   Firebase đọc xong IndexedDB persistence trong delay đó.
//   First callback = user thật (không phải null transient từ token processing).
//   Null = explicit signout hoặc session thật sự expired → xử lý ngay.
//
// Lưu ý quan trọng về startUnifiedListener cho user mới (v9.0 FIX):
//   Truyền verifyStatus trực tiếp (KHÔNG ép || 'pending').
//   User mới: verifyStatus=null → initialStatus=null → _lastStatus=null.
//   "Doc chưa tồn tại" + _lastStatus=null → return (chờ syncUserDoc) ✓
//   Nếu truyền 'pending': _lastStatus='pending' ≠ null → force signOut → BUG!
//
function VTFilms_startListener() {
    VTFilms_log.info('[AUTH] Bắt đầu lắng nghe onAuthStateChanged...');

    onAuthStateChanged(VTFilms_auth, async (fbUser) => {
        if (fbUser) {
            // ── User đã xác thực ─────────────────────────────────────────────
            VTFilms_log.ok(`[AUTH] Firebase xác nhận: ${fbUser.email} (uid: ${fbUser.uid})`);

            const user = VTFilms_buildUser(fbUser);
            VTFilms_setUser(user);

            // syncUserDoc: fire & forget — không block UI.
            // User mới: gọi setDoc() ngay (optimistic local write) trước khi await resolve.
            // Điều này đảm bảo onSnapshot nhận local write TRƯỚC khi callback bắn lần đầu.
            VTFilms_syncUserDoc(fbUser).catch(e =>
                VTFilms_log.warn('[AUTH] syncUserDoc lỗi (không ảnh hưởng app):', e.message)
            );

            VTFilms_hideOverlay();

            // ── Admin: bypass xác minh ────────────────────────────────────────
            if (user.role === 'admin') {
                VTFilms_log.ok('[AUTH] Admin → bypass verification, show app.');
                if (!document.getElementById('vtfilms-app')) {
                    window.location.reload();
                } else {
                    VTFilms_showApp();
                    VTFilms_startDropdownGuard(user);
                }
                return;
            }

            // ── User thường: kiểm tra verification ───────────────────────────
            const verifyStatus = VTFilms_getVerifyStatus(fbUser.uid);
            VTFilms_log.info(`[AUTH] verifyStatus cache: ${verifyStatus ?? 'null'}`);

            if (verifyStatus === 'approved') {
                VTFilms_log.ok('[AUTH] User approved → show app + unified listener.');
                VTFilms_hidePendingOverlay();
                if (!document.getElementById('vtfilms-app')) {
                    window.location.reload();
                } else {
                    VTFilms_showApp();
                    VTFilms_startDropdownGuard(user);
                    VTFilms_startUnifiedListener(fbUser, 'approved');
                }

            } else if (verifyStatus === 'rejected') {
                VTFilms_log.warn('[AUTH] User rejected → overlay + unified listener.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                    setTimeout(() => VTFilms_applyOverlayContent('rejected'), 50);
                }
                VTFilms_startUnifiedListener(fbUser, 'rejected');

            } else if (verifyStatus === 'revoked') {
                VTFilms_log.warn('[AUTH] User revoked → overlay + unified listener.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                    setTimeout(() => VTFilms_applyOverlayContent('revoked'), 50);
                }
                VTFilms_startUnifiedListener(fbUser, 'revoked');

            } else {
                // pending HOẶC null (user mới / cache bị xóa một phần)
                VTFilms_log.info('[AUTH] User pending/null → overlay + unified listener.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                }
                // [v9.0 FIX] Truyền verifyStatus trực tiếp (null nếu user mới).
                // KHÔNG ép || 'pending' — null an toàn hơn cho case doc chưa tồn tại.
                VTFilms_startUnifiedListener(fbUser, verifyStatus);
            }

        } else {
            // ── Null: chưa đăng nhập / vừa đăng xuất ────────────────────────
            // [v9.0] Không debounce — xử lý ngay.
            // Dynamic import delay đảm bảo đây là null thật.
            VTFilms_log.info('[AUTH] Firebase: null → dọn dẹp session...');

            VTFilms_setUser(null);
            VTFilms_stopDropdownGuard();
            VTFilms_stopVerifyListener();
            VTFilms_clearProfileFlag();
            VTFilms_clearTabGuard();
            VTFilms_clearVerifyStatus();

            const appEl = document.getElementById('vtfilms-app');
            if (appEl) { appEl.remove(); window.__VTF_READY = false; }

            VTFilms_hidePendingOverlay();
            if (!document.getElementById('VTFilms-overlay')) VTFilms_showOverlay();

            document.readyState === 'loading'
                ? document.addEventListener('DOMContentLoaded', VTFilms_initGSI)
                : VTFilms_initGSI();
        }
    });
}


// ── 20. EXPORT GLOBAL API ─────────────────────────────────────────────────────
window.VTFilms_USER = null;

window.VTFilms_Auth = {
    signOut:    VTFilms_signOut,
    getUser:    () => window.VTFilms_USER,
    isAdmin:    () => window.VTFilms_USER?.role === 'admin',
    isVerified: () => {
        const u = window.VTFilms_USER;
        if (!u) return false;
        if (u.role === 'admin') return true;
        return VTFilms_getVerifyStatus(u.uid) === 'approved';
    },
    isRevoked:  () => {
        const u = window.VTFilms_USER;
        if (!u) return false;
        return VTFilms_getVerifyStatus(u.uid) === 'revoked';
    },
    _openPopup: VTFilms_openPopup,
    version:    VTFilms_VERSION,
};


// ── 21. KHỞI CHẠY ─────────────────────────────────────────────────────────────
VTFilms_log.info(`===== vtfilms-module v${VTFilms_VERSION} (VT Films v5.1.0) khởi chạy =====`);
VTFilms_antiFlash();      // Bước 1: Sync anti-flash (đọc cache, hiện UI ngay)
VTFilms_startListener();  // Bước 2: Firebase onAuthStateChanged
VTFilms_log.ok('Module boot hoàn tất — chờ Firebase phản hồi.');

})(); // ── end async IIFE ──
