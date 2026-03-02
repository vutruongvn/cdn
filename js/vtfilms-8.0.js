// ============================================================
// vtfilms.js — VT Films · Auth & API Module (Combined)
// Website   : films.vutruong.vn
// Version   : v8.0
// ============================================================
//
// MỤC LỤC
//   Phase 1 — ĐỒNG BỘ (chạy ngay khi parse script, trước khi Firebase load):
//     §0    Domain check
//     §1    Hằng số Auth & Storage helpers (localStorage / sessionStorage)
//     §2    Anti-flash UI — đọc cache, show đúng UI ngay lập tức
//
//   Phase 2 — BẤT ĐỒNG BỘ (sau khi dynamic import() Firebase thành công):
//     §3    Firebase init (initializeApp, getAuth, getFirestore, getAnalytics)
//     §4    Helpers phân quyền (getRole)
//     §5    DOM quản lý — #VT-Films-App show/hide/remove
//     §6    Overlay đăng nhập (#VTFilms-overlay)
//     §7    Overlay chờ xác minh (#VTFilms-pending-overlay)
//     §8    Transition functions (approved / rejected / revoked / pending)
//     §9    Unified realtime listener (onSnapshot users/{uid})
//     §10   Admin panel (quản lý user — 3 tabs, realtime)
//     §11   Google Identity Services (GSI — One Tap + Popup)
//     §12   Đăng xuất (VTFilms_signOut)
//     §13   Auth state listener (onAuthStateChanged)
//     §14   [API] Lazy load ảnh (IntersectionObserver)
//     §15   [API] Hằng số & cấu hình API (BASE_URL, endpoints, ...)
//     §16   [API] Fetch Queue — rate limiting (tối đa 3 concurrent, 220ms/req)
//     §17   [API] API Cache — sessionStorage, TTL 5 phút
//     §18   [API] VTFilms_fetch — fetch với cache + retry + abort
//     §19   [API] Rate-limit Modal (glassmorphism, auto-close 30s)
//     §20   [API] Tiện ích (slugify, getDisplayName, updateURL, debounce)
//     §21   [API] Render card phim & skeleton
//     §22   [API] Điều hướng SPA (navigate, triggerSearch)
//     §23   [API] Infinite Scroll (loadMoreMovies, bottomLoader)
//     §24   [API] Router SPA (checkRoute, setupInfinitePage)
//     §25   [API] Trang chủ — lazy section loading (chain pattern)
//     §26   [API] Phim liên quan (loadRelatedMovies)
//     §27   [API] Chi tiết phim (showMovieDetail, changeServer, playVideo)
//     §28   [API GATE] VTFilms_initAPI() — chỉ gọi khi user là approved/admin
//     §29   Export global window.VTFilms_Auth + Boot (antiFlash → startListener)
//
// ============================================================
// CHANGELOG
//   vtfilms-api.js    v1.x → v2.2   (xem changelog trong file gốc)
//   vtfilms-module.js v6.0 → v7.0   (xem changelog trong file gốc)
//
//   v8.0  ── MERGE + AUTH GATE ──
//         [MERGE]  Gộp vtfilms-api.js (v2.2) + vtfilms-module.js (v7.0)
//                  thành 1 file duy nhất: vtfilms.js
//         [ARCH]   Chuyển từ ES module (static import + type="module")
//                  sang async IIFE với dynamic import()
//                  → Không cần type="module" trên thẻ <script>
//                  → Firebase v12.9.0 modular SDK vẫn dùng bình thường
//                  → Anti-flash (§2) vẫn chạy đồng bộ trước khi Firebase load
//         [GATE]   VTFilms_initAPI() (§28) — API hoàn toàn không khởi chạy
//                  cho đến khi xác nhận user là approved hoặc admin:
//                  → User chưa đăng nhập        : 0 API request, 0 DOM render
//                  → User pending/rejected/revoked: 0 API request, 0 DOM render
//                  → User approved / admin       : VTFilms_initAPI() được gọi
//         [MOVE]   DOMContentLoaded handler (api.js §14) → VTFilms_initAPI()
//                  với guard readyState để an toàn khi Firebase resolve sớm
//         [MOVE]   window.onpopstate → VTFilms_initAPI()
//         [MOVE]   window.VTFilms_handleViewAll → VTFilms_initAPI()
//         [EXPOSE] Các hàm API gọi từ inline onclick HTML (renderMovieCard,
//                  renderSectionHTML, episodeList, ...) được gán lên window
//                  trong VTFilms_initAPI() để an toàn (không tồn tại sớm hơn cần)
//         [KEEP]   Toàn bộ logic auth module v7.0 — KHÔNG thay đổi
//         [KEEP]   Toàn bộ logic API v2.2 — KHÔNG thay đổi
//         [TODO]   Lịch sử xem → Firestore doc "filmViewed"
//                  Tham khảo: https://phim.nguonc.com/api-document
//                  Sẽ phát triển trong phiên bản tiếp theo
// ============================================================

(async () => {

// ─────────────────────────────────────────────────────────────
// §0  DOMAIN CHECK
//     [v8.0] Tích hợp từ IIFE đầu file của vtfilms-api.js.
//     Chặn script chạy trên domain không được phép.
//     Chạy đồng bộ, trước mọi thứ khác.
// ─────────────────────────────────────────────────────────────
{
    const _allowed = ['films.vutruong.vn', 'localhost', '127.0.0.1'];
    if (!_allowed.includes(location.hostname)) {
        console.error('[VTFilms] Unauthorized domain:', location.hostname);
        document.body.innerHTML = '';
        throw new Error('[VTFilms] Unauthorized domain — script halted.');
    }
}


// ─────────────────────────────────────────────────────────────
// §1  HẰNG SỐ AUTH & STORAGE HELPERS
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0.
//     Phải định nghĩa TRƯỚC anti-flash (§2) vì antiFlash cần đọc localStorage.
// ─────────────────────────────────────────────────────────────

const VTFilms_VERSION = '8.0';

// DEBUG FLAG: true → log đầy đủ | false → chỉ warn/error (production)
const VTFilms_DEBUG = true;

// Admin UIDs — thêm UID vào đây để cấp quyền admin. Mọi UID khác = "user".
const VTFilms_ADMIN_UIDS = [
    'KU6FC2SAsmaE8qIu4EGU9J422On1', // admin@vutruong.vn
];

// Storage keys
const VTFilms_CACHE_KEY   = 'VTFilms_userCache';
const VTFilms_PROFILE_KEY = 'VTFilms_profileSaved';
const VTFilms_VERIFY_KEY  = 'VTFilms_verifyStatus';
const VTFilms_TAB_KEY     = 'VTFilms_tabActive';

const VTFilms_CLIENT_ID = '891750241616-234jksd5e2b301g838gr6t650hdobptk.apps.googleusercontent.com';

// Logger
const VTFilms_log = {
    info:  (m, ...a) => VTFilms_DEBUG && console.log( `%c[VTFilms v${VTFilms_VERSION}]`,   'color:#dc3545;font-weight:bold', '→', m, ...a),
    ok:    (m, ...a) => VTFilms_DEBUG && console.log( `%c[VTFilms v${VTFilms_VERSION}] ✓`, 'color:#28a745;font-weight:bold', m, ...a),
    warn:  (m, ...a) => console.warn( `[VTFilms v${VTFilms_VERSION}] ⚠`, m, ...a),
    error: (m, ...a) => console.error(`[VTFilms v${VTFilms_VERSION}] ✗`, m, ...a),
};

// ── localStorage helpers ──────────────────────────────────────

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

// ── sessionStorage helpers ────────────────────────────────────

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


// ─────────────────────────────────────────────────────────────
// §2  ANTI-FLASH UI
//     [v8.0] Giữ nguyên logic từ vtfilms-module.js v7.0 (§18).
//     GỌI NGAY TẠI ĐÂY — đồng bộ, trước khi await Firebase.
//     → Đọc localStorage cache → show đúng UI ngay lập tức, không flash.
//
//     Nguyên tắc:
//       Không có cache          → remove app + show login overlay
//       Cache role = admin      → giữ app (admin bypass xác minh)
//       verifyStatus 'approved' → giữ app bình thường
//       verifyStatus pending/null → remove app + pending overlay (default)
//       verifyStatus 'rejected' → remove app + overlay + applyContent('rejected')
//       verifyStatus 'revoked'  → remove app + overlay + applyContent('revoked')
//
//     [v8.0] VTFilms_showOverlay / VTFilms_showPendingOverlay được định nghĩa
//     TRƯỚC trong Phase 2, nên anti-flash gọi hàm qua wrapper để tránh
//     reference lỗi. Thực tế các hàm này được hoisted (function declaration),
//     nhưng vì nằm trong async IIFE scope, cần khai báo trước điểm gọi.
//     → Giải pháp: khai báo antiFlash trước, gọi sau khi tất cả hàm đã định nghĩa.
//     → Xem §29 BOOT: VTFilms_antiFlash() được gọi sau khi toàn bộ hàm sẵn sàng.
// ─────────────────────────────────────────────────────────────

function VTFilms_antiFlash() {
    const cache = VTFilms_getCache();

    if (!cache) {
        VTFilms_log.info('Anti-flash: không có cache → remove app, login overlay...');
        const appEl = document.getElementById('VT-Films-App');
        if (appEl) appEl.remove();
        VTFilms_showOverlay();
        return;
    }

    if (cache.role === 'admin') {
        VTFilms_log.info(`Anti-flash: admin (${cache.name}) → giữ UI, chờ Firebase...`);
        return;
    }

    const verifyStatus = VTFilms_getVerifyStatus(cache.uid);
    VTFilms_log.info(`Anti-flash: user (${cache.name}), verifyStatus = ${verifyStatus}`);

    if (verifyStatus === 'approved') {
        VTFilms_log.info('Anti-flash: approved → giữ UI, chờ Firebase...');
        return;
    }

    const appEl = document.getElementById('VT-Films-App');
    if (appEl) {
        appEl.remove();
        VTFilms_log.info('Anti-flash: app removed (security — non-approved state).');
    }

    VTFilms_showPendingOverlay(cache);

    if (verifyStatus === 'rejected') {
        VTFilms_log.warn('Anti-flash: rejected → applyOverlayContent(rejected)...');
        setTimeout(() => VTFilms_applyOverlayContent('rejected'), 50);
    } else if (verifyStatus === 'revoked') {
        VTFilms_log.warn('Anti-flash: revoked → applyOverlayContent(revoked)...');
        setTimeout(() => VTFilms_applyOverlayContent('revoked'), 50);
    }
}


// ─────────────────────────────────────────────────────────────
// §3  FIREBASE DYNAMIC IMPORT & INIT
//     [v8.0] THAY ĐỔI: static import → dynamic import() bên trong async IIFE.
//     Cho phép file chạy mà không cần type="module" trên thẻ <script>.
//     Firebase v12.9.0 modular SDK — giữ nguyên hoàn toàn.
//
//     CAN THIỆP: Chuyển từ:
//       import { initializeApp } from 'https://...'
//     thành:
//       const { initializeApp } = await import('https://...')
// ─────────────────────────────────────────────────────────────

VTFilms_log.info(`===== vtfilms.js v${VTFilms_VERSION} — bắt đầu load Firebase... =====`);

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
        collection,
        query,
        where,
        orderBy,
        setDoc,
        updateDoc,
        deleteDoc,
        onSnapshot,
        serverTimestamp,
    },
] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js'),
]);

VTFilms_log.ok('Firebase modules loaded.');

const VTFilms_fbApp = initializeApp({
    apiKey:            'AIzaSyCyTqNXos2w80W9o6XHj7QkLaSoSU5MiOM',
    authDomain:        'vt-films-pj.firebaseapp.com',
    projectId:         'vt-films-pj',
    storageBucket:     'vt-films-pj.firebasestorage.app',
    messagingSenderId: '891750241616',
    appId:             '1:891750241616:web:78a48d2ee8d2fd71dd0855',
    measurementId:     'G-G8QD7CEKDF',
});

getAnalytics(VTFilms_fbApp);
const VTFilms_auth = getAuth(VTFilms_fbApp);
const VTFilms_db   = getFirestore(VTFilms_fbApp);

VTFilms_log.ok('Firebase init OK (auth + firestore sẵn sàng).');


// ─────────────────────────────────────────────────────────────
// §4  FIRESTORE: SYNC USER DOCUMENT
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§8).
// ─────────────────────────────────────────────────────────────

function VTFilms_getRole(uid) {
    return VTFilms_ADMIN_UIDS.includes(uid) ? 'admin' : 'user';
}

async function VTFilms_syncUserDoc(fbUser) {
    const uid  = fbUser.uid;
    const role = VTFilms_getRole(uid);
    const ref  = doc(VTFilms_db, 'users', uid);

    if (VTFilms_isTabActive()) {
        VTFilms_log.info('Tab guard tồn tại → skip Firestore write (reload).');
        return;
    }

    if (!VTFilms_isProfileSaved(uid)) {
        const cachedVerifyStatus = VTFilms_getVerifyStatus(uid);
        if (cachedVerifyStatus !== null) {
            VTFilms_log.info(`syncUserDoc: verifyStatus cache='${cachedVerifyStatus}' → user cũ, restore flag, skip setDoc.`);
            VTFilms_markProfileSaved(uid);
        } else {
            const isAdmin       = role === 'admin';
            const verifiedValue = isAdmin ? true : false;
            VTFilms_log.info(`User mới (${fbUser.email}) → tạo document Firestore...`);
            try {
                await setDoc(ref, {
                    uid,
                    email:        fbUser.email,
                    displayName:  fbUser.displayName || 'Người dùng',
                    photoURL:     fbUser.photoURL    || null,
                    provider:     'google',
                    role,
                    verifiedUser: verifiedValue,
                    createdAt:    serverTimestamp(),
                    lastLoginAt:  serverTimestamp(),
                });
                VTFilms_markProfileSaved(uid);
                VTFilms_markTabActive();
                VTFilms_log.ok(`Document tạo mới OK: users/${uid} (role: ${role}, verifiedUser: ${verifiedValue})`);
            } catch (err) {
                VTFilms_log.error('setDoc thất bại:', err.message);
            }
            return;
        }
    }

    VTFilms_log.info(`User cũ, tab mới (${fbUser.email}) → cập nhật lastLoginAt...`);
    try {
        await updateDoc(ref, { lastLoginAt: serverTimestamp() });
        VTFilms_markTabActive();
        VTFilms_log.ok(`lastLoginAt cập nhật OK: users/${uid}`);
    } catch (err) {
        VTFilms_log.error('updateDoc thất bại:', err.message);
    }
}


// ─────────────────────────────────────────────────────────────
// §5  DOM QUẢN LÝ — #VT-Films-App
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§9).
//     remove() bảo mật SPA: user không thể khôi phục app bằng DevTools.
// ─────────────────────────────────────────────────────────────

function VTFilms_removeApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) return;
    el.remove();
    VTFilms_log.ok('#VT-Films-App đã xóa khỏi DOM (security).');
}

function VTFilms_showApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) return;
    el.classList.remove('d-none');
    VTFilms_log.ok('#VT-Films-App hiển thị (d-none removed).');
}


// ─────────────────────────────────────────────────────────────
// §6  OVERLAY ĐĂNG NHẬP (#VTFilms-overlay)
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§10).
// ─────────────────────────────────────────────────────────────

function VTFilms_showOverlay() {
    if (document.getElementById('VTFilms-overlay')) return;
    VTFilms_log.info('Tạo overlay đăng nhập...');

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-overlay';
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.zIndex = '99999';

    overlay.innerHTML = `
        <div class="card text-center shadow-lg"
             style="width:min(500px,calc(100vw - 28px));
                    background:rgba(255,255,255,.045);
                    border:1px solid rgba(255,255,255,.09) !important;
                    border-radius:22px;backdrop-filter:blur(24px)">
            <div class="card-body px-3 py-5">
                <div class="d-flex align-items-center justify-content-center gap-2 mb-4">
                    <svg fill='var(--bs-danger)' id='Layer_1' version='1.1' viewBox='0 0 992 992' width='75' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'>
            <path d=' M537.072266,790.994934   C518.384460,823.271484 499.881897,855.232605 481.546600,886.904846   C478.881500,886.932983 478.519226,885.252380 477.814240,884.032715   C449.972229,835.864990 422.152496,787.684387 394.315430,739.513794   C390.315125,732.591492 386.319824,725.663940 382.164368,718.834900   C380.506805,716.110901 380.462708,713.887695 382.125458,711.018250   C426.808105,633.910156 471.397614,556.748169 516.004395,479.596100   C524.258179,465.320282 532.502258,451.038788 540.782654,436.778381   C545.431152,428.772736 544.592163,427.275574 535.083252,427.237640   C518.919495,427.173157 502.752899,427.023346 486.593201,427.275269   C481.969421,427.347321 479.380280,425.745056 477.107635,421.790588   C447.725372,370.664581 418.193115,319.624817 388.704956,268.559662   C386.049835,263.961761 383.438019,259.338867 379.894104,253.129639   C385.960632,253.129639 390.803619,253.110168 395.646393,253.132751   C431.301971,253.299011 466.956360,252.964279 502.614929,253.440689   C531.431396,253.825653 560.260315,253.186874 589.083862,253.148209   C638.565613,253.081833 688.054443,252.618851 737.526855,253.301346   C772.849670,253.788635 808.158020,252.737198 843.472717,253.321091   C846.685547,253.374207 848.234192,254.640961 849.695862,257.176147   C881.311340,312.012695 912.985779,366.815247 944.634949,421.632355   C945.440491,423.027618 946.591370,424.321869 946.523254,426.153778   C944.361511,427.828064 941.948669,427.139038 939.723450,427.140350   C877.900391,427.176880 816.077271,427.210663 754.254578,427.063690   C749.389282,427.052124 746.563293,428.368378 743.998535,432.817963   C682.519409,539.473328 620.854248,646.021362 559.227478,752.591614   C551.890320,765.279602 544.580139,777.983154 537.072266,790.994934  M819.889526,322.563171   C819.395142,321.694672 818.778259,320.872894 818.426147,319.950104   C816.044861,313.709869 811.857849,311.803955 804.977356,311.842102   C744.648071,312.176819 684.316345,312.063019 623.985291,312.061981   C579.153809,312.061188 534.322266,312.028320 489.490753,312.015198   C482.944855,312.013306 482.075104,313.355286 485.232697,318.848877   C493.949249,334.014130 502.731812,349.141418 511.469452,364.294556   C512.931519,366.830078 514.423218,368.791748 517.951172,368.753387   C558.773682,368.309479 599.602661,369.267975 640.423889,368.212158   C642.548523,368.157196 644.742676,367.995361 646.466614,369.508209   C646.796143,370.938385 645.950256,371.853851 645.381775,372.839539   C635.644958,389.723267 625.897766,406.600983 616.147461,423.476898   C576.307068,492.433197 536.462280,561.386963 496.624573,630.344788   C481.206879,657.032288 465.843597,683.751404 450.341980,710.390015   C448.438293,713.661377 448.402344,716.329529 450.331238,719.611450   C459.192932,734.689331 467.808929,749.911377 476.610535,765.024963   C479.793884,770.491150 481.213623,770.492065 484.345154,765.150940   C490.243134,755.091309 496.025574,744.963806 501.852203,734.862366   C537.729919,672.662231 573.562988,610.436157 609.496277,548.268127   C642.844788,490.571930 676.359741,432.971771 709.598022,375.212311   C712.350708,370.428802 715.243408,368.482300 720.894104,368.520233   C760.057373,368.783051 799.223328,368.673859 838.388367,368.649750   C844.888184,368.645752 845.635620,367.338776 842.437500,361.751801   C835.071777,348.884094 827.663818,336.040588 819.889526,322.563171  z' opacity='1.000000' stroke='none'/>
            <path d=' M188.102264,382.835175   C163.279175,339.887726 138.642349,297.257141 113.141380,253.131256   C119.858635,253.131256 125.113457,253.120575 130.368240,253.132904   C190.193649,253.273224 250.019073,253.456223 309.844482,253.465607   C313.559967,253.466187 315.126831,255.231369 316.719513,257.989685   C342.292236,302.279297 367.915436,346.539734 393.532959,390.803467   C410.804230,420.645935 428.072968,450.489929 445.383789,480.309418   C446.696198,482.570129 447.637421,484.512726 446.072235,487.195251   C435.997070,504.463043 426.061462,521.812195 416.063263,539.125000   C415.576385,539.968079 415.156158,540.937561 413.884003,541.255676   C411.952515,541.072021 411.607605,539.190308 410.826355,537.837036   C378.762604,482.292603 346.731018,426.729584 314.677948,371.178986   C304.187378,352.997955 293.581360,334.883057 283.194855,316.642944   C281.313202,313.338501 279.077026,311.939941 275.252472,311.976196   C258.088135,312.138824 240.921509,312.038818 223.755890,312.090637   C216.543533,312.112396 215.631409,313.705109 219.267776,320.001587   C240.013321,355.923126 260.782440,391.831055 281.564423,427.731537   C313.944000,483.666565 346.337646,539.593506 378.738495,595.516235   C380.138489,597.932495 380.874237,600.095947 379.222107,602.916992   C369.035461,620.311523 359.021393,637.807129 348.929565,655.257324   C348.610321,655.809326 348.069458,656.233154 346.872345,657.556152   C293.847748,565.805542 241.068130,474.478760 188.102264,382.835175  z' opacity='1.000000' stroke='none'/>
					</svg>
					<div class="text-danger h3 m-0 pt-2 fw-bold">FILMS</div>
                </div>
                <p class="text-danger mb-4 h5 fw-semibold">Đăng nhập để tiếp tục</p>
                <div id="VTFilms-g-btn" class="d-flex align-items-center justify-content-center mb-3" style="min-height:44px"></div>
                <p class="text-light m-0 mb-1 mt-4 h6 opacity-75 fw-normal">Miễn phí • Tốc độ cao • Cập nhật liên tục</p>
                <p class="text-light m-0 small opacity-50 fw-normal">Tài khoản được phê duyệt mới có thể sử dụng</p>
                <button id="VTFilms-popup-btn"
                        class="d-none btn btn-light w-100 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                        onclick="window.VTFilms_Auth._openPopup()">
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                    </svg>
                    Chọn tài khoản Google
                </button>
                <div id="VTFilms-loading" class="d-none mt-3">
                    <div class="d-inline-flex align-items-center gap-2 text-secondary small rounded-pill px-4 py-2"
                         style="background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);">
                        <i class="fad fa-spinner-third fa-spin me-2"></i>Đang kiểm tra
                    </div>
                </div>
                <div id="VTFilms-error" class="d-none alert alert-danger text-center border-0 small mt-3 mb-0 py-2 px-3" role="alert"></div>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    VTFilms_log.ok('Overlay đăng nhập đã chèn vào DOM.');
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


// ─────────────────────────────────────────────────────────────
// §7  OVERLAY CHỜ XÁC MINH (#VTFilms-pending-overlay)
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§11).
//     1 overlay duy nhất, không destroy/recreate khi admin đổi trạng thái.
// ─────────────────────────────────────────────────────────────

function VTFilms_showPendingOverlay(user) {
    if (document.getElementById('VTFilms-pending-overlay')) return;
    VTFilms_log.info(`Hiện pending overlay cho user: ${user?.email || 'unknown'}`);

    const name   = user?.name   || 'Người dùng';
    const email  = user?.email  || '';
    const avatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3545&color=fff&size=80`;

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-pending-overlay';
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.cssText = 'z-index:99998;opacity:0;transition:opacity .35s ease';

    overlay.innerHTML = `
        <div class="card text-center shadow-lg"
             style="width:min(500px,calc(100vw - 28px));
                    background:rgba(255,255,255,.055);
                    border:1px solid rgba(255,255,255,.1) !important;
                    border-radius:22px;backdrop-filter:blur(28px)">
            <div class="card-body px-3 py-5">
                <img loading="lazy" src="${avatar}" class="rounded-circle mb-3 pe-none"
                     width="99" height="99" style="object-fit:cover"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3545&color=fff&size=80'"
                     alt="${name}">
                <div class="text-white opacity-75 fw-bold m-0 fs-5">${name}</div>
                <div class="text-secondary mb-4 opacity-75">${email}</div>
                <div id="VTFilms-pending-status-area">
                    <div id="VTFilms-pending-icon" class="mb-3"><i class="fad fa-spinner-third fa-2x text-info fa-spin"></i></div>
                    <div id="VTFilms-pending-title" class="fw-semibold h5 text-info mb-2">Tài khoản đang chờ xác thực</div>
                    <p id="VTFilms-pending-msg" class="text-secondary mb-4">Liên hệ admin để được cấp quyền sử dụng</p>
                </div>
                <div id="VTFilms-pending-spinner"
                     class="d-inline-flex align-items-center gap-2 text-secondary small rounded-pill px-4 py-2 mb-3"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
                    admin@vutruong.vn
                </div>
                <div class="mt-1">
                    <a class="btn btn-sm btn-outline-secondary rounded px-3 border-0 fw-semibold opacity-75"
                            onclick="window.VTFilms_Auth.signOut()">
                        <i class="fad fa-right-from-bracket me-1"></i>Đăng xuất
                    </a>
                </div>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    });
    VTFilms_log.ok('Pending overlay đã chèn vào DOM (fade-in).');
}

/**
 * [v7.0] Fade chỉ #VTFilms-pending-status-area — không fade toàn overlay.
 * Tránh nhấp nháy khi admin đổi trạng thái realtime.
 */
function VTFilms_overlayTransition(updateFn, fadeDuration = 220) {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    if (!overlay) { updateFn(null); return; }

    const statusArea = overlay.querySelector('#VTFilms-pending-status-area');
    if (!statusArea) { updateFn(overlay); return; }

    statusArea.style.transition = `opacity ${fadeDuration}ms ease`;
    statusArea.style.opacity    = '0';
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


// ─────────────────────────────────────────────────────────────
// §8  TRANSITION FUNCTIONS (Layer A + Layer B)
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§12).
//
//     Layer A — applyOverlayContent(state): chỉ cập nhật DOM, không reload.
//     Layer B — onTransition*(): trigger từ unified listener, có side effects.
// ─────────────────────────────────────────────────────────────

function VTFilms_applyOverlayContent(state) {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    if (!overlay) return;

    const configs = {
        pending: {
            icon:    '<i class="fad fa-spinner-third fa-2x text-warning fa-spin"></i>',
            title:   'Tài khoản đang chờ xác thực',
            titleCls:'fw-semibold h5 text-warning mb-2',
            msg:     'Liên hệ admin để được cấp quyền sử dụng',
            spinner: 'admin@vutruong.vn',
        },
        rejected: {
            icon:    '<i class="fad fa-ban fa-2x text-danger"></i>',
            title:   'Tài khoản bị từ chối',
            titleCls:'fw-semibold h5 text-danger mb-2',
            msg:     'Liên hệ admin để được hỗ trợ',
            spinner: 'admin@vutruong.vn',
        },
        revoked: {
            icon:    '<i class="fad fa-lock-keyhole fa-2x text-warning"></i>',
            title:   'Quyền truy cập bị thu hồi',
            titleCls:'fw-semibold h5 text-warning mb-2',
            msg:     'Liên hệ admin để được hỗ trợ',
            spinner: 'admin@vutruong.vn',
        },
    };

    const cfg = configs[state] || configs.pending;
    VTFilms_overlayTransition((ov) => {
        if (!ov) return;
        const icon    = ov.querySelector('#VTFilms-pending-icon');
        const title   = ov.querySelector('#VTFilms-pending-title');
        const msg     = ov.querySelector('#VTFilms-pending-msg');
        const spinner = ov.querySelector('#VTFilms-pending-spinner');
        if (icon)    icon.innerHTML = cfg.icon;
        if (title)   { title.innerHTML = cfg.title; title.className = cfg.titleCls; }
        if (msg)     msg.innerHTML = cfg.msg;
        if (spinner) spinner.innerHTML = cfg.spinner;
    });
    VTFilms_log.info(`applyOverlayContent: state="${state}" applied.`);
}

function VTFilms_onTransitionApproved() {
    VTFilms_log.ok('Transition → APPROVED: hiện overlay success → reload...');
    if (!document.getElementById('VTFilms-pending-overlay')) {
        const cache = VTFilms_getCache();
        VTFilms_showPendingOverlay(cache || {});
    }
    VTFilms_overlayTransition((overlay) => {
        if (!overlay) return;
        const icon    = overlay.querySelector('#VTFilms-pending-icon');
        const title   = overlay.querySelector('#VTFilms-pending-title');
        const msg     = overlay.querySelector('#VTFilms-pending-msg');
        const spinner = overlay.querySelector('#VTFilms-pending-spinner');
        if (icon)    icon.innerHTML = '<i class="fad fa-circle-check text-success fa-2x"></i>';
        if (title)   { title.textContent = 'Xác thực thành công!'; title.className = 'fw-semibold h5 text-success mb-2'; }
        if (msg)     msg.innerHTML = 'Tài khoản của bạn đã được phê duyệt';
        if (spinner) spinner.innerHTML = '<i class="fad fa-spinner-third fa-spin me-2"></i>Đang tải dữ liệu';
    });
    setTimeout(() => {
        const pendingOverlay = document.getElementById('VTFilms-pending-overlay');
        if (pendingOverlay) {
            pendingOverlay.style.transition = 'opacity .4s ease';
            pendingOverlay.style.opacity    = '0';
            setTimeout(() => { window.location.reload(); }, 420);
        } else {
            window.location.reload();
        }
    }, 2500);
}

function VTFilms_onTransitionBlocked(state) {
    VTFilms_log.warn(`[v7.0] Transition → ${state.toUpperCase()}: remove app + update overlay in-place (no reload).`);
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

function VTFilms_onTransitionPending() {
    VTFilms_log.info('[v7.0] Transition → PENDING: remove app + update overlay in-place (no reload).');
    VTFilms_removeApp();
    if (!document.getElementById('VTFilms-pending-overlay')) {
        const cache = VTFilms_getCache();
        VTFilms_showPendingOverlay(cache || {});
    } else {
        VTFilms_applyOverlayContent('pending');
    }
}


// ─────────────────────────────────────────────────────────────
// §9  UNIFIED REALTIME LISTENER
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§13).
//     1 onSnapshot duy nhất. Chỉ trigger khi status THỰC SỰ thay đổi.
// ─────────────────────────────────────────────────────────────

let VTFilms_verifyUnsubscribe = null;

function VTFilms_startUnifiedListener(fbUser, initialStatus) {
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
    }
    VTFilms_log.info(`Unified listener START uid: ${fbUser.uid}, initialStatus: ${initialStatus}`);
    const ref = doc(VTFilms_db, 'users', fbUser.uid);
    let _lastStatus = initialStatus || null;

    VTFilms_verifyUnsubscribe = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
            if (_lastStatus === null) {
                VTFilms_log.warn(`Unified listener: users/${fbUser.uid} chưa tồn tại (init) → chờ syncUserDoc.`);
                return;
            }
            VTFilms_log.warn(`Unified listener: users/${fbUser.uid} bị XÓA → force signOut...`);
            VTFilms_clearCache();
            VTFilms_clearProfileFlag();
            VTFilms_clearVerifyStatus();
            VTFilms_clearTabGuard();
            if (VTFilms_verifyUnsubscribe) { VTFilms_verifyUnsubscribe(); VTFilms_verifyUnsubscribe = null; }
            VTFilms_fbSignOut(VTFilms_auth).then(() => {
                window.location.href = window.location.pathname;
            }).catch(err => {
                VTFilms_log.error('Force signOut thất bại:', err.message);
                window.location.reload();
            });
            return;
        }

        const v = snap.data().verifiedUser;
        let newStatus;
        if      (v === true)       newStatus = 'approved';
        else if (v === false)      newStatus = 'pending';
        else if (v === 'rejected') newStatus = 'rejected';
        else if (v === 'revoked')  newStatus = 'revoked';
        else                       newStatus = 'pending';

        VTFilms_log.info(`Unified listener: verifiedUser=${JSON.stringify(v)} → newStatus=${newStatus}, lastStatus=${_lastStatus}`);

        if (newStatus === _lastStatus) {
            VTFilms_saveVerifyStatus(fbUser.uid, newStatus);
            return;
        }

        VTFilms_log.ok(`Unified listener: transition ${_lastStatus} → ${newStatus}`);
        _lastStatus = newStatus;
        VTFilms_saveVerifyStatus(fbUser.uid, newStatus);

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


// ─────────────────────────────────────────────────────────────
// §10  ADMIN PANEL — QUẢN LÝ USER
//      [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§14).
//      3 onSnapshot queries realtime, partial update khi switch tab.
// ─────────────────────────────────────────────────────────────

let VTFilms_pendingUsers    = [];
let VTFilms_pendingVisible  = 5;
let VTFilms_adminPendingUnsub = null;

let VTFilms_approvedUsers   = [];
let VTFilms_approvedVisible = 5;
let VTFilms_adminApprovedUnsub = null;

let VTFilms_rejectedUsers   = [];
let VTFilms_rejectedVisible = 5;
let VTFilms_adminRejectedUnsub = null;

let VTFilms_adminActiveTab  = 'pending';

function VTFilms_getAdminContainer() {
    let container = document.getElementById('vt-admin-info');
    if (container) return container;
    container = document.createElement('div');
    container.id        = 'vt-admin-info';
    container.className = 'me-1 dropdown';
    const userInfo = document.getElementById('vt-user-info');
    if (userInfo?.parentElement) {
        userInfo.parentElement.insertBefore(container, userInfo);
    } else {
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9997';
        document.body.appendChild(container);
    }
    return container;
}

function VTFilms_adminSwitchTab(tab) {
    VTFilms_adminActiveTab = tab;
    VTFilms_renderAdminTabContent();
}

function VTFilms_adminUserItemHTML(u, tab) {
    const name   = u.displayName || u.email || 'Unknown';
    const email  = u.email || '';
    const uid    = u.uid;
    const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=45`;
    const ts     = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('vi-VN') : '—';

    let actionHTML = '';
    if (tab === 'pending') {
        actionHTML = `
            <div class="d-flex gap-2">
                <a class="btn btn-sm btn-success flex-fill rounded small w-50"
                   onclick="window.VTFilms_Auth._adminApprove('${uid}', this)" role="button">
                    <i class="fad fa-check me-2"></i>Phê duyệt
                </a>
                <a class="btn btn-sm btn-danger flex-fill rounded small w-50"
                   onclick="window.VTFilms_Auth._adminReject('${uid}', this)" role="button">
                    <i class="fad fa-xmark me-2"></i>Từ chối
                </a>
            </div>`;
    } else if (tab === 'approved') {
        actionHTML = `
            <div class="d-flex gap-2">
                <a class="btn btn-sm btn-warning flex-fill rounded small w-50"
                   onclick="window.VTFilms_Auth._adminRevoke('${uid}', this)" role="button">
                    <i class="fad fa-lock-keyhole me-2"></i>Thu hồi
                </a>
                <a class="btn btn-sm btn-danger flex-fill rounded small w-50"
                   onclick="window.VTFilms_Auth._showDeleteConfirmModal('${uid}', '${name.replace(/'/g,"\\'")}', '${email}', this)"
                   role="button">
                    <i class="fad fa-trash-can me-2"></i>Xóa tài khoản
                </a>
            </div>`;
    } else if (tab === 'rejected') {
        const isRevoked = u.verifiedUser === 'revoked';
        const statusBadge = isRevoked
            ? `<span class="badge bg-warning text-dark ms-1" style="font-size:9px">Thu hồi</span>`
            : `<span class="badge bg-danger ms-1" style="font-size:9px">Từ chối</span>`;
        actionHTML = `
            <div class="d-flex gap-2">
                <a class="btn btn-sm btn-success flex-fill rounded small w-50"
                   onclick="window.VTFilms_Auth._adminReapprove('${uid}', this)" role="button">
                    <i class="fad fa-rotate-left me-2"></i>Phê duyệt lại
                </a>
                <a class="btn btn-sm btn-danger flex-fill rounded small w-50"
                   onclick="window.VTFilms_Auth._showDeleteConfirmModal('${uid}', '${name.replace(/'/g,"\\'")}', '${email}', this)"
                   role="button">
                    <i class="fad fa-trash-can me-2"></i>Xóa tài khoản
                </a>
            </div>`;
        return `
            <li><div class="dropdown-item-text text-light m-0 p-3">
                <div class="d-flex align-items-start gap-2 mb-3">
                    <img src="${avatar}" class="rounded-circle flex-shrink-0" width="45" height="45" style="object-fit:cover"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=45'" alt="${name}">
                    <div class="overflow-hidden flex-grow-1">
                        <div class="fw-semibold text-truncate d-flex align-items-center gap-1">${name}${statusBadge}</div>
                        <div class="text-truncate opacity-75 small">${email}</div>
                    </div>
                    <div class="flex-shrink-0 small opacity-50">${ts}</div>
                </div>
                ${actionHTML}
            </div></li>`;
    }

    return `
        <li><div class="dropdown-item-text text-light m-0 p-3">
            <div class="d-flex align-items-start gap-2 mb-3">
                <img src="${avatar}" class="rounded-circle flex-shrink-0" width="45" height="45" style="object-fit:cover"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=45'" alt="${name}">
                <div class="overflow-hidden flex-grow-1">
                    <div class="fw-semibold text-truncate">${name}</div>
                    <div class="text-truncate opacity-75 small">${email}</div>
                </div>
                <div class="flex-shrink-0 small opacity-50">${ts}</div>
            </div>
            ${actionHTML}
        </div></li>`;
}

function VTFilms_computePanelParts() {
    const tab = VTFilms_adminActiveTab;
    let users, visible;
    if      (tab === 'pending')  { users = VTFilms_pendingUsers;  visible = VTFilms_pendingVisible; }
    else if (tab === 'approved') { users = VTFilms_approvedUsers; visible = VTFilms_approvedVisible; }
    else                         { users = VTFilms_rejectedUsers; visible = VTFilms_rejectedVisible; }

    const shown   = users.slice(0, visible);
    const hasMore = users.length > visible;

    const emptyMsg = {
        pending:  '<i class="fad fa-circle-check me-2 text-secondary"></i>Không có user nào đang chờ',
        approved: '<i class="fad fa-users me-2 text-secondary"></i>Chưa có user nào được duyệt',
        rejected: '<i class="fad fa-circle-xmark me-2 text-secondary"></i>Chưa có user nào bị từ chối',
    };

    const itemsHTML = shown.length === 0
        ? `<li><span class="dropdown-item-text text-secondary small py-3 d-block text-center">${emptyMsg[tab]}</span></li>`
        : shown.map(u => VTFilms_adminUserItemHTML(u, tab)).join('');

    const loadMoreHTML = hasMore ? `
        <li>
            <a class="dropdown-item text-center text-info small py-2" role="button"
               onclick="window.VTFilms_Auth._adminLoadMore('${tab}')">
                <i class="fad fa-chevron-down me-1"></i>Tải thêm (còn ${users.length - visible} user)
            </a>
        </li>` : '';

    const pendingTotal = VTFilms_pendingUsers.length;
    const badgeInner   = pendingTotal > 0
        ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
               style="margin:.25rem -.25rem 0">${pendingTotal > 99 ? '99+' : pendingTotal}</span>`
        : '';

    const tabDefs = [
        { key: 'pending',  label: 'Chờ duyệt', count: VTFilms_pendingUsers.length,  badge: 'bg-warning text-dark' },
        { key: 'approved', label: 'Đã duyệt',  count: VTFilms_approvedUsers.length, badge: 'bg-success' },
        { key: 'rejected', label: 'Từ chối',   count: VTFilms_rejectedUsers.length, badge: 'bg-danger' },
    ];

    const tabsInner = tabDefs.map(t => `
        <li class="nav-item">
            <a class="nav-link py-1 px-2 small ${t.key === tab ? 'active' : 'text-secondary'}"
               role="button" onclick="window.VTFilms_Auth._adminSwitchTab('${t.key}')"
               style="font-size:12px;border-radius:6px">
                ${t.label}
                <span class="badge ${t.count > 0 ? t.badge : 'bg-secondary'} ms-1" style="font-size:9px">${t.count}</span>
            </a>
        </li>`
    ).join('');

    return { badgeInner, tabsInner, listHTML: itemsHTML + loadMoreHTML, shown, users };
}

function VTFilms_renderAdminPanel() {
    const container = VTFilms_getAdminContainer();
    const { badgeInner, tabsInner, listHTML, shown, users } = VTFilms_computePanelParts();
    const alreadyRendered = !!container.querySelector('[data-bs-toggle="dropdown"]');

    if (alreadyRendered) {
        const badgeWrap = container.querySelector('#vtfilms-admin-badge');
        if (badgeWrap) badgeWrap.innerHTML = badgeInner;
        const tabsUl = container.querySelector('#vtfilms-admin-tabs');
        if (tabsUl) tabsUl.innerHTML = tabsInner;
        const listUl = container.querySelector('#vtfilms-admin-list');
        if (listUl) listUl.innerHTML = listHTML;
        return;
    }

    container.innerHTML = `
        <a class="nav-link position-relative admin-bell-icon border-0 shadow-none"
           data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside" role="button">
            <i class="fad fa-bell"></i>
            <span id="vtfilms-admin-badge">${badgeInner}</span>
        </a>
        <div class="dropdown-menu dropdown-menu-end history-dropdown p-0 m-0 shadow-lg rounded-3 slideIn animate"
             style="min-width:420px;max-width:500px;max-height:80vh;overflow-y:auto">
            <div class="px-3 pt-3 pb-0">
                <div class="fw-bold dropdown-item-text text-light p-0 text-uppercase small mb-2">Quản lý người dùng</div>
                <ul class="nav nav-pills gap-1 mb-0" id="vtfilms-admin-tabs">${tabsInner}</ul>
            </div>
            <hr class="my-2 opacity-10">
            <ul class="list-unstyled mb-0" id="vtfilms-admin-list">${listHTML}</ul>
        </div>`;

    VTFilms_log.ok(`Admin panel full render: tab=${VTFilms_adminActiveTab}, ${Math.min(shown.length, users.length)}/${users.length}.`);
}

function VTFilms_renderAdminTabContent() {
    const container = VTFilms_getAdminContainer();
    const tabsUl = container.querySelector('#vtfilms-admin-tabs');
    const listUl = container.querySelector('#vtfilms-admin-list');
    if (!tabsUl || !listUl) { VTFilms_renderAdminPanel(); return; }
    const { badgeInner, tabsInner, listHTML, shown, users } = VTFilms_computePanelParts();
    const badgeWrap = container.querySelector('#vtfilms-admin-badge');
    if (badgeWrap) badgeWrap.innerHTML = badgeInner;
    tabsUl.innerHTML = tabsInner;
    listUl.innerHTML = listHTML;
    VTFilms_log.info(`Admin panel tab switch: ${VTFilms_adminActiveTab}, ${Math.min(shown.length, users.length)}/${users.length}.`);
}

// ── Admin action functions ────────────────────────────────────

async function VTFilms_adminApprove(uid, btn) {
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: true });
        VTFilms_log.ok(`Approve OK: users/${uid}`);
    } catch (err) {
        VTFilms_log.error(`Approve ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-check me-2"></i>Duyệt'; }
    }
}

async function VTFilms_adminReject(uid, btn) {
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: 'rejected' });
        VTFilms_log.ok(`Reject OK: users/${uid}`);
    } catch (err) {
        VTFilms_log.error(`Reject ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-xmark me-2"></i>Biến'; }
    }
}

async function VTFilms_adminRevoke(uid, btn) {
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: 'revoked' });
        VTFilms_log.ok(`Revoke OK: users/${uid}`);
    } catch (err) {
        VTFilms_log.error(`Revoke ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-lock-keyhole me-2"></i>Thu hồi'; }
    }
}

async function VTFilms_adminReapprove(uid, btn) {
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: true });
        VTFilms_log.ok(`Reapprove OK: users/${uid}`);
    } catch (err) {
        VTFilms_log.error(`Reapprove ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-rotate-left me-2"></i>Phê duyệt lại'; }
    }
}

function VTFilms_showDeleteConfirmModal(uid, name, email, btn) {
    const existing = document.getElementById('vtfilms-delete-modal');
    if (existing) existing.remove();

    const modalEl = document.createElement('div');
    modalEl.id        = 'vtfilms-delete-modal';
    modalEl.className = 'modal fade';
    modalEl.setAttribute('tabindex', '-1');
    modalEl.setAttribute('data-bs-backdrop', 'static');
    modalEl.setAttribute('data-bs-keyboard', 'false');
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 rounded-4 shadow-lg"
                 style="background:rgba(0,0,0,.3);backdrop-filter:blur(3rem)">
                <div class="modal-header border-danger border-opacity-25 pb-2">
                    <div class="d-flex align-items-center gap-2">
                        <i class="fad fa-triangle-exclamation text-danger fa-lg"></i>
                        <h5 class="modal-title fw-bold text-danger mb-0">Xác nhận xóa user</h5>
                    </div>
                </div>
                <div class="modal-body py-3">
                    <p class="text-secondary small mb-3">Bạn sắp xóa hoàn toàn user sau khỏi hệ thống:</p>
                    <div class="rounded-3 p-3 mb-3"
                         style="background:rgba(220,53,69,.08);border:1px solid rgba(220,53,69,.25)">
                        <div class="fw-semibold text-light">${name}</div>
                        <div class="text-secondary small">${email}</div>
                    </div>
                    <ul class="small text-secondary mb-0 ps-3">
                        <li>Xóa toàn bộ dữ liệu user khỏi hệ thống</li>
                        <li>User bị đăng xuất ngay lập tức</li>
                        <li>Đăng nhập lại phải chờ phê duyệt từ đầu</li>
                    </ul>
                </div>
                <div class="modal-footer border-danger border-opacity-25 p-2">
                    <button type="button" id="vtf-del-cancel"
                            class="btn btn-sm btn-outline-secondary border-0 rounded px-4">Hủy bỏ</button>
                    <button type="button" id="vtf-del-confirm"
                            class="btn btn-sm btn-danger rounded px-4 d-flex align-items-center gap-2">
                        <i class="fad fa-trash-can me-2"></i>Xóa
                    </button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(modalEl);
    const bsModal = new bootstrap.Modal(modalEl);
    modalEl.querySelector('#vtf-del-cancel').onclick = () => bsModal.hide();
    modalEl.querySelector('#vtf-del-confirm').onclick = async () => {
        const confirmBtn = modalEl.querySelector('#vtf-del-confirm');
        const cancelBtn  = modalEl.querySelector('#vtf-del-cancel');
        confirmBtn.setAttribute('disabled', '');
        cancelBtn.setAttribute('disabled', '');
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xóa...';
        await VTFilms_adminDeleteUser(uid, email, btn);
        bsModal.hide();
    };
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    bsModal.show();
}

async function VTFilms_adminDeleteUser(uid, email, btn) {
    VTFilms_log.warn(`Admin xóa user: uid=${uid} (${email})...`);
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await deleteDoc(doc(VTFilms_db, 'users', uid));
        VTFilms_log.ok(`Delete OK: users/${uid} đã xóa.`);
    } catch (err) {
        VTFilms_log.error(`Delete ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-trash-can"></i>'; }
    }
}

function VTFilms_adminLoadMore(tab) {
    if (tab === 'pending')  VTFilms_pendingVisible  += 5;
    if (tab === 'approved') VTFilms_approvedVisible += 5;
    if (tab === 'rejected') VTFilms_rejectedVisible += 5;
    VTFilms_renderAdminPanel();
}

function VTFilms_startAdminPanel() {
    if (VTFilms_adminPendingUnsub)  { VTFilms_adminPendingUnsub();  VTFilms_adminPendingUnsub  = null; }
    if (VTFilms_adminApprovedUnsub) { VTFilms_adminApprovedUnsub(); VTFilms_adminApprovedUnsub = null; }
    if (VTFilms_adminRejectedUnsub) { VTFilms_adminRejectedUnsub(); VTFilms_adminRejectedUnsub = null; }

    VTFilms_log.info('Khởi động admin panel (3 onSnapshot queries)...');

    VTFilms_adminPendingUnsub = onSnapshot(
        query(collection(VTFilms_db, 'users'), where('verifiedUser', '==', false), orderBy('createdAt', 'desc')),
        (snap) => {
            VTFilms_pendingUsers   = snap.docs.map(d => d.data());
            VTFilms_pendingVisible = 5;
            VTFilms_renderAdminPanel();
        }, err => VTFilms_log.error('Admin pending onSnapshot lỗi:', err.message)
    );

    VTFilms_adminApprovedUnsub = onSnapshot(
        query(collection(VTFilms_db, 'users'), where('verifiedUser', '==', true), orderBy('lastLoginAt', 'desc')),
        (snap) => {
            VTFilms_approvedUsers   = snap.docs.map(d => d.data()).filter(u => u.role !== 'admin');
            VTFilms_approvedVisible = 5;
            VTFilms_renderAdminPanel();
        }, err => VTFilms_log.error('Admin approved onSnapshot lỗi:', err.message)
    );

    VTFilms_adminRejectedUnsub = onSnapshot(
        query(collection(VTFilms_db, 'users'), where('verifiedUser', 'in', ['rejected', 'revoked']), orderBy('lastLoginAt', 'desc')),
        (snap) => {
            VTFilms_rejectedUsers   = snap.docs.map(d => d.data());
            VTFilms_rejectedVisible = 5;
            VTFilms_renderAdminPanel();
        }, err => VTFilms_log.error('Admin rejected onSnapshot lỗi:', err.message)
    );
}

function VTFilms_stopAdminPanel() {
    if (VTFilms_adminPendingUnsub)  { VTFilms_adminPendingUnsub();  VTFilms_adminPendingUnsub  = null; }
    if (VTFilms_adminApprovedUnsub) { VTFilms_adminApprovedUnsub(); VTFilms_adminApprovedUnsub = null; }
    if (VTFilms_adminRejectedUnsub) { VTFilms_adminRejectedUnsub(); VTFilms_adminRejectedUnsub = null; }
    VTFilms_log.info('Admin panel: tất cả 3 listeners đã dừng.');
}


// ─────────────────────────────────────────────────────────────
// §11  GOOGLE IDENTITY SERVICES (GSI)
//      [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§15).
// ─────────────────────────────────────────────────────────────

function VTFilms_initGSI() {
    if (!window.google?.accounts?.id) {
        VTFilms_log.warn('GSI chưa sẵn sàng, thử lại sau 600ms...');
        setTimeout(VTFilms_initGSI, 600);
        return;
    }
    VTFilms_log.info('Khởi tạo Google GSI...');
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
            type: 'standard', theme: 'dark', size: 'large',
            text: 'signin_with', shape: 'pill', logo_alignment: 'left',
        });
        VTFilms_log.ok('Google Sign-In Button đã render.');
    }
}

async function VTFilms_onGSICallback(response) {
    VTFilms_log.info('GSI callback → signInWithCredential...');
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
    VTFilms_log.info('Mở Google Popup (manual)...');
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


// ─────────────────────────────────────────────────────────────
// §12  ĐĂNG XUẤT
//      [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§16).
// ─────────────────────────────────────────────────────────────

async function VTFilms_signOut() {
    VTFilms_log.info('Bắt đầu đăng xuất...');
    try {
        window.google?.accounts?.id?.disableAutoSelect();
        VTFilms_stopVerifyListener();
        VTFilms_stopAdminPanel();
        VTFilms_clearCache();
        VTFilms_clearProfileFlag();
        VTFilms_clearVerifyStatus();
        VTFilms_clearTabGuard();
        VTFilms_hidePendingOverlay();
        const _appEl = document.getElementById('VT-Films-App');
        if (_appEl) _appEl.remove();
        await VTFilms_fbSignOut(VTFilms_auth);
        VTFilms_log.ok('Đăng xuất thành công → redirect...');
        window.location.href = window.location.pathname;
    } catch (err) {
        VTFilms_log.error('Đăng xuất thất bại:', err.message);
    }
}


// ─────────────────────────────────────────────────────────────
// §13  QUẢN LÝ USER OBJECT & DROPDOWN
//      [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§17).
// ─────────────────────────────────────────────────────────────

function VTFilms_buildUser(fbUser) {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'U')}&background=dc3545&color=fff&size=128`;
    const role     = VTFilms_getRole(fbUser.uid);
    return {
        uid:       fbUser.uid,
        name:      fbUser.displayName || 'Người dùng',
        email:     fbUser.email,
        avatar:    fbUser.photoURL || fallback,
        provider:  fbUser.providerData?.[0]?.providerId || 'google.com',
        role,
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
        VTFilms_log.info('User set: null (chưa đăng nhập).');
    }
    window.dispatchEvent(new CustomEvent('vtfilms:auth-ready', { detail: { user } }));
}

function VTFilms_renderDropdown(user) {
    const el = document.getElementById('vt-user-info');
    if (!el || !user) return;
    const fallback   = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=dc3545&color=fff`;
    const adminBadge = user.role === 'admin'
        ? `<i class="fa-solid fa-badge-check ms-1 text-primary"></i>`
        : '';
    el.innerHTML = `
        <div class="dropdown">
            <a class="nav-link p-0 m-0" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside">
                <img src="${user.avatar}" class="rounded-circle" width="45" height="45"
                     style="object-fit:cover" alt="${user.name}"
                     onerror="this.src='${fallback}'">
            </a>
            <ul class="dropdown-menu dropdown-menu-end slideIn animate border-0 shadow-none history-dropdown"
                style="min-width: max-content">
                <li class="mb-2">
                    <div class="dropdown-item-text text-light d-flex align-items-center gap-2">
                        <img src="${user.avatar}" class="rounded-circle flex-shrink-0"
                             width="44" height="44" style="object-fit:cover" alt="${user.name}"
                             onerror="this.src='${fallback}'">
                        <div class="overflow-hidden">
                            <div class="fw-semibold text-truncate d-inline-flex align-items-center">${user.name}${adminBadge}</div>
                            <div class="text-secondary text-truncate small">${user.email}</div>
                        </div>
                    </div>
                </li>
                <li>
                    <a class="dropdown-item text-danger d-flex align-items-center gap-2 py-2 small"
                            onclick="window.VTFilms_Auth.signOut()" role="button">
                        <i class="fa-duotone fa-right-from-bracket fa-fw"></i>Đăng xuất
                    </a>
                </li>
            </ul>
        </div>`;
    VTFilms_log.ok(`Dropdown render OK (${user.name} · ${user.role}).`);
}


// ─────────────────────────────────────────────────────────────
// §14 [API] LAZY LOAD ẢNH
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§0).
//     Single shared IntersectionObserver — không tạo mới mỗi lần gọi.
//     Chỉ observe ảnh có class "lazy-img" + data-src.
// ─────────────────────────────────────────────────────────────

let VTFilms__lazyObserver = null;

function VTFilms_initLazyLoading() {
    if (!VTFilms__lazyObserver) {
        VTFilms__lazyObserver = new IntersectionObserver((entries, observer) => {
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
        }, { rootMargin: '50px 0px', threshold: 0.01 });
    }
    document.querySelectorAll('.lazy-img').forEach(img => VTFilms__lazyObserver.observe(img));
}


// ─────────────────────────────────────────────────────────────
// §15 [API] HẰNG SỐ & CẤU HÌNH API
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§1).
// ─────────────────────────────────────────────────────────────

const VTFilms_CONFIG = {
    BASE_API:     'https://phim.nguonc.com/api/films',
    DETAIL_API:   'https://phim.nguonc.com/api/film/',
    ENDPOINTS: {
        new:      '/phim-moi-cap-nhat',
        list:     '/danh-sach/',
        category: '/the-loai/',
        country:  '/quoc-gia/',
        search:   '/search?keyword=',
    },
    CONTAINER_ID:  'movieList',
    DEFAULT_TITLE: 'VT Films',
    MAX_CONCURRENT:     3,
    MIN_DELAY_MS:       220,
    CACHE_TTL_MS:       5 * 60 * 1000,
    HOME_INITIAL_COUNT: 3,
    HOME_SECTION_DELAY: 1000,
    SKELETON_DELAY_MS:  600,
    MAX_RETRIES:        2,
    RETRY_BACKOFF_MS:   1000,
};

const VTFilms_MOVIE_MENU_DATA = {
    genres: [
        'Hành Động', 'Phiêu Lưu', 'Hoạt Hình', 'Hài', 'Hình Sự',
        'Tài Liệu', 'Chính Kịch', 'Gia Đình', 'Giả Tưởng', 'Lịch Sử',
        'Kinh Dị', 'Phim Nhạc', 'Bí Ẩn', 'Lãng Mạn', 'Khoa Học Viễn Tưởng',
        'Gây Cấn', 'Chiến Tranh', 'Tâm Lý', 'Tình Cảm', 'Cổ Trang',
        'Miền Tây', 'Phim 18+',
    ],
    countries: [
        'Âu Mỹ', 'Anh', 'Trung Quốc', 'Indonesia', 'Việt Nam',
        'Pháp', 'Hồng Kông', 'Hàn Quốc', 'Nhật Bản', 'Thái Lan',
        'Đài Loan', 'Nga', 'Hà Lan', 'Philippines', 'Ấn Độ', 'Quốc gia khác',
    ],
};

const VTFilms__ALL_MENU_ITEMS = [
    ...VTFilms_MOVIE_MENU_DATA.genres,
    ...VTFilms_MOVIE_MENU_DATA.countries,
    'Phim Lẻ', 'Phim Bộ', 'Phim Mới',
];

const VTFilms_PAGING_STATE = {
    currentPage:      1,
    isLoading:        false,
    hasMore:          true,
    currentEndpoint:  '',
    isInfiniteMode:   false,
};


// ─────────────────────────────────────────────────────────────
// §16 [API] FETCH QUEUE — Rate Limiting
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§2).
//     Tối đa MAX_CONCURRENT request song song, delay MIN_DELAY_MS/req.
// ─────────────────────────────────────────────────────────────

const VTFilms_FetchQueue = (() => {
    const queue   = [];
    let   running = 0;

    function _processQueue() {
        if (running >= VTFilms_CONFIG.MAX_CONCURRENT || queue.length === 0) return;
        running++;
        const { fn, resolve, reject } = queue.shift();
        fn()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                setTimeout(() => { running--; _processQueue(); }, VTFilms_CONFIG.MIN_DELAY_MS);
            });
        _processQueue();
    }

    return {
        enqueue(fn) {
            return new Promise((resolve, reject) => {
                queue.push({ fn, resolve, reject });
                _processQueue();
            });
        },
        get queueLength() { return queue.length; },
    };
})();


// ─────────────────────────────────────────────────────────────
// §17 [API] API CACHE — sessionStorage, TTL 5 phút
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§3).
// ─────────────────────────────────────────────────────────────

const VTFilms_ApiCache = (() => {
    const PREFIX = 'vtf_cache_';
    return {
        get(url) {
            try {
                const raw = sessionStorage.getItem(PREFIX + url);
                if (!raw) return null;
                const { data, ts } = JSON.parse(raw);
                if (Date.now() - ts > VTFilms_CONFIG.CACHE_TTL_MS) {
                    sessionStorage.removeItem(PREFIX + url);
                    return null;
                }
                return data;
            } catch { return null; }
        },
        set(url, data) {
            try {
                sessionStorage.setItem(PREFIX + url, JSON.stringify({ data, ts: Date.now() }));
            } catch { /* QuotaExceeded — bỏ qua */ }
        },
        clear() {
            Object.keys(sessionStorage)
                .filter(k => k.startsWith(PREFIX))
                .forEach(k => sessionStorage.removeItem(k));
        },
    };
})();


// ─────────────────────────────────────────────────────────────
// §18 [API] VTFilms_fetch — Fetch với Cache + Rate Limiting + Retry
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§4).
//     Thứ tự: cache hit → FetchQueue → retry → modal nếu rate-limit.
// ─────────────────────────────────────────────────────────────

let VTFilms__currentAbortController = new AbortController();

function VTFilms__resetAbortController() {
    VTFilms__currentAbortController.abort();
    VTFilms__currentAbortController = new AbortController();
}

async function VTFilms_fetch(endpoint, page = null, useQueue = true) {
    let url = endpoint.startsWith('http')
        ? endpoint
        : `${VTFilms_CONFIG.BASE_API}${endpoint}`;
    if (page !== null) {
        url += (url.includes('?') ? '&' : '?') + `page=${page}`;
    }

    const cached = VTFilms_ApiCache.get(url);
    if (cached) return cached;

    const doFetch = async () => {
        const signal = VTFilms__currentAbortController.signal;
        let lastError;
        let lastFailType = null;

        for (let attempt = 0; attempt <= VTFilms_CONFIG.MAX_RETRIES; attempt++) {
            if (signal.aborted) return null;
            try {
                if (attempt > 0) {
                    await new Promise(r => setTimeout(r, VTFilms_CONFIG.RETRY_BACKOFF_MS * attempt));
                }
                const res = await fetch(url, { signal });
                if (res.status === 429) { lastFailType = 'ratelimit'; lastError = new Error('HTTP 429'); continue; }
                if (res.status === 503) { lastFailType = 'overload';  lastError = new Error('HTTP 503'); continue; }
                if (!res.ok) { lastFailType = null; throw new Error(`HTTP ${res.status}`); }
                lastFailType = null;
                const data = await res.json();
                VTFilms_ApiCache.set(url, data);
                return data;
            } catch (err) {
                if (err.name === 'AbortError') return null;
                lastError = err;
            }
        }

        if (lastFailType && !signal.aborted) VTFilms_showRateLimitModal(lastFailType);
        console.error('[VTFilms API] fetch thất bại sau retry:', url, lastError?.message);
        return null;
    };

    return useQueue ? VTFilms_FetchQueue.enqueue(doFetch) : doFetch();
}


// ─────────────────────────────────────────────────────────────
// §19 [API] RATE-LIMIT MODAL
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§4b).
//     Glassmorphism, auto-close 30s, guard chống duplicate.
// ─────────────────────────────────────────────────────────────

function VTFilms_showRateLimitModal(type) {
    if (document.getElementById('vtf-ratelimit-modal')) return;
    const configs = {
        ratelimit: {
            icon:   '<i class="fad fa-ban fa-2x text-warning"></i>',
            title:  'Yêu cầu bị từ chối tạm thời',
            reason: 'Tài khoản của bạn tạm thời bị hạn chế do <b>gửi quá nhiều yêu cầu</b> đến máy chủ trong thời gian ngắn.',
            hint:   'Hãy cuộn chậm hơn hoặc đợi 10–30 giây để hệ thống phục hồi.',
        },
        overload: {
            icon:   '<i class="fad fa-server fa-2x text-danger"></i>',
            title:  'Máy chủ đang quá tải',
            reason: 'Máy chủ nguồn phim đang quá tải (503). Dịch vụ sẽ tự phục hồi trong giây lát.',
            hint:   'Thử lại sau 1–2 phút.',
        },
    };
    const cfg = configs[type] || configs.ratelimit;
    const modal = document.createElement('div');
    modal.id = 'vtf-ratelimit-modal';
    modal.style.cssText = [
        'position:fixed','inset:0','z-index:99997',
        'display:flex','align-items:center','justify-content:center',
        'background:rgba(0,0,0,.55)','backdrop-filter:blur(4px)',
        'opacity:0','transition:opacity .25s ease','padding:16px',
    ].join(';');
    modal.innerHTML = `
        <div role="dialog" aria-modal="true"
             style="width:min(440px,100%);background:rgba(30,30,30,.92);border:1px solid rgba(255,255,255,.12);
                    border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.6);padding:2rem 1.75rem 1.5rem;text-align:center">
            <div style="margin-bottom:.9rem">${cfg.icon}</div>
            <div style="font-size:1.05rem;font-weight:700;color:#f8d470;margin-bottom:.65rem">${cfg.title}</div>
            <p style="font-size:.875rem;color:#aaa;line-height:1.6;margin-bottom:.5rem">${cfg.reason}</p>
            <p style="font-size:.8rem;color:#666;line-height:1.5;margin-bottom:1.4rem">${cfg.hint}</p>
            <button style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#ccc;
                           border-radius:10px;padding:.55rem 2.2rem;font-size:.875rem;font-weight:600;cursor:pointer"
                    onmouseover="this.style.background='rgba(255,255,255,.16)'"
                    onmouseout="this.style.background='rgba(255,255,255,.08)'"
                    onclick="window.VTFilms_closeRateLimitModal()">Đóng</button>
        </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => requestAnimationFrame(() => { modal.style.opacity = '1'; }));
    modal.addEventListener('click', e => { if (e.target === modal) window.VTFilms_closeRateLimitModal(); });
    modal._autoClose = setTimeout(() => window.VTFilms_closeRateLimitModal(), 30000);
}

function VTFilms_closeRateLimitModal() {
    const modal = document.getElementById('vtf-ratelimit-modal');
    if (!modal) return;
    clearTimeout(modal._autoClose);
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 260);
}


// ─────────────────────────────────────────────────────────────
// §20 [API] TIỆN ÍCH
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§5).
// ─────────────────────────────────────────────────────────────

function VTFilms_getDisplayName(slug) {
    const found = VTFilms__ALL_MENU_ITEMS.find(item => VTFilms_slugify(item) === slug);
    if (found) return found;
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function VTFilms_slugify(text) {
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

function VTFilms_updatePageTitle(content = '', isRaw = false) {
    if (!content) { document.title = VTFilms_CONFIG.DEFAULT_TITLE; return; }
    document.title = isRaw ? content : VTFilms_getDisplayName(content);
}

function VTFilms_updateURL(params = {}) {
    const url = new URL(window.location.href);
    url.search = '';
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    window.history.pushState({}, '', url);
}

function VTFilms__debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}


// ─────────────────────────────────────────────────────────────
// §21 [API] RENDER CARD PHIM & SKELETON
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§6).
// ─────────────────────────────────────────────────────────────

const VTFilms_BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function VTFilms_renderMovieCard(movie, mode = 'grid') {
    const colClass = mode === 'grid' ? 'col' : 'movie-card-item';
    return `
    <div class="${colClass}">
      <div class="movie-item" title="${movie.name}"
           onclick="window.VTFilms_navigateToMovie('${movie.slug}')" style="cursor:pointer">
        <div class="poster-wrapper">
          <i class="fa-duotone fa-play play-overlay"></i>
          <img data-src="${movie.thumb_url}" src="${VTFilms_BLANK_GIF}"
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

function VTFilms_renderGridSkeleton(count = 10) {
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

function VTFilms_renderSectionSkeleton() {
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
// §22 [API] ĐIỀU HƯỚNG SPA
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§7).
//     [v8.0] CAN THIỆP: gán window.VTFilms_navigateToMovie trong VTFilms_initAPI()
//     vì các hàm này được gọi từ inline onclick trong HTML được render bởi API.
// ─────────────────────────────────────────────────────────────

function VTFilms_triggerSearch() {
    const sInput  = document.getElementById('searchInput');
    const keyword = sInput ? sInput.value.trim() : '';
    if (keyword.length > 1) {
        VTFilms_updateURL({ search: keyword });
        VTFilms_checkRoute();
        sInput.blur();
    }
}

function VTFilms_navigateToMovie(slug) {
    VTFilms_updateURL({ watch: slug });
    VTFilms_showMovieDetail(slug);
}

function VTFilms_navigateToCategory(type, slug) {
    let params = {};
    if (type === 'quoc-gia')      params.country = slug;
    else if (type === 'the-loai') params.type    = slug;
    else                           params.cat     = slug || type;
    VTFilms_updateURL(params);
    VTFilms_checkRoute();
    const navbarCollapse = document.getElementById('movieNavbar');
    if (navbarCollapse?.classList.contains('show')) {
        bootstrap.Collapse.getInstance(navbarCollapse)?.hide();
    }
}


// ─────────────────────────────────────────────────────────────
// §23 [API] INFINITE SCROLL
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§8).
// ─────────────────────────────────────────────────────────────

async function VTFilms_loadMoreMovies(isFirstLoad = false) {
    if (VTFilms_PAGING_STATE.isLoading || !VTFilms_PAGING_STATE.hasMore) return;
    VTFilms_PAGING_STATE.isLoading = true;

    const btnLoadMore = document.getElementById('btnLoadMore');
    if (btnLoadMore) btnLoadMore.style.display = 'none';
    VTFilms_updateBottomLoader(true);

    try {
        const [data] = await Promise.all([
            VTFilms_fetch(VTFilms_PAGING_STATE.currentEndpoint, VTFilms_PAGING_STATE.currentPage),
            new Promise(r => setTimeout(r, 500)),
        ]);

        const grid = document.querySelector('.movie-grid-row');
        if (grid && data?.items?.length > 0) {
            const html = data.items.map(m => VTFilms_renderMovieCard(m, 'grid')).join('');
            if (isFirstLoad) grid.innerHTML = html;
            else             grid.insertAdjacentHTML('beforeend', html);
            VTFilms_PAGING_STATE.currentPage++;
            VTFilms_PAGING_STATE.hasMore = VTFilms_PAGING_STATE.currentPage <= (data.paginate?.total_page || 1);
        } else {
            if (isFirstLoad && grid) {
                if (data === null) {
                    grid.innerHTML = '<div class="text-secondary text-center py-5 w-100 opacity-75">'
                        + '<i class="fad fa-triangle-exclamation me-2 text-warning"></i>'
                        + 'Không thể tải dữ liệu. Vui lòng thử lại sau.'
                        + '</div>';
                } else {
                    grid.innerHTML = '<div class="text-danger text-center py-5 w-100">Không tìm thấy phim nào.</div>';
                }
            }
            VTFilms_PAGING_STATE.hasMore = false;
        }
    } catch (err) {
        console.error('[VTFilms API] Lỗi loadMoreMovies:', err);
    } finally {
        VTFilms_PAGING_STATE.isLoading = false;
        VTFilms_updateBottomLoader(false, VTFilms_PAGING_STATE.hasMore ? '' : 'Không còn kết quả nào khác.');
        VTFilms_initLazyLoading();
        if (btnLoadMore && VTFilms_PAGING_STATE.hasMore) btnLoadMore.style.display = 'inline-block';
    }
}

function VTFilms_updateBottomLoader(show, msg = '') {
    const loader = document.getElementById('bottom-loader');
    if (!loader) return;
    if (show) {
        loader.innerHTML = `
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-5 g-2 mt-1 text-start">
          ${VTFilms_renderGridSkeleton(10)}
      </div>`;
    } else {
        loader.innerHTML = msg
            ? `<div class="py-4 text-center text-secondary fw-bold">${msg}</div>`
            : '';
    }
}


// ─────────────────────────────────────────────────────────────
// §24 [API] ROUTER SPA
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§9).
// ─────────────────────────────────────────────────────────────

async function VTFilms_checkRoute() {
    const container = document.getElementById(VTFilms_CONFIG.CONTAINER_ID);
    if (!container) return;

    VTFilms__resetAbortController();
    const urlParams = new URLSearchParams(window.location.search);
    container.innerHTML = '';
    VTFilms_PAGING_STATE.isInfiniteMode = false;
    window.scrollTo(0, 0);

    if (urlParams.has('watch')) {
        VTFilms_showMovieDetail(urlParams.get('watch'));
    } else if (urlParams.has('search')) {
        const key = urlParams.get('search');
        VTFilms_updatePageTitle(key, true);
        VTFilms_setupInfinitePage(
            `<i class="fa-duotone fa-search me-2"></i>Tìm kiếm: ${key}`,
            `${VTFilms_CONFIG.ENDPOINTS.search}${key}`
        );
    } else if (urlParams.has('type')) {
        const slug = urlParams.get('type');
        VTFilms_updatePageTitle(slug);
        VTFilms_setupInfinitePage(
            `<i class="fa-duotone fa-tags me-2"></i>Thể loại: ${VTFilms_getDisplayName(slug)}`,
            `${VTFilms_CONFIG.ENDPOINTS.category}${slug}`
        );
    } else if (urlParams.has('country')) {
        const slug = urlParams.get('country');
        VTFilms_updatePageTitle(slug);
        VTFilms_setupInfinitePage(
            `<i class="fa-duotone fa-earth-asia me-2"></i>Quốc gia: ${VTFilms_getDisplayName(slug)}`,
            `${VTFilms_CONFIG.ENDPOINTS.country}${slug}`
        );
    } else if (urlParams.has('cat')) {
        const slug     = urlParams.get('cat');
        const endpoint = (slug === 'new')
            ? VTFilms_CONFIG.ENDPOINTS.new
            : `${VTFilms_CONFIG.ENDPOINTS.list}${slug}`;
        VTFilms_updatePageTitle(slug);
        VTFilms_setupInfinitePage(
            `<i class="fa-duotone fa-tags me-2"></i>${VTFilms_getDisplayName(slug)}`,
            endpoint
        );
    } else {
        VTFilms_updatePageTitle('');
        VTFilms_loadHomePage();
    }
}

async function VTFilms_setupInfinitePage(title, endpoint) {
    const container = document.getElementById(VTFilms_CONFIG.CONTAINER_ID);

    VTFilms_PAGING_STATE.isInfiniteMode  = true;
    VTFilms_PAGING_STATE.currentPage     = 1;
    VTFilms_PAGING_STATE.hasMore         = true;
    VTFilms_PAGING_STATE.currentEndpoint = endpoint;

    container.innerHTML = `
    <div class="infinite-wrapper">
      <h2 class="section-title mb-3 text-danger">${title}</h2>
      <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 row-cols-xl-5 g-2 movie-grid-row">
          ${VTFilms_renderGridSkeleton(10)}
      </div>
      <div id="pagination-area" class="text-center py-3">
        <div id="bottom-loader"></div>
        <div id="infinite-sentinel" style="height: 20px;"></div>
        <button id="btnLoadMore"
                class="btn btn-outline-danger px-5 py-2 fw-bold mt-3"
                style="display:none;"
                onclick="window.VTFilms_loadMoreMovies()">TẢI THÊM</button>
      </div>
    </div>`;

    await new Promise(r => setTimeout(r, VTFilms_CONFIG.SKELETON_DELAY_MS));
    await VTFilms_loadMoreMovies(true);

    if (window.movieObserver) window.movieObserver.disconnect();
    const sentinel = document.getElementById('infinite-sentinel');
    if (sentinel) {
        let _observerReady = false;
        setTimeout(() => { _observerReady = true; }, 200);
        window.movieObserver = new IntersectionObserver(entries => {
            if (
                _observerReady &&
                entries[0].isIntersecting &&
                VTFilms_PAGING_STATE.isInfiniteMode &&
                !VTFilms_PAGING_STATE.isLoading &&
                VTFilms_PAGING_STATE.hasMore
            ) {
                VTFilms_loadMoreMovies();
            }
        }, { rootMargin: '50px' });
        window.movieObserver.observe(sentinel);
    }
}


// ─────────────────────────────────────────────────────────────
// §25 [API] TRANG CHỦ — LAZY SECTION LOADING (CHAIN PATTERN)
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§10).
//     Chain: chỉ observe 1 sentinel tại 1 thời điểm → tuyệt đối tuần tự.
// ─────────────────────────────────────────────────────────────

const VTFilms_HOME_SECTIONS_LIST = [
    { title: 'Phim mới cập nhật',          slug: 'new',                  type: 'new'     },
    { title: 'Phim đang chiếu',            slug: 'phim-dang-chieu',      type: 'list'    },
    { title: 'Việt Nam',                   slug: 'viet-nam',             type: 'country' },
    { title: 'Mèo Ú Doraemon',             slug: 'Doraemon',             type: 'search'  },
    // { title: 'Thám tử lừng danh Conan',    slug: 'Conan',                type: 'search'  },
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

function VTFilms__buildSectionJob(item) {
    let endpoint, navType = 'cat';
    if (item.type === 'new') {
        endpoint = VTFilms_CONFIG.ENDPOINTS.new;
    } else if (item.type === 'search') {
        endpoint = `${VTFilms_CONFIG.ENDPOINTS.search}${item.slug}`;
        navType  = 'search';
    } else if (item.type === 'country') {
        endpoint = `${VTFilms_CONFIG.ENDPOINTS.country}${item.slug}`;
        navType  = 'quoc-gia';
    } else {
        endpoint = `${VTFilms_CONFIG.ENDPOINTS.list}${item.slug}`;
    }
    return { title: item.title, endpoint, navType, slug: item.slug };
}

function VTFilms__renderSectionHTML(job, data) {
    const top10 = data.items.slice(0, 10);
    return `
      <div class="section-title-wrapper d-flex justify-content-between align-items-center mb-3">
        <h2 class="section-title bungee h4 mb-0 py-2">${job.title}</h2>
        <button onclick="window.VTFilms_handleViewAll('${job.navType}', '${job.slug}')"
                class="btn-view-all btn btn-sm btn-dark d-flex align-items-center border-0 shadow-none">
          Xem thêm <i class="ms-1 fa-duotone fa-plus fa-sm"></i>
        </button>
      </div>
      <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0">
        ${top10.map(m => VTFilms_renderMovieCard(m, 'card')).join('')}
      </div>`;
}

async function VTFilms_loadHomeSection(index, containerEl) {
    const item = VTFilms_HOME_SECTIONS_LIST[index];
    if (!item || containerEl.dataset.loaded === '1') return;
    containerEl.dataset.loaded = '1';

    const job  = VTFilms__buildSectionJob(item);
    const data = await VTFilms_fetch(job.endpoint, 1);
    if (!data?.items?.length) { containerEl.innerHTML = ''; return; }

    containerEl.style.transition = 'opacity .25s ease';
    containerEl.style.opacity    = '0';
    await new Promise(r => setTimeout(r, 260));
    containerEl.innerHTML = VTFilms__renderSectionHTML(job, data);
    containerEl.style.opacity = '1';
    VTFilms_initLazyLoading();
    if (typeof initDragToScroll === 'function') initDragToScroll();
}

async function VTFilms_loadHomePage() {
    const container = document.getElementById(VTFilms_CONFIG.CONTAINER_ID);
    const initial   = VTFilms_CONFIG.HOME_INITIAL_COUNT;
    const total     = VTFilms_HOME_SECTIONS_LIST.length;

    let html = '';
    for (let i = 0; i < initial; i++) {
        html += `<div id="home-section-${i}" class="movie-section mb-3" data-loaded="0">${VTFilms_renderSectionSkeleton()}</div>`;
    }
    for (let i = initial; i < total; i++) {
        html += `<div id="home-section-${i}" class="movie-section mb-3"
                      data-loaded="0"
                      style="background:transparent!important;padding:0!important;gap:0!important;min-height:1px;max-height:0;overflow:hidden;margin:0!important;box-shadow:none!important"></div>`;
    }
    container.innerHTML = html;

    const initialLoads = [];
    for (let i = 0; i < initial; i++) {
        const el = document.getElementById(`home-section-${i}`);
        if (el) initialLoads.push(VTFilms_loadHomeSection(i, el));
    }
    await Promise.all(initialLoads);

    let nextIndex         = initial;
    let _isLoadingSection = false;

    if (window._homeObserver) window._homeObserver.disconnect();

    window._homeObserver = new IntersectionObserver(async (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || _isLoadingSection) return;
        _isLoadingSection = true;

        const currentIndex = nextIndex;
        const el = document.getElementById(`home-section-${currentIndex}`);
        window._homeObserver.unobserve(entry.target);

        if (el) {
            el.removeAttribute('style');
            el.innerHTML = VTFilms_renderSectionSkeleton();
            await new Promise(r => setTimeout(r, VTFilms_CONFIG.HOME_SECTION_DELAY));
            await VTFilms_loadHomeSection(currentIndex, el);
        }

        nextIndex++;
        _isLoadingSection = false;

        if (nextIndex < total) {
            const nextEl = document.getElementById(`home-section-${nextIndex}`);
            if (nextEl) window._homeObserver.observe(nextEl);
        }
    }, { rootMargin: '50px 0px', threshold: 0 });

    if (nextIndex < total) {
        const firstSentinel = document.getElementById(`home-section-${nextIndex}`);
        if (firstSentinel) window._homeObserver.observe(firstSentinel);
    }
}


// ─────────────────────────────────────────────────────────────
// §26 [API] PHIM LIÊN QUAN
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§11).
// ─────────────────────────────────────────────────────────────

async function VTFilms_loadRelatedMovies(currentMovie) {
    const genres = currentMovie.category?.['2']?.list;
    if (!genres?.length) return;
    const genreSlug = VTFilms_slugify(genres[0].name);
    const container = document.getElementById('relatedMoviesContainer');
    if (!container) return;

    const data = await VTFilms_fetch(`${VTFilms_CONFIG.ENDPOINTS.category}${genreSlug}`);
    if (!data?.items?.length) { container.innerHTML = ''; return; }

    const related = data.items.filter(m => m.slug !== currentMovie.slug).slice(0, 10);
    if (!related.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
    <div class="related-films-widget bg-dark-custom p-3 rounded-4">
      <div class="section-title-wrapper d-flex justify-content-between align-items-center m-0 p-0">
        <h2 class="section-title m-0 p-0 text-danger fs-6 fw-bold text-uppercase">Có thể bạn quan tâm</h2>
        <a onclick="window.VTFilms_navigateToCategory('the-loai', '${genreSlug}')"
           class="text-secondary small text-decoration-none cursor-pointer">
          Xem thêm<i class="fa-duotone fa-angle-right ms-1"></i>
        </a>
      </div>
      <div class="movie-slider d-flex flex-nowrap overflow-x-auto gap-2 p-0 mt-3 scrollbar-hide">
        ${related.map(m => VTFilms_renderMovieCard(m, 'card')).join('')}
      </div>
    </div>`;

    VTFilms_initLazyLoading();
    if (typeof initDragToScroll === 'function') initDragToScroll();
}


// ─────────────────────────────────────────────────────────────
// §27 [API] CHI TIẾT PHIM
//     [v8.0] Giữ nguyên từ vtfilms-api.js v2.2 (§13).
//     [v8.0] CAN THIỆP: VTFilms_changeServer và VTFilms_playVideo
//     được expose ra window trong §28 (VTFilms_initAPI).
// ─────────────────────────────────────────────────────────────

let VTFilms_currentMovieData = null;

async function VTFilms_showMovieDetail(slug) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const container = document.getElementById(VTFilms_CONFIG.CONTAINER_ID);

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

    const res   = await VTFilms_fetch(`${VTFilms_CONFIG.DETAIL_API}${slug}`, null, false);
    const movie = res?.movie;
    if (!movie) {
        container.innerHTML = '<div class="text-center py-5 text-danger">Không thể tải phim, vui lòng thử lại.</div>';
        return;
    }

    VTFilms_currentMovieData = movie;
    VTFilms_updatePageTitle(movie.name, true);

    const getCat = id => movie.category?.[id]?.list.map(i => i.name).join(', ') || 'N/A';

    if (typeof MovieHistoryManager !== 'undefined') {
        MovieHistoryManager.add({
            slug:      movie.slug,
            name:      movie.name,
            thumb_url: movie.poster_url,
            quality:   movie.quality  || 'HD',
            lang:      movie.language || 'Vietsub',
            category:  getCat('2'),
            url:       window.location.href,
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
                 src="${VTFilms_BLANK_GIF}" data-src="${movie.thumb_url}" />
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
                        onclick="window.VTFilms_changeServer(${i}, this)">
                  <img class="w-100 h-100 object-fit-cover lazy-img"
                       src="${VTFilms_BLANK_GIF}" data-src="${movie.poster_url}" />
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
                 src="${VTFilms_BLANK_GIF}" data-src="${movie.poster_url}" />
          </div>
        </div>
      </div>
      <div id="relatedMoviesContainer" class="mt-3"></div>
    </div>`;

    VTFilms_changeServer(0);
    VTFilms_initLazyLoading();
    VTFilms_loadRelatedMovies(movie);
}

function VTFilms_changeServer(serverIndex, el) {
    if (!VTFilms_currentMovieData?.episodes[serverIndex]) return;

    if (el) {
        document.querySelectorAll('#serverList button').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    }

    const episodes  = VTFilms_currentMovieData.episodes[serverIndex].items;
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
              onclick="window.scrollTo({top:0, behavior:'smooth'}); window.VTFilms_playVideo('${ep.embed}', this)">
          ${ep.name}
      </button>`;
    }).join('');

    if (episodes.length > 0) {
        const targetTap = new URLSearchParams(window.location.search).get('tap');
        const allBtns   = epCont.querySelectorAll('.btn-episode');
        let   target    = Array.from(allBtns).find(b => b.innerText.trim() === targetTap);
        if (!target) target = document.getElementById('ep-0');
        if (target) VTFilms_playVideo(episodes[target.id.replace('ep-', '')].embed, target);
    }
}

function VTFilms_playVideo(url, el) {
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

// ── Menu khởi tạo (từ vtfilms-api.js §14) ────────────────────

function VTFilms_initDynamicMenu() {
    const genreMenu   = document.getElementById('menu-the-loai');
    const countryMenu = document.getElementById('menu-quoc-gia');
    if (genreMenu) {
        genreMenu.innerHTML = VTFilms_MOVIE_MENU_DATA.genres.map(name =>
            `<li><a class="dropdown-item rounded" href="javascript:void(0)"
                    onclick="window.VTFilms_navigateToCategory('the-loai', '${VTFilms_slugify(name)}')">${name}</a></li>`
        ).join('');
    }
    if (countryMenu) {
        countryMenu.innerHTML = VTFilms_MOVIE_MENU_DATA.countries.map(name =>
            `<li><a class="dropdown-item rounded" href="javascript:void(0)"
                    onclick="window.VTFilms_navigateToCategory('quoc-gia', '${VTFilms_slugify(name)}')">${name}</a></li>`
        ).join('');
    }
}

function VTFilms_refreshHome() {
    window.history.pushState({}, '', window.location.pathname);
    document.title = 'VT Films';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const searchInput = document.querySelector('#searchInput');
    if (searchInput) { searchInput.value = ''; searchInput.blur(); }
    const navbarCollapse = document.querySelector('.navbar-collapse.show');
    if (navbarCollapse) {
        const bsc = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsc) bsc.hide(); else navbarCollapse.classList.remove('show');
    }
    VTFilms_ApiCache.clear();
    VTFilms_loadHomePage();
}


// ─────────────────────────────────────────────────────────────
// §28 [API GATE] VTFilms_initAPI()
//     [v8.0] MỚI HOÀN TOÀN — Đây là điểm then chốt của v8.0.
//
//     Hàm này được gọi BỞI VTFilms_startListener() sau khi Firebase
//     xác nhận user là approved hoặc admin. Không được gọi trực tiếp
//     từ bất kỳ đâu khác.
//
//     Thay thế hoàn toàn:
//       document.addEventListener('DOMContentLoaded', ...)  ← api.js §14
//       window.onpopstate = () => VTFilms_checkRoute()      ← api.js §5
//       window.VTFilms_handleViewAll = ...                  ← api.js §12
//
//     Guard readyState: Firebase auth có thể resolve trước DOMContentLoaded
//     trong một số trường hợp (cache hit cực nhanh). Guard này đảm bảo
//     initAPI luôn chạy sau khi DOM sẵn sàng.
//
//     Expose window.X: các hàm API được gọi từ inline onclick HTML
//     (renderMovieCard, renderSectionHTML, episodeList buttons, ...).
//     Chỉ expose khi API thực sự được khởi chạy → không có hàm API
//     nào tồn tại trên window khi user chưa được approved.
// ─────────────────────────────────────────────────────────────

let _apiInitialized = false; // Guard: chỉ khởi chạy 1 lần

function VTFilms_initAPI() {
    // Guard: không init lại nếu đã chạy (vd: admin reload nhanh)
    if (_apiInitialized) {
        VTFilms_log.info('VTFilms_initAPI: đã khởi chạy trước đó → skip.');
        return;
    }
    _apiInitialized = true;
    VTFilms_log.ok('VTFilms_initAPI: user approved/admin → khởi chạy API...');

    // ── Expose API functions lên window (gọi từ inline onclick HTML) ──
    // [v8.0] Không expose sớm hơn → đảm bảo 0 API function tồn tại
    // khi user chưa được approved.
    window.VTFilms_navigateToMovie     = VTFilms_navigateToMovie;
    window.VTFilms_navigateToCategory  = VTFilms_navigateToCategory;
    window.VTFilms_changeServer        = VTFilms_changeServer;
    window.VTFilms_playVideo           = VTFilms_playVideo;
    window.VTFilms_loadMoreMovies      = VTFilms_loadMoreMovies;
    window.VTFilms_triggerSearch       = VTFilms_triggerSearch;
    window.VTFilms_refreshHome         = VTFilms_refreshHome;
    window.VTFilms_closeRateLimitModal = VTFilms_closeRateLimitModal;

    // window.VTFilms_handleViewAll — gọi từ nút "Xem thêm" trong home sections
    window.VTFilms_handleViewAll = function(type, slug) {
        if (type === 'search') {
            window.location.href = `?search=${encodeURIComponent(slug)}`;
            return;
        }
        const paramKey = (type === 'quoc-gia') ? 'country' : 'cat';
        window.history.pushState({ type, slug }, '', `?${paramKey}=${slug}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const container = document.getElementById(VTFilms_CONFIG.CONTAINER_ID);
        if (container) container.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-danger"></div></div>';
        VTFilms_checkRoute();
    };

    // ── Back/Forward browser → re-render đúng route ──
    // [v8.0] CAN THIỆP: Chuyển từ top-level assignment → trong initAPI()
    window.onpopstate = () => VTFilms_checkRoute();

    // ── Hàm thực sự khởi động API ──
    function _doInit() {
        VTFilms_initDynamicMenu();
        VTFilms_checkRoute();

        // Search debounce 400ms
        const sInput  = document.getElementById('searchInput');
        const sBtn    = document.getElementById('searchBtn');
        const _search = VTFilms__debounce(VTFilms_triggerSearch, 400);
        if (sInput && sBtn) {
            sBtn.onclick   = VTFilms_triggerSearch;
            sInput.onkeyup = e => { if (e.key === 'Enter') VTFilms_triggerSearch(); else _search(); };
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

        VTFilms_log.ok('VTFilms_initAPI: hoàn tất khởi chạy — menu, route, search, listeners ready.');
    }

    // Guard DOMContentLoaded: an toàn nếu Firebase resolve trước DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _doInit);
    } else {
        _doInit();
    }
}


// ─────────────────────────────────────────────────────────────
// §29 AUTH STATE LISTENER
//     [v8.0] Giữ nguyên từ vtfilms-module.js v7.0 (§19).
//     [v8.0] CAN THIỆP: Thêm VTFilms_initAPI() vào 2 nhánh:
//       1. Admin login → VTFilms_initAPI()
//       2. User approved (cache) → VTFilms_initAPI()
//     → API CHỈ CHẠY sau 2 điều kiện này.
// ─────────────────────────────────────────────────────────────

function VTFilms_startListener() {
    VTFilms_log.info('Bắt đầu lắng nghe onAuthStateChanged...');

    onAuthStateChanged(VTFilms_auth, async (fbUser) => {
        if (fbUser) {
            VTFilms_log.ok(`Firebase xác nhận: ${fbUser.email} (uid: ${fbUser.uid})`);
            const user = VTFilms_buildUser(fbUser);
            VTFilms_setUser(user);

            VTFilms_syncUserDoc(fbUser).catch(e =>
                VTFilms_log.warn('syncUserDoc lỗi (không ảnh hưởng app):', e.message)
            );

            VTFilms_hideOverlay();

            // ── ADMIN: bypass xác minh, khởi chạy API ngay ──
            if (user.role === 'admin') {
                VTFilms_log.ok('Admin đăng nhập → bypass xác minh, show app + initAPI.');
                if (!document.getElementById('VT-Films-App')) {
                    window.location.reload();
                } else {
                    VTFilms_showApp();
                    VTFilms_renderDropdown(user);
                    VTFilms_startAdminPanel();
                    // [v8.0] Admin cũng cần API để dùng web app
                    VTFilms_initAPI();
                }
                return;
            }

            // ── USER: kiểm tra verification status ──
            const verifyStatus = VTFilms_getVerifyStatus(fbUser.uid);
            VTFilms_log.info(`Verify status từ cache: ${verifyStatus}`);

            if (verifyStatus === 'approved') {
                VTFilms_log.ok('User đã approved → show app + initAPI + unified listener.');
                VTFilms_hidePendingOverlay();
                const appEl = document.getElementById('VT-Films-App');
                if (!appEl) {
                    window.location.reload();
                } else {
                    VTFilms_showApp();
                    VTFilms_renderDropdown(user);
                    // [v8.0] User approved → khởi chạy toàn bộ API
                    VTFilms_initAPI();
                    VTFilms_startUnifiedListener(fbUser, 'approved');
                }

            } else if (verifyStatus === 'rejected') {
                VTFilms_log.warn('User rejected (cache) → đảm bảo rejection overlay hiện.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                    setTimeout(() => VTFilms_applyOverlayContent('rejected'), 50);
                }
                // Lắng nghe → nhận khi admin phê duyệt lại
                VTFilms_startUnifiedListener(fbUser, 'rejected');

            } else if (verifyStatus === 'revoked') {
                VTFilms_log.warn('User revoked (cache) → đảm bảo revoked overlay hiện.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                    setTimeout(() => VTFilms_applyOverlayContent('revoked'), 50);
                }
                VTFilms_startUnifiedListener(fbUser, 'revoked');

            } else {
                // pending hoặc null
                VTFilms_log.info('User chưa/đang chờ xác minh → pending overlay.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                }
                VTFilms_startUnifiedListener(fbUser, verifyStatus || 'pending');
            }

        } else {
            // ── Chưa / vừa đăng xuất ──
            VTFilms_log.info('Firebase: chưa đăng nhập → dọn dẹp...');
            VTFilms_setUser(null);
            VTFilms_stopVerifyListener();
            VTFilms_stopAdminPanel();
            VTFilms_clearProfileFlag();
            VTFilms_clearTabGuard();
            VTFilms_clearVerifyStatus();

            const appEl = document.getElementById('VT-Films-App');
            if (appEl) { appEl.remove(); VTFilms_log.ok('#VT-Films-App đã xóa.'); }

            VTFilms_hidePendingOverlay();
            if (!document.getElementById('VTFilms-overlay')) VTFilms_showOverlay();

            document.readyState === 'loading'
                ? document.addEventListener('DOMContentLoaded', VTFilms_initGSI)
                : VTFilms_initGSI();
        }
    });
}


// ─────────────────────────────────────────────────────────────
// §30  EXPORT GLOBAL window.VTFilms_Auth + BOOT
//      [v8.0] Giữ nguyên exports từ vtfilms-module.js v7.0 (§20).
//      Thêm: window.VTFilms_closeRateLimitModal (gọi từ modal HTML).
//
//      BOOT ORDER:
//        1. VTFilms_antiFlash()  — đọc cache, show đúng UI (đồng bộ)
//        2. VTFilms_startListener() — Firebase onAuthStateChanged
//           → nếu approved/admin: VTFilms_initAPI() được gọi từ trong listener
// ─────────────────────────────────────────────────────────────

window.VTFilms_USER = null;

window.VTFilms_Auth = {
    signOut:          VTFilms_signOut,
    getUser:          () => window.VTFilms_USER,
    isAdmin:          () => window.VTFilms_USER?.role === 'admin',
    isVerified:       () => {
        const u = window.VTFilms_USER;
        if (!u) return false;
        if (u.role === 'admin') return true;
        return VTFilms_getVerifyStatus(u.uid) === 'approved';
    },
    isRevoked:        () => {
        const u = window.VTFilms_USER;
        if (!u) return false;
        return VTFilms_getVerifyStatus(u.uid) === 'revoked';
    },
    _openPopup:              VTFilms_openPopup,
    _adminApprove:           VTFilms_adminApprove,
    _adminReject:            VTFilms_adminReject,
    _adminRevoke:            VTFilms_adminRevoke,
    _adminReapprove:         VTFilms_adminReapprove,
    _adminDeleteUser:        VTFilms_adminDeleteUser,
    _showDeleteConfirmModal: VTFilms_showDeleteConfirmModal,
    _adminSwitchTab:         VTFilms_adminSwitchTab,
    _adminLoadMore:          VTFilms_adminLoadMore,
    version:                 VTFilms_VERSION,
};

// ── BOOT ────────────────────────────────────────────────────
// Bước 1: Anti-flash — chạy đồng bộ, đọc cache, show đúng overlay ngay
VTFilms_antiFlash();

// Bước 2: Firebase auth state listener — gọi initAPI() khi approved/admin
VTFilms_startListener();

VTFilms_log.ok(`vtfilms.js v${VTFilms_VERSION} boot hoàn tất — chờ Firebase phản hồi.`);

// ============================================================
// End · VT Films v8.0 · films.vutruong.vn
// ── TODO v9.0: Lịch sử xem → Firestore doc "filmViewed" ────
//    Tham khảo API: https://phim.nguonc.com/api-document
//    Cấu trúc dự kiến:
//      collection: users/{uid}/filmViewed
//      doc fields: slug, name, thumb_url, watchedAt (serverTimestamp),
//                  episode, server, progress
//    Trigger: VTFilms_playVideo() → write/update filmViewed doc
// ============================================================

})(); // end async IIFE
