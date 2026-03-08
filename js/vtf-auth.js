/**
 * vtfilms-module — VT Films Firebase Auth Module
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
/**
 * [v6.3] Xóa #vtfilms-app khỏi DOM — bảo mật SPA.
 * remove() thay vì d-none: user không thể khôi phục qua DevTools mà không reload.
 */
function VTFilms_removeApp() {
    const el = document.getElementById('vtfilms-app');
    if (!el) return;
    el.remove();
    VTFilms_log.ok('#vtfilms-app đã xóa khỏi DOM (bảo mật SPA).');
}

/** Hiện #vtfilms-app — chỉ gọi khi user là admin hoặc đã approved. */
function VTFilms_showApp() {
    const el = document.getElementById('vtfilms-app');
    if (!el) return;
    el.classList.remove('d-none');
    window.__VTF_READY = true;
    VTFilms_log.ok('#vtfilms-app hiển thị, __VTF_READY = true.');
}


// ── 10. OVERLAY ĐĂNG NHẬP ────────────────────────────────────────────────────
function VTFilms_showOverlay() {
    if (document.getElementById('VTFilms-overlay')) return;
    VTFilms_log.info('Tạo overlay đăng nhập...');

    const overlay = document.createElement('div');
    overlay.id        = 'VTFilms-overlay';
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.cssText = 'z-index:99999;background:rgba(7,8,15,.97)';

    overlay.innerHTML = `
        <div class="text-center" style="width:min(480px,calc(100vw - 28px))">
            <div class="mb-4">
                <svg fill='var(--vtf-primary)' enable-background='new 0 0 992 992' id='Layer_1' version='1.1' viewBox='0 0 992 992' width='70' x='0px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' y='0px'> <path d=' M537.072266,790.994934   C518.384460,823.271484 499.881897,855.232605 481.546600,886.904846   C478.881500,886.932983 478.519226,885.252380 477.814240,884.032715   C449.972229,835.864990 422.152496,787.684387 394.315430,739.513794   C390.315125,732.591492 386.319824,725.663940 382.164368,718.834900   C380.506805,716.110901 380.462708,713.887695 382.125458,711.018250   C426.808105,633.910156 471.397614,556.748169 516.004395,479.596100   C524.258179,465.320282 532.502258,451.038788 540.782654,436.778381   C545.431152,428.772736 544.592163,427.275574 535.083252,427.237640   C518.919495,427.173157 502.752899,427.023346 486.593201,427.275269   C481.969421,427.347321 479.380280,425.745056 477.107635,421.790588   C447.725372,370.664581 418.193115,319.624817 388.704956,268.559662   C386.049835,263.961761 383.438019,259.338867 379.894104,253.129639   C385.960632,253.129639 390.803619,253.110168 395.646393,253.132751   C431.301971,253.299011 466.956360,252.964279 502.614929,253.440689   C531.431396,253.825653 560.260315,253.186874 589.083862,253.148209   C638.565613,253.081833 688.054443,252.618851 737.526855,253.301346   C772.849670,253.788635 808.158020,252.737198 843.472717,253.321091   C846.685547,253.374207 848.234192,254.640961 849.695862,257.176147   C881.311340,312.012695 912.985779,366.815247 944.634949,421.632355   C945.440491,423.027618 946.591370,424.321869 946.523254,426.153778   C944.361511,427.828064 941.948669,427.139038 939.723450,427.140350   C877.900391,427.176880 816.077271,427.210663 754.254578,427.063690   C749.389282,427.052124 746.563293,428.368378 743.998535,432.817963   C682.519409,539.473328 620.854248,646.021362 559.227478,752.591614   C551.890320,765.279602 544.580139,777.983154 537.072266,790.994934  M819.889526,322.563171   C819.395142,321.694672 818.778259,320.872894 818.426147,319.950104   C816.044861,313.709869 811.857849,311.803955 804.977356,311.842102   C744.648071,312.176819 684.316345,312.063019 623.985291,312.061981   C579.153809,312.061188 534.322266,312.028320 489.490753,312.015198   C482.944855,312.013306 482.075104,313.355286 485.232697,318.848877   C493.949249,334.014130 502.731812,349.141418 511.469452,364.294556   C512.931519,366.830078 514.423218,368.791748 517.951172,368.753387   C558.773682,368.309479 599.602661,369.267975 640.423889,368.212158   C642.548523,368.157196 644.742676,367.995361 646.466614,369.508209   C646.796143,370.938385 645.950256,371.853851 645.381775,372.839539   C635.644958,389.723267 625.897766,406.600983 616.147461,423.476898   C576.307068,492.433197 536.462280,561.386963 496.624573,630.344788   C481.206879,657.032288 465.843597,683.751404 450.341980,710.390015   C448.438293,713.661377 448.402344,716.329529 450.331238,719.611450   C459.192932,734.689331 467.808929,749.911377 476.610535,765.024963   C479.793884,770.491150 481.213623,770.492065 484.345154,765.150940   C490.243134,755.091309 496.025574,744.963806 501.852203,734.862366   C537.729919,672.662231 573.562988,610.436157 609.496277,548.268127   C642.844788,490.571930 676.359741,432.971771 709.598022,375.212311   C712.350708,370.428802 715.243408,368.482300 720.894104,368.520233   C760.057373,368.783051 799.223328,368.673859 838.388367,368.649750   C844.888184,368.645752 845.635620,367.338776 842.437500,361.751801   C835.071777,348.884094 827.663818,336.040588 819.889526,322.563171  z' opacity='1.000000' stroke='none'/> <path d=' M188.102264,382.835175   C163.279175,339.887726 138.642349,297.257141 113.141380,253.131256   C119.858635,253.131256 125.113457,253.120575 130.368240,253.132904   C190.193649,253.273224 250.019073,253.456223 309.844482,253.465607   C313.559967,253.466187 315.126831,255.231369 316.719513,257.989685   C342.292236,302.279297 367.915436,346.539734 393.532959,390.803467   C410.804230,420.645935 428.072968,450.489929 445.383789,480.309418   C446.696198,482.570129 447.637421,484.512726 446.072235,487.195251   C435.997070,504.463043 426.061462,521.812195 416.063263,539.125000   C415.576385,539.968079 415.156158,540.937561 413.884003,541.255676   C411.952515,541.072021 411.607605,539.190308 410.826355,537.837036   C378.762604,482.292603 346.731018,426.729584 314.677948,371.178986   C304.187378,352.997955 293.581360,334.883057 283.194855,316.642944   C281.313202,313.338501 279.077026,311.939941 275.252472,311.976196   C258.088135,312.138824 240.921509,312.038818 223.755890,312.090637   C216.543533,312.112396 215.631409,313.705109 219.267776,320.001587   C240.013321,355.923126 260.782440,391.831055 281.564423,427.731537   C313.944000,483.666565 346.337646,539.593506 378.738495,595.516235   C380.138489,597.932495 380.874237,600.095947 379.222107,602.916992   C369.035461,620.311523 359.021393,637.807129 348.929565,655.257324   C348.610321,655.809326 348.069458,656.233154 346.872345,657.556152   C293.847748,565.805542 241.068130,474.478760 188.102264,382.835175  z' opacity='1.000000' stroke='none'/> </svg>
                <div style="color:var(--vtf-primary,#dc3636);font-size:1.5rem;font-weight:800;margin-top:10px">VT Films</div>
            </div>
            <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:22px;backdrop-filter:blur(24px);padding:36px 28px">
                <p style="color:#e4e8ff;font-size:1.05rem;font-weight:600;margin-bottom:6px">Đăng nhập để tiếp tục</p>
                <p style="color:#7b84a8;font-size:.85rem;margin-bottom:28px">Tài khoản được phê duyệt mới có thể sử dụng</p>
                <div id="VTFilms-g-btn" class="d-flex align-items-center justify-content-center mb-3" style="min-height:44px"></div>
                <div id="VTFilms-loading" class="d-none mt-3">
                    <div class="d-inline-flex align-items-center gap-2 small"
                         style="color:#7b84a8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 20px">
                        <i class="fad fa-spinner-third fa-spin me-1"></i>Đang kiểm tra
                    </div>
                </div>
                <div id="VTFilms-error" class="d-none mt-3 small"
                     style="color:#f87171;background:rgba(220,54,54,.1);border:1px solid rgba(220,54,54,.2);border-radius:10px;padding:10px 14px"></div>
            </div>
            <p class="mt-3" style="color:#4a5170;font-size:.78rem">Miễn phí · Tốc độ cao · Cập nhật liên tục</p>
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
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.cssText = 'z-index:99998;background:rgba(7,8,15,.97);opacity:0;transition:opacity .35s ease';

    overlay.innerHTML = `
        <div class="text-center" style="width:min(480px,calc(100vw - 28px))">
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
