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
 *        [REMOVED] Ánh sáng nền trang trí trong overlay
 *  v3.2  [FIX] Xóa lazy load API (không tương thích với kiến trúc hiện tại)
 *        [NEW] Remove class d-none khỏi #VT-Films-App sau khi Firebase xác nhận login
 *  v4.0  [NEW] Đăng xuất → redirect về trang chủ ngay lập tức
 *        [NEW] Thu thập & lưu thông tin phiên đăng nhập vào Firestore
 *  v4.1  [OPT] Giảm dữ liệu session 15 → 6 fields, guard bằng sessionStorage
 *  v5.0  [REFACTOR] Bỏ subcollection sessions, flat document users/{uid}
 *        [NEW] Fields: uid, email, displayName, photoURL, provider, role,
 *                      createdAt, lastLoginAt
 *        [NEW] Phân quyền admin / user, logic write 3 mức, 0 reads
 *  v6.0  [NEW] Hệ thống xác minh user (Verification Gate)
 *        ── User side ──
 *        [NEW] Sau login, user thường phải chờ admin xác minh trước khi dùng app
 *        [NEW] Overlay "Chờ xác minh" — hiện thay vì app, tồn tại qua reload/thoát
 *        [NEW] Realtime onSnapshot trên users/{uid} → khi admin duyệt → hiệu ứng
 *              thành công → reload tự động → vào app bình thường
 *        [NEW] Overlay "Bị từ chối" khi admin reject
 *        ── Admin side ──
 *        [NEW] Dropdown Bootstrap realtime — danh sách user đang chờ xác minh
 *        [NEW] Nút "Chấp nhận" → updateDoc verifiedUser: true (realtime phía user)
 *        [NEW] Nút "Từ chối" → updateDoc verifiedUser: "rejected"
 *        [NEW] Hiển thị tối đa 5 user, nút "Tải thêm" khi có nhiều hơn
 *        [NEW] Badge đếm số user đang chờ trên icon chuông
 *        ── Firestore ──
 *        [NEW] Field verifiedUser: false (default) | true (approved) | "rejected"
 *        [NEW] Admin bypass xác minh hoàn toàn
 *        [OPT] localStorage cache trạng thái xác minh — không đọc Firestore khi reload
 *              → 'approved': show app ngay, không cần listener
 *              → 'pending': show pending overlay ngay + start onSnapshot listener
 *              → 'rejected': show rejection overlay ngay, không cần listener
 *        [UPD] Firestore Security Rules cập nhật đầy đủ (xem cuối file)
 *
 * ─────────────────────────────────────────────────────────────
 * CẤU TRÚC FIRESTORE (v6.0)
 *
 *   users/{uid}
 *     uid            string     Firebase UID
 *     email          string     Email Google
 *     displayName    string     Tên hiển thị
 *     photoURL       string     URL ảnh đại diện
 *     provider       string     "google"
 *     role           string     "admin" | "user"
 *     verifiedUser   mixed      false (pending) | true (approved) | "rejected"
 *     createdAt      timestamp  Lần đầu đăng nhập (không ghi đè)
 *     lastLoginAt    timestamp  Lần đăng nhập/mở tab gần nhất
 *
 * ─────────────────────────────────────────────────────────────
 * LUỒNG XÁC MINH
 *
 *   User thường đăng nhập lần đầu:
 *     syncUserDoc → verifiedUser: false → showPendingOverlay
 *     → startVerifyListener (onSnapshot) → admin duyệt → verifiedUser: true
 *     → showVerifySuccess → delay 2s → reload → vào app bình thường
 *
 *   User reload khi đang chờ:
 *     antiFlash đọc cache verifyStatus = 'pending'
 *     → showPendingOverlay ngay (không chờ Firebase)
 *     → startListener → startVerifyListener tiếp tục lắng nghe
 *
 *   User đã được duyệt (reload / mở tab mới):
 *     antiFlash đọc cache verifyStatus = 'approved'
 *     → giữ app, không cần onSnapshot nữa
 *
 *   Admin đăng nhập: bypass hoàn toàn, không cần xác minh
 *
 * ─────────────────────────────────────────────────────────────
 * STORAGE ĐƯỢC DÙNG (v6.0)
 *
 *   localStorage['VTFilms_userCache']      { uid, name, email, avatar, role }
 *     Mục đích: anti-flash UI
 *     Tồn tại: đến khi đăng xuất
 *
 *   localStorage['VTFilms_profileSaved']   uid (string)
 *     Mục đích: biết user đã có document Firestore chưa
 *     Tồn tại: đến khi đăng xuất
 *
 *   localStorage['VTFilms_verifyStatus']   JSON { uid, status }
 *     Mục đích: cache trạng thái xác minh, tránh đọc Firestore khi reload
 *     status: 'pending' | 'approved' | 'rejected'
 *     Tồn tại: đến khi đăng xuất
 *
 *   sessionStorage['VTFilms_tabActive']    "1"
 *     Mục đích: guard lastLoginAt trong tab
 *     Tồn tại: đến khi đóng tab
 *
 * ─────────────────────────────────────────────────────────────
 * API CÔNG KHAI
 *   window.VTFilms_USER                  → Object user (null nếu chưa login)
 *   window.VTFilms_USER.role             → "admin" | "user"
 *   window.VTFilms_Auth.signOut()        → Đăng xuất + redirect về trang chủ
 *   window.VTFilms_Auth.getUser()        → Lấy user hiện tại
 *   window.VTFilms_Auth.isAdmin()        → true nếu role === "admin"
 *   window.VTFilms_Auth.isVerified()     → true nếu đã được xác minh
 *   window.VTFilms_Auth._openPopup()     → Dùng trong HTML onclick
 *   window.addEventListener('vtfilms:auth-ready', cb)
 */


// ── 1. IMPORT FIREBASE v12.9.0 ────────────────────────────────────────────────
// [v6.0] Thêm: onSnapshot, collection, query, where, orderBy (cho realtime panels)
import { initializeApp }   from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getAnalytics }    from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup,
    signOut as VTFilms_fbSignOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    collection,          // [v6.0] Query collection users
    query,               // [v6.0] Build Firestore query
    where,               // [v6.0] Filter verifiedUser == false
    orderBy,             // [v6.0] Sort by createdAt desc
    setDoc,
    updateDoc,
    onSnapshot,          // [v6.0] Realtime listener (user verify + admin panel)
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';


// ── 2. HẰNG SỐ & CẤU HÌNH ────────────────────────────────────────────────────
const VTFilms_VERSION = '6.0';

// Admin UIDs — thêm UID vào đây để cấp quyền admin. Mọi UID khác = "user".
const VTFilms_ADMIN_UIDS = [
    'KU6FC2SAsmaE8qIu4EGU9J422On1',
];

// ── Storage Keys ──
const VTFilms_CACHE_KEY   = 'VTFilms_userCache';     // localStorage: UI anti-flash
const VTFilms_PROFILE_KEY = 'VTFilms_profileSaved';  // localStorage: flag document Firestore đã tạo
const VTFilms_VERIFY_KEY  = 'VTFilms_verifyStatus';  // [v6.0] localStorage: cache trạng thái xác minh
const VTFilms_TAB_KEY     = 'VTFilms_tabActive';     // sessionStorage: guard lastLoginAt

/** Google OAuth Client ID. */
const VTFilms_CLIENT_ID = '891750241616-234jksd5e2b301g838gr6t650hdobptk.apps.googleusercontent.com';

/** Wrapper log có màu, dễ filter trong DevTools. */
const VTFilms_log = {
    info:  (m, ...a) => console.log( `%c[VTFilms v${VTFilms_VERSION}]`,   'color:#dc3545;font-weight:bold', '→', m, ...a),
    ok:    (m, ...a) => console.log( `%c[VTFilms v${VTFilms_VERSION}] ✓`, 'color:#28a745;font-weight:bold', m, ...a),
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

/**
 * Xác định role dựa trên UID.
 * Admin bypass toàn bộ xác minh.
 * @param {string} uid
 * @returns {'admin' | 'user'}
 */
function VTFilms_getRole(uid) {
    return VTFilms_ADMIN_UIDS.includes(uid) ? 'admin' : 'user';
}


// ── 5. STORAGE: localStorage (cache UI + flags) ──────────────────────────────

/** Lưu { uid, name, email, avatar, role } vào localStorage. */
function VTFilms_saveCache(user) {
    try {
        localStorage.setItem(VTFilms_CACHE_KEY, JSON.stringify({
            uid: user.uid, name: user.name, email: user.email,
            avatar: user.avatar, role: user.role,
        }));
        VTFilms_log.info(`Cache UI lưu OK (${user.name} · ${user.role}).`);
    } catch (e) { VTFilms_log.warn('Lưu cache thất bại:', e.message); }
}

/** Đọc cache UI. @returns {{ uid, name, email, avatar, role } | null} */
function VTFilms_getCache() {
    try { return JSON.parse(localStorage.getItem(VTFilms_CACHE_KEY)); } catch (_) { return null; }
}

/** Xóa cache UI. */
function VTFilms_clearCache() {
    try { localStorage.removeItem(VTFilms_CACHE_KEY); } catch (_) {}
    VTFilms_log.info('Cache UI đã xóa.');
}

/** Kiểm tra user đã có document Firestore chưa (so sánh uid). */
function VTFilms_isProfileSaved(uid) {
    try { return localStorage.getItem(VTFilms_PROFILE_KEY) === uid; } catch (_) { return false; }
}

/** Đánh dấu document Firestore đã tạo. */
function VTFilms_markProfileSaved(uid) {
    try { localStorage.setItem(VTFilms_PROFILE_KEY, uid); } catch (_) {}
    VTFilms_log.info(`Profile flag lưu OK (uid: ${uid}).`);
}

/** Xóa profile flag khi đăng xuất. */
function VTFilms_clearProfileFlag() {
    try { localStorage.removeItem(VTFilms_PROFILE_KEY); } catch (_) {}
    VTFilms_log.info('Profile flag đã xóa.');
}


// ── 6. STORAGE: VERIFY STATUS CACHE ──────────────────────────────────────────
// [v6.0] Lưu trạng thái xác minh vào localStorage để persist qua reload/thoát trang.
// Không đọc Firestore khi reload — chỉ đọc từ cache này.
//
// Format: JSON { uid: string, status: 'pending' | 'approved' | 'rejected' }
//
// 'pending'  → hiện pending overlay ngay, start onSnapshot để chờ admin duyệt
// 'approved' → show app ngay, không cần listener
// 'rejected' → hiện rejection overlay ngay, không cần listener

/**
 * Đọc trạng thái xác minh từ cache.
 * @param {string} uid
 * @returns {'pending' | 'approved' | 'rejected' | null} null = chưa có cache
 */
function VTFilms_getVerifyStatus(uid) {
    try {
        const raw = localStorage.getItem(VTFilms_VERIFY_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // Chỉ trả về status nếu uid khớp (tránh dùng nhầm cache của user khác)
        return data.uid === uid ? data.status : null;
    } catch (_) { return null; }
}

/**
 * Lưu trạng thái xác minh.
 * @param {string} uid
 * @param {'pending' | 'approved' | 'rejected'} status
 */
function VTFilms_saveVerifyStatus(uid, status) {
    try {
        localStorage.setItem(VTFilms_VERIFY_KEY, JSON.stringify({ uid, status }));
        VTFilms_log.info(`Verify status lưu: ${status} (uid: ${uid}).`);
    } catch (e) { VTFilms_log.warn('Lưu verify status thất bại:', e.message); }
}

/** Xóa verify status khi đăng xuất. */
function VTFilms_clearVerifyStatus() {
    try { localStorage.removeItem(VTFilms_VERIFY_KEY); } catch (_) {}
    VTFilms_log.info('Verify status đã xóa.');
}


// ── 7. STORAGE: sessionStorage (guard tab lastLoginAt) ───────────────────────

/** Kiểm tra tab này đã updateDoc lastLoginAt chưa. */
function VTFilms_isTabActive() {
    try { return !!sessionStorage.getItem(VTFilms_TAB_KEY); } catch (_) { return false; }
}

/** Đánh dấu tab đã updateDoc. */
function VTFilms_markTabActive() {
    try { sessionStorage.setItem(VTFilms_TAB_KEY, '1'); } catch (_) {}
}

/** Xóa tab guard khi đăng xuất. */
function VTFilms_clearTabGuard() {
    try { sessionStorage.removeItem(VTFilms_TAB_KEY); } catch (_) {}
    VTFilms_log.info('Tab guard đã xóa.');
}


// ── 8. FIRESTORE: SYNC USER DOCUMENT ─────────────────────────────────────────
// [v6.0] Thêm verifiedUser: false vào setDoc khi tạo mới.
// Logic 3 mức giữ nguyên như v5.0.

/**
 * Đồng bộ document users/{uid} lên Firestore.
 *
 *   Mức 1 — User MỚI: setDoc full (bao gồm verifiedUser: false)
 *   Mức 2 — User cũ, tab mới: updateDoc chỉ lastLoginAt
 *   Mức 3 — Reload cùng tab: SKIP hoàn toàn
 *
 * 0 reads, tối đa 1 write/tab.
 */
async function VTFilms_syncUserDoc(fbUser) {
    const uid  = fbUser.uid;
    const role = VTFilms_getRole(uid);
    const ref  = doc(VTFilms_db, 'users', uid);

    if (VTFilms_isTabActive()) {
        VTFilms_log.info('Tab guard tồn tại → skip Firestore write (reload).');
        return;
    }

    if (!VTFilms_isProfileSaved(uid)) {
        // [v6.0] Thêm verifiedUser: false — admin bypass (role admin không cần xác minh,
        // nhưng field vẫn được set để nhất quán — admin access do role, không do verifiedUser)
        VTFilms_log.info(`User mới (${fbUser.email}) → tạo document Firestore (verifiedUser: false)...`);
        try {
            await setDoc(ref, {
                uid,
                email:        fbUser.email,
                displayName:  fbUser.displayName || 'Người dùng',
                photoURL:     fbUser.photoURL    || null,
                provider:     'google',
                role,
                verifiedUser: false, // [v6.0] Mặc định chờ xác minh
                createdAt:    serverTimestamp(),
                lastLoginAt:  serverTimestamp(),
            });
            VTFilms_markProfileSaved(uid);
            VTFilms_markTabActive();
            VTFilms_log.ok(`Document tạo mới OK: users/${uid} (role: ${role}, verifiedUser: false)`);
        } catch (err) {
            VTFilms_log.error('setDoc thất bại:', err.message);
        }
        return;
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


// ── 9. QUẢN LÝ DOM ───────────────────────────────────────────────────────────

/** Xóa #VT-Films-App khỏi DOM. */
function VTFilms_removeApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) { VTFilms_log.warn('#VT-Films-App không tìm thấy.'); return; }
    el.remove();
    VTFilms_log.ok('#VT-Films-App đã xóa khỏi DOM.');
}

/** Hiện #VT-Films-App: remove class d-none. */
function VTFilms_showApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) return;
    el.classList.remove('d-none');
    VTFilms_log.ok('#VT-Films-App hiển thị (d-none removed).');
}

/** Reload trang sau đăng nhập / sau xác minh thành công. */
function VTFilms_reloadPage() {
    VTFilms_log.info('Reload trang...');
    window.location.reload();
}


// ── 10. OVERLAY ĐĂNG NHẬP ────────────────────────────────────────────────────
// [UNCHANGED từ v5.0 — giữ nguyên toàn bộ HTML]

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
                </div>
                <p class="text-danger mb-4 h5 fw-semibold">Đăng nhập để tiếp tục</p>
                <div id="VTFilms-g-btn" class="d-flex align-items-center justify-content-center mb-3" style="min-height:44px"></div>
                <p class="text-light m-0 mb-1 mt-4 h6 opacity-75 fw-normal">Miễn phí • Tốc độ cao • Cập nhật liên tục</p>
                <p class="text-light m-0 small opacity-50 fw-normal">Tài khoản được phê duyệt mới có thể sử dụng</p>
                <div class="d-none align-items-center gap-2 text-secondary small mb-3">
                    <div class="flex-grow-1 border-top border-secondary opacity-25"></div>hoặc
                    <div class="flex-grow-1 border-top border-secondary opacity-25"></div>
                </div>
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

/** Fade-out overlay đăng nhập, remove sau 1.5s. */
function VTFilms_hideOverlay() {
    const el = document.getElementById('VTFilms-overlay');
    if (!el) return;
    el.style.transition = 'opacity .3s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 1500);
    VTFilms_log.info('Overlay đăng nhập ẩn dần...');
}

/** Toggle loading state trong overlay đăng nhập. */
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
// [v6.0] Hiện sau khi user đăng nhập nhưng chưa được admin duyệt.
// Persist qua reload/thoát bằng localStorage verifyStatus = 'pending'.
// onSnapshot lắng nghe realtime → khi admin duyệt → chuyển sang success state.

/**
 * Tạo overlay "Chờ xác minh" — thay thế app, hiện thông tin user + spinner chờ.
 * ID: VTFilms-pending-overlay
 *
 * @param {{ name, email, avatar } | null} user — Object user hoặc cache
 */
function VTFilms_showPendingOverlay(user) {
    if (document.getElementById('VTFilms-pending-overlay')) return;
    VTFilms_log.info(`Hiện pending overlay cho user: ${user?.email || 'unknown'}`);

    const name   = user?.name   || 'Người dùng';
    const email  = user?.email  || '';
    const avatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3545&color=fff&size=80`;

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-pending-overlay';
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.zIndex = '99998'; // Dưới overlay đăng nhập (99999) một bậc

    overlay.innerHTML = `
        <div class="card text-center shadow-lg"
             style="width:min(500px,calc(100vw - 28px));
                    background:rgba(255,255,255,.055);
                    border:1px solid rgba(255,255,255,.1) !important;
                    border-radius:22px;backdrop-filter:blur(28px)">
            <div class="card-body px-3 py-5">

                <!-- Avatar user -->
                <img loading="lazy" src="${avatar}" class="rounded-circle mb-3"
                     width="99" height="99" style="object-fit:cover"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3545&color=fff&size=80'"
                     alt="${name}">

                <!-- Tên & email -->
                <div class="text-white opacity-75 fw-bold m-0 fs-5">${name}</div>
                <div class="text-secondary mb-4 opacity-75">${email}</div>

                <!-- Icon đồng hồ / chờ -->
                <div id="VTFilms-pending-icon" class="mb-3"><i class="fa-duotone fa-solid fa-hourglass-clock fa-2x text-warning fa-fade" style="--fa-animation-duration: 2s;"></i></div>

                <!-- Tiêu đề -->
                <div id="VTFilms-pending-title" class="fw-semibold h5 text-warning mb-2">
                    Tài khoản đang chờ xác thực
                </div>

                <!-- Mô tả -->
                <p id="VTFilms-pending-msg" class="text-secondary mb-4">
                    Liên hệ <b>Vũ Trường</b> để được cấp quyền sử dụng
                </p>

                <!-- Spinner realtime -->
                <div id="VTFilms-pending-spinner"
                     class="d-inline-flex align-items-center gap-2 text-secondary small rounded-pill px-4 py-2 mb-3"
                     style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
                    <i class="fad fa-spinner-third fa-spin"></i>Đang chờ xác thực
                </div>

                <!-- Nút đăng xuất -->
                <div class="mt-1">
                    <a class="btn btn-sm btn-outline-secondary rounded-pill px-3 border-0 fw-semibold opacity-75"
                            onclick="window.VTFilms_Auth.signOut()">
                        <i class="fad fa-right-from-bracket me-1"></i>
                        Đăng xuất
                    </a>
                </div>

            </div>
        </div>`;

    document.body.appendChild(overlay);
    VTFilms_log.ok('Pending overlay đã chèn vào DOM.');
}

/**
 * Chuyển pending overlay sang trạng thái "Xác thực thành công".
 * Hiệu ứng: đổi nội dung → delay 2.5s → fade out → reload.
 */
function VTFilms_showVerifySuccess() {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    VTFilms_log.ok('Xác thực thành công! Hiện hiệu ứng success...');

    if (overlay) {
        // Cập nhật nội dung overlay → success state
        const icon    = overlay.querySelector('#VTFilms-pending-icon');
        const title   = overlay.querySelector('#VTFilms-pending-title');
        const msg     = overlay.querySelector('#VTFilms-pending-msg');
        const spinner = overlay.querySelector('#VTFilms-pending-spinner');

        if (icon)    { icon.innerHTML = '<i class="fad fa-circle-check text-success fa-2x"></i>'; icon.style.animation = 'none'; }
        if (title)   { title.textContent = 'Xác thực thành công!'; title.className = 'fw-semibold h5 text-success mb-2'; }
        if (msg)     { msg.innerHTML = 'Tài khoản của bạn đã được phê duyệt'; }
        if (spinner) { spinner.innerHTML = `<i class="fad fa-spinner-third fa-spin me-2"></i>Đang tải dữ liệu`; }

        // Sau 2.5s → fade out → reload
        setTimeout(() => {
            overlay.style.transition = 'opacity .5s ease';
            overlay.style.opacity    = '0';
            setTimeout(() => {
                overlay.remove();
                VTFilms_log.info('Pending overlay đã xóa → reload trang...');
                window.location.reload();
            }, 600);
        }, 3000);
    } else {
        // Không có overlay (hiếm gặp) → reload luôn
        setTimeout(() => window.location.reload(), 1000);
    }
}

/**
 * Chuyển pending overlay sang trạng thái "Bị từ chối".
 * User thấy thông báo, có thể đăng xuất.
 */
function VTFilms_showVerifyRejected() {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    VTFilms_log.warn('Tài khoản bị từ chối bởi Admin.');

    if (overlay) {
        const icon    = overlay.querySelector('#VTFilms-pending-icon');
        const title   = overlay.querySelector('#VTFilms-pending-title');
        const msg     = overlay.querySelector('#VTFilms-pending-msg');
        const spinner = overlay.querySelector('#VTFilms-pending-spinner');

        if (icon)    icon.innerHTML = '<i class="fad fa-ban fa-2x text-danger"></i>';
        if (title)   { title.textContent = 'Tài khoản bị từ chối'; title.className = 'fw-semibold h5 text-danger mb-2'}
        if (msg)     msg.innerHTML = 'Liên hệ <b>Vũ Trường</b> để được hỗ trợ';
        // if (spinner) spinner.classList.add('d-none');
		if (spinner) { spinner.innerHTML = `admin@vutruong.vn`; }
    }
}

/** Remove pending overlay (dùng khi đăng xuất hoặc đã approved). */
function VTFilms_hidePendingOverlay() {
    const el = document.getElementById('VTFilms-pending-overlay');
    if (!el) return;
    el.style.transition = 'opacity .3s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 400);
    VTFilms_log.info('Pending overlay ẩn dần...');
}


// ── 12. REALTIME LISTENER: XÁC MINH USER ─────────────────────────────────────
// [v6.0] onSnapshot trên users/{uid} để nhận kết quả xác minh realtime từ admin.
// Tự hủy sau khi nhận được kết quả (approved/rejected).

/** Giữ hàm unsubscribe để cleanup khi đăng xuất. */
let VTFilms_verifyUnsubscribe = null;

/**
 * Bắt đầu lắng nghe trạng thái xác minh realtime.
 * Chạy onSnapshot trên users/{uid}:
 *   verifiedUser === true       → showVerifySuccess → reload
 *   verifiedUser === "rejected" → showVerifyRejected → lưu cache
 *   verifiedUser === false      → vẫn đang chờ, tiếp tục lắng nghe
 *
 * @param {import('firebase/auth').User} fbUser
 */
function VTFilms_startVerifyListener(fbUser) {
    // Dọn dẹp listener cũ nếu có
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
    }

    VTFilms_log.info(`Bắt đầu onSnapshot xác minh cho uid: ${fbUser.uid}...`);
    const ref = doc(VTFilms_db, 'users', fbUser.uid);

    VTFilms_verifyUnsubscribe = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
            VTFilms_log.warn('onSnapshot: document users/' + fbUser.uid + ' chưa tồn tại.');
            return;
        }

        const data           = snap.data();
        const verifiedStatus = data.verifiedUser;
        VTFilms_log.info(`onSnapshot users/${fbUser.uid}: verifiedUser = ${JSON.stringify(verifiedStatus)}`);

        if (verifiedStatus === true) {
            // ✅ Admin đã duyệt
            VTFilms_log.ok('Admin đã xác minh tài khoản → cập nhật cache → success UI...');
            VTFilms_saveVerifyStatus(fbUser.uid, 'approved');
            // Dừng listener (không cần lắng nghe nữa)
            if (VTFilms_verifyUnsubscribe) { VTFilms_verifyUnsubscribe(); VTFilms_verifyUnsubscribe = null; }
            VTFilms_showVerifySuccess();

        } else if (verifiedStatus === 'rejected') {
            // 🚫 Admin đã từ chối
            VTFilms_log.warn('Admin đã từ chối tài khoản → cập nhật cache → rejection UI...');
            VTFilms_saveVerifyStatus(fbUser.uid, 'rejected');
            if (VTFilms_verifyUnsubscribe) { VTFilms_verifyUnsubscribe(); VTFilms_verifyUnsubscribe = null; }
            VTFilms_showVerifyRejected();

        } else {
            // ⏳ Vẫn đang chờ (verifiedUser === false)
            VTFilms_log.info('Vẫn đang chờ admin xác minh...');
            VTFilms_saveVerifyStatus(fbUser.uid, 'pending');
        }
    }, (err) => {
        VTFilms_log.error('onSnapshot xác minh lỗi:', err.message);
    });
}

/** Dừng listener xác minh (gọi khi đăng xuất). */
function VTFilms_stopVerifyListener() {
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
        VTFilms_log.info('Verify listener đã dừng.');
    }
}


// ── 13. ADMIN PANEL: DANH SÁCH USER CHỜ XÁC MINH ────────────────────────────
// [v6.0] Chỉ render cho admin (role === 'admin').
// Dùng onSnapshot query users collection where verifiedUser == false.
// Hiện tối đa 5 user, nút "Tải thêm" để xem thêm.
// Inject vào #vt-admin-info nếu có, không thì inject trước #vt-user-info.

/** Danh sách user đang chờ (nhận từ onSnapshot). */
let VTFilms_pendingUsers = [];

/** Số lượng đang hiển thị trong dropdown. */
let VTFilms_pendingVisible = 5;

/** Hàm unsubscribe admin panel listener. */
let VTFilms_adminUnsubscribe = null;

/**
 * Lấy/tạo container cho admin panel.
 * Ưu tiên #vt-admin-info → inject trước #vt-user-info → fallback fixed bottom-right.
 * @returns {HTMLElement}
 */
function VTFilms_getAdminContainer() {
    let container = document.getElementById('vt-admin-info');
    if (container) return container;

    container = document.createElement('div');
    container.id        = 'vt-admin-info';
    container.className = 'me-1';

    const userInfo = document.getElementById('vt-user-info');
    if (userInfo?.parentElement) {
        userInfo.parentElement.insertBefore(container, userInfo);
        VTFilms_log.info('Admin panel container: inject trước #vt-user-info.');
    } else {
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9997';
        document.body.appendChild(container);
        VTFilms_log.warn('Admin panel container: fallback → fixed bottom-right.');
    }
    return container;
}

/**
 * Render admin panel dropdown vào container.
 * Gọi lại mỗi khi VTFilms_pendingUsers thay đổi (từ onSnapshot).
 */
function VTFilms_renderAdminPanel() {
    const container = VTFilms_getAdminContainer();
    const total     = VTFilms_pendingUsers.length;
    const visible   = VTFilms_pendingUsers.slice(0, VTFilms_pendingVisible);
    const hasMore   = total > VTFilms_pendingVisible;

    // ── Tạo HTML các item user ──
    const itemsHTML = visible.length === 0
        ? `<li><span class="dropdown-item-text text-secondary small py-2 d-block text-center">
               <i class="fad fa-circle-check me-1 text-success"></i>
               Không có user nào đang chờ
           </span></li>`
        : visible.map(u => {
            const name   = u.displayName || u.email || 'Unknown';
            const email  = u.email || '';
            const uid    = u.uid;
            const avatar = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=36`;
            const ts     = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('vi-VN') : '—';

            return `
                <li>
                    <div class="dropdown-item-text text-light m-0 p-3">
                        <!-- Avatar + tên + email -->
                        <div class="d-flex align-items-start gap-2 mb-3">
                            <img src="${avatar}" class="rounded-circle flex-shrink-0 border-0"
                                 width="45" height="45" style="object-fit:cover"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=45'"
                                 alt="${name}">
                            <div class="overflow-hidden flex-grow-1">
                                <div class="fw-semibold text-truncate">${name}</div>
                                <div class="text-truncate opacity-75 small">${email}</div>
                            </div>
                            <div class="flex-shrink-0 small opacity-50">${ts}</div>
                        </div>

                        <!-- Nút Chấp nhận / Từ chối -->
                        <div class="d-flex gap-2">
                            <a class="btn btn-sm btn-success flex-fill rounded-pill small"
                                    onclick="window.VTFilms_Auth._adminApprove('${uid}', this)" role="button">
                                <i class="fad fa-check me-2"></i>Duyệt
                            </a>
                            <a class="btn btn-sm btn-outline-danger flex-fill rounded-pill small"
                                    onclick="window.VTFilms_Auth._adminReject('${uid}', this)" role="button">
                                <i class="fad fa-xmark me-2"></i>Biến
                            </a>
                        </div>

                    </div>
                </li>`;
        }).join('');

    // ── Nút "Tải thêm" ──
    const loadMoreHTML = hasMore ? `
        <li>
            <button class="dropdown-item text-center text-info small py-2"
                    style="font-size:12px"
                    onclick="window.VTFilms_Auth._adminLoadMore()">
                <i class="fa-regular fa-chevron-down me-1"></i>
                Tải thêm (còn ${total - VTFilms_pendingVisible} user)
            </button>
        </li>` : '';

    // ── Badge số user đang chờ ──
    const badgeHTML = total > 0
        ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
               style="margin:.25rem -.25rem 0">${total > 99 ? '99+' : total}</span>`
        : '';

    // ── Render dropdown ──
    container.innerHTML = `
        <div class="dropdown-menu-end">
            <a class="nav-link position-relative admin-bell-icon border-0 shadow-none"
                    data-bs-toggle="dropdown" aria-expanded="false" role="button">
                <i class="fad fa-bell"></i>
                ${badgeHTML}
            </a>
            <div class="dropdown-menu dropdown-menu-end history-dropdown p-0 shadow-lg mt-1 rounded-3 slideIn animate"
                 style="min-width:max-content;max-height:80vh;overflow-y:auto">

                <!-- Header -->
                <div class="px-3 py-2 d-flex align-items-center justify-content-between gap-3"
                     style="border-bottom:1px solid rgba(255,255,255,.08)">
                    <span class="fw-bold dropdown-item-text text-light p-0 text-uppercase small">
                        Danh sách user chờ phê duyệt
                    </span>
                    <span class="badge small rounded-pill ${total > 0 ? 'bg-warning text-dark' : 'bg-secondary'}">
                        ${total}
                    </span>
                </div>

                <!-- Danh sách -->
                ${itemsHTML}
                ${loadMoreHTML}

            </div>
        </div>`;

    VTFilms_log.info(`Admin panel render: ${total} user đang chờ (hiện ${Math.min(visible.length, total)}).`);
}

/**
 * Admin chấp nhận user: updateDoc verifiedUser = true.
 * Realtime → trigger onSnapshot phía user → showVerifySuccess.
 *
 * @param {string} uid — UID của user cần duyệt
 * @param {HTMLElement} btn — Nút đã bấm (để show loading state)
 */
async function VTFilms_adminApprove(uid, btn) {
    VTFilms_log.info(`Admin approve uid: ${uid}...`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }

    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), {
            verifiedUser: true,          // [v6.0] Phê duyệt: boolean true
        });
        VTFilms_log.ok(`Đã approve uid: ${uid} → verifiedUser: true`);
        // onSnapshot phía user tự trigger — không cần làm gì thêm
    } catch (err) {
        VTFilms_log.error(`Approve uid ${uid} thất bại:`, err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-regular fa-check me-1"></i>Chấp nhận'; }
    }
}

/**
 * Admin từ chối user: updateDoc verifiedUser = "rejected".
 * Dùng string "rejected" thay vì false để loại khỏi query pending
 * (where verifiedUser == false sẽ không khớp string "rejected").
 *
 * @param {string} uid
 * @param {HTMLElement} btn
 */
async function VTFilms_adminReject(uid, btn) {
    VTFilms_log.info(`Admin reject uid: ${uid}...`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }

    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), {
            verifiedUser: 'rejected',    // [v6.0] Từ chối: string "rejected" → loại khỏi pending query
        });
        VTFilms_log.ok(`Đã reject uid: ${uid} → verifiedUser: "rejected"`);
    } catch (err) {
        VTFilms_log.error(`Reject uid ${uid} thất bại:`, err.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-regular fa-xmark me-1"></i>Từ chối'; }
    }
}

/**
 * Tải thêm 5 user trong dropdown admin.
 * Dữ liệu đã có trong VTFilms_pendingUsers (từ onSnapshot) — chỉ tăng số hiển thị.
 */
function VTFilms_adminLoadMore() {
    VTFilms_pendingVisible += 5;
    VTFilms_log.info(`Admin load more: hiện ${VTFilms_pendingVisible} user.`);
    VTFilms_renderAdminPanel();
}

/**
 * Bắt đầu admin panel: onSnapshot query users where verifiedUser == false.
 * Realtime — tự cập nhật khi có user mới hoặc admin duyệt.
 * Chỉ gọi cho admin sau khi app đã hiện.
 */
function VTFilms_startAdminPanel() {
    // Dọn dẹp listener cũ
    if (VTFilms_adminUnsubscribe) { VTFilms_adminUnsubscribe(); VTFilms_adminUnsubscribe = null; }

    VTFilms_log.info('Khởi động admin panel — onSnapshot users (verifiedUser == false)...');

    // Query: users where verifiedUser == false, sắp xếp theo createdAt desc (mới nhất trước)
    const q = query(
        collection(VTFilms_db, 'users'),
        where('verifiedUser', '==', false),  // Chỉ pending (không lấy true hoặc "rejected")
        orderBy('createdAt', 'desc')
    );

    VTFilms_adminUnsubscribe = onSnapshot(q, (snapshot) => {
        VTFilms_pendingUsers    = snapshot.docs.map(d => d.data());
        VTFilms_pendingVisible  = 5; // Reset về 5 mỗi khi data thay đổi
        VTFilms_log.info(`Admin panel cập nhật: ${VTFilms_pendingUsers.length} user đang chờ.`);
        VTFilms_renderAdminPanel();
    }, (err) => {
        VTFilms_log.error('Admin panel onSnapshot lỗi:', err.message);
    });
}

/** Dừng admin panel listener (gọi khi đăng xuất). */
function VTFilms_stopAdminPanel() {
    if (VTFilms_adminUnsubscribe) {
        VTFilms_adminUnsubscribe();
        VTFilms_adminUnsubscribe = null;
        VTFilms_log.info('Admin panel listener đã dừng.');
    }
}


// ── 14. GOOGLE IDENTITY SERVICES (GSI) ───────────────────────────────────────
// [UNCHANGED từ v5.0]

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
    google.accounts.id.prompt((n) => {
        if      (n.isNotDisplayed())  VTFilms_log.warn('One Tap không hiển thị:', n.getNotDisplayedReason());
        else if (n.isSkippedMoment()) VTFilms_log.warn('One Tap bị bỏ qua:', n.getSkippedReason());
        else                          VTFilms_log.ok('One Tap góc màn hình hiển thị.');
    });
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


// ── 15. ĐĂNG XUẤT ────────────────────────────────────────────────────────────
// [v6.0] Thêm: dừng verify listener, dừng admin panel, xóa verify status cache

async function VTFilms_signOut() {
    VTFilms_log.info('Bắt đầu đăng xuất...');
    try {
        window.google?.accounts?.id?.disableAutoSelect();
        VTFilms_stopVerifyListener();   // [v6.0] Dừng realtime verify listener
        VTFilms_stopAdminPanel();       // [v6.0] Dừng admin panel listener
        VTFilms_clearCache();
        VTFilms_clearProfileFlag();
        VTFilms_clearVerifyStatus();    // [v6.0] Xóa verify status cache
        VTFilms_clearTabGuard();
        VTFilms_hidePendingOverlay();   // [v6.0] Xóa pending overlay nếu có
        await VTFilms_fbSignOut(VTFilms_auth);
        VTFilms_log.ok('Đăng xuất thành công → redirect trang chủ...');
        window.location.href = window.location.pathname;
    } catch (err) {
        VTFilms_log.error('Đăng xuất thất bại:', err.message);
    }
}


// ── 16. QUẢN LÝ USER OBJECT ───────────────────────────────────────────────────
// [UNCHANGED từ v5.0]

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
            <a class="nav-link p-0 m-0" role="button" data-bs-toggle="dropdown" aria-expanded="false">
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
                    <a class="dropdown-item dropdown-item-text text-light d-flex align-items-center gap-2 nav-toggle-theme-btn shadow-none py-2 small"
                       id="themeToggler" onclick="toggleTheme()" role="button">
                        <i class="fa-duotone fa-sun" id="themeIcon"></i>Thay đổi giao diện
                    </a>
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


// ── 17. ANTI-FLASH ────────────────────────────────────────────────────────────
// [v6.0] Cập nhật: đọc verifyStatus cache để hiện đúng UI ngay lập tức.
//
//  Không có cache → chắc chắn chưa login → show login overlay
//  Cache có, role admin → keep app (admin không cần xác minh)
//  Cache có, verifyStatus 'approved' → keep app
//  Cache có, verifyStatus 'rejected' → remove app, show rejection overlay
//  Cache có, verifyStatus 'pending' hoặc null → remove app, show pending overlay

function VTFilms_antiFlash() {
    const cache = VTFilms_getCache();

    if (!cache) {
        VTFilms_log.info('Anti-flash: không có cache → login overlay...');
        const appEl = document.getElementById('VT-Films-App');
        if (appEl) appEl.remove();
        VTFilms_showOverlay();
        return;
    }

    // Admin bypass hoàn toàn — không cần xác minh
    if (cache.role === 'admin') {
        VTFilms_log.info(`Anti-flash: admin (${cache.name}) → giữ UI, chờ Firebase...`);
        return;
    }

    const verifyStatus = VTFilms_getVerifyStatus(cache.uid);
    VTFilms_log.info(`Anti-flash: user (${cache.name}), verifyStatus = ${verifyStatus}`);

    if (verifyStatus === 'approved') {
        // Đã được duyệt → giữ app bình thường
        VTFilms_log.info('Anti-flash: approved → giữ UI, chờ Firebase...');

    } else if (verifyStatus === 'rejected') {
        // Bị từ chối → remove app, show rejection overlay ngay
        VTFilms_log.warn('Anti-flash: rejected → xóa UI, hiện rejection overlay...');
        const appEl = document.getElementById('VT-Films-App');
        if (appEl) appEl.remove();
        VTFilms_showPendingOverlay(cache);    // Hiện overlay
        VTFilms_showVerifyRejected();         // Ngay lập tức set sang rejection state

    } else {
        // 'pending' hoặc null (chưa có cache verify) → remove app, show pending overlay
        VTFilms_log.info('Anti-flash: pending/unknown → xóa UI, hiện pending overlay...');
        const appEl = document.getElementById('VT-Films-App');
        if (appEl) appEl.remove();
        VTFilms_showPendingOverlay(cache);
    }
}


// ── 18. AUTH STATE LISTENER (TRUNG TÂM ĐIỀU PHỐI) ────────────────────────────
// [v6.0] Thêm verification gate trước khi show app cho user thường.
//
// Đã đăng nhập:
//   1. Build user, setUser (cache + dispatch)
//   2. syncUserDoc (0 reads, tối đa 1 write/tab)
//   3. Nếu admin → bypass xác minh → showApp + renderDropdown + startAdminPanel
//   4. Nếu user thường + approved (cache) → showApp + renderDropdown
//   5. Nếu user thường + pending/null → showPendingOverlay + startVerifyListener
//   6. Nếu user thường + rejected (cache) → showPendingOverlay (rejection state)
//
// Chưa đăng nhập:
//   1. Clear tất cả storage + listeners
//   2. Remove app, show login overlay
//   3. Init GSI

function VTFilms_startListener() {
    VTFilms_log.info('Bắt đầu lắng nghe onAuthStateChanged...');

    onAuthStateChanged(VTFilms_auth, async (fbUser) => {
        if (fbUser) {
            VTFilms_log.ok(`Firebase xác nhận: ${fbUser.email} (uid: ${fbUser.uid})`);

            const user = VTFilms_buildUser(fbUser);
            VTFilms_setUser(user);

            // Sync Firestore (tối đa 1 write/tab, 0 reads)
            VTFilms_syncUserDoc(fbUser).catch(e =>
                VTFilms_log.warn('syncUserDoc lỗi (không ảnh hưởng app):', e.message)
            );

            VTFilms_hideOverlay(); // Ẩn login overlay nếu đang hiện

            // ── Admin: bypass toàn bộ verification ──
            if (user.role === 'admin') {
                VTFilms_log.ok('Admin đăng nhập → bypass xác minh, show app trực tiếp.');
                if (!document.getElementById('VT-Films-App')) {
                    VTFilms_reloadPage();
                } else {
                    VTFilms_showApp();
                    VTFilms_renderDropdown(user);
                    VTFilms_startAdminPanel();   // [v6.0] Bắt đầu admin panel realtime
                }
                return;
            }

            // ── User thường: kiểm tra verification ──
            const verifyStatus = VTFilms_getVerifyStatus(fbUser.uid);
            VTFilms_log.info(`Verify status từ cache: ${verifyStatus}`);

            if (verifyStatus === 'approved') {
                // Đã được duyệt trước đó → show app bình thường
                VTFilms_log.ok('User đã approved (cache) → show app.');
                VTFilms_hidePendingOverlay();
                if (!document.getElementById('VT-Films-App')) {
                    VTFilms_reloadPage();
                } else {
                    VTFilms_showApp();
                    VTFilms_renderDropdown(user);
                }

            } else if (verifyStatus === 'rejected') {
                // Đã bị từ chối → show rejection (antiFlash đã làm, đây là fallback)
                VTFilms_log.warn('User rejected (cache) → đảm bảo rejection overlay hiện.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_showPendingOverlay(user);
                    VTFilms_showVerifyRejected();
                }

            } else {
                // 'pending' hoặc null → cần xác minh
                VTFilms_log.info('User chưa/đang chờ xác minh → pending overlay + verify listener...');

                // Đảm bảo pending overlay đang hiển thị
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    const appEl = document.getElementById('VT-Films-App');
                    if (appEl) appEl.remove();
                    VTFilms_showPendingOverlay(user);
                }

                // Bắt đầu lắng nghe realtime để nhận kết quả từ admin
                VTFilms_startVerifyListener(fbUser);
            }

        } else {
            // ── Chưa / vừa đăng xuất ──
            VTFilms_log.info('Firebase: chưa đăng nhập → dọn dẹp toàn bộ...');
            VTFilms_setUser(null);
            VTFilms_stopVerifyListener();   // [v6.0]
            VTFilms_stopAdminPanel();       // [v6.0]
            VTFilms_clearProfileFlag();
            VTFilms_clearVerifyStatus();    // [v6.0]
            VTFilms_clearTabGuard();

            const appEl = document.getElementById('VT-Films-App');
            if (appEl) { appEl.remove(); VTFilms_log.ok('#VT-Films-App đã xóa.'); }

            VTFilms_hidePendingOverlay();   // [v6.0] Xóa pending overlay nếu còn

            if (!document.getElementById('VTFilms-overlay')) VTFilms_showOverlay();

            document.readyState === 'loading'
                ? document.addEventListener('DOMContentLoaded', VTFilms_initGSI)
                : VTFilms_initGSI();
        }
    });
}


// ── 19. EXPORT GLOBAL API ─────────────────────────────────────────────────────
// [v6.0] Thêm: isVerified(), _adminApprove(), _adminReject(), _adminLoadMore()

window.VTFilms_USER = null;

window.VTFilms_Auth = {
    signOut:          VTFilms_signOut,
    getUser:          () => window.VTFilms_USER,
    isAdmin:          () => window.VTFilms_USER?.role === 'admin',
    isVerified:       () => {
        const u = window.VTFilms_USER;
        if (!u) return false;
        if (u.role === 'admin') return true;             // Admin luôn verified
        return VTFilms_getVerifyStatus(u.uid) === 'approved';
    },
    _openPopup:       VTFilms_openPopup,
    _adminApprove:    VTFilms_adminApprove,    // [v6.0] Dùng trong HTML button onclick
    _adminReject:     VTFilms_adminReject,     // [v6.0] Dùng trong HTML button onclick
    _adminLoadMore:   VTFilms_adminLoadMore,   // [v6.0] Dùng trong HTML button onclick
    version:          VTFilms_VERSION,
};


// ── 20. KHỞI CHẠY ─────────────────────────────────────────────────────────────
VTFilms_log.info(`===== vtfilms-module.js v${VTFilms_VERSION} khởi chạy =====`);
VTFilms_antiFlash();      // Bước 1: Anti-flash UI (đọc cache, hiện đúng overlay ngay)
VTFilms_startListener();  // Bước 2: Firebase onAuthStateChanged
VTFilms_log.info('Module khởi động xong, chờ Firebase phản hồi...');
