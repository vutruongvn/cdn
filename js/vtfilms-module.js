/**
 * vtfilms-module.js — VT Films Firebase Auth Module
 * films.vutruong.vn
 *
 * CHANGELOG
 *  v1.0  Khởi tạo: Firebase Auth + Google One Tap
 *  v1.1  Cải thiện UX overlay
 *  v1.2  Sửa One Tap không render → dùng renderButton()
 *  v2.0  Refactor: Remove DOM thay CSS opacity, Bootstrap 5 thuần
 *  v3.0  Fix Firebase CDN link, auto-reload sau login, anti-flash localStorage
 *        Fix One Tap tự đóng (cancel_on_tap_outside: false), đổi tiền tố VTFilms_
 *  v3.1  [FIX] One Tap callback gọi Popup → double login
 *          → Dùng signInWithCredential(JWT) cho One Tap, không mở thêm popup
 *          → Nút "Chọn tài khoản" vẫn dùng signInWithPopup (đúng luồng)
 *        [REMOVED] Ánh sáng nền trang trí trong overlay
 *  v3.2  [FIX] Xóa lazy load API (không tương thích với kiến trúc hiện tại)
 *          → File API giữ nguyên chèn bằng thẻ script ngoài như cũ
 *        [NEW] Remove class d-none khỏi #VT-Films-App sau khi Firebase xác nhận login
 *  v4.0  [NEW] Đăng xuất → redirect về trang chủ ngay lập tức
 *        [NEW] Thu thập & lưu toàn bộ thông tin phiên đăng nhập vào Firestore
 *              (uid, name, email, provider, thời gian, thiết bị, múi giờ, vị trí GPS)
 *        [NEW] Firebase Firestore rules bảo vệ dữ liệu user (xem cuối file)
 *
 * ─────────────────────────────────────────────────────────────
 * LUỒNG ĐĂNG NHẬP
 *
 *   One Tap (renderButton / góc màn hình)
 *     → VTFilms_onGSICallback(response.credential = JWT)
 *     → signInWithCredential   ← 1 bước, không popup thêm
 *     → onAuthStateChanged → VTFilms_saveLoginSession() → reload
 *
 *   Nút "Chọn tài khoản" (manual)
 *     → VTFilms_openPopup()
 *     → signInWithPopup        ← popup chọn tài khoản
 *     → onAuthStateChanged → VTFilms_saveLoginSession() → reload
 *
 * ─────────────────────────────────────────────────────────────
 * API CÔNG KHAI
 *   window.VTFilms_USER                  → Object user (null nếu chưa login)
 *   window.VTFilms_Auth.signOut()        → Đăng xuất + redirect về trang chủ
 *   window.VTFilms_Auth.getUser()        → Lấy user hiện tại
 *   window.VTFilms_Auth._openPopup()     → Dùng trong HTML onclick
 *   window.addEventListener('vtfilms:auth-ready', cb)
 *
 * ─────────────────────────────────────────────────────────────
 * DỮ LIỆU PHIÊN ĐĂNG NHẬP (Firestore: users/{uid}/sessions/{sessionId})
 *   uid, name, email, avatar, provider
 *   sessionId    — ID duy nhất mỗi phiên (tạo bằng crypto.randomUUID)
 *   loginAt      — Timestamp server (Firestore serverTimestamp)
 *   loginAtLocal — ISO string theo giờ local của trình duyệt
 *   userAgent    — Chuỗi User-Agent đầy đủ
 *   platform     — navigator.platform (Win32, MacIntel, ...)
 *   language     — navigator.language (vi, en-US, ...)
 *   timezone     — Intl.DateTimeFormat locale timezone
 *   screen       — Độ phân giải màn hình (widthxheight)
 *   referrer     — URL nguồn (document.referrer)
 *   pageUrl      — URL trang tại thời điểm đăng nhập
 *   geo.lat      — Latitude (nếu user cho phép định vị)
 *   geo.lng      — Longitude (nếu user cho phép định vị)
 *   geo.accuracy — Độ chính xác GPS (mét)
 *   geo.error    — Thông báo lỗi định vị nếu bị từ chối
 */


// ── 1. IMPORT FIREBASE v12.9.0 ────────────────────────────────────────────────
import { initializeApp }   from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getAnalytics }    from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithCredential,   // One Tap: JWT → Firebase 1 bước, không popup thêm
    signInWithPopup,        // Nút manual: mở popup chọn tài khoản
    signOut as VTFilms_fbSignOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp         // Timestamp phía server (chính xác, không phụ thuộc giờ client)
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';


// ── 2. HẰNG SỐ & TIỆN ÍCH ────────────────────────────────────────────────────
const VTFilms_VERSION   = '4.0';

/** Key localStorage để cache thông tin hiển thị UI (tránh flash khi reload). */
const VTFilms_CACHE_KEY = 'VTFilms_userCache';

/** Google OAuth Client ID của dự án VT Films. */
const VTFilms_CLIENT_ID = '891750241616-234jksd5e2b301g838gr6t650hdobptk.apps.googleusercontent.com';

/**
 * VTFilms_log — Wrapper log có màu sắc, dễ nhận diện trong DevTools.
 * Dùng thay console.log/warn/error trực tiếp để dễ filter theo prefix.
 */
const VTFilms_log = {
    info:  (m, ...a) => console.log( `%c[VTFilms v${VTFilms_VERSION}]`,   'color:#dc3545;font-weight:bold', '→', m, ...a),
    ok:    (m, ...a) => console.log( `%c[VTFilms v${VTFilms_VERSION}] ✓`, 'color:#28a745;font-weight:bold', m, ...a),
    warn:  (m, ...a) => console.warn( `[VTFilms v${VTFilms_VERSION}] ⚠`, m, ...a),
    error: (m, ...a) => console.error(`[VTFilms v${VTFilms_VERSION}] ✗`, m, ...a),
};


// ── 3. FIREBASE INIT ──────────────────────────────────────────────────────────
VTFilms_log.info('Firebase v12.9.0 khởi tạo...');

/** Firebase App instance — dùng chung cho Auth, Firestore, Analytics. */
const VTFilms_fbApp = initializeApp({
    apiKey:            'AIzaSyCyTqNXos2w80W9o6XHj7QkLaSoSU5MiOM',
    authDomain:        'vt-films-pj.firebaseapp.com',
    projectId:         'vt-films-pj',
    storageBucket:     'vt-films-pj.firebasestorage.app',
    messagingSenderId: '891750241616',
    appId:             '1:891750241616:web:78a48d2ee8d2fd71dd0855',
    measurementId:     'G-G8QD7CEKDF'
});

getAnalytics(VTFilms_fbApp); // Khởi tạo Analytics (tự động track page view)

/** Firebase Auth instance. */
const VTFilms_auth = getAuth(VTFilms_fbApp);

/** Firestore instance — dùng để lưu dữ liệu phiên đăng nhập. */
const VTFilms_db   = getFirestore(VTFilms_fbApp);

VTFilms_log.ok('Firebase sẵn sàng.');


// ── 4. CACHE PHIÊN ĐĂNG NHẬP (localStorage) ──────────────────────────────────
/**
 * Chỉ lưu dữ liệu hiển thị (uid, name, email, avatar), KHÔNG lưu token.
 * Mục đích: đọc trước khi Firebase phản hồi (~200–800ms) → tránh flash UI.
 */

/**
 * VTFilms_saveCache(user) — Lưu thông tin hiển thị vào localStorage.
 * @param {{ uid, name, email, avatar }} user
 */
function VTFilms_saveCache(user) {
    try {
        localStorage.setItem(VTFilms_CACHE_KEY, JSON.stringify(
            { uid: user.uid, name: user.name, email: user.email, avatar: user.avatar }
        ));
        VTFilms_log.info('Cache lưu OK.');
    } catch (e) {
        VTFilms_log.warn('Lưu cache thất bại:', e.message);
    }
}

/**
 * VTFilms_clearCache() — Xóa cache khỏi localStorage (khi đăng xuất hoặc lỗi).
 */
function VTFilms_clearCache() {
    try { localStorage.removeItem(VTFilms_CACHE_KEY); } catch (_) {}
    VTFilms_log.info('Cache đã xóa.');
}

/**
 * VTFilms_getCache() — Đọc cache từ localStorage.
 * @returns {{ uid, name, email, avatar } | null}
 */
function VTFilms_getCache() {
    try { return JSON.parse(localStorage.getItem(VTFilms_CACHE_KEY)); } catch (_) { return null; }
}


// ── 5. QUẢN LÝ DOM ───────────────────────────────────────────────────────────

/**
 * VTFilms_removeApp() — Xóa hoàn toàn #VT-Films-App khỏi DOM.
 * Gọi khi xác nhận user chưa đăng nhập → ngăn render nội dung phim.
 */
function VTFilms_removeApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) { VTFilms_log.warn('#VT-Films-App không tìm thấy.'); return; }
    el.remove();
    VTFilms_log.ok('#VT-Films-App đã xóa khỏi DOM.');
}

/**
 * VTFilms_showApp() — Hiện #VT-Films-App bằng cách remove class d-none.
 * HTML đặt d-none sẵn → module này remove sau khi Firebase xác nhận đăng nhập.
 * Kỹ thuật anti-flash: không bao giờ thấy nội dung phim trước khi verify xong.
 */
function VTFilms_showApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) return;
    el.classList.remove('d-none');
    VTFilms_log.ok('#VT-Films-App hiển thị (d-none removed).');
}

/**
 * VTFilms_reloadPage() — Reload trang sau khi đăng nhập lần đầu.
 * Firebase session tự khôi phục sau reload → onAuthStateChanged(user) được gọi lại.
 */
function VTFilms_reloadPage() {
    VTFilms_log.info('Login OK → reload...');
    window.location.reload();
}


// ── 6. OVERLAY ĐĂNG NHẬP ─────────────────────────────────────────────────────

/**
 * VTFilms_showOverlay() — Tạo và chèn overlay đăng nhập vào body (chỉ tạo 1 lần).
 * Overlay chứa: logo, nút Google Sign-In (One Tap renderButton), spinner, error msg.
 */
function VTFilms_showOverlay() {
    if (document.getElementById('VTFilms-overlay')) return;
    VTFilms_log.info('Tạo overlay đăng nhập...');

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-overlay';
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.zIndex = '99999';

    overlay.innerHTML = `
        <!-- Card đăng nhập – Bootstrap 5 thuần, không custom style thừa -->
        <div class="card text-center shadow-lg"
             style="width:min(500px,calc(100vw - 28px));
                    background:rgba(255,255,255,.045);
                    border:1px solid rgba(255,255,255,.09) !important;
                    border-radius:22px;
                    backdrop-filter:blur(24px);
                    user-select:none">
            <div class="card-body p-5">

                <!-- Logo VT Films -->
                <div class="d-flex align-items-center justify-content-center gap-2 mb-4">
                    <svg style='fill:var(--bs-danger)' id='Layer_1' version='1.1' viewBox='0 0 992 992' width='75' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'>
                      <path d=' M537.072266,790.994934   C518.384460,823.271484 499.881897,855.232605 481.546600,886.904846   C478.881500,886.932983 478.519226,885.252380 477.814240,884.032715   C449.972229,835.864990 422.152496,787.684387 394.315430,739.513794   C390.315125,732.591492 386.319824,725.663940 382.164368,718.834900   C380.506805,716.110901 380.462708,713.887695 382.125458,711.018250   C426.808105,633.910156 471.397614,556.748169 516.004395,479.596100   C524.258179,465.320282 532.502258,451.038788 540.782654,436.778381   C545.431152,428.772736 544.592163,427.275574 535.083252,427.237640   C518.919495,427.173157 502.752899,427.023346 486.593201,427.275269   C481.969421,427.347321 479.380280,425.745056 477.107635,421.790588   C447.725372,370.664581 418.193115,319.624817 388.704956,268.559662   C386.049835,263.961761 383.438019,259.338867 379.894104,253.129639   C385.960632,253.129639 390.803619,253.110168 395.646393,253.132751   C431.301971,253.299011 466.956360,252.964279 502.614929,253.440689   C531.431396,253.825653 560.260315,253.186874 589.083862,253.148209   C638.565613,253.081833 688.054443,252.618851 737.526855,253.301346   C772.849670,253.788635 808.158020,252.737198 843.472717,253.321091   C846.685547,253.374207 848.234192,254.640961 849.695862,257.176147   C881.311340,312.012695 912.985779,366.815247 944.634949,421.632355   C945.440491,423.027618 946.591370,424.321869 946.523254,426.153778   C944.361511,427.828064 941.948669,427.139038 939.723450,427.140350   C877.900391,427.176880 816.077271,427.210663 754.254578,427.063690   C749.389282,427.052124 746.563293,428.368378 743.998535,432.817963   C682.519409,539.473328 620.854248,646.021362 559.227478,752.591614   C551.890320,765.279602 544.580139,777.983154 537.072266,790.994934  M819.889526,322.563171   C819.395142,321.694672 818.778259,320.872894 818.426147,319.950104   C816.044861,313.709869 811.857849,311.803955 804.977356,311.842102   C744.648071,312.176819 684.316345,312.063019 623.985291,312.061981   C579.153809,312.061188 534.322266,312.028320 489.490753,312.015198   C482.944855,312.013306 482.075104,313.355286 485.232697,318.848877   C493.949249,334.014130 502.731812,349.141418 511.469452,364.294556   C512.931519,366.830078 514.423218,368.791748 517.951172,368.753387   C558.773682,368.309479 599.602661,369.267975 640.423889,368.212158   C642.548523,368.157196 644.742676,367.995361 646.466614,369.508209   C646.796143,370.938385 645.950256,371.853851 645.381775,372.839539   C635.644958,389.723267 625.897766,406.600983 616.147461,423.476898   C576.307068,492.433197 536.462280,561.386963 496.624573,630.344788   C481.206879,657.032288 465.843597,683.751404 450.341980,710.390015   C448.438293,713.661377 448.402344,716.329529 450.331238,719.611450   C459.192932,734.689331 467.808929,749.911377 476.610535,765.024963   C479.793884,770.491150 481.213623,770.492065 484.345154,765.150940   C490.243134,755.091309 496.025574,744.963806 501.852203,734.862366   C537.729919,672.662231 573.562988,610.436157 609.496277,548.268127   C642.844788,490.571930 676.359741,432.971771 709.598022,375.212311   C712.350708,370.428802 715.243408,368.482300 720.894104,368.520233   C760.057373,368.783051 799.223328,368.673859 838.388367,368.649750   C844.888184,368.645752 845.635620,367.338776 842.437500,361.751801   C835.071777,348.884094 827.663818,336.040588 819.889526,322.563171  z' opacity='1.000000' stroke='none'/>
                      <path d=' M188.102264,382.835175   C163.279175,339.887726 138.642349,297.257141 113.141380,253.131256   C119.858635,253.131256 125.113457,253.120575 130.368240,253.132904   C190.193649,253.273224 250.019073,253.456223 309.844482,253.465607   C313.559967,253.466187 315.126831,255.231369 316.719513,257.989685   C342.292236,302.279297 367.915436,346.539734 393.532959,390.803467   C410.804230,420.645935 428.072968,450.489929 445.383789,480.309418   C446.696198,482.570129 447.637421,484.512726 446.072235,487.195251   C435.997070,504.463043 426.061462,521.812195 416.063263,539.125000   C415.576385,539.968079 415.156158,540.937561 413.884003,541.255676   C411.952515,541.072021 411.607605,539.190308 410.826355,537.837036   C378.762604,482.292603 346.731018,426.729584 314.677948,371.178986   C304.187378,352.997955 293.581360,334.883057 283.194855,316.642944   C281.313202,313.338501 279.077026,311.939941 275.252472,311.976196   C258.088135,312.138824 240.921509,312.038818 223.755890,312.090637   C216.543533,312.112396 215.631409,313.705109 219.267776,320.001587   C240.013321,355.923126 260.782440,391.831055 281.564423,427.731537   C313.944000,483.666565 346.337646,539.593506 378.738495,595.516235   C380.138489,597.932495 380.874237,600.095947 379.222107,602.916992   C369.035461,620.311523 359.021393,637.807129 348.929565,655.257324   C348.610321,655.809326 348.069458,656.233154 346.872345,657.556152   C293.847748,565.805542 241.068130,474.478760 188.102264,382.835175  z' opacity='1.000000' stroke='none'/>
                    </svg>
                    <div class="fw-bolder fs-2">
                        <span class="text-danger d-block pt-2">Films</span>
                    </div>
                </div>

                <p class="text-light mb-4 h6 fw-bold">Đăng nhập để sử dụng VT Films!</p>

                <!-- One Tap renderButton (JWT → signInWithCredential, không popup thêm) -->
                <div id="VTFilms-g-btn"
                     class="d-flex align-items-center justify-content-center mb-3"
                     style="min-height:44px"></div>

                <p class="text-light mt-4 h6 opacity-50 fw-normal">
                    Miễn phí • Tốc độ cao • Cập nhật liên tục
                </p>
                <p class="text-light m-0 mt-2 small opacity-25 fw-normal"
                   onclick="javascript:alert('Hông được đâu ní')">
                    Tiếp tục mà không đăng nhập?
                </p>

                <!-- Phân cách (ẩn, dùng khi cần hiện thêm phương thức khác) -->
                <div class="d-none align-items-center gap-2 text-secondary small mb-3">
                    <div class="flex-grow-1 border-top border-secondary opacity-25"></div>
                    hoặc
                    <div class="flex-grow-1 border-top border-secondary opacity-25"></div>
                </div>

                <!-- Nút manual → VTFilms_openPopup() → signInWithPopup (ẩn mặc định) -->
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

                <!-- Spinner loading (ẩn mặc định, hiện khi đang xác thực) -->
                <div id="VTFilms-loading" class="d-none mt-3">
                    <div class="d-inline-flex align-items-center gap-2 text-danger small rounded-pill px-4 py-2"
                         style="background:rgba(220,53,69,.08);border:1px solid rgba(220,53,69,.2)">
                        <div class="spinner-border spinner-border-sm text-danger me-1" role="status">
                            <span class="visually-hidden"></span>
                        </div>
                        Đang xác thực
                    </div>
                </div>

                <!-- Thông báo lỗi (ẩn mặc định) -->
                <div id="VTFilms-error"
                     class="d-none alert alert-danger text-center border-0 small mt-3 mb-0 py-2 px-3"
                     role="alert"></div>

            </div>
        </div>`;

    document.body.appendChild(overlay);
    VTFilms_log.ok('Overlay đăng nhập đã chèn vào DOM.');
}

/**
 * VTFilms_hideOverlay() — Xóa overlay với hiệu ứng fade-out 300ms.
 * Delay remove 1500ms để animation chạy xong trước khi xóa khỏi DOM.
 */
function VTFilms_hideOverlay() {
    const el = document.getElementById('VTFilms-overlay');
    if (!el) return;
    el.style.transition = 'opacity .3s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 1500); // Đợi animation kết thúc rồi mới remove
    VTFilms_log.info('Overlay đăng nhập đã xóa.');
}

/**
 * VTFilms_setLoading(show, errorMsg) — Toggle trạng thái loading trong overlay.
 * show=true  → disable nút, ẩn error, hiện spinner
 * show=false → enable nút, ẩn spinner, hiện error nếu có
 *
 * @param {boolean} show
 * @param {string}  errorMsg - Thông báo lỗi (chỉ dùng khi show=false)
 */
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
        if (errEl && errorMsg) {
            errEl.textContent = errorMsg;
            errEl.classList.remove('d-none');
        }
    }
}


// ── 7. GOOGLE IDENTITY SERVICES (GSI) ────────────────────────────────────────

/**
 * VTFilms_initGSI() — Khởi tạo Google Identity Services và render nút đăng nhập.
 * Tự retry sau 600ms nếu script GSI chưa load xong.
 *
 * cancel_on_tap_outside: false → One Tap không tự đóng khi click ra ngoài
 * auto_select: false           → User phải chủ động chọn tài khoản
 */
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
        cancel_on_tap_outside: false, // FIX: không tự đóng khi click ra ngoài
        language:              'vi',
        context:               'signin',
        ux_mode:               'popup',
    });

    // Render nút Google chuẩn trong card overlay
    const btnEl = document.getElementById('VTFilms-g-btn');
    if (btnEl) {
        google.accounts.id.renderButton(btnEl, {
            type:           'standard',
            theme:          'dark',
            size:           'large',
            text:           'signin_with',
            shape:          'pill',
            logo_alignment: 'left',
        });
        VTFilms_log.ok('Google Sign-In Button đã render.');
    }

    // One Tap góc màn hình (phụ – chỉ hiện khi trình duyệt cho phép)
    google.accounts.id.prompt((n) => {
        if      (n.isNotDisplayed())  VTFilms_log.warn('One Tap không hiển thị:', n.getNotDisplayedReason());
        else if (n.isSkippedMoment()) VTFilms_log.warn('One Tap bị bỏ qua:', n.getSkippedReason());
        else                          VTFilms_log.ok('One Tap góc màn hình hiển thị.');
    });
}

/**
 * VTFilms_onGSICallback(response) — Callback từ One Tap / renderButton.
 * [FIX v3.1] Dùng signInWithCredential(JWT) thay vì mở popup → tránh double login.
 *
 * @param {{ credential: string }} response - Response từ Google GSI (chứa JWT)
 */
async function VTFilms_onGSICallback(response) {
    VTFilms_log.info('One Tap callback → signInWithCredential (không mở popup)...');
    VTFilms_setLoading(true);
    try {
        // Chuyển JWT từ Google → Firebase credential, xác thực 1 bước
        const credential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(VTFilms_auth, credential);
        // → onAuthStateChanged(user) sẽ được trigger → xử lý tiếp ở bước 11
    } catch (err) {
        VTFilms_log.error('signInWithCredential thất bại:', err.code);
        VTFilms_setLoading(false, `Đăng nhập thất bại (${err.code}).`);
    }
}

/**
 * VTFilms_openPopup() — Đăng nhập thủ công bằng popup chọn tài khoản Google.
 * Dùng cho nút "Chọn tài khoản Google" trong overlay (hiện khi d-none bị bỏ).
 */
async function VTFilms_openPopup() {
    VTFilms_log.info('Mở Google Popup (chọn tài khoản thủ công)...');
    VTFilms_setLoading(true);
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(VTFilms_auth, provider);
        // → onAuthStateChanged(user) sẽ được trigger
    } catch (err) {
        VTFilms_log.error('Popup Sign-In thất bại:', err.code);
        const msg = err.code === 'auth/popup-closed-by-user'
            ? 'Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.'
            : `Đăng nhập thất bại (${err.code}).`;
        VTFilms_setLoading(false, msg);
    }
}


// ── 8. ĐĂNG XUẤT ─────────────────────────────────────────────────────────────

/**
 * VTFilms_signOut() — Đăng xuất Firebase và redirect về trang chủ ngay lập tức.
 *
 * Thứ tự:
 *   1. Tắt Google auto-select (tránh tự đăng nhập lại)
 *   2. Xóa cache localStorage
 *   3. Firebase signOut
 *   4. Redirect về trang chủ (xóa toàn bộ query string)
 */
async function VTFilms_signOut() {
    VTFilms_log.info('Đang đăng xuất...');
    try {
        window.google?.accounts?.id?.disableAutoSelect(); // Tắt auto-select Google
        VTFilms_clearCache();
        await VTFilms_fbSignOut(VTFilms_auth);
        VTFilms_log.ok('Đăng xuất thành công → chuyển hướng về trang chủ...');

        // [NEW v4.0] Redirect ngay về trang chủ, xóa sạch query string
        window.location.href = window.location.pathname;

    } catch (err) {
        VTFilms_log.error('Đăng xuất thất bại:', err.message);
    }
}


// ── 9. QUẢN LÝ USER ──────────────────────────────────────────────────────────

/**
 * VTFilms_buildUser(fbUser) — Chuẩn hóa Firebase User object → VTFilms_USER object.
 * Thêm fallback avatar nếu Google không trả về ảnh.
 *
 * @param {import('firebase/auth').User} fbUser
 * @returns {{ uid, name, email, avatar, provider, loginTime }}
 */
function VTFilms_buildUser(fbUser) {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'U')}&background=dc3545&color=fff&size=128`;
    return {
        uid:       fbUser.uid,
        name:      fbUser.displayName || 'Người dùng',
        email:     fbUser.email,
        avatar:    fbUser.photoURL || fallback,
        provider:  fbUser.providerData?.[0]?.providerId || 'google.com',
        loginTime: Date.now(), // Timestamp ms (local)
    };
}

/**
 * VTFilms_setUser(user) — Gán user vào global window.VTFilms_USER + cache + dispatch event.
 * Gọi sau mỗi lần onAuthStateChanged phản hồi.
 *
 * @param {object|null} user - VTFilms_USER object hoặc null khi đăng xuất
 */
function VTFilms_setUser(user) {
    window.VTFilms_USER = user;
    if (user) {
        VTFilms_saveCache(user);
        VTFilms_log.ok('User set:', user.name, `<${user.email}>`);
    } else {
        VTFilms_clearCache();
        VTFilms_log.info('User set: null.');
    }
    // Dispatch custom event để các module khác có thể lắng nghe
    window.dispatchEvent(new CustomEvent('vtfilms:auth-ready', { detail: { user } }));
}

/**
 * VTFilms_renderDropdown(user) — Render dropdown avatar/tên user vào #vt-user-info.
 * Chứa: thông tin user, nút đổi giao diện, nút đăng xuất.
 *
 * @param {{ uid, name, email, avatar }} user
 */
function VTFilms_renderDropdown(user) {
    const el = document.getElementById('vt-user-info');
    if (!el || !user) return;

    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=dc3545&color=fff`;

    el.innerHTML = `
        <div class="dropdown">
            <a class="nav-link p-0 m-0"
               role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="${user.avatar}"
                     class="rounded-circle"
                     width="45" height="45"
                     style="object-fit:cover"
                     alt="${user.name}"
                     onerror="this.src='${fallback}'">
                <span class="d-none small fw-semibold text-white text-truncate"
                      style="max-width:110px">${user.name}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark shadow">
                <!-- Thông tin user -->
                <li>
                    <div class="dropdown-item-text d-flex align-items-center gap-3 py-2">
                        <img src="${user.avatar}"
                             class="rounded-circle flex-shrink-0"
                             width="44" height="44"
                             style="object-fit:cover"
                             alt="${user.name}"
                             onerror="this.src='${fallback}'">
                        <div class="overflow-hidden">
                            <div class="fw-semibold small text-truncate">${user.name}</div>
                            <div class="text-secondary text-truncate"
                                 style="font-size:12px">${user.email}</div>
                        </div>
                    </div>
                </li>
                <li><hr class="dropdown-divider"></li>

                <!-- Nút đổi giao diện sáng/tối -->
                <li>
                    <a class="dropdown-item text-white d-flex align-items-center gap-2 nav-toggle-theme-btn shadow-none py-2"
                       id="themeToggler"
                       onclick="toggleTheme()"
                       role="button"
                       title="Chuyển chế độ sáng/tối">
                        <i class="fa-duotone fa-sun" id="themeIcon"></i>
                        Đổi giao diện
                    </a>
                </li>

                <!-- Nút đăng xuất → VTFilms_signOut() → redirect trang chủ -->
                <li>
                    <button class="dropdown-item text-danger d-flex align-items-center gap-2 py-2"
                            onclick="window.VTFilms_Auth.signOut()">
                        <i class="fa-duotone fa-right-from-bracket fa-fw"></i>
                        Đăng xuất
                    </button>
                </li>
            </ul>
        </div>`;

    VTFilms_log.ok('Dropdown user render vào #vt-user-info.');
}


// ── 10. CHỐNG FLASH UI (Anti-Flash) ──────────────────────────────────────────

/**
 * VTFilms_antiFlash() — Xử lý tức thì TRƯỚC khi Firebase phản hồi (~200–800ms).
 *
 * Logic:
 *   Có cache  → kỳ vọng đã login → GIỮ #VT-Films-App → chờ Firebase xác nhận
 *   Không cache → chắc chắn chưa login → XÓA #VT-Films-App + hiện overlay ngay
 *
 * Kết quả:
 *   User đã login  → không thấy flash overlay dù 1 frame
 *   User chưa login → không thấy nội dung phim dù 1 frame
 */
function VTFilms_antiFlash() {
    const cache = VTFilms_getCache();
    if (cache) {
        VTFilms_log.info(`Cache tìm thấy (${cache.name}) → giữ UI, chờ Firebase...`);
    } else {
        VTFilms_log.info('Không có cache → xóa UI, hiện overlay ngay...');
        VTFilms_removeApp();
        VTFilms_showOverlay();
    }
}


// ── 11. THU THẬP & LƯU THÔNG TIN PHIÊN ĐĂNG NHẬP ────────────────────────────

/**
 * VTFilms_getGeolocation() — Lấy vị trí GPS của user (bất đồng bộ).
 * Trả về object { lat, lng, accuracy } nếu thành công,
 * hoặc { error: "..." } nếu user từ chối hoặc trình duyệt không hỗ trợ.
 *
 * @returns {Promise<{ lat: number, lng: number, accuracy: number } | { error: string }>}
 */
function VTFilms_getGeolocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ error: 'Trình duyệt không hỗ trợ Geolocation.' });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                lat:      pos.coords.latitude,
                lng:      pos.coords.longitude,
                accuracy: Math.round(pos.coords.accuracy) // Đơn vị: mét
            }),
            (err) => resolve({ error: err.message || 'Từ chối cấp quyền vị trí.' }),
            { timeout: 8000, maximumAge: 60000 } // Timeout 8s, dùng lại nếu <60s trước
        );
    });
}

/**
 * VTFilms_saveLoginSession(fbUser) — Thu thập toàn bộ thông tin phiên đăng nhập
 * và lưu vào Firestore tại: users/{uid}/sessions/{sessionId}
 *
 * Dữ liệu thu thập:
 *   - Thông tin user: uid, name, email, avatar, provider
 *   - Thời gian: loginAt (server timestamp), loginAtLocal (ISO local)
 *   - Thiết bị: userAgent, platform, language, timezone, screen
 *   - Trang: referrer, pageUrl
 *   - Vị trí: lat, lng, accuracy (hoặc error nếu bị từ chối)
 *
 * QUAN TRỌNG: Chạy bất đồng bộ, không block luồng chính.
 *
 * @param {import('firebase/auth').User} fbUser - Firebase User object
 */
async function VTFilms_saveLoginSession(fbUser) {
    try {
        // Tạo session ID duy nhất cho mỗi lần đăng nhập/reload
        const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        VTFilms_log.info(`Thu thập dữ liệu phiên đăng nhập... sessionId: ${sessionId}`);

        // Thu thập thông tin thiết bị & môi trường (đồng bộ, không chờ)
        const deviceInfo = {
            userAgent: navigator.userAgent,                     // Chuỗi UA đầy đủ
            platform:  navigator.platform,                     // Win32, MacIntel, Linux x86_64, ...
            language:  navigator.language,                     // vi, en-US, ...
            timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone, // Asia/Ho_Chi_Minh, ...
            screen:    `${window.screen.width}x${window.screen.height}`, // 1920x1080
        };

        // Thu thập vị trí GPS (bất đồng bộ, chờ tối đa 8s)
        const geo = await VTFilms_getGeolocation();
        VTFilms_log.info('Vị trí:', geo.error ? `Không lấy được (${geo.error})` : `${geo.lat}, ${geo.lng}`);

        // Xây dựng object session đầy đủ
        const sessionData = {
            // ── Thông tin user ──
            uid:      fbUser.uid,
            name:     fbUser.displayName || 'Người dùng',
            email:    fbUser.email,
            avatar:   fbUser.photoURL || null,
            provider: fbUser.providerData?.[0]?.providerId || 'google.com',

            // ── Thời gian ──
            loginAt:      serverTimestamp(),               // Timestamp chính xác từ server Firestore
            loginAtLocal: new Date().toISOString(),        // ISO 8601 theo giờ local trình duyệt
            sessionId,

            // ── Thiết bị & Môi trường ──
            ...deviceInfo,

            // ── Trang web tại thời điểm đăng nhập ──
            pageUrl:  window.location.href,
            referrer: document.referrer || null,

            // ── Vị trí GPS ──
            geo,
        };

        // Lưu vào Firestore: users/{uid}/sessions/{sessionId}
        const sessionRef = doc(VTFilms_db, 'users', fbUser.uid, 'sessions', sessionId);
        await setDoc(sessionRef, sessionData);

        VTFilms_log.ok(`Phiên đăng nhập đã lưu vào Firestore: users/${fbUser.uid}/sessions/${sessionId}`);

    } catch (err) {
        // Lỗi lưu Firestore không nên block toàn bộ app → chỉ log
        VTFilms_log.error('Không thể lưu phiên đăng nhập:', err.message);
    }
}


// ── 12. AUTH STATE LISTENER (TRUNG TÂM ĐIỀU PHỐI) ────────────────────────────

/**
 * VTFilms_startListener() — Đăng ký lắng nghe onAuthStateChanged.
 * Đây là hàm trung tâm điều phối toàn bộ luồng xác thực.
 *
 * Khi user đã đăng nhập (fbUser truthy):
 *   1. Build VTFilms_USER object
 *   2. Lưu phiên đăng nhập vào Firestore (bất đồng bộ)
 *   3. Ẩn overlay
 *   4a. App bị xóa (vừa login lần đầu) → reload trang
 *   4b. App còn trong DOM (reload từ cache) → remove d-none + render dropdown
 *
 * Khi chưa đăng nhập (fbUser falsy):
 *   1. Xóa user & cache
 *   2. Xóa app, hiện overlay
 *   3. Khởi tạo GSI
 */
function VTFilms_startListener() {
    VTFilms_log.info('Bắt đầu lắng nghe onAuthStateChanged...');

    onAuthStateChanged(VTFilms_auth, async (fbUser) => {
        if (fbUser) {
            // ✅ Firebase xác nhận đã đăng nhập
            VTFilms_log.ok('Firebase xác nhận đăng nhập:', fbUser.email);

            const user = VTFilms_buildUser(fbUser);
            VTFilms_setUser(user);
            VTFilms_hideOverlay();

            // [NEW v4.0] Lưu phiên đăng nhập vào Firestore (chạy nền, không block UI)
            VTFilms_saveLoginSession(fbUser).catch(e =>
                VTFilms_log.warn('saveLoginSession error (không nghiêm trọng):', e.message)
            );

            if (!document.getElementById('VT-Films-App')) {
                // App đã bị xóa (vừa login từ overlay) → reload để khôi phục
                VTFilms_reloadPage();
            } else {
                // App còn trong DOM (reload từ cache) → remove d-none + render dropdown
                VTFilms_log.ok('#VT-Films-App còn trong DOM → hiện UI + render dropdown.');
                VTFilms_showApp();
                VTFilms_renderDropdown(user);
            }

        } else {
            // ❌ Firebase xác nhận chưa / vừa đăng xuất
            VTFilms_log.info('Firebase: chưa đăng nhập → dọn dẹp UI...');
            VTFilms_setUser(null);

            if (document.getElementById('VT-Films-App'))   VTFilms_removeApp();
            if (!document.getElementById('VTFilms-overlay')) VTFilms_showOverlay();

            // Khởi tạo GSI sau khi DOM sẵn sàng
            document.readyState === 'loading'
                ? document.addEventListener('DOMContentLoaded', VTFilms_initGSI)
                : VTFilms_initGSI();
        }
    });
}


// ── 13. EXPORT GLOBAL API ─────────────────────────────────────────────────────

/** window.VTFilms_USER — Object user hiện tại (null nếu chưa login). */
window.VTFilms_USER = null;

/**
 * window.VTFilms_Auth — Public API để các module khác tương tác với auth.
 *
 * @property {Function} signOut    - Đăng xuất + redirect trang chủ
 * @property {Function} getUser    - Trả về VTFilms_USER hiện tại
 * @property {Function} _openPopup - Mở popup chọn tài khoản thủ công
 * @property {string}   version    - Version module hiện tại
 */
window.VTFilms_Auth = {
    signOut:    VTFilms_signOut,
    getUser:    () => window.VTFilms_USER,
    _openPopup: VTFilms_openPopup,
    version:    VTFilms_VERSION,
};


// ── 14. KHỞI CHẠY ─────────────────────────────────────────────────────────────
VTFilms_log.info(`===== vtfilms-module.js v${VTFilms_VERSION} khởi chạy =====`);
VTFilms_antiFlash();      // Bước 1: Tránh flash UI trước khi Firebase phản hồi
VTFilms_startListener();  // Bước 2: Lắng nghe Firebase Auth State
VTFilms_log.info('Module khởi động xong, chờ Firebase phản hồi...');


// ============================================================
// FIREBASE FIRESTORE SECURITY RULES  (v4.0)
//
// Sao chép nội dung bên dưới vào Firebase Console:
//   Firestore Database → Rules → Publish
//
// ─────────────────────────────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // ── Dữ liệu user & phiên đăng nhập ──
//     // Cấu trúc: users/{uid}/sessions/{sessionId}
//     match /users/{uid} {
//
//       // Tài liệu gốc user: chỉ user đó đọc/ghi
//       allow read, write: if request.auth != null
//                          && request.auth.uid == uid;
//
//       match /sessions/{sessionId} {
//         // Chỉ user đó được đọc phiên của mình
//         allow read: if request.auth != null
//                     && request.auth.uid == uid;
//
//         // Chỉ user đó được TẠO mới phiên của mình (không cho sửa/xóa từ client)
//         // Validate: đảm bảo sessionId trong document khớp với document path
//         allow create: if request.auth != null
//                       && request.auth.uid == uid
//                       && request.resource.data.uid == uid;
//
//         // Không cho phép update hay delete từ client (chỉ admin/Cloud Functions)
//         allow update, delete: if false;
//       }
//     }
//
//     // Mặc định: từ chối tất cả
//     match /{document=**} {
//       allow read, write: if false;
//     }
//   }
// }
// ============================================================
