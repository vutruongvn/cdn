/**
 * vtfilms-module.js — VT Films Firebase Auth Module
 * films.vutruong.vn
 *
 * CHANGELOG (từ v6.0 — xem git history cho v1–v5)
 *
 *  v6.0  Hệ thống xác minh user (Verification Gate), admin panel
 *  v6.1  verifiedUser:'revoked', admin 3 tabs, nút Thu hồi / Phê duyệt lại
 *  v6.2  Unified listener, overlay transition mượt, fix tab dropdown, bỏ auto sign-out
 *  v6.3  Bảo mật SPA: remove() thay d-none, mọi transition kết thúc bằng reload()
 *         Layer A (applyOverlayContent) / Layer B (onTransition*) tránh reload loop
 *  v6.3.1 Fix reload vô hạn: guard verifyStatus trong syncUserDoc;
 *         pure compare _lastStatus=initialStatus trong unified listener
 *  v6.5  ── FIX FORCE SIGNOUT + BOOTSTRAP MODAL ──
 *
 *  v7.0  ── SINGLE PERSISTENT OVERLAY — NO-FLICKER REALTIME ──
 *        [REFACTOR] Gộp tất cả trạng thái (pending/rejected/revoked/approved)
 *                   vào 1 overlay duy nhất. Overlay KHÔNG bao giờ bị
 *                   destroy/recreate khi admin thay đổi trạng thái user.
 *        [NEW]  #VTFilms-pending-status-area — wrapper bao 4 element động
 *               (icon / title / msg / spinner). Các thành phần tĩnh (avatar,
 *               tên, email, admin@vutruong.vn, nút đăng xuất) nằm ngoài
 *               wrapper → không bị ảnh hưởng khi transition.
 *        [UPD]  VTFilms_overlayTransition: chỉ fade #VTFilms-pending-status-area
 *               thay vì fade cả .card → không còn nhấp nháy toàn màn hình
 *        [UPD]  VTFilms_onTransitionBlocked (rejected/revoked): BỎ reload()
 *               → cập nhật overlay in-place, mượt mà, tức thì, không reload
 *        [UPD]  VTFilms_onTransitionPending: BỎ reload()
 *               → cập nhật overlay in-place
 *        [KEEP] VTFilms_onTransitionApproved: GIỮ NGUYÊN reload()
 *               → bắt buộc vì lý do bảo mật SPA (v6.3): app phải được load
 *                  sạch từ HTML gốc sau khi admin phê duyệt
 *        [COMPAT] Toàn bộ tính năng khác giữ nguyên 100% — không thay đổi
 *                 logic, localStorage, admin panel, unified listener, antiFlash
 *        [FIX] Unified listener: !snap.exists() → force signOut ngay lập tức
 *              Trước: khi document bị admin xóa → listener chỉ log "chưa tồn tại" → return
 *              Sau: xóa toàn bộ localStorage cache → VTFilms_fbSignOut() → reload
 *              → User bị đăng xuất ngay, dù đang ở bất kỳ trang nào
 *        [FIX] adminDeleteUser: thay window.confirm() → Bootstrap Modal đẹp, chuyên nghiệp
 *              Modal inject vào document.body (không nằm trong dropdown để tránh z-index)
 *              Auto cleanup modal sau khi đóng (remove khỏi DOM)
 *        [OPT] VTFilms_showDeleteConfirmModal(uid, name, email, btn) — helper riêng
 *  v6.4.1 ── XÓA USER (TAB TỪ CHỐI) ──
 *        [NEW] Nút "Xóa" trong tab Từ chối (bên cạnh "Phê duyệt lại")
 *        [NEW] VTFilms_adminDeleteUser(uid): xóa document users/{uid} khỏi Firestore
 *              → User bị đăng xuất ngay (unified listener nhận snapshot null → signOut)
 *              → User đăng nhập lại: syncUserDoc tạo doc mới → verifiedUser:false (pending)
 *              → Giống như user chưa từng đăng nhập
 *        [NEW] Xác nhận trước khi xóa: confirm dialog tên + email
 *        [UPD] deleteDoc thêm vào Firestore imports
 *        [UPD] Firestore Rules: allow delete nếu requester là admin
 *              (cần deploy rules mới đi kèm — xem vtfilms-rules-6.4.1.rules)
 *        [UPD] window.VTFilms_Auth._adminDeleteUser export ra ngoài
 *  v6.4  ── CLEANUP & OPTIMIZE ──
 *        [REM] Dead code: aliases showVerifyRejected / showRevokedState / showVerifySuccess
 *        [REM] VTFilms_stopRevokeListener, VTFilms_adminUnsubscribe, VTFilms_reloadPage
 *        [MERGE] onTransitionRejected + onTransitionRevoked → onTransitionBlocked(state)
 *        [STD] setTimeout delay chuẩn hóa 50ms trong toàn bộ overlay transitions
 *        [OPT] VTFilms_DEBUG flag — tắt log khi production
 */


// ── 1. IMPORT FIREBASE v12.9.0 ────────────────────────────────────────────────
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
    collection,
    query,
    where,
    orderBy,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';


// ── 2. HẰNG SỐ & CẤU HÌNH ────────────────────────────────────────────────────
const VTFilms_VERSION = '7.0';

// ── DEBUG FLAG ────────────────────────────────────────────────────────────────
// true  → in log đầy đủ ra console (dùng khi development/debug)
// false → tắt log info/ok, chỉ giữ warn/error (dùng khi production)
const VTFilms_DEBUG = true;

// Admin UIDs — thêm UID vào đây để cấp quyền admin. Mọi UID khác = "user".
const VTFilms_ADMIN_UIDS = [
    'KU6FC2SAsmaE8qIu4EGU9J422On1', // admin@vutruong.vn
    // 'dNkYpISZzgdpoJ4fVQUzWAFWgVw1',
];

// ── Storage Keys ──
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
// Format: JSON { uid: string, status: 'pending'|'approved'|'rejected'|'revoked' }
// [v6.2] 'revoked' không cần persist qua đăng xuất vì không còn auto-logout

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
async function VTFilms_syncUserDoc(fbUser) {
    const uid  = fbUser.uid;
    const role = VTFilms_getRole(uid);
    const ref  = doc(VTFilms_db, 'users', uid);

    if (VTFilms_isTabActive()) {
        VTFilms_log.info('Tab guard tồn tại → skip Firestore write (reload).');
        return;
    }

    if (!VTFilms_isProfileSaved(uid)) {
        // [v6.3.1] FIX RELOAD LOOP: Kiểm tra kép — verifyStatus cache là signal tin cậy
        // rằng user đã có Firestore document, dù profileSaved flag bị mất.
        //
        // Tại sao cần fix:
        //   profileSaved flag có thể bị mất (user clear storage một phần, hoặc đăng xuất
        //   trước đó xóa flag nhưng để lại verifyStatus). Nếu không có guard này,
        //   syncUserDoc sẽ gọi setDoc → Firestore tạo OPTIMISTIC LOCAL SNAPSHOT với
        //   verifiedUser:false → unified listener nhận snapshot giả → lưu 'pending' vào cache
        //   → snapshot thật đến → thấy pending→rejected là "thay đổi" → reload → loop vô hạn.
        //
        // Fix: nếu verifyStatus cache != null → đây là user cũ → KHÔNG setDoc.
        //       Restore profileSaved flag và chỉ updateDoc lastLoginAt.
        const cachedVerifyStatus = VTFilms_getVerifyStatus(uid);
        if (cachedVerifyStatus !== null) {
            VTFilms_log.info(`syncUserDoc: verifyStatus cache='${cachedVerifyStatus}' tồn tại → user cũ, profileSaved flag bị mất → restore flag, skip setDoc.`);
            VTFilms_markProfileSaved(uid); // Khôi phục flag để tránh lặp lại lần sau
            // Fall through xuống updateDoc lastLoginAt bên dưới
        } else {
            // Thực sự là user mới — chưa có document lẫn verifyStatus cache
            const isAdmin       = role === 'admin';
            const verifiedValue = isAdmin ? true : false;
            VTFilms_log.info(`User mới (${fbUser.email}) → tạo document Firestore (verifiedUser: ${verifiedValue}, role: ${role})...`);
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


// ── 9. QUẢN LÝ DOM ───────────────────────────────────────────────────────────

/**
 * [v6.3] Xóa hoàn toàn #VT-Films-App khỏi DOM.
 *
 * BẮT BUỘC dùng remove() thay vì d-none cho mọi trạng thái không phải 'approved'.
 * Lý do bảo mật (SPA/JS): nếu chỉ ẩn bằng d-none, user có thể mở DevTools
 * → xóa class d-none → tiếp tục dùng app mà không cần reload.
 * remove() loại bỏ hoàn toàn khỏi DOM — không thể khôi phục mà không reload trang.
 *
 * Sau khi admin approve → reload() → app được tải lại sạch từ HTML gốc.
 */
function VTFilms_removeApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) return; // Đã bị remove trước đó hoặc không tồn tại
    el.remove();
    VTFilms_log.ok('#VT-Films-App đã xóa khỏi DOM (security).');
}

/** Hiện #VT-Films-App (remove class d-none) — chỉ gọi khi status = approved. */
function VTFilms_showApp() {
    const el = document.getElementById('VT-Films-App');
    if (!el) return;
    el.classList.remove('d-none');
    VTFilms_log.ok('#VT-Films-App hiển thị (d-none removed).');
}



// ── 10. OVERLAY ĐĂNG NHẬP ────────────────────────────────────────────────────
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

                <!-- Avatar user -->
                <img loading="lazy" src="${avatar}" class="rounded-circle mb-3 pe-none"
                     width="99" height="99" style="object-fit:cover"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc3545&color=fff&size=80'"
                     alt="${name}">

                <!-- Tên & email -->
                <div class="text-white opacity-75 fw-bold m-0 fs-5">${name}</div>
                <div class="text-secondary mb-4 opacity-75">${email}</div>

                <!-- ═══════════════════════════════════════════════════════════
                     [v7.0] #VTFilms-pending-status-area — vùng duy nhất thay đổi
                     khi admin cập nhật trạng thái user realtime.

                     Các thành phần NGOÀI wrapper này (avatar, tên, email user,
                     admin@vutruong.vn, nút đăng xuất) KHÔNG bị fade hay thay đổi.
                     VTFilms_overlayTransition() chỉ fade wrapper này → không còn
                     nhấp nháy toàn overlay khi trạng thái thay đổi.
                     ═══════════════════════════════════════════════════════════ -->
                <div id="VTFilms-pending-status-area">

                    <!-- Icon trạng thái: pending/rejected/revoked/approved -->
                    <div id="VTFilms-pending-icon" class="mb-3"><i class="fad fa-spinner-third fa-2x text-info fa-spin"></i></div>

                    <!-- Tiêu đề trạng thái -->
                    <div id="VTFilms-pending-title" class="fw-semibold h5 text-info mb-2">
                        Tài khoản đang chờ xác thực
                    </div>

                    <!-- Mô tả trạng thái -->
                    <p id="VTFilms-pending-msg" class="text-secondary mb-4">
                        Liên hệ admin để được cấp quyền sử dụng
                    </p>
                </div><!-- /#VTFilms-pending-status-area -->

                    <!-- Thông tin liên hệ / spinner loading -->
                    <div id="VTFilms-pending-spinner"
                         class="d-inline-flex align-items-center gap-2 text-secondary small rounded-pill px-4 py-2 mb-3"
                         style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
                        admin@vutruong.vn
                    </div>


                <!-- Nút đăng xuất -->
                <div class="mt-1">
                    <a class="btn btn-sm btn-outline-secondary rounded px-3 border-0 fw-semibold opacity-75"
                            onclick="window.VTFilms_Auth.signOut()">
                        <i class="fad fa-right-from-bracket me-1"></i>
                        Đăng xuất
                    </a>
                </div>

            </div>
        </div>`;

    document.body.appendChild(overlay);
    // Fade in ngay sau khi thêm vào DOM
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    });
    VTFilms_log.ok('Pending overlay đã chèn vào DOM (fade-in).');
}

/**
 * [v7.0] Smooth overlay content transition — chỉ fade #VTFilms-pending-status-area.
 *
 * THAY ĐỔI SO VỚI v6.2:
 *   v6.2 target: .card → toàn bộ overlay card biến mất khi transition
 *                → avatar, tên, email, nút đăng xuất đều fade theo → nhấp nháy
 *   v7.0 target: #VTFilms-pending-status-area → chỉ vùng động (icon/title/msg/spinner)
 *                → avatar, tên, email, admin@vutruong.vn, nút đăng xuất đứng yên
 *                → transition mượt, không nhấp nháy
 *
 * @param {function(overlay: HTMLElement): void} updateFn — callback cập nhật nội dung DOM
 * @param {number} [fadeDuration=220] — thời gian fade ms (khớp với cảm giác mượt)
 */
function VTFilms_overlayTransition(updateFn, fadeDuration = 220) {
    const overlay = document.getElementById('VTFilms-pending-overlay');
    if (!overlay) {
        // Overlay chưa tồn tại — trả null để caller biết và tự xử lý
        updateFn(null);
        return;
    }

    // [v7.0] Chỉ fade #VTFilms-pending-status-area (không fade .card)
    const statusArea = overlay.querySelector('#VTFilms-pending-status-area');
    if (!statusArea) {
        // Fallback an toàn: status-area chưa có (overlay cũ format) → update thẳng
        updateFn(overlay);
        return;
    }

    // Bước 1: fade OUT chỉ vùng status-area
    statusArea.style.transition = `opacity ${fadeDuration}ms ease`;
    statusArea.style.opacity    = '0';

    // Bước 2: sau khi vùng status-area mờ → cập nhật nội dung DOM
    setTimeout(() => {
        updateFn(overlay);
        // Bước 3: fade IN vùng status-area với nội dung mới
        statusArea.style.opacity = '1';
    }, fadeDuration);
}

/** Remove pending overlay (dùng khi đăng xuất hoặc transition sang approved + show app). */
function VTFilms_hidePendingOverlay() {
    const el = document.getElementById('VTFilms-pending-overlay');
    if (!el) return;
    el.style.transition = 'opacity .35s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 380);
    VTFilms_log.info('Pending overlay ẩn dần...');
}


// ── 12. TRANSITION FUNCTIONS (v6.3) ──────────────────────────────────────────
//
// Kiến trúc 2 layer — tránh vòng lặp reload:
//
//   Layer A — applyOverlayContent(state):
//     Chỉ cập nhật DOM overlay. KHÔNG remove app, KHÔNG reload.
//     Dùng bởi: antiFlash() sau khi page vừa được load/reload.
//     Gọi thẳng, không trigger side effect.
//
//   Layer B — onTransition*(state):
//     Full transition triggered bởi unified listener (admin thay đổi realtime).
//     1. Lưu status mới vào localStorage cache.
//     2. remove() app khỏi DOM (bảo mật — không dùng d-none).
//     3. Hiện overlay với nội dung tương ứng.
//     4. Sau delay ngắn → window.location.reload().
//     Sau reload, antiFlash đọc cache → gọi Layer A → hiện đúng overlay ngay.
//
// Flow sau reload: antiFlash → applyOverlayContent → startListener → startUnifiedListener
//   → snapshot đầu bị skip (initialStatus khớp cache) → tiếp tục lắng nghe.

/**
 * [v6.3] Layer A: Cập nhật nội dung overlay theo trạng thái.
 * KHÔNG remove app, KHÔNG reload — chỉ cập nhật DOM.
 * Dùng trong antiFlash (sau reload) để tránh vòng lặp.
 *
 * @param {'pending'|'rejected'|'revoked'} state
 */
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

    // Dùng VTFilms_overlayTransition để animation mượt (fadeOut card → update → fadeIn)
    VTFilms_overlayTransition((ov) => {
        if (!ov) return;
        const icon    = ov.querySelector('#VTFilms-pending-icon');
        const title   = ov.querySelector('#VTFilms-pending-title');
        const msg     = ov.querySelector('#VTFilms-pending-msg');
        const spinner = ov.querySelector('#VTFilms-pending-spinner');
        if (icon)    { icon.innerHTML = cfg.icon; }
        if (title)   { title.innerHTML = cfg.title; title.className = cfg.titleCls; }
        if (msg)     { msg.innerHTML = cfg.msg; }
        if (spinner) { spinner.innerHTML = cfg.spinner; }
    });

    VTFilms_log.info(`applyOverlayContent: state="${state}" applied.`);
}

/**
 * [v6.3] Layer B: Transition APPROVED (triggered bởi admin realtime).
 *
 * Luồng:
 *   1. Hiện overlay success (fadeIn nội dung mới).
 *   2. Sau 2.5s: overlay fade out → reload().
 *   3. Sau reload: antiFlash đọc 'approved' → giữ app → startUnifiedListener.
 *
 * Lý do reload thay vì show app trực tiếp:
 *   → Đảm bảo HTML/JS được tải sạch, không có state cũ còn sót lại.
 *   → App được load lại từ đầu với session đã xác minh.
 */
function VTFilms_onTransitionApproved() {
    VTFilms_log.ok('Transition → APPROVED: hiện overlay success → reload...');

    // Hiện overlay nếu chưa có (trường hợp user không có pending overlay)
    if (!document.getElementById('VTFilms-pending-overlay')) {
        const cache = VTFilms_getCache();
        VTFilms_showPendingOverlay(cache || {});
    }

    // Cập nhật nội dung overlay → success state
    VTFilms_overlayTransition((overlay) => {
        if (!overlay) return;
        const icon    = overlay.querySelector('#VTFilms-pending-icon');
        const title   = overlay.querySelector('#VTFilms-pending-title');
        const msg     = overlay.querySelector('#VTFilms-pending-msg');
        const spinner = overlay.querySelector('#VTFilms-pending-spinner');
        if (icon)    { icon.innerHTML = '<i class="fad fa-circle-check text-success fa-2x"></i>'; }
        if (title)   { title.textContent = 'Xác thực thành công!'; title.className = 'fw-semibold h5 text-success mb-2'; }
        if (msg)     { msg.innerHTML = 'Tài khoản của bạn đã được phê duyệt'; }
        if (spinner) { spinner.innerHTML = '<i class="fad fa-spinner-third fa-spin me-2"></i>Đang tải dữ liệu'; }
    });

    // Sau 2.5s: fade out overlay → reload (để app load sạch từ HTML gốc)
    setTimeout(() => {
        const pendingOverlay = document.getElementById('VTFilms-pending-overlay');
        if (pendingOverlay) {
            pendingOverlay.style.transition = 'opacity .4s ease';
            pendingOverlay.style.opacity    = '0';
            setTimeout(() => { window.location.reload(); }, 420);
        } else {
            window.location.reload();
        }
    }, 2500); // delay ở đây
}

/**
 * [v7.0] Layer B: Transition REJECTED hoặc REVOKED (triggered bởi admin realtime).
 *
 * THAY ĐỔI SO VỚI v6.4:
 *   v6.4: remove app → show overlay → reload(0ms)
 *         → trang reload tức thì → overlay mất → tạo lại → NHẤP NHÁY
 *   v7.0: remove app → đảm bảo overlay tồn tại → applyOverlayContent (in-place)
 *         → KHÔNG reload → overlay ở nguyên trong DOM → chỉ status-area fade
 *         → Mượt mà, tức thì, không gây cảm giác giật hay nhấp nháy
 *
 * Tại sao an toàn khi BỎ reload()?
 *   - App đã bị remove() → không thể bypass qua DevTools (bảo mật SPA giữ nguyên)
 *   - localStorage cache đã được unified listener ghi (VTFilms_saveVerifyStatus)
 *     trước khi gọi hàm này → antiFlash đọc đúng nếu user tự reload sau
 *   - Unified listener vẫn chạy liên tục → nhận trạng thái tiếp theo từ Firestore
 *
 * @param {'rejected'|'revoked'} state
 */
function VTFilms_onTransitionBlocked(state) {
    VTFilms_log.warn(`[v7.0] Transition → ${state.toUpperCase()}: remove app + update overlay in-place (no reload).`);

    // Bảo mật: xóa app ngay lập tức khỏi DOM (không dùng d-none — bảo mật SPA)
    VTFilms_removeApp();

    if (!document.getElementById('VTFilms-pending-overlay')) {
        // Overlay chưa tồn tại (ví dụ: user vừa được approved nhưng admin revoke
        // ngay trước khi trang reload xong) → tạo mới, rồi apply content
        VTFilms_showPendingOverlay(VTFilms_getCache() || {});
        // Chờ 50ms để overlay fade-in xong rồi mới update status-area
        setTimeout(() => VTFilms_applyOverlayContent(state), 50);
    } else {
        // [v7.0] Overlay đang hiện → chỉ fade vùng status-area, cập nhật nội dung
        VTFilms_applyOverlayContent(state);
    }

    // [v7.0] ĐÃ XÓA: setTimeout(reload) — không cần reload nữa
    // Cache localStorage đã được ghi bởi VTFilms_startUnifiedListener
    // trước khi gọi hàm này → đúng trạng thái nếu user tự reload sau
}

// Alias shorthand để unified listener gọi gọn
function VTFilms_onTransitionRejected() { VTFilms_onTransitionBlocked('rejected'); }
function VTFilms_onTransitionRevoked()  { VTFilms_onTransitionBlocked('revoked');  }

/**
 * [v7.0] Layer B: Transition PENDING (triggered bởi admin realtime — hiếm gặp).
 *
 * THAY ĐỔI SO VỚI v6.3:
 *   v6.3: reload() sau 1200ms
 *   v7.0: KHÔNG reload — update overlay in-place qua applyOverlayContent('pending')
 *
 * Luồng v7.0:
 *   1. remove() app (bảo mật SPA giữ nguyên).
 *   2. Nếu overlay chưa có: tạo mới (default content đã là pending — không cần apply).
 *   3. Nếu overlay đã có: applyOverlayContent('pending') để reset về pending state.
 */
function VTFilms_onTransitionPending() {
    VTFilms_log.info('[v7.0] Transition → PENDING: remove app + update overlay in-place (no reload).');
    VTFilms_removeApp();

    if (!document.getElementById('VTFilms-pending-overlay')) {
        // Tạo mới — default content của showPendingOverlay đã là pending state
        const cache = VTFilms_getCache();
        VTFilms_showPendingOverlay(cache || {});
    } else {
        // [v7.0] Overlay đã có (ví dụ: đang ở rejected/revoked) → reset về pending
        VTFilms_applyOverlayContent('pending');
    }

    // [v7.0] ĐÃ XÓA: setTimeout(reload, 1200) — không cần reload
}




// ── 13. UNIFIED REALTIME LISTENER (v6.2) ─────────────────────────────────────
// Thay thế hoàn toàn startVerifyListener + startRevokeListener của v6.1.
//
// 1 onSnapshot duy nhất cho mọi trạng thái.
// Giữ kết nối liên tục — KHÔNG tự hủy sau khi nhận trạng thái.
// Chỉ trigger UI transition khi status THỰC SỰ THAY ĐỔI (tránh redundant transition).
//
// Fix bug: approve → revoke → approve lại:
//   v6.1: revoke → handleRevocation → unsubscribe listener → auto signout → listener mất
//   v6.2: revoke → onTransitionRevoked (không signout, không unsubscribe)
//         → listener tiếp tục → approve lại → onTransitionApproved → show app ✓

/** Hàm unsubscribe duy nhất cho unified listener. */
let VTFilms_verifyUnsubscribe = null;

/**
 * Bắt đầu unified realtime listener.
 * Chạy 1 onSnapshot liên tục trên users/{uid}.
 * Chỉ trigger transition UI khi verifiedUser THAY ĐỔI so với status trước.
 *
 * @param {import('firebase/auth').User} fbUser
 * @param {string} initialStatus — status hiện tại từ cache ('pending'|'approved'|'rejected'|'revoked'|null)
 *        Nếu truyền vào, snapshot đầu tiên sẽ bị bỏ qua (antiFlash + startListener đã xử lý UI).
 */
function VTFilms_startUnifiedListener(fbUser, initialStatus) {
    // Dọn dẹp listener cũ nếu có
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
    }

    VTFilms_log.info(`Unified listener START uid: ${fbUser.uid}, initialStatus: ${initialStatus}`);

    const ref = doc(VTFilms_db, 'users', fbUser.uid);

    // [v6.3.1] FIX RELOAD LOOP: Bỏ _initialized flag, dùng pure compare logic.
    //
    // Cơ chế hoạt động:
    //   _lastStatus = initialStatus (từ localStorage cache — source of truth khi khởi động)
    //
    //   Mỗi snapshot đến:
    //     a) newStatus === _lastStatus → skip (no transition, chỉ refresh cache).
    //        → Xử lý init case (snapshot đầu giống initialStatus) ✓
    //        → Xử lý no-change case ✓
    //     b) newStatus !== _lastStatus → status thực sự thay đổi → trigger transition.
    //        → Admin đổi trong lúc online ✓
    //        → Admin đổi trong lúc offline (snapshot đầu khác initialStatus) ✓
    //
    // Tại sao an toàn hơn _initialized:
    //   v6.3 dùng _initialized để skip snapshot đầu vô điều kiện, nhưng nếu
    //   có optimistic snapshot giả (do setDoc lỗi), _lastStatus bị set sai giá trị
    //   → snapshot thật trông như "thay đổi" → reload vô hạn.
    //
    //   v6.3.1: _lastStatus = initialStatus (từ cache, không bị optimistic write ảnh hưởng).
    //   Khi snapshot đầu đến với cùng value → skip. Optimistic snapshot (nếu còn) cũng
    //   bị lọc nếu nó trùng với initialStatus, hoặc nếu khác → server sẽ revert → snapshot
    //   tiếp theo trùng initialStatus → skip. Không còn reload giả.
    let _lastStatus = initialStatus || null;

    VTFilms_verifyUnsubscribe = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
            // [v6.5] Document không tồn tại — có 2 trường hợp:
            //   1. Lần đầu listener khởi động, syncUserDoc chưa kịp tạo doc → bỏ qua (hiếm)
            //   2. Admin đã XÓA document → force signOut user ngay lập tức
            //
            // Phân biệt 2 trường hợp bằng _lastStatus:
            //   null    → user vừa login, doc chưa tồn tại → bỏ qua (sẽ được tạo bởi syncUserDoc)
            //   có giá  → user đang dùng app, doc bị xóa → admin đã xóa → force signOut
            if (_lastStatus === null) {
                VTFilms_log.warn(`Unified listener: users/${fbUser.uid} chưa tồn tại (init) → chờ syncUserDoc tạo.`);
                return;
            }
            VTFilms_log.warn(`Unified listener: users/${fbUser.uid} bị XÓA bởi admin → force signOut...`);
            // Xóa toàn bộ localStorage trước để antiFlash không giữ UI cũ
            VTFilms_clearCache();
            VTFilms_clearProfileFlag();
            VTFilms_clearVerifyStatus();
            VTFilms_clearTabGuard();
            // Dừng listener ngay (document không còn → tiếp tục lắng nghe sẽ báo lỗi permission)
            if (VTFilms_verifyUnsubscribe) {
                VTFilms_verifyUnsubscribe();
                VTFilms_verifyUnsubscribe = null;
            }
            // Force signOut Firebase Auth → onAuthStateChanged sẽ dọn dẹp phần còn lại
            VTFilms_fbSignOut(VTFilms_auth).then(() => {
                VTFilms_log.ok('Force signOut sau khi document bị xóa → reload...');
                window.location.href = window.location.pathname;
            }).catch(err => {
                VTFilms_log.error('Force signOut thất bại:', err.message);
                // Fallback: reload cứng để đảm bảo user bị đăng xuất
                window.location.reload();
            });
            return;
        }

        const v = snap.data().verifiedUser;
        // Normalize verifiedUser field → status string
        let newStatus;
        if      (v === true)        newStatus = 'approved';
        else if (v === false)       newStatus = 'pending';
        else if (v === 'rejected')  newStatus = 'rejected';
        else if (v === 'revoked')   newStatus = 'revoked';
        else                        newStatus = 'pending'; // fallback an toàn

        VTFilms_log.info(`Unified listener snapshot: verifiedUser=${JSON.stringify(v)} → newStatus=${newStatus}, lastStatus=${_lastStatus}`);

        // Không thay đổi → refresh cache silently, không trigger transition
        if (newStatus === _lastStatus) {
            VTFilms_saveVerifyStatus(fbUser.uid, newStatus); // Giữ cache tươi
            VTFilms_log.info(`Unified listener: status không đổi (${newStatus}) → skip transition.`);
            return;
        }

        // Status THAY ĐỔI (admin vừa cập nhật) → lưu cache + trigger transition UI
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

/** Dừng unified listener (gọi khi đăng xuất). */
function VTFilms_stopVerifyListener() {
    if (VTFilms_verifyUnsubscribe) {
        VTFilms_verifyUnsubscribe();
        VTFilms_verifyUnsubscribe = null;
        VTFilms_log.info('Unified listener đã dừng.');
    }
}



// ── 14. ADMIN PANEL: QUẢN LÝ USER (v6.2) ─────────────────────────────────────
// 3 tabs Bootstrap: Chờ duyệt / Đã duyệt / Từ chối.
// [v6.2] FIX: Tab click không còn đóng dropdown.
//   → renderAdminPanel() lần đầu: full HTML (tạo dropdown trigger + menu).
//   → renderAdminPanel() các lần sau: chỉ cập nhật badge, tabs, list → dropdown giữ nguyên state.
//   → switchTab(): gọi renderAdminTabContent() thay vì renderAdminPanel() full.

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

/**
 * Lấy/tạo container cho admin panel.
 * [v6.2] Thêm class 'dropdown' để Bootstrap dropdown định vị đúng.
 */
function VTFilms_getAdminContainer() {
    let container = document.getElementById('vt-admin-info');
    if (container) return container;

    container = document.createElement('div');
    container.id        = 'vt-admin-info';
    // [v6.2] Thêm 'dropdown' để Bootstrap quản lý positioning
    container.className = 'me-1 dropdown';

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
 * [v6.2] Chuyển tab admin panel.
 * Chỉ cập nhật nội dung tab (không rebuild toàn bộ dropdown) → dropdown giữ nguyên state.
 */
function VTFilms_adminSwitchTab(tab) {
    VTFilms_adminActiveTab = tab;
    VTFilms_log.info(`Admin panel chuyển tab: ${tab}`);
    VTFilms_renderAdminTabContent(); // [v6.2] Partial update thay vì full render
}

/** Helper tạo HTML cho 1 user item trong danh sách admin. */
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
            <li>
                <div class="dropdown-item-text text-light m-0 p-3">
                    <div class="d-flex align-items-start gap-2 mb-3">
                        <img src="${avatar}" class="rounded-circle flex-shrink-0"
                             width="45" height="45" style="object-fit:cover"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=45'"
                             alt="${name}">
                        <div class="overflow-hidden flex-grow-1">
                            <div class="fw-semibold text-truncate d-flex align-items-center gap-1">
                                ${name}${statusBadge}
                            </div>
                            <div class="text-truncate opacity-75 small">${email}</div>
                        </div>
                        <div class="flex-shrink-0 small opacity-50">${ts}</div>
                    </div>
                    ${actionHTML}
                </div>
            </li>`;
    }

    return `
        <li>
            <div class="dropdown-item-text text-light m-0 p-3">
                <div class="d-flex align-items-start gap-2 mb-3">
                    <img src="${avatar}" class="rounded-circle flex-shrink-0"
                         width="45" height="45" style="object-fit:cover"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c757d&color=fff&size=45'"
                         alt="${name}">
                    <div class="overflow-hidden flex-grow-1">
                        <div class="fw-semibold text-truncate">${name}</div>
                        <div class="text-truncate opacity-75 small">${email}</div>
                    </div>
                    <div class="flex-shrink-0 small opacity-50">${ts}</div>
                </div>
                ${actionHTML}
            </div>
        </li>`;
}

/** Helper tính HTML badge, tabs, list cho tab hiện tại. */
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
                <i class="fad fa-chevron-down me-1"></i>
                Tải thêm (còn ${users.length - visible} user)
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
                <span class="badge ${t.count > 0 ? t.badge : 'bg-secondary'} ms-1"
                      style="font-size:9px">${t.count}</span>
            </a>
        </li>`
    ).join('');

    return { badgeInner, tabsInner, listHTML: itemsHTML + loadMoreHTML, shown, users };
}

/**
 * [v6.2] Full render admin panel — chỉ gọi 1 lần đầu tiên khi panel chưa tồn tại.
 * Sau đó dùng renderAdminTabContent() để partial update.
 */
function VTFilms_renderAdminPanel() {
    const container = VTFilms_getAdminContainer();
    const { badgeInner, tabsInner, listHTML, shown, users } = VTFilms_computePanelParts();

    // [v6.2] Kiểm tra xem dropdown trigger đã tồn tại chưa
    const alreadyRendered = !!container.querySelector('[data-bs-toggle="dropdown"]');

    if (alreadyRendered) {
        // Partial update: chỉ cập nhật badge + tabs + list — GIỮ NGUYÊN dropdown trigger và menu structure
        const badgeWrap = container.querySelector('#vtfilms-admin-badge');
        if (badgeWrap) badgeWrap.innerHTML = badgeInner;

        const tabsUl = container.querySelector('#vtfilms-admin-tabs');
        if (tabsUl) tabsUl.innerHTML = tabsInner;

        const listUl = container.querySelector('#vtfilms-admin-list');
        if (listUl) listUl.innerHTML = listHTML;

        VTFilms_log.info(`Admin panel partial update: tab=${VTFilms_adminActiveTab}, ${Math.min(shown.length, users.length)}/${users.length}.`);
        return;
    }

    // Full render: tạo lần đầu
    container.innerHTML = `
        <a class="nav-link position-relative admin-bell-icon border-0 shadow-none"
           data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside" role="button">
            <i class="fad fa-bell"></i>
            <span id="vtfilms-admin-badge">${badgeInner}</span>
        </a>
        <div class="dropdown-menu dropdown-menu-end history-dropdown p-0 m-0 shadow-lg rounded-3 slideIn animate"
             style="min-width:420px;max-width:500px;max-height:80vh;overflow-y:auto">

            <!-- Header + Tabs -->
            <div class="px-3 pt-3 pb-0">
                <div class="fw-bold dropdown-item-text text-light p-0 text-uppercase small mb-2">
                    Quản lý người dùng
                </div>
                <ul class="nav nav-pills gap-1 mb-0" id="vtfilms-admin-tabs">
                    ${tabsInner}
                </ul>
            </div>

            <hr class="my-2 opacity-10">

            <!-- Danh sách theo tab -->
            <ul class="list-unstyled mb-0" id="vtfilms-admin-list">
                ${listHTML}
            </ul>

        </div>`;

    VTFilms_log.ok(`Admin panel full render: tab=${VTFilms_adminActiveTab}, ${Math.min(shown.length, users.length)}/${users.length}.`);
}

/**
 * [v6.2] Partial update — chỉ cập nhật tabs active state + list content.
 * Gọi khi switch tab để giữ nguyên dropdown state (không đóng dropdown).
 */
function VTFilms_renderAdminTabContent() {
    const container = VTFilms_getAdminContainer();
    const tabsUl = container.querySelector('#vtfilms-admin-tabs');
    const listUl = container.querySelector('#vtfilms-admin-list');

    if (!tabsUl || !listUl) {
        // Panel chưa render lần đầu → full render
        VTFilms_renderAdminPanel();
        return;
    }

    const { badgeInner, tabsInner, listHTML, shown, users } = VTFilms_computePanelParts();

    const badgeWrap = container.querySelector('#vtfilms-admin-badge');
    if (badgeWrap) badgeWrap.innerHTML = badgeInner;

    tabsUl.innerHTML = tabsInner;
    listUl.innerHTML = listHTML;

    VTFilms_log.info(`Admin panel tab switch: ${VTFilms_adminActiveTab}, ${Math.min(shown.length, users.length)}/${users.length}.`);
}


// ── ACTION FUNCTIONS ──────────────────────────────────────────────────────────

async function VTFilms_adminApprove(uid, btn) {
    VTFilms_log.info(`Admin approve uid: ${uid}...`);
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: true });
        VTFilms_log.ok(`Approve OK: users/${uid} → verifiedUser: true`);
    } catch (err) {
        VTFilms_log.error(`Approve ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-check me-2"></i>Duyệt'; }
    }
}

async function VTFilms_adminReject(uid, btn) {
    VTFilms_log.info(`Admin reject uid: ${uid}...`);
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: 'rejected' });
        VTFilms_log.ok(`Reject OK: users/${uid} → verifiedUser: "rejected"`);
    } catch (err) {
        VTFilms_log.error(`Reject ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-xmark me-2"></i>Biến'; }
    }
}

async function VTFilms_adminRevoke(uid, btn) {
    VTFilms_log.info(`Admin revoke uid: ${uid}...`);
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: 'revoked' });
        VTFilms_log.ok(`Revoke OK: users/${uid} → verifiedUser: "revoked"`);
    } catch (err) {
        VTFilms_log.error(`Revoke ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-lock-keyhole me-2"></i>Thu hồi'; }
    }
}

async function VTFilms_adminReapprove(uid, btn) {
    VTFilms_log.info(`Admin reapprove uid: ${uid}...`);
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
    try {
        await updateDoc(doc(VTFilms_db, 'users', uid), { verifiedUser: true });
        VTFilms_log.ok(`Reapprove OK: users/${uid} → verifiedUser: true`);
    } catch (err) {
        VTFilms_log.error(`Reapprove ${uid} thất bại:`, err.message);
        if (btn) { btn.removeAttribute('disabled'); btn.innerHTML = '<i class="fad fa-rotate-left me-2"></i>Phê duyệt lại'; }
    }
}

/**
 * VTFilms_showDeleteConfirmModal(uid, name, email, btn)
 * [v6.5] Bootstrap Modal xác nhận xóa user — thay thế window.confirm().
 *
 * Tại sao inject vào document.body thay vì nằm trong dropdown:
 *   - Dropdown có overflow:hidden + z-index thấp → modal bị cắt hoặc bị che
 *   - Body-level modal đảm bảo hiển thị đúng ở mọi ngữ cảnh
 *
 * Auto-cleanup: xóa DOM node sau khi modal đóng (không để rác).
 *
 * @param {string}      uid   - Firebase UID cần xóa
 * @param {string}      name  - Tên hiển thị (hiển thị trong modal)
 * @param {string}      email - Email (hiển thị trong modal)
 * @param {HTMLElement} btn   - Nút icon thùng rác (restore nếu huỷ)
 */
function VTFilms_showDeleteConfirmModal(uid, name, email, btn) {
    // Xóa modal cũ nếu còn sót (tránh trùng id)
    const existing = document.getElementById('vtfilms-delete-modal');
    if (existing) existing.remove();

    // Tạo và inject modal vào body
    const modalEl = document.createElement('div');
    modalEl.id        = 'vtfilms-delete-modal';
    modalEl.className = 'modal fade';
    modalEl.setAttribute('tabindex', '-1');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.setAttribute('data-bs-backdrop', 'static'); // Không đóng khi click ngoài
    modalEl.setAttribute('data-bs-keyboard', 'false');  // Không đóng khi nhấn Esc
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
                            class="btn btn-sm btn-outline-secondary border-0 rounded px-4">
                        Hủy bỏ
                    </button>
                    <button type="button" id="vtf-del-confirm"
                            class="btn btn-sm btn-danger rounded px-4 d-flex align-items-center gap-2">
                        <i class="fad fa-trash-can me-2"></i>Xóa
                    </button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(modalEl);
    const bsModal = new bootstrap.Modal(modalEl);

    // Nút Hủy
    modalEl.querySelector('#vtf-del-cancel').onclick = () => bsModal.hide();

    // Nút Xác nhận → thực hiện xóa
    modalEl.querySelector('#vtf-del-confirm').onclick = async () => {
        const confirmBtn = modalEl.querySelector('#vtf-del-confirm');
        const cancelBtn  = modalEl.querySelector('#vtf-del-cancel');
        confirmBtn.setAttribute('disabled', '');
        cancelBtn.setAttribute('disabled', '');
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xóa...';

        await VTFilms_adminDeleteUser(uid, email, btn);
        bsModal.hide();
    };

    // Cleanup DOM sau khi modal đóng hoàn toàn
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());

    bsModal.show();
}

/**
 * VTFilms_adminDeleteUser(uid, email, btn) — Thực hiện xóa Firestore document.
 * [v6.5] Tách khỏi UI confirm. Được gọi bởi VTFilms_showDeleteConfirmModal.
 *
 * Luồng sau khi xóa thành công:
 *   1. Document users/{uid} bị xóa khỏi Firestore
 *   2. Unified listener phía user nhận !snap.exists() với _lastStatus != null
 *      → Nhận diện "admin đã xóa" → xóa localStorage → fbSignOut → reload
 *      → User bị đăng xuất ngay lập tức (xem VTFilms_startUnifiedListener)
 *   3. Admin panel tự cập nhật qua onSnapshot (document biến mất khỏi query)
 *
 * Lưu ý:
 *   - Chỉ xóa Firestore document, không xóa Firebase Auth account
 *   - User đăng nhập lại → syncUserDoc tạo doc mới → verifiedUser: false → pending
 *   - Firestore Rules v6.5: admin được delete users (trừ chính mình)
 *
 * @param {string}      uid   - Firebase UID cần xóa
 * @param {string}      email - Email (chỉ để log)
 * @param {HTMLElement} btn   - Nút icon thùng rác (restore nếu lỗi)
 */
async function VTFilms_adminDeleteUser(uid, email, btn) {
    VTFilms_log.warn(`Admin xóa user: uid=${uid} (${email})...`);
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }

    try {
        await deleteDoc(doc(VTFilms_db, 'users', uid));
        VTFilms_log.ok(`Delete OK: users/${uid} (${email}) đã xóa khỏi Firestore.`);
        // Panel tự cập nhật qua onSnapshot — không cần gọi render thêm

    } catch (err) {
        VTFilms_log.error(`Delete ${uid} thất bại:`, err.message);
        if (btn) {
            btn.removeAttribute('disabled');
            btn.innerHTML = '<i class="fad fa-trash-can"></i>';
        }
    }
}

function VTFilms_adminLoadMore(tab) {
    if (tab === 'pending')  VTFilms_pendingVisible  += 5;
    if (tab === 'approved') VTFilms_approvedVisible += 5;
    if (tab === 'rejected') VTFilms_rejectedVisible += 5;
    VTFilms_log.info(`Admin load more tab "${tab}".`);
    VTFilms_renderAdminPanel();
}

/**
 * Khởi động admin panel: 3 onSnapshot queries realtime.
 * [v6.2] Mỗi lần data thay đổi → renderAdminPanel() (partial update nếu đã render).
 */
function VTFilms_startAdminPanel() {
    if (VTFilms_adminPendingUnsub)   { VTFilms_adminPendingUnsub();   VTFilms_adminPendingUnsub   = null; }
    if (VTFilms_adminApprovedUnsub)  { VTFilms_adminApprovedUnsub();  VTFilms_adminApprovedUnsub  = null; }
    if (VTFilms_adminRejectedUnsub)  { VTFilms_adminRejectedUnsub();  VTFilms_adminRejectedUnsub  = null; }

    VTFilms_log.info('Khởi động admin panel (3 onSnapshot queries)...');

    const qPending = query(
        collection(VTFilms_db, 'users'),
        where('verifiedUser', '==', false),
        orderBy('createdAt', 'desc')
    );
    VTFilms_adminPendingUnsub = onSnapshot(qPending, (snap) => {
        VTFilms_pendingUsers   = snap.docs.map(d => d.data());
        VTFilms_pendingVisible = 5;
        VTFilms_log.info(`Admin panel [pending] cập nhật: ${VTFilms_pendingUsers.length} user.`);
        VTFilms_renderAdminPanel();
    }, err => VTFilms_log.error('Admin pending onSnapshot lỗi:', err.message));

    const qApproved = query(
        collection(VTFilms_db, 'users'),
        where('verifiedUser', '==', true),
        orderBy('lastLoginAt', 'desc')
    );
    VTFilms_adminApprovedUnsub = onSnapshot(qApproved, (snap) => {
        VTFilms_approvedUsers   = snap.docs.map(d => d.data()).filter(u => u.role !== 'admin');
        VTFilms_approvedVisible = 5;
        VTFilms_log.info(`Admin panel [approved] cập nhật: ${VTFilms_approvedUsers.length} user.`);
        VTFilms_renderAdminPanel();
    }, err => VTFilms_log.error('Admin approved onSnapshot lỗi:', err.message));

    const qRejected = query(
        collection(VTFilms_db, 'users'),
        where('verifiedUser', 'in', ['rejected', 'revoked']),
        orderBy('lastLoginAt', 'desc')
    );
    VTFilms_adminRejectedUnsub = onSnapshot(qRejected, (snap) => {
        VTFilms_rejectedUsers   = snap.docs.map(d => d.data());
        VTFilms_rejectedVisible = 5;
        VTFilms_log.info(`Admin panel [rejected/revoked] cập nhật: ${VTFilms_rejectedUsers.length} user.`);
        VTFilms_renderAdminPanel();
    }, err => VTFilms_log.error('Admin rejected onSnapshot lỗi:', err.message));
}

function VTFilms_stopAdminPanel() {
    if (VTFilms_adminPendingUnsub)  { VTFilms_adminPendingUnsub();  VTFilms_adminPendingUnsub  = null; }
    if (VTFilms_adminApprovedUnsub) { VTFilms_adminApprovedUnsub(); VTFilms_adminApprovedUnsub = null; }
    if (VTFilms_adminRejectedUnsub) { VTFilms_adminRejectedUnsub(); VTFilms_adminRejectedUnsub = null; }
    VTFilms_log.info('Admin panel: tất cả 3 listeners đã dừng.');
}


// ── 15. GOOGLE IDENTITY SERVICES (GSI) ───────────────────────────────────────
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
    // google.accounts.id.prompt((n) => {
    //     if      (n.isNotDisplayed())  VTFilms_log.warn('One Tap không hiển thị:', n.getNotDisplayedReason());
    //     else if (n.isSkippedMoment()) VTFilms_log.warn('One Tap bị bỏ qua:', n.getSkippedReason());
    //     else                          VTFilms_log.ok('One Tap góc màn hình hiển thị.');
    // });
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


// ── 16. ĐĂNG XUẤT ────────────────────────────────────────────────────────────
// [v6.2] Luôn xóa verifyStatus (không cần giữ 'revoked' vì không còn auto-logout)

async function VTFilms_signOut() {
    VTFilms_log.info('Bắt đầu đăng xuất...');
    try {
        window.google?.accounts?.id?.disableAutoSelect();
        VTFilms_stopVerifyListener();
        VTFilms_stopAdminPanel();
        VTFilms_clearCache();
        VTFilms_clearProfileFlag();
        VTFilms_clearVerifyStatus(); // [v6.2] Luôn xóa — không cần giữ 'revoked'
        VTFilms_clearTabGuard();
        VTFilms_hidePendingOverlay();
        // [v6.3] Xóa app khỏi DOM trước khi signOut (bảo mật)
        const _appEl = document.getElementById('VT-Films-App');
        if (_appEl) _appEl.remove();
        await VTFilms_fbSignOut(VTFilms_auth);
        VTFilms_log.ok('Đăng xuất thành công → redirect trang chủ...');
        window.location.href = window.location.pathname;
    } catch (err) {
        VTFilms_log.error('Đăng xuất thất bại:', err.message);
    }
}


// ── 17. QUẢN LÝ USER OBJECT ───────────────────────────────────────────────────
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


// ── 18. ANTI-FLASH (v6.3) ────────────────────────────────────────────────────
// Chạy đồng bộ ngay khi module load — trước khi Firebase phản hồi.
// Đọc localStorage cache để hiện đúng UI ngay lập tức (không flash).
//
// [v6.3] THAY ĐỔI QUAN TRỌNG:
//   Tất cả trạng thái không phải 'approved' → remove() app khỏi DOM (KHÔNG d-none).
//   Lý do: SPA/JS app — user có thể xóa class d-none bằng DevTools để bypass.
//   remove() đảm bảo app KHÔNG thể khôi phục mà không reload trang.
//
//   Dùng Layer A (applyOverlayContent) — KHÔNG gọi onTransition* (Layer B).
//   Layer B có reload() → sẽ gây vòng lặp reload vô hạn nếu gọi trong antiFlash.
//
//  Không có cache              → remove app + show login overlay
//  Cache có, role admin        → giữ app (admin bypass xác minh)
//  verifyStatus 'approved'     → giữ app bình thường (startUnifiedListener sau)
//  verifyStatus 'pending'/null → remove app + show pending overlay (default content)
//  verifyStatus 'rejected'     → remove app + show overlay + applyOverlayContent('rejected')
//  verifyStatus 'revoked'      → remove app + show overlay + applyOverlayContent('revoked')

function VTFilms_antiFlash() {
    const cache = VTFilms_getCache();

    // Không có cache → chưa login
    if (!cache) {
        VTFilms_log.info('Anti-flash: không có cache → remove app, login overlay...');
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
        // Đã approved → giữ app hiển thị bình thường
        VTFilms_log.info('Anti-flash: approved → giữ UI, chờ Firebase...');
        return;
    }

    // Mọi trạng thái khác: remove app ngay (bảo mật SPA)
    const appEl = document.getElementById('VT-Films-App');
    if (appEl) {
        appEl.remove();
        VTFilms_log.info('Anti-flash: app removed (security — non-approved state).');
    }

    // Hiện pending overlay (content mặc định = pending)
    VTFilms_showPendingOverlay(cache);

    // Cập nhật content nếu cần — dùng Layer A (không reload)
    if (verifyStatus === 'rejected') {
        VTFilms_log.warn('Anti-flash: rejected → applyOverlayContent(rejected)...');
        setTimeout(() => VTFilms_applyOverlayContent('rejected'), 50);
    } else if (verifyStatus === 'revoked') {
        VTFilms_log.warn('Anti-flash: revoked → applyOverlayContent(revoked)...');
        setTimeout(() => VTFilms_applyOverlayContent('revoked'), 50);
    }
    // 'pending' hoặc null → content mặc định của VTFilms_showPendingOverlay đã đúng
}


// ── 19. AUTH STATE LISTENER ───────────────────────────────────────────────────
// [v6.2] Dùng VTFilms_startUnifiedListener cho tất cả user.
//        Truyền initialStatus để listener không trigger transition ở snapshot đầu.
//        Không còn startVerifyListener / startRevokeListener riêng biệt.

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

            // ── Admin: bypass toàn bộ verification ──
            if (user.role === 'admin') {
                VTFilms_log.ok('Admin đăng nhập → bypass xác minh, show app trực tiếp.');
                if (!document.getElementById('VT-Films-App')) {
                    window.location.reload();
                } else {
                    VTFilms_showApp();
                    VTFilms_renderDropdown(user);
                    VTFilms_startAdminPanel();
                }
                return;
            }

            // ── User thường: kiểm tra verification ──
            const verifyStatus = VTFilms_getVerifyStatus(fbUser.uid);
            VTFilms_log.info(`Verify status từ cache: ${verifyStatus}`);

            if (verifyStatus === 'approved') {
                // Đã được duyệt → show app + bắt đầu unified listener (initialStatus='approved')
                VTFilms_log.ok('User đã approved (cache) → show app + unified listener.');
                VTFilms_hidePendingOverlay();
                const appEl = document.getElementById('VT-Films-App');
                if (!appEl) {
                    window.location.reload();
                } else {
                    VTFilms_showApp();
                    VTFilms_renderDropdown(user);
                    // [v6.2] Unified listener — sẽ chỉ trigger khi status thay đổi
                    VTFilms_startUnifiedListener(fbUser, 'approved');
                }

            } else if (verifyStatus === 'rejected') {
                VTFilms_log.warn('User rejected (cache) → đảm bảo rejection overlay hiện.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    // [v6.3] antiFlash đã xử lý, đây là fallback (nếu antiFlash miss)
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                    // Dùng Layer A — KHÔNG gọi onTransitionRejected (Layer B) vì có reload()
                    setTimeout(() => VTFilms_applyOverlayContent('rejected'), 50);
                }
                // Unified listener — lắng nghe để nhận khi admin phê duyệt lại
                VTFilms_startUnifiedListener(fbUser, 'rejected');

            } else if (verifyStatus === 'revoked') {
                VTFilms_log.warn('User revoked (cache) → đảm bảo revoked overlay hiện.');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                    // Dùng Layer A — KHÔNG gọi onTransitionRevoked (Layer B) vì có reload()
                    setTimeout(() => VTFilms_applyOverlayContent('revoked'), 50);
                }
                // Unified listener — lắng nghe để nhận khi admin phê duyệt lại
                VTFilms_startUnifiedListener(fbUser, 'revoked');

            } else {
                // 'pending' hoặc null
                VTFilms_log.info('User chưa/đang chờ xác minh → pending overlay + unified listener...');
                if (!document.getElementById('VTFilms-pending-overlay')) {
                    // [v6.3] remove() thay vì hideApp() — bảo mật SPA
                    VTFilms_removeApp();
                    VTFilms_showPendingOverlay(user);
                }
                // Unified listener — initialStatus='pending'
                VTFilms_startUnifiedListener(fbUser, verifyStatus || 'pending');
            }

        } else {
            // ── Chưa / vừa đăng xuất ──
            VTFilms_log.info('Firebase: chưa đăng nhập → dọn dẹp toàn bộ...');
            VTFilms_setUser(null);
            VTFilms_stopVerifyListener();
            VTFilms_stopAdminPanel();
            VTFilms_clearProfileFlag();
            VTFilms_clearTabGuard();
            // [v6.2] Luôn xóa verifyStatus khi logout (không cần giữ 'revoked')
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


// ── 20. EXPORT GLOBAL API ─────────────────────────────────────────────────────
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
    _openPopup:       VTFilms_openPopup,
    // ── Admin actions ──
    _adminApprove:    VTFilms_adminApprove,
    _adminReject:     VTFilms_adminReject,
    _adminRevoke:      VTFilms_adminRevoke,
    _adminReapprove:   VTFilms_adminReapprove,
    _adminDeleteUser:       VTFilms_adminDeleteUser,       // Hàm xóa thực (gọi từ modal)
    _showDeleteConfirmModal: VTFilms_showDeleteConfirmModal, // Hiển thị modal xác nhận
    _adminSwitchTab:  VTFilms_adminSwitchTab,
    _adminLoadMore:   VTFilms_adminLoadMore,
    version:          VTFilms_VERSION,
};


// ── 21. KHỞI CHẠY ─────────────────────────────────────────────────────────────
VTFilms_log.info(`===== vtfilms-module.js v${VTFilms_VERSION} khởi chạy =====`);
VTFilms_antiFlash();      // Bước 1: Anti-flash UI (đọc cache, hiện đúng overlay ngay)
VTFilms_startListener();  // Bước 2: Firebase onAuthStateChanged
VTFilms_log.info('Module khởi động xong, chờ Firebase phản hồi...');
