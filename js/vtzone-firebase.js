// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG FIREBASE TỔNG HỢP
 * Gộp từ: VT-Zone-firebase-5_0_1.js + VT-Zone-comments-5_0_2.js
 * Tính năng: Auth, Like, View History, Session Cache, Admin Tools,
 *            Bình luận Realtime (Đăng/Trả lời/Xóa/Chỉnh sửa/Bật-Tắt/Đếm)
 * Phiên bản: 5.6.0
 * Cập nhật: 24/2/2026
 * Thay đổi (5.3.0):
 *   - Thêm nút "Hạn chế người dùng" (Admin) vào dropdown ellipsis, toggle "Gỡ hạn chế"
 *   - Modal chọn lý do: Spam / Quảng cáo / Đồi trụy / Xúc phạm / Khác (tự nhập)
 *   - Lưu chi tiết vào Firestore: banned, bannedAt, banReasonType, banReason, bannedBy
 *   - Gom Chỉnh sửa + Xóa + Hạn chế vào dropdown Bootstrap 5 (icon fa-ellipsis-stroke)
 *   - Modal thông báo bị hạn chế, hiện ngay khi tải trang nếu đã bị hạn chế
 * Thay đổi (5.4.0):
 *   - Đồng bộ toggle text "Hạn chế/Gỡ hạn chế": lazy-fetch Firestore, cache per session
 *   - Thay tất cả alert() → modal Bootstrap 5 (_showSimpleModal)
 *   - Thay confirm() → modal Bootstrap 5 xác nhận (_showConfirmModal)
 *   - Modal thông báo bị hạn chế (VTBanNoticeModal): lý do, liên hệ, checkbox tắt lần sau
 *   - Toast thành công cho admin sau mỗi lệnh hạn chế/gỡ hạn chế (_showAdminToast)
 *   - Guard: không cho admin hạn chế admin khác, không cho tự hạn chế mình
 * Thay đổi (5.4.1) - BUGFIX:
 *   - [ROOT CAUSE FIX] Loại bỏ biến closure _banContext, thay bằng data-* attributes trên modal
 *     → Triệt tiêu lỗi "_banContext.uid is null" khi VT_InitCommentSystem bị gọi nhiều lần
 *     → Đọc uid/userName từ DOM (modalEl.dataset) trong confirmBtn.onclick - không phụ thuộc scope
 *   - Lưu reference nút hạn chế trực tiếp trên modalEl._vtBtnRef (không serialize qua dataset)
 * Thay đổi (5.5.0):
 *   - Đổi toàn bộ text "cấm/bỏ cấm" → "hạn chế/gỡ hạn chế" xuyên suốt UI
 *   - Đăng nhập (popup + One Tap): reload trang ngay, bỏ delay 500ms
 *   - User bị hạn chế → xóa khỏi DOM: input area, reply box, nút Trả lời,
 *     mục Chỉnh sửa và Xóa trong dropdown → chỉ có thể xem, không thể tương tác
 *   - Toast gỡ hạn chế: "Tài khoản của bạn đã được gỡ bỏ hạn chế." trước khi reload
 *   - Class is-banned-user: tự động thêm/xóa trên thẻ div username (is-admin-name /
 *     is-not-admin-name) của user bị hạn chế → tùy biến CSS dễ dàng
 *   - data-author-uid trên mỗi .VT-comment-item → xác định owner để toggle class
 *   - _updateBannedUserClass(uid, isBanned) cập nhật realtime không cần re-render
 * Thay đổi (5.6.0):
 *   - Gỡ hạn chế: thay toast → modal-md Bootstrap 5 (VTUnbanNoticeModal)
 *     → Không tự reload, chỉ reload khi user bấm "Đóng" (đảm bảo user đọc thông báo)
 *   - Logic banned user: không xóa DOM, chỉ vô hiệu hóa input + đổi placeholder +
 *     ẩn nút "Trả lời", "Chỉnh sửa", "Xóa" khỏi giao diện (style display:none)
 *   - Icon hạn chế: thêm <i class="fa-solid fa-ban text-danger"> sau tên user bị hạn chế
 *     trong cả createHtml (render mới) và _updateBannedUserClass (toggle realtime)
 *   - Khi banned user tương tác (click like, focus input...): luôn hiện modal hạn chế
 *     dù đã tick "Không hiển thị lại" (force=true bypass suppress key)
 *   - window._vtLastBanData: lưu banData mới nhất để force-modal dùng khi cần
 *   - VT_SyncUserUI: tôn trọng trạng thái banned (không re-enable input khi bị hạn chế)
 *   - Tối ưu module: loại bỏ dead code, đồng bộ guard force-show xuyên suốt
 */
// =========================================================================================

// =====================
// IMPORT FIREBASE v10
// Gộp toàn bộ import từ 2 files - loại bỏ trùng lặp
// =====================
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, onSnapshot, serverTimestamp, getDocs,
    writeBatch, increment
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// =====================
// CẤU HÌNH & KHỞI TẠO FIREBASE
// Chỉ khai báo 1 lần duy nhất - tránh trùng lặp giữa 2 files cũ
// =====================
const firebaseConfig = {
    apiKey:            "AIzaSyD0t0UgJlOjZEdhbmznGN5hRKCSMLkA_yU",
    authDomain:        "vutruong-vn.firebaseapp.com",
    databaseURL:       "https://vutruong-vn-default-rtdb.firebaseio.com",
    projectId:         "vutruong-vn",
    storageBucket:     "vutruong-vn.firebasestorage.app",
    messagingSenderId: "417755493462",
    appId:             "1:417755493462:web:3102aba63f638f7"
};

// Khởi tạo App một lần duy nhất
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo Firestore với persistent cache - hỗ trợ đa tab, offline
// Dùng initializeFirestore thay vì getFirestore đơn giản (upgrade từ firebase.js cũ)
// Fallback sang getFirestore() nếu đã được khởi tạo với options khác
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch(e) {
    db = getFirestore(app);
}

const auth = getAuth(app);

// Export ra window để các file/code bên ngoài dùng chung (body.js, v.v.)
window.db   = db;
window.auth = auth;

// =====================
// COMPATIBILITY LAYER
// Giả lập namespace window.firebase để tương thích với code body.js (VT_InitAdminSystem)
// =====================

// Lưu reference gốc trước khi tạo class giả - tránh đệ quy vô hạn
const _originalGoogleProviderCredential = GoogleAuthProvider.credential.bind(GoogleAuthProvider);
const _originalGoogleProvider           = GoogleAuthProvider;

window.firebase = {
    apps:          getApps(),
    initializeApp: (config) => initializeApp(config),
    auth:          function() { return auth; },
    firestore:     function() { return db; }
};

window.firebase.auth.GoogleAuthProvider = class {
    constructor() { return new _originalGoogleProvider(); }
};
window.firebase.auth.GoogleAuthProvider.credential = function(idToken, accessToken) {
    return _originalGoogleProviderCredential(idToken, accessToken);
};

// FieldValue giả lập - cho code dùng window.firebase.firestore.FieldValue
window.firebase.firestore.FieldValue = {
    serverTimestamp: () => serverTimestamp(),
    increment:       (n) => increment(n)
};

// =====================
// ADMIN TOOLS
// ⚠️  NGUỒN GỐC DUY NHẤT cho danh sách UID admin
// Thêm/bớt admin tại đây - tự động áp dụng cho toàn bộ hệ thống
// Xuất ra window.VT_ADMIN_UIDS để các module khác dùng chung
// =====================
const VT_ADMIN_UIDS = [
    'lqwBdkeUnOSjclnMEbewRlhFTp33',  // ...2069@gmail
    'i0couAY25zO9X7oVime446irXel1',  // admin@vutruong.vn
];
window.VT_ADMIN_UIDS = VT_ADMIN_UIDS;  // Export toàn cục

// Flag: Firebase onAuthStateChanged đã resolve ít nhất 1 lần chưa
// Nếu chưa resolve, không xóa admin-tools khỏi DOM (tránh mất element trước khi biết user thực sự)
let _firebaseAuthResolved = false;

function applyAdminToolsUI(uid) {
    const isAdmin    = VT_ADMIN_UIDS.includes(uid);
    const adminTools = document.querySelectorAll('.VT-admin-tools');

    if (isAdmin) {
        // Là admin: gỡ class ẩn, KHÔNG xóa khỏi DOM
        adminTools.forEach(el => el.classList.remove('d-none'));
        sessionStorage.setItem('VT_AdminLogged', 'true');
    } else if (_firebaseAuthResolved) {
        // Firebase đã resolve xác nhận không phải admin → xóa khỏi DOM để bảo mật
        adminTools.forEach(el => el.remove());
        sessionStorage.removeItem('VT_AdminLogged');
    } else {
        // Chưa resolve (gọi từ cache) → chỉ ẩn, KHÔNG xóa khỏi DOM
        // để khi Firebase resolve là admin thì vẫn còn element để show
        adminTools.forEach(el => el.classList.add('d-none'));
        sessionStorage.removeItem('VT_AdminLogged');
    }
}

// Export để các file khác (multiple-items, body) gọi sau AJAX load
window.VT_ApplyAdminUI = function() {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    applyAdminToolsUI(uid);
};

// Tương thích với body.js (VT_InitAdminSystem dùng firebase.auth().onAuthStateChanged)
// Hàm này đã được thay thế hoàn toàn bởi logic trong onAuthStateChanged bên dưới
// Giữ lại để không break bất kỳ lời gọi nào từ code cũ
window.VT_InitAdminSystem = function() {
    // Không làm gì - logic đã được gộp vào onAuthStateChanged bên dưới
    // Admin tools được xử lý trong applyAdminToolsUI
};

// =====================
// SESSION CACHE - localStorage
// Render UI ngay lập tức mà không cần chờ Firebase resolve
// TTL: 30 ngày
// =====================

const SESSION_KEY = 'vt_user_session';
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

function saveUserSession(user) {
    if (!user) return;
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            uid:         user.uid,
            displayName: user.displayName || '',
            email:       user.email       || '',
            photoURL:    user.photoURL    || '',
            cachedAt:    Date.now()
        }));
    } catch(e) { console.warn("[Session] Không thể lưu cache:", e); }
}

function getCachedUser() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data.cachedAt || Date.now() - data.cachedAt > SESSION_TTL) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return data;
    } catch(e) { return null; }
}

function clearUserSession() {
    localStorage.removeItem(SESSION_KEY);
}

// =====================
// LƯU HỒ SƠ NGƯỜI DÙNG VÀO FIRESTORE
// Ghi thông tin đầy đủ vào users/{uid} mỗi lần đăng nhập
// - Lần đầu: tạo document đầy đủ (có createdAt)
// - Đăng nhập lại: chỉ cập nhật lastLoginAt + thông tin có thể thay đổi
// - Dùng updateDoc để GIỮ NGUYÊN banned/bannedAt/bannedBy nếu có
// =====================

async function saveUserProfile(user) {
    if (!user || !db) return;
    const isAdminUser = VT_ADMIN_UIDS.includes(user.uid);
    const userRef     = doc(db, 'users', user.uid);
    try {
        const snap = await getDoc(userRef);
        const profileBase = {
            uid:         user.uid,
            displayName: user.displayName || '',
            email:       user.email       || '',
            photoURL:    user.photoURL    || '',
            provider:    'google',
            role:        isAdminUser ? 'admin' : 'user',
            lastLoginAt: serverTimestamp(),
        };
        if (!snap.exists()) {
            // Lần đầu đăng nhập → tạo document mới với createdAt
            await setDoc(userRef, { ...profileBase, createdAt: serverTimestamp() });
            console.log('[UserProfile] Tạo hồ sơ mới:', user.email);
        } else {
            // Đăng nhập lại → chỉ cập nhật thông tin mutable, KHÔNG ghi đè banned/createdAt
            await updateDoc(userRef, profileBase);
            console.log('[UserProfile] Cập nhật hồ sơ:', user.email);
        }
    } catch(e) {
        console.warn('[UserProfile] Lỗi lưu hồ sơ:', e.message);
    }
}

// =====================
// HỆ THỐNG BAN NGƯỜI DÙNG - CLIENT SIDE
// window._vtUserBanned: flag toàn cục, cập nhật realtime qua onSnapshot
// Admin set users/{uid}.banned = true → user bị chặn ngay lập tức kể cả đang online
// =====================

window._vtUserBanned  = false;  // Flag toàn cục - true khi user bị hạn chế
window._vtLastBanData = {};     // Lưu banData mới nhất để force-modal khi user tương tác

// =====================
// MODAL THÔNG BÁO BỊ HẠN CHẾ (phía User)
// - Bootstrap 5 modal, không tự đóng (data-bs-backdrop="static")
// - Hiển thị lý do hạn chế, nút Liên hệ admin, nút Đóng
// - Checkbox "Không hiển thị lại lần sau" → lưu sessionStorage
//   Suppress key bị xóa khi: đăng xuất, được gỡ hạn chế, bị hạn chế realtime
// - force=true: luôn hiện modal dù đã suppress (dùng khi user click tương tác)
// =====================

const BAN_NOTICE_SUPPRESS_KEY = 'vt_ban_notice_suppressed';

function _showBanModal(banData = {}, force = false) {
    // Nếu user đã check "Không hiển thị lại" → bỏ qua, TRỪ KHI force=true (click tương tác)
    if (!force && sessionStorage.getItem(BAN_NOTICE_SUPPRESS_KEY) === '1') return;

    // Xóa modal cũ nếu tồn tại
    const old = document.getElementById('VTBanNoticeModal');
    if (old) { bootstrap?.Modal?.getInstance(old)?.dispose(); old.remove(); }

    const reason = banData.banReason
        ? `<span class="text-danger fw-medium">${banData.banReason}</span>`
        : 'vi phạm nội quy';

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="VTBanNoticeModal" tabindex="-1"
             data-bs-backdrop="static" data-bs-keyboard="false" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-md">
                <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div class="modal-body text-center p-4">
                        <div class="mb-3 text-danger">
                            <i class="fad fa-ban" style="font-size:2.2rem"></i>
                        </div>
                        <h5 class="fw-bold mb-2">Tài khoản bị hạn chế</h5>
                        <p class="mb-1 small">
                            Tài khoản của bạn bị hạn chế một số tính năng vì lý do: <div class="VT-userBanned-reason">${reason}</div>
                        </p>
                        <p class="opacity-75 small mb-3">
                            Liên hệ quản trị viên để được hỗ trợ.
                        </p>
                        <div class="d-flex gap-2 mb-3">
                            <a href="/contact"
                               class="btn btn-primary btn-sm rounded-pill flex-grow-1 fw-medium"
                               target="_blank">
                                Liên hệ
                            </a>
                            <button type="button"
                                    id="VTBanNoticeCloseBtn"
                                    class="btn btn-light btn-sm rounded-pill flex-grow-1">
                                Đóng
                            </button>
                        </div>
                        <div class="form-check form-check-sm text-start">
                            <input class="form-check-input" type="checkbox"
                                   id="VTBanNoticeSuppressChk">
                            <label class="form-check-label small opacity-75"
                                   for="VTBanNoticeSuppressChk">
                                Không hiển thị lại lần sau
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>`);

    const modalEl  = document.getElementById('VTBanNoticeModal');
    const modalObj = new bootstrap.Modal(modalEl);

    document.getElementById('VTBanNoticeCloseBtn').addEventListener('click', () => {
        if (document.getElementById('VTBanNoticeSuppressChk')?.checked) {
            sessionStorage.setItem(BAN_NOTICE_SUPPRESS_KEY, '1');
        }
        modalObj.hide();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        modalObj.dispose();
        modalEl.remove();
    }, { once: true });

    modalObj.show();
}
// Export để module bình luận và các nơi khác gọi được
window._showBanModal = _showBanModal;

// Lắng nghe realtime ban status của user đang đăng nhập
// Cập nhật window._vtUserBanned ngay khi admin thay đổi
let _banUnsubscribe = null;

function listenBanStatus(uid) {
    // Hủy listener cũ trước khi tạo mới
    if (_banUnsubscribe) { _banUnsubscribe(); _banUnsubscribe = null; }
    if (!uid || !db) { window._vtUserBanned = false; return; }

    let _isFirstBanSnapshot = true;  // Flag: phân biệt lần đầu tải vs thay đổi realtime

    _banUnsubscribe = onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
            const wasBanned      = window._vtUserBanned;
            window._vtUserBanned = snap.exists() && snap.data().banned === true;
            const banData        = snap.exists() ? snap.data() : {};

            const isFirst        = _isFirstBanSnapshot;
            _isFirstBanSnapshot  = false;

            // Lưu banData mới nhất để force-modal dùng khi user tương tác (like, focus input...)
            if (window._vtUserBanned) window._vtLastBanData = banData;

            // Bị hạn chế realtime (không phải lần đầu tải) → xóa suppress để modal luôn hiện
            if (window._vtUserBanned && !wasBanned && !isFirst) {
                sessionStorage.removeItem(BAN_NOTICE_SUPPRESS_KEY);
            }

            // Hiển thị modal + vô hiệu hóa UI khi:
            // 1. Lần đầu tải trang & đã bị hạn chế → hiển thị ngay (trừ khi đã suppress)
            // 2. Vừa bị hạn chế trong lúc đang online → hiển thị realtime
            if (window._vtUserBanned && (isFirst || !wasBanned)) {
                console.warn('[Ban] Tài khoản bị hạn chế quyền:', uid);
                _showBanModal(banData);
                // Vô hiệu hóa UI: disable input + ẩn nút Trả lời / Chỉnh sửa / Xóa
                _applyBannedDomState();
                // Thêm is-banned-user class + icon ban vào tên user trong các comment
                _updateBannedUserClass(uid, true);
            }

            // Nếu vừa được gỡ hạn chế → hiện modal thông báo, user bấm "Đóng" mới reload
            if (wasBanned && !window._vtUserBanned) {
                console.log('[Ban] Tài khoản đã được gỡ hạn chế:', uid);
                sessionStorage.removeItem(BAN_NOTICE_SUPPRESS_KEY);
                window._vtLastBanData = {};

                if (typeof bootstrap !== 'undefined') {
                    // ── Modal gỡ hạn chế ─────────────────────────────────────────────
                    const _uid = 'VTUnbanNoticeModal';
                    const _old = document.getElementById(_uid);
                    if (_old) { bootstrap.Modal.getInstance(_old)?.dispose(); _old.remove(); }

                    document.body.insertAdjacentHTML('beforeend', `
                        <div class="modal fade" id="${_uid}" tabindex="-1"
                             data-bs-backdrop="static" data-bs-keyboard="false" aria-hidden="true">
                            <div class="modal-dialog modal-dialog-centered modal-md">
                                <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                    <div class="modal-body text-center p-4">
                                        <div class="mb-3 text-success">
                                            <i class="fad fa-circle-check" style="font-size:2.2rem"></i>
                                        </div>
                                        <h5 class="fw-bold mb-2">Hạn chế đã được gỡ bỏ</h5>
                                        <p class="opacity-75 small mb-3">Tài khoản của bạn đã được gỡ bỏ hạn chế.</p>
                                        <button type="button" id="VTUnbanCloseBtn"
                                                class="btn btn-success btn-sm rounded-pill px-4 fw-medium">
                                            <i class="fad fa-circle-check me-2"></i>Đóng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>`);

                    const _el  = document.getElementById(_uid);
                    const _obj = new bootstrap.Modal(_el);

                    // Reload chỉ khi user bấm "Đóng" — không tự động
                    document.getElementById('VTUnbanCloseBtn').addEventListener('click', () => {
                        _obj.hide();
                        window.location.reload();
                    });

                    _el.addEventListener('hidden.bs.modal', () => {
                        _obj.dispose();
                        _el.remove();
                        // Fallback: nếu user đóng bằng cách khác (Esc...) vẫn reload
                        window.location.reload();
                    }, { once: true });

                    _obj.show();
                } else {
                    // Fallback khi Bootstrap chưa load
                    window.location.reload();
                }
            }
        },
        (err) => console.warn('[Ban] Không đọc được trạng thái hạn chế:', err.message)
    );
}

// =====================
// _applyBannedDomState
// Vô hiệu hóa tương tác khi user bị hạn chế — KHÔNG xóa DOM, chỉ disable/ẩn.
// Gọi từ listenBanStatus lần đầu phát hiện bị hạn chế (tải trang hoặc realtime).
// Phục hồi đầy đủ sau khi reload (khi đã gỡ hạn chế).
// =====================

function _applyBannedDomState() {
    // 1. Vô hiệu hóa ô nhập bình luận: tắt contenteditable, đổi placeholder, ẩn nút gửi
    document.querySelectorAll('.VT-input-area').forEach(area => {
        area.classList.add('vt-banned-input');

        const input   = area.querySelector('.VT-comment-input');
        const ph      = area.querySelector('.VT-placeholder');
        const sendBtn = area.querySelector('button[onclick*="VT_SendComment"]');

        if (input) {
            input.contentEditable = 'false';
            input.innerText       = '';
            // Click vào input → luôn hiện modal hạn chế (dù đã suppress)
            input.addEventListener('click', _onBannedInteract, true);
        }
        if (ph)      ph.innerText         = 'Tài khoản của bạn đã bị hạn chế.';
        if (sendBtn) sendBtn.style.display = 'none';
    });

    // 2. Đóng reply box đang mở (nếu có)
    document.querySelectorAll('.VT-dynamic-reply-box').forEach(el => el.remove());

    // 3. Ẩn nút "Trả lời" trên từng comment (không xóa khỏi DOM)
    document.querySelectorAll('[onclick*="VT_ToggleReply"]')
            .forEach(el => el.style.setProperty('display', 'none', 'important'));

    // 4. Ẩn mục "Chỉnh sửa" trong dropdown
    document.querySelectorAll('[onclick*="VT_EditMode"]')
            .forEach(el => el.closest('li')?.style.setProperty('display', 'none', 'important'));

    // 5. Ẩn mục "Xóa" trong dropdown (chỉ ẩn trên comment của chính mình)
    document.querySelectorAll('[onclick*="VT_DeleteComment"]')
            .forEach(el => el.closest('li')?.style.setProperty('display', 'none', 'important'));

    // 6. Ẩn dropdown khi không còn item nào hiển thị
    document.querySelectorAll('.VT-comment-item .dropdown-menu').forEach(menu => {
        const hasVisible = Array.from(menu.querySelectorAll('li'))
            .some(li => li.style.display !== 'none' && li.querySelector('.dropdown-item'));
        if (!hasVisible) menu.closest('.dropdown')?.style.setProperty('display', 'none', 'important');
    });
}

// Handler: banned user click vào vùng nhập → luôn hiện modal hạn chế (force=true)
function _onBannedInteract(e) {
    e.preventDefault();
    e.stopPropagation();
    _showBanModal(window._vtLastBanData || {}, true);
}

// =====================
// _updateBannedUserClass(uid, isBanned)
// Toggle class is-banned-user + icon fa-ban trên thẻ div username
// (is-admin-name / is-not-admin-name) của tất cả comment thuộc uid tương ứng.
// data-author-uid gán trong createHtml lên mỗi .VT-comment-item.
// Dùng để tùy biến CSS + hiển thị icon hạn chế realtime, không cần re-render.
// =====================

function _updateBannedUserClass(uid, isBanned) {
    if (!uid) return;
    document.querySelectorAll(
        `.VT-comment-item[data-author-uid="${uid}"] .is-admin-name,
         .VT-comment-item[data-author-uid="${uid}"] .is-not-admin-name`
    ).forEach(el => {
        el.classList.toggle('is-banned-user', isBanned);
    });
}

// Đọc cache ngay — trước khi Firebase resolve
const _cachedUser = getCachedUser();
if (_cachedUser) console.log("[Session] Cache hợp lệ:", _cachedUser.displayName);

// =====================
// PHÂN LOẠI TRANG
// =====================
const isPostPage          = window.location.pathname.indexOf(".html") > -1;
const isItemPageByBlogger = typeof _WidgetManager !== 'undefined' &&
                            _WidgetManager._GetAllData().blog.pageType === "item";

// =====================
// BIẾN UI TOÀN CỤC
// Được gán trong DOMContentLoaded
// =====================
let userNullContainers, userTrueContainers, signInLinks, signOutButtons,
    userNameDisplays, userPhotoDisplays;

// =====================
// CẬP NHẬT GIAO DIỆN AUTH
// =====================

function updateAuthUI(user) {
    const name  = user ? (user.displayName || '') : '';
    const photo = user ? (user.photoURL    || '') : '';

    userNullContainers.forEach(el => { if (el) el.style.display = user ? 'none' : 'block'; });
    userTrueContainers.forEach(el => { if (el) el.style.display = user ? 'block' : 'none'; });
    userNameDisplays.forEach(el  => { el.innerText = name; });
    userPhotoDisplays.forEach(el => { el.src = photo; });

    // Export uid hiện tại ra window để body.js fallback dùng khi cần
    window._vtCurrentUid = user ? user.uid : null;

    // Áp dụng admin tools theo uid của user
    applyAdminToolsUI(window._vtCurrentUid);
}

// =====================
// LIKE UI
// =====================

function updateLikeUI(btnElement, isLiked) {
    const icon = btnElement.querySelector('i');
    btnElement.classList.toggle('active-like', isLiked);
    if (icon) {
        icon.classList.toggle('fad',      !isLiked);
        icon.classList.toggle('fa-solid',  isLiked);
    }
}
window.updateLikeUI = updateLikeUI;

// =====================
// ĐẾM LƯỢT XEM (TẠM ĐÓNG BĂNG)
// =====================

function countView() {
    if (!isPostPage || !db) return;
    const viewEl = document.querySelector('.post-view-count');
    if (!viewEl) return;
    const display = viewEl.querySelector('#view-count-number') || viewEl.querySelector('span');
    if (display) display.innerText = 'x';
}

// =====================
// HIỂN THỊ TỔNG LƯỢT LIKE - REALTIME
// Lắng nghe collection "postMetrics" - 1 listener / postId
// =====================

function initLikeCountDisplay() {
    if (!db) return;
    const postIds = new Set();
    document.querySelectorAll('.likePost[data-post-id]').forEach(btn => {
        const id = btn.getAttribute('data-post-id');
        if (id) postIds.add(id);
    });
    postIds.forEach(postId => {
        onSnapshot(doc(db, 'postMetrics', postId), snap => {
            const count     = snap.exists() ? (snap.data().likeCount || 0) : 0;
            const formatted = count.toLocaleString('en-US');
            document.querySelectorAll(`.likePost[data-post-id="${postId}"] .like-count`)
                    .forEach(el => el.innerText = formatted);
        }, err => console.error("[Like] Lỗi đọc like count:", err));
    });
}
window.initLikeCountDisplay = initLikeCountDisplay;

// =====================
// LIKE / UNLIKE CÁ NHÂN
// Mỗi nút được init 1 lần, lắng nghe realtime trạng thái của user
// =====================

function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    // Guard: user bị hạn chế → không cho like, luôn hiện modal hạn chế (force=true)
    if (window._vtUserBanned) {
        button.onclick = (e) => { e.preventDefault(); _showBanModal(window._vtLastBanData || {}, true); };
        return;
    }

    const postId = button.getAttribute('data-post-id');

    // Lấy tiêu đề & URL - ưu tiên data-attribute, fallback DOM
    let postTitle = button.getAttribute('data-post-title');
    let postUrl   = button.getAttribute('data-post-url');
    if (!postTitle || !postUrl) {
        const post = button.closest('article.post, .post-outer, [data-post-id]');
        if (post) {
            if (!postTitle) {
                const el = post.querySelector('.post-title a, h2.post-title, h1.post-title, [itemprop="name"]');
                postTitle = el ? el.textContent.trim() : '';
            }
            if (!postUrl) {
                const el = post.querySelector('.post-title a, a[rel="bookmark"], [itemprop="url"]');
                postUrl  = el ? el.href : window.location.href;
            }
        }
    }
    if (!postTitle) postTitle = document.title;
    if (!postUrl)   postUrl   = window.location.href.split('?')[0];

    const userLikeRef    = doc(db, 'users', user.uid, 'likes', postId);
    const postMetricsRef = doc(db, 'postMetrics', postId);

    // Realtime: cập nhật UI khi trạng thái like thay đổi
    onSnapshot(userLikeRef, snap => updateLikeUI(button, snap.exists()));

    button.onclick = async (e) => {
        e.preventDefault();
        const currentDoc = await getDoc(userLikeRef);
        const isLiked    = currentDoc.exists();

        if (isLiked) {
            try {
                await deleteDoc(userLikeRef);
                await updateDoc(postMetricsRef, { likeCount: increment(-1) });
            } catch(err) {
                if (err.code === 'not-found') await setDoc(postMetricsRef, { likeCount: 0 });
                else console.error("[Like] Lỗi unlike:", err);
            }
        } else {
            try {
                await setDoc(userLikeRef, { postId, postTitle, postUrl, timestamp: serverTimestamp() });
                const metric = await getDoc(postMetricsRef);
                if (metric.exists()) {
                    await updateDoc(postMetricsRef, { likeCount: increment(1) });
                } else {
                    await setDoc(postMetricsRef, { likeCount: 1 });
                }
            } catch(err) {
                console.error("[Like] Lỗi like:", err);
            }
        }
    };
}
window.initSingleLikeButton = initSingleLikeButton;

// =====================
// LƯU LỊCH SỬ XEM BÀI VIẾT
// Chỉ chạy trên item page khi đã đăng nhập
// =====================

async function saveViewHistory(user) {
    let postId = null;
    if (typeof _WidgetManager !== 'undefined') {
        postId = _WidgetManager._GetAllData().blog.postId;
    }
    if (!postId) {
        const el = document.querySelector('article.post[data-post-id], .post-outer[data-post-id]');
        if (el) postId = el.getAttribute('data-post-id');
    }
    if (!postId || !db) return;
    try {
        await setDoc(
            doc(db, 'users', user.uid, 'viewedHistory', postId),
            { postId, title: document.title, url: window.location.href.split('?')[0], timestamp: serverTimestamp() },
            { merge: true }
        );
    } catch(err) { console.error("[History] Lỗi lưu:", err); }
}

// =====================
// KHỞI TẠO KHI DOM READY - MODULE FIREBASE
// =====================

document.addEventListener('DOMContentLoaded', () => {
    // Gán biến UI sau khi DOM sẵn sàng
    userNullContainers = document.querySelectorAll('.user-auth-null');
    userTrueContainers = document.querySelectorAll('.user-auth-true');
    signInLinks        = document.querySelectorAll('.sign-in-link');
    signOutButtons     = document.querySelectorAll('.sign-out-button-class');
    userNameDisplays   = document.querySelectorAll('.user-name-display');
    userPhotoDisplays  = document.querySelectorAll('.user-photo-display');

    // ⚡ Render ngay lập tức từ cache - tránh nhấp nháy UI
    if (_cachedUser) updateAuthUI(_cachedUser);

    // Sự kiện đăng nhập
    signInLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        signInWithPopup(auth, provider)
            .then(() => {
                console.log("[Auth] Đăng nhập thành công");
                window.location.reload();
            })
            .catch(err => console.error("[Auth] Lỗi đăng nhập:", err.message));
    }));

    // Sự kiện đăng xuất
    signOutButtons.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        clearUserSession(); // Xóa cache ngay
        firebaseSignOut(auth)
            .then(() => {
                console.log("[Auth] Đăng xuất thành công");
                window.location.reload();
            })
            .catch(err => console.error("[Auth] Lỗi đăng xuất:", err.message));
    }));

    countView();
    initLikeCountDisplay();

    // =====================
    // AUTH STATE LISTENER DUY NHẤT
    // Gộp tất cả logic phụ thuộc auth vào 1 listener - tối ưu Firebase calls
    // =====================
    const likeButtons   = document.querySelectorAll('.likePost');
    let _likeLoginToast = null;

    // Helper: lấy hoặc tạo Bootstrap Toast thông báo đăng nhập
    function _getOrCreateLikeToast() {
        if (_likeLoginToast) return _likeLoginToast;
        let toastEl = document.getElementById('loginToast');
        if (!toastEl) {
            const container     = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '1060';
            container.innerHTML = `
                <div id="loginToast" class="toast align-items-center text-white bg-warning border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="fad fa-exclamation me-2"></i>Đăng nhập để Thích bài viết này.
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>`;
            document.body.appendChild(container);
            toastEl = document.getElementById('loginToast');
        }
        if (typeof bootstrap !== 'undefined') {
            _likeLoginToast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });
        }
        return _likeLoginToast;
    }

    onAuthStateChanged(auth, (user) => {
        // Đánh dấu Firebase đã resolve - từ đây admin-tools mới được xóa khỏi DOM nếu không phải admin
        _firebaseAuthResolved = true;

        if (user) {
            console.log("[Auth] Đã đăng nhập:", user.email);

            // Cập nhật cache và UI
            saveUserSession(user);
            updateAuthUI(user);

            // Lưu/cập nhật hồ sơ đầy đủ vào Firestore (không await - chạy nền)
            saveUserProfile(user);

            // Bắt đầu lắng nghe trạng thái ban realtime
            // listenBanStatus tự hiển thị modal ngay lần đầu nếu user đã bị ban
            listenBanStatus(user.uid);

            // Lịch sử xem
            if (isItemPageByBlogger) saveViewHistory(user);

            // Like buttons
            likeButtons.forEach(btn => initSingleLikeButton(btn, user));

            // Auto sync metadata sau One Tap login
            if (localStorage.getItem('vutruong_sync_name') && window.VT_SyncUserMetadata) {
                window.VT_SyncUserMetadata();
            }

            // Disable One Tap auto-select khi đã đăng nhập
            if (window.google && window.google.accounts) {
                window.google.accounts.id.disableAutoSelect();
            }

        } else {
            console.log("[Auth] Chưa đăng nhập");

            // Dừng lắng nghe ban status khi đăng xuất / guest
            if (_banUnsubscribe) { _banUnsubscribe(); _banUnsubscribe = null; }
            window._vtUserBanned = false;

            // Xóa suppress key để lần đăng nhập sau vẫn hiện modal nếu còn bị hạn chế
            sessionStorage.removeItem(BAN_NOTICE_SUPPRESS_KEY);

            clearUserSession();
            updateAuthUI(null);

            // Like buttons: chuyển về trạng thái guest + hiện Toast khi click
            likeButtons.forEach(btn => {
                updateLikeUI(btn, false);
                btn.onclick = (e) => {
                    e.preventDefault();
                    const t = _getOrCreateLikeToast();
                    if (t) t.show();
                };
            });

            // Khởi tạo Google One Tap cho guest
            _initOneTap();
        }
    });
});

// =====================
// GOOGLE ONE TAP LOGIN
// =====================

function _parseJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    ));
}

function _initOneTap() {
    const checkGSI = setInterval(() => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
            clearInterval(checkGSI);
            window.google.accounts.id.initialize({
                client_id:             "129635740050-2htdgc0rf6sq0dmmqa9uvkgefumbm3qm.apps.googleusercontent.com",
                callback:              window.handleCredentialResponse,
                auto_select:           true,
                cancel_on_tap_outside: false
            });
            window.google.accounts.id.prompt();
        }
    }, 500);
}

window.handleCredentialResponse = async function(response) {
    console.log("[One Tap] Đang xử lý token...");
    try {
        const payload    = _parseJwt(response.credential);
        const credential = _originalGoogleProviderCredential(response.credential);
        const result     = await signInWithCredential(auth, credential);
        const user       = result.user;

        // Cập nhật profile nếu cần
        if (user.displayName !== payload.name || user.photoURL !== payload.picture) {
            await updateProfile(user, { displayName: payload.name, photoURL: payload.picture });
        }

        saveUserSession(result.user);
        localStorage.setItem('vutruong_sync_name',   payload.name);
        localStorage.setItem('vutruong_sync_avatar', payload.picture);

        if (window.google && window.google.accounts) {
            window.google.accounts.id.cancel();
        }

        console.log("[One Tap] Đăng nhập thành công:", user.email);
        window.location.reload();

    } catch(err) {
        console.error("[One Tap] Lỗi:", err.message);
    }
};

// =========================================================================================
// MODULE BÌNH LUẬN REALTIME
// Tất cả logic bình luận đóng gói bên trong window.VT_InitCommentSystem
// =========================================================================================

// Hằng số dùng chung cho module bình luận
// ADMIN_UIDS tham chiếu trực tiếp VT_ADMIN_UIDS ở trên - không cần fallback vì cùng file
const ADMIN_UIDS    = VT_ADMIN_UIDS;
const DEFAULT_AVATAR = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhS34MMIbvh9P6obSup4qu4xfE2LrXkhY8rAXLJGX3PzwvolCMWTeXSU0hgm3fETQnfGbcEd0jklsAzNV9NIA-v3XQblgT6DTLHsC9zVuTrEuifK3h9P1Fq7PIAha8Z9TER64RIcfAzSgtq7uHbZL4iLJuR5XGhqn3ju4ZXoTHYjXCclA/s44/vtzone-default-avatar.jpg';

window.VT_InitCommentSystem = function() {

    // =====================
    // TRẠNG THÁI MODULE
    // =====================
    let unsubscribeMap = {};      // Map lưu hàm unsubscribe của listener comment chính
    const PAGINATION_STATE = {};  // Lưu số lượng comment đang hiển thị mỗi postId
    let commentIdToDelete  = null;
    let deleteModalObj     = null;
    const IS_LOADING_MAP   = {};  // Guard chống double-click "Xem thêm"

    // =====================
    // POST SETTINGS - BẬT / TẮT BÌNH LUẬN
    // Lưu vào Firestore collection "postSettings"
    // Cấu trúc: postSettings/{postId} → { commentsDisabled: true, updatedAt: Timestamp }
    // Khi bật lại → deleteDoc (không để trường false) → tiết kiệm storage
    // Chi phí: 1 read ban đầu + push realtime, không tốn read cho mỗi thay đổi
    // =====================

    const POST_SETTINGS_COL  = 'postSettings';
    const commentDisabledCache = {};  // Cache { postId: boolean } - tránh query Firestore lặp lại
    const settingsUnsubMap   = {};    // Map unsubscribe listener postSettings

    // HTML thông báo khi bình luận bị tắt
    const getDisabledNoticeHtml = (photoURL) => `
        <div class="VT-disabled-notice flex-grow-1 position-relative d-flex align-items-center gap-2" style="cursor:default;user-select:none">
            <!--<img src="${photoURL || DEFAULT_AVATAR}" class="VT-user-avatar rounded-circle m-0 pe-none d-none" loading="lazy" width="44" height="44" style="object-fit:cover; flex-shrink:0;">-->
   			<i class="fad fa-comment-slash opacity-50 rounded-circle" style="width:100%;max-width:36px;line-height:36px;text-align:center;background:rgba(0,0,0,.15)"></i>
            <div class="VT-comment-input VT-comment-disabled-noty flex-grow-1 d-flex align-items-center text-nowrap">
                <span class="opacity-50">Quản trị viên đã tắt bình luận của bài viết này.</span>
            </div>
        </div>`;

    // =====================
    // ÁP DỤNG TRẠNG THÁI TẮT/BẬT BL LÊN DOM
    // disabled=true  → XÓA ô nhập, nút Trả lời, nút Chỉnh sửa khỏi DOM
    // disabled=false → KHÔI PHỤC ô nhập từ node đã lưu
    // =====================

    const applyCommentDisabledState = (appBox, disabled) => {
        const postId = appBox.getAttribute('data-post-id');

        // Cập nhật cache và data-attribute để guard kiểm tra nhanh
        commentDisabledCache[postId]      = disabled;
        appBox.dataset.commentDisabled    = disabled ? 'true' : '';

        if (disabled) {
            // 1. Lưu node .VT-input-area (giữ nguyên event listeners)
            const inputArea = appBox.querySelector('.VT-input-area');
            if (inputArea && !appBox._vtSavedInputNode) {
                appBox._vtSavedInputNode = inputArea;
                inputArea.remove();
            }

            // 2. Chèn thông báo vào đầu appBox
            if (!appBox.querySelector('.VT-disabled-notice')) {
                const photoURL = auth.currentUser?.photoURL || DEFAULT_AVATAR;
                appBox.insertAdjacentHTML('afterbegin', getDisabledNoticeHtml(photoURL));
            }

            // 3. Xóa nút "Trả lời" và "Chỉnh sửa" đang hiển thị khỏi DOM
            appBox.querySelectorAll('[onclick*="VT_ToggleReply"]').forEach(btn => btn.remove());
            appBox.querySelectorAll('[onclick*="VT_EditMode"]').forEach(btn => btn.remove());

            // 4. Xóa reply box đang mở nếu có
            appBox.querySelectorAll('.VT-dynamic-reply-box').forEach(box => box.remove());

            // 5. Đóng các khung chỉnh sửa đang mở - tắt luôn nút Lưu/Hủy (realtime)
            appBox.querySelectorAll('.VT-comment-text[contenteditable="true"]').forEach(txt => {
                txt.contentEditable = 'false';
                if (txt._vtEditCleanup) { txt._vtEditCleanup(); delete txt._vtEditCleanup; }
                txt.innerText = txt.dataset.oldContent || txt.innerText;
            });
            appBox.querySelectorAll('.VT-edit-btns').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });

        } else {
            // 1. Xóa thông báo
            appBox.querySelector('.VT-disabled-notice')?.remove();

            // 2. Khôi phục ô nhập từ node đã lưu
            if (!appBox.querySelector('.VT-input-area') && appBox._vtSavedInputNode) {
                appBox.insertBefore(appBox._vtSavedInputNode, appBox.firstChild);
                appBox._vtSavedInputNode = null;

                // Đồng bộ avatar, placeholder và nút gửi với trạng thái user hiện tại
                const user         = auth.currentUser;
                const restoredImg  = appBox.querySelector('.VT-user-avatar');
                const restoredIn   = appBox.querySelector('.VT-comment-input');
                const restoredPh   = appBox.querySelector('.VT-placeholder');
                const restoredSend = appBox.querySelector('.VT-input-area button[onclick*="VT_SendComment"]');
                if (restoredImg)  restoredImg.src              = user?.photoURL || DEFAULT_AVATAR;
                if (restoredIn)   restoredIn.contentEditable   = String(!!user);
                if (restoredPh)   restoredPh.innerText         = user
                    ? `Bình luận dưới tên ${user.displayName}`
                    : 'Đăng nhập để bình luận về bài viết này.';
                if (restoredSend) restoredSend.style.display   = user ? '' : 'none';
            }

            // 3. Xóa sạch comment list để force re-render đầy đủ (kể cả nút Trả lời/Chỉnh sửa)
            // Không thể chỉ gọi startListening vì onSnapshot chỉ update timestamp cho element đã có sẵn
            const list = appBox.querySelector('.VT-comment-list');
            if (list) list.innerHTML = '';

            // 4. Force re-render để khôi phục đầy đủ nút Trả lời/Chỉnh sửa trên các comment
            startListening(appBox, true);
        }
    };

    // =====================
    // LẮNG NGHE TRẠNG THÁI TẮT/BẬT BL - REALTIME
    // 1 listener/postId, tự động cập nhật DOM khi admin thay đổi
    // =====================

    const listenPostSettings = (appBox) => {
        const postId = appBox.getAttribute('data-post-id');
        if (!postId || settingsUnsubMap[postId]) return;

        const settingsRef      = doc(db, POST_SETTINGS_COL, postId);
        let _isFirstSnapshot   = true;  // Flag phân biệt lần đầu load vs admin toggle thực sự
        settingsUnsubMap[postId] = onSnapshot(
            settingsRef,
            (snap) => {
                const disabled   = snap.exists() && snap.data().commentsDisabled === true;
                const wasFirst   = _isFirstSnapshot;
                _isFirstSnapshot = false;

                // Chỉ áp dụng khi trạng thái thực sự thay đổi
                if (commentDisabledCache[postId] === disabled) return;

                applyCommentDisabledState(appBox, disabled);

                // Chỉ log khi admin thực sự toggle - không log lần đầu tải trang
                if (!wasFirst) {
                    console.log(`[Comments] ${postId}: đã ${disabled ? 'tắt' : 'bật'} bình luận`);
                }

                // Cập nhật text nút .VT_offComment
                const postCont = appBox.closest('.post');
                if (postCont) {
                    const offBtn = postCont.querySelector('.VT_offComment');
                    if (offBtn) {
                        offBtn.innerHTML = disabled
                            ? `<i class="fa-duotone fa-comment me-2"></i>Bật bình luận`
                            : `<i class="fa-duotone fa-comment-slash me-2"></i>Tắt bình luận`;
                    }
                }
            },
            (err) => {
                console.warn(`[Comments] Không đọc được postSettings bài ${postId}:`, err.message,
                    '→ Kiểm tra Firestore Rules: collection "postSettings" cần allow read: if true');
            }
        );
    };

    // =====================
    // VT_offComment - Hàm public, gọi từ onclick="VT_offComment(this)"
    // Toggle trạng thái bật/tắt bình luận của bài viết
    // Chi phí: 1 write hoặc 1 delete mỗi lần click
    // =====================

    window.VT_offComment = async function(btn) {
        const postContainer = btn.closest('.post');
        if (!postContainer) { console.warn('[Comments] VT_offComment: không tìm thấy .post'); return; }

        const appBox = postContainer.querySelector('.VT-comment-app');
        if (!appBox) { console.warn('[Comments] VT_offComment: không tìm thấy .VT-comment-app'); return; }

        const postId = appBox.getAttribute('data-post-id');
        if (!postId) { console.warn('[Comments] VT_offComment: không có data-post-id'); return; }

        const currentlyDisabled = commentDisabledCache[postId] === true;
        const willDisable       = !currentlyDisabled;

        // Disable nút tạm thời chống double-click
        btn.style.pointerEvents = 'none';
        btn.style.opacity       = '0.5';

        try {
            const settingsRef = doc(db, POST_SETTINGS_COL, postId);
            if (willDisable) {
                await setDoc(settingsRef, { commentsDisabled: true, updatedAt: serverTimestamp() });
            } else {
                await deleteDoc(settingsRef);
            }
            // onSnapshot tự nhận thay đổi → gọi applyCommentDisabledState
        } catch(err) {
            console.error(`[Comments] Lỗi toggle bình luận bài ${postId}:`, err.message);
        } finally {
            btn.style.pointerEvents = '';
            btn.style.opacity       = '';
        }
    };

    // =====================
    // TIỆN ÍCH
    // =====================

    // Tính thời gian tương đối
    const timeAgo = (date) => {
        if (!date) return "Đang viết";
        const d       = date.toDate ? date.toDate() : new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        const map     = { 'năm': 31536000, 'tháng': 2592000, 'tuần': 604800, 'ngày': 86400, 'giờ': 3600, 'phút': 60 };
        if (seconds < 30) return 'Vừa xong';
        if (seconds < 60) return '1 phút';
        for (let key in map) {
            const n = Math.floor(seconds / map[key]);
            if (n > 0) return (key === 'ngày' && n === 1) ? 'Hôm qua' : n + ' ' + key;
        }
        return 'Vừa xong';
    };

    // Skeleton loading HTML
    const renderSkeleton = () =>
        `<div class="VT-comment-item mt-3"><div class="d-flex align-items-start gap-2"><div class="vt-ske-avatar vt-loading-effect-loading" style="width:36px;height:36px;border-radius:50%;flex-shrink:0"></div><div class="flex-grow-1"><div class="vt-ske-bubble vt-loading-effect-loading" style="width:18rem;height:1rem;border-radius:4px"></div><div class="d-flex align-items-center gap-2 mt-1"><div class="vt-ske-text vt-loading-effect-loading" style="width:2.75rem;height:.8rem;border-radius:4px"></div><div class="vt-ske-text vt-loading-effect-loading" style="width:2.75rem;height:.8rem;border-radius:4px"></div></div></div></div></div>`;

    // Format nội dung comment (sanitize + markdown cơ bản)
    const formatCommentText = (str, cId) => {
        if (!str) return "";
        const p   = document.createElement('p');
        p.textContent = str;
        let safe  = p.innerHTML;
        safe = safe.replace(/\[img\](.*?)\[\/img\]/gi, (m, url) =>
            `<a loading="lazy" data-fancybox="photo-cmt-${cId}" src="${url.trim()}" class="cursor-pointer" onerror="this.src='https://placehold.co/600x400?text=Error'"><i class="me-1 fa-duotone fa-image"></i>Xem ảnh</a>`
        );
        safe = safe
            .replace(/\*([^\s][^*]*[^\s])\*/g, '<b>$1</b>')
            .replace(/(?<!\w)_([^\s][^_]*[^\s])_(?!\w)/g, '<i>$1</i>');
        return safe;
    };

    const toggleEl = (el, show) => { if (el) el.style.setProperty('display', show ? 'block' : 'none', 'important'); };

    // =====================
    // CÁC HÀM PUBLIC TIỆN ÍCH
    // =====================

    window.VT_RefreshTooltips = () => {
        if (typeof bootstrap === 'undefined') return;
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            const inst = bootstrap.Tooltip.getInstance(el);
            if (inst) inst.dispose();
            new bootstrap.Tooltip(el);
        });
    };

    window.VT_HandlePlaceholder = (el) => {
        const ph = el.parentElement.querySelector('.VT-placeholder');
        if (ph) ph.style.display = el.innerText.trim() === '' ? 'block' : 'none';
    };

    // Sync tên/avatar của user trong tất cả comment đã đăng
    window.VT_SyncUserMetadata = async function() {
        if (!auth || !auth.currentUser) return;
        try {
            // Key đồng nhất với firebase.js: 'vutruong_sync_name' / 'vutruong_sync_avatar'
            const savedName   = localStorage.getItem('vutruong_sync_name')   || auth.currentUser.displayName;
            const savedAvatar = localStorage.getItem('vutruong_sync_avatar') || auth.currentUser.photoURL;
            const q           = query(collection(db, "comments"), where("uid", "==", auth.currentUser.uid));
            const snap        = await getDocs(q);
            if (snap.empty) return;
            const batch  = writeBatch(db);
            let count    = 0;
            snap.forEach((docSnap) => {
                if (docSnap.data().userName !== savedName) {
                    batch.update(docSnap.ref, { userName: savedName, userAvatar: savedAvatar });
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
                localStorage.removeItem('vutruong_sync_name');
                localStorage.removeItem('vutruong_sync_avatar');
                console.log(`[Comments] Đã sync ${count} comment`);
            }
        } catch(e) { console.error("[Comments] Lỗi sync:", e); }
    };

    // =====================
    // HTML REPLY BOX ĐỘNG
    // Chỉ tạo khi user bấm nút "Trả lời"
    // =====================

    const getReplyBoxHtml = (parentId, replyToName) => {
        const user        = auth.currentUser;
        const isLogged    = !!user;
        const avatar      = user ? user.photoURL : DEFAULT_AVATAR;
        const placeholder = isLogged
            ? (replyToName ? `Trả lời ${replyToName}` : 'Trả lời')
            : `Đăng nhập để trả lời ${replyToName}`;

        return `
        <div class="VT-rep-box-${parentId} VT-dynamic-reply-box p-0 m-0 mt-3">
            <div class="d-flex align-items-start gap-2">
                <img src="${avatar}" class="VT-user-avatar rounded-circle m-0" loading="lazy" width="36" height="36" style="object-fit:cover;">
                <div class="flex-grow-1">
                    <div class="VT-rep-box d-flex align-items-center py-1 m-0 position-relative">
                        <div class="VT-rep-in-${parentId} flex-grow-1" contenteditable="${isLogged}" oninput="VT_HandlePlaceholder(this)" style="outline:none;min-height:1rem;z-index:2"></div>
                        <div class="VT-rep-placeholder VT-placeholder position-absolute opacity-75" style="z-index:1">${placeholder}</div>
                        ${isLogged ? `<button onclick="VT_SendComment(this,'${parentId}')" class="btn btn-link p-0 m-0 text-primary shadow-none border-0"><i class="fa-duotone fa-solid fa-paper-plane-top"></i></button>` : ''}
                    </div>
                    <a class="d-inline-flex mt-2 fw-bold small opacity-75 cursor-pointer" onclick="VT_CancelReply('${parentId}')">Hủy</a>
                </div>
            </div>
        </div>`;
    };

    // =====================
    // GỬI BÌNH LUẬN / TRẢ LỜI
    // =====================

    window.VT_SendComment = async function(btn, parentId = null) {
        const appBox = btn.closest('.VT-comment-app');

        // Guard: bình luận bị tắt → không cho gửi dù client bypass nút
        if (appBox && appBox.dataset.commentDisabled === 'true') {
            console.warn('[Comments] Bình luận đã bị tắt, không thể gửi');
            return;
        }

        // Guard: user bị hạn chế → không cho gửi, luôn hiện modal hạn chế (force=true)
        if (window._vtUserBanned) {
            if (typeof window._showBanModal === 'function') window._showBanModal(window._vtLastBanData || {}, true);
            return;
        }

        let input;
        if (parentId) {
            const replyBox = btn.closest(`.VT-rep-box-${parentId}`);
            input = replyBox ? replyBox.querySelector(`.VT-rep-in-${parentId}`) : null;
        } else {
            input = appBox.querySelector('.VT-comment-input');
        }
        if (!input) return;

        const content = input.innerText.trim();
        if (!auth.currentUser || !content) return;

        let finalPostUrl     = window.location.href.split('?')[0].split('#')[0];
        const postContainer  = btn.closest('.post');
        if (postContainer) {
            const titleSpan = postContainer.querySelector('.postTitle span');
            if (titleSpan && titleSpan.getAttribute('data-post-url')) {
                finalPostUrl = titleSpan.getAttribute('data-post-url').split('?')[0].split('#')[0];
            }
        }

        const backupContent = content;
        input.innerText     = '';
        VT_HandlePlaceholder(input);

        const postId = appBox.getAttribute('data-post-id');

        try {
            const docRef = await addDoc(collection(db, "comments"), {
                postId,
                postUrl:     finalPostUrl,
                parentId,
                uid:         auth.currentUser.uid,
                userName:    auth.currentUser.displayName,
                userAvatar:  auth.currentUser.photoURL,
                content:     backupContent,
                createdAt:   serverTimestamp()
            });

            if (parentId) {
                const parentDocRef = doc(db, "comments", parentId);
                await updateDoc(parentDocRef, { childCount: increment(1) });

                const childContainer = appBox.querySelector(`.VT-child-list-${parentId}`);
                const parentItem     = appBox.querySelector(`#VT-cmt-${parentId}`);

                if (childContainer) {
                    const hasLoaded = childContainer.querySelectorAll('.VT-comment-item').length > 0;
                    if (!hasLoaded && parentItem?.querySelector('[onclick*="VT_LoadSubComments"]')) {
                        await window.VT_LoadSubComments(parentItem.querySelector('[onclick*="VT_LoadSubComments"]'), parentId);
                    } else {
                        const newHtml = createHtml({
                            id:          docRef.id,
                            userName:    auth.currentUser.displayName,
                            userAvatar:  auth.currentUser.photoURL,
                            content:     backupContent,
                            createdAt:   { toDate: () => new Date() },
                            uid:         auth.currentUser.uid
                        }, true, true);
                        childContainer.insertAdjacentHTML('beforeend', newHtml);
                        childContainer.style.display = 'block';
                        if (window.VT_RefreshTooltips) window.VT_RefreshTooltips();
                    }

                    const loadBtn = parentItem?.querySelector('[onclick*="VT_LoadSubComments"]');
                    if (loadBtn) {
                        const cnt = childContainer.querySelectorAll('.VT-comment-item').length;
                        loadBtn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${cnt} phản hồi`;
                    }
                }
            }
            window.VT_SyncUserMetadata();

        } catch(e) {
            console.error("[Comments] Lỗi gửi bình luận:", e);
            if (parentId) {
                window.VT_ToggleReply(btn, parentId);
                setTimeout(() => {
                    const newItem  = document.getElementById(`VT-cmt-${parentId}`);
                    const newInput = newItem?.querySelector(`.VT-rep-in-${parentId}`);
                    if (newInput) { newInput.innerText = backupContent; VT_HandlePlaceholder(newInput); }
                }, 100);
            } else {
                input.innerText = backupContent;
                VT_HandlePlaceholder(input);
            }
            _showSimpleModal(
                'Có lỗi xảy ra',
                'Không thể gửi bình luận, hãy thử reload trang và thử lại.',
                'fa-circle-exclamation text-warning'
            );
        }
    };

    // =====================
    // TOGGLE / HỦY REPLY BOX
    // =====================

    window.VT_ToggleReply = (btn, id, name = "") => {
        const cmtItem = document.getElementById(`VT-cmt-${id}`);
        if (!cmtItem) return;

        // Guard: bình luận bị tắt
        const parentApp = cmtItem.closest('.VT-comment-app');
        if (parentApp && parentApp.dataset.commentDisabled === 'true') return;

        const existingBox = cmtItem.querySelector(`.VT-rep-box-${id}`);
        if (existingBox) {
            existingBox.remove();
        } else {
            const container = cmtItem.querySelector('.flex-grow-1');
            container.insertAdjacentHTML('beforeend', getReplyBoxHtml(id, name));
            const newInput = cmtItem.querySelector(`.VT-rep-in-${id}`);
            if (newInput) newInput.focus();
        }
    };

    window.VT_CancelReply = (id) => {
        const cmtItem = document.getElementById(`VT-cmt-${id}`);
        if (cmtItem) cmtItem.querySelector(`.VT-rep-box-${id}`)?.remove();
    };

    // =====================
    // XÓA BÌNH LUẬN
    // =====================

    window.VT_DeleteComment = (id) => { commentIdToDelete = id; deleteModalObj.show(); };

    // =====================
    // CHỈNH SỬA BÌNH LUẬN
    // Fix: Con trỏ hiển thị ở cuối, chỉ cho lưu khi nội dung thực sự thay đổi
    // =====================

    window.VT_EditMode = (btn, cId) => {
        const row = btn.closest(`#VT-cmt-${cId}`);
        const txt = row.querySelector('.VT-comment-text');

        txt.dataset.oldContent  = txt.innerText.trim();
        txt.contentEditable     = 'true';

        // Đặt con trỏ vào CUỐI nội dung (fix lỗi con trỏ hiện đầu)
        txt.focus();
        const range = document.createRange();
        const sel   = window.getSelection();
        range.selectNodeContents(txt);
        range.collapse(false); // false = cuối
        sel.removeAllRanges();
        sel.addRange(range);

        toggleEl(row.querySelector('.VT-edit-btns'), true);

        // Vô hiệu hóa nút Lưu ngay từ đầu - chỉ enable khi nội dung thay đổi
        const saveBtn = row.querySelector('[onclick*="VT_SaveEdit"]');
        if (saveBtn) {
            saveBtn.style.opacity      = '0.4';
            saveBtn.style.pointerEvents = 'none';
        }

        // Lắng nghe input để enable/disable nút Lưu
        const onInput = () => {
            const changed = txt.innerText.trim() !== txt.dataset.oldContent;
            if (saveBtn) {
                saveBtn.style.opacity       = changed ? '1'    : '0.4';
                saveBtn.style.pointerEvents = changed ? 'auto' : 'none';
            }
        };
        txt.addEventListener('input', onInput);
        txt._vtEditCleanup = () => txt.removeEventListener('input', onInput);
    };

    window.VT_CancelEdit = (btn, cId) => {
        const row = btn.closest(`#VT-cmt-${cId}`);
        const txt = row.querySelector('.VT-comment-text');
        txt.innerText          = txt.dataset.oldContent || "";
        txt.contentEditable    = 'false';
        if (txt._vtEditCleanup) { txt._vtEditCleanup(); delete txt._vtEditCleanup; }
        toggleEl(row.querySelector('.VT-edit-btns'), false);
    };

    window.VT_SaveEdit = async (btn, cId) => {
        const row    = btn.closest(`#VT-cmt-${cId}`);
        const txt    = row.querySelector('.VT-comment-text');
        const newText = txt.innerText.trim();

        // Guard: không lưu nếu nội dung không thay đổi
        if (!newText || newText === txt.dataset.oldContent) return;

        try {
            await updateDoc(doc(db, "comments", cId), {
                content:    newText,
                lastEdited: serverTimestamp()
            });
            txt.contentEditable = 'false';
            if (txt._vtEditCleanup) { txt._vtEditCleanup(); delete txt._vtEditCleanup; }
            toggleEl(row.querySelector('.VT-edit-btns'), false);
        } catch(e) { console.error("[Comments] Lỗi lưu chỉnh sửa:", e); }
    };

    // =====================
    // RENDER HTML COMMENT
    // =====================

    const createHtml = (data, isOwner, isChild, childCount = 0) => {
        const cId            = data.id;
        const isAdmin        = ADMIN_UIDS.includes(data.uid);
        const isCurrentAdmin = auth.currentUser && ADMIN_UIDS.includes(auth.currentUser.uid);
        const fullDate       = data.createdAt ? data.createdAt.toDate().toLocaleString() : "";

        // Flag: user hiện tại đang bị hạn chế → ẩn toàn bộ tương tác của chính mình
        const currentUserBanned = window._vtUserBanned === true;

        // Disabled state: ẩn Trả lời và Chỉnh sửa, chỉ giữ Xóa
        const isDisabled = (() => {
            const appBox = document.querySelector(`.VT-comment-app[data-post-id="${data.postId}"]`);
            return appBox && appBox.dataset.commentDisabled === 'true';
        })();

        // -----------------------------------------------------------------------
        // Dropdown: Chỉnh sửa / Xóa / Hạn chế người dùng
        // -----------------------------------------------------------------------

        // Chỉnh sửa: owner, chưa tắt bình luận, chưa bị hạn chế
        const editItem = (isOwner && !isDisabled && !currentUserBanned) ? `
                            <li class="m-0">
                                <a class="dropdown-item small py-2" onclick="VT_EditMode(this,'${cId}')" role="button">
                                    <i class="fa-duotone fa-solid fa-pen me-2"></i>Chỉnh sửa
                                </a>
                            </li>` : '';

        // Xóa: owner (khi chưa bị hạn chế) HOẶC admin hiện tại
        const canDelete  = (isOwner && !currentUserBanned) || isCurrentAdmin;
        const deleteItem = canDelete ? `
                            <li class="m-0">
                                <a class="dropdown-item small py-2 text-danger" onclick="VT_DeleteComment('${cId}')" role="button">
                                    <i class="fa-duotone fa-solid fa-trash me-2"></i>Xóa
                                </a>
                            </li>` : '';

        // Hạn chế người dùng: chỉ admin, không tự hạn chế mình, không hạn chế admin khác
        const targetIsAdmin = ADMIN_UIDS.includes(data.uid);
        const banItem = (isCurrentAdmin && data.uid !== auth.currentUser?.uid && !targetIsAdmin) ? `
                            ${(editItem || deleteItem) ? '<li class="d-none"><hr class="dropdown-divider my-1"></li>' : ''}
                            <li class="m-0">
                                <a class="VT-ban-toggle dropdown-item small py-2 text-warning" role="button"
                                   data-ban-uid="${data.uid}"
                                   data-ban-name="${(data.userName || '').replace(/"/g, '&quot;')}"
                                   onclick="VT_ToggleBanUser('${data.uid}','${(data.userName || '').replace(/'/g, "\\'")}',this)">
                                    <i class="fa-duotone fa-solid fa-ban me-2"></i>Hạn chế người dùng
                                </a>
                            </li>` : '';

        // Chỉ render dropdown khi có ít nhất 1 item
        const hasDropdown  = editItem || deleteItem || banItem;
        const dropdownHtml = hasDropdown ? `
                        <div class="dropdown d-inline-block">
                            <a class="VT-action-link text-decoration-none px-1"
                               role="button"
                               data-bs-toggle="dropdown"
                               aria-expanded="false"
                               title="Tùy chọn"
                               onclick="VT_PrepBanLabel(this,'${data.uid}')">
                                <i class="fa-duotone fa-solid fa-ellipsis-stroke"></i>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-start shadow border-0 rounded-3"
                                style="min-width:170px">
                                ${editItem}${deleteItem}${banItem}
                            </ul>
                        </div>` : '';

        // Class is-banned-user + icon ban: thêm nếu _banStatusCache biết author đang bị hạn chế
        const isAuthorBanned = _banStatusCache.has(data.uid) && _banStatusCache.get(data.uid) === true;
        const nameCls        = `d-inline ${isAdmin ? 'is-admin-name' : 'is-not-admin-name'} fw-medium${isAuthorBanned ? ' is-banned-user' : ''}`;
        const bannedIconHtml = isAuthorBanned
            ? '<i class="fad fa-ban ms-1 text-danger small vt-banned-icon" data-bs-toggle="tooltip" title="Tài khoản bị hạn chế"></i>'
            : '';

        // data-author-uid: dùng để _updateBannedUserClass() toggle class is-banned-user
        return `<div class="VT-comment-item m-0 mt-3 ${isChild ? 'VT-comment-item-reply' : ''}" id="VT-cmt-${cId}" data-author-uid="${data.uid}">
            <div class="d-flex align-items-start gap-2">
                <img src="${data.userAvatar || DEFAULT_AVATAR}" class="rounded-circle m-0 object-fit-cover pe-none" loading="lazy" width="${isChild ? 36 : 36}" height="${isChild ? 36 : 36}">
                <div class="flex-grow-1">
                    <div class="VT-comment-bubble">
                        <div class="${nameCls}">
                            ${data.userName}${isAdmin ? '<i class="fa-solid fa-badge-check ms-1 text-primary small" data-bs-toggle="tooltip" title="Tài khoản đã được xác thực"></i>' : ''}${bannedIconHtml}
                        </div>
                        <div class="VT-comment-text d-inline border-0">${formatCommentText(data.content, cId)}</div>
                    </div>
                    <div class="VT-edit-btns mt-1" style="display:none">
                        <small class="text-primary fw-bold cursor-pointer me-2" onclick="VT_SaveEdit(this,'${cId}')">Lưu chỉnh sửa</small>
                        <small class="opacity-75 cursor-pointer" onclick="VT_CancelEdit(this,'${cId}')">Hủy</small>
                    </div>
                    <div class="d-flex align-items-center gap-2 small">
                        <a href="${window.location.href.split('#')[0]}#VT-cmt-${cId}" class="VT-cmt-time opacity-75 text-decoration-none" title="${fullDate}">${timeAgo(data.createdAt?.toDate())}${data.lastEdited ? ' (đã chỉnh sửa)' : ''}</a>
                        ${!isChild && !isDisabled && !currentUserBanned ? `<span class="VT-action-link" onclick="VT_ToggleReply(this,'${cId}','${data.userName}')">Trả lời</span>` : ''}
                        ${dropdownHtml}
                    </div>
                    ${!isChild && childCount > 0 ? `
                    <div class="d-inline-block mt-2 fw-medium opacity-75 cursor-pointer small" onclick="VT_LoadSubComments(this,'${cId}')">
                        <i class="fa-duotone fa-turn-down-right me-2"></i>${childCount} phản hồi
                    </div>` : ""}
                    <div class="VT-child-list VT-child-list-${cId}"></div>
                </div>
            </div>
        </div>`;
    };

    // =====================
    // ĐẾM SỐ LƯỢNG BÌNH LUẬN - REALTIME
    // 1 listener duy nhất / postId - có guard chống leak
    // =====================

    const _countUnsubMap = {};  // Guard: chỉ tạo 1 listener đếm mỗi postId

    const updateCommentCount = (postId) => {
        // Nếu listener đã tồn tại thì bỏ qua - không tạo thêm
        if (_countUnsubMap[postId]) return;

        const q = query(collection(db, "comments"), where("postId", "==", postId));
        _countUnsubMap[postId] = onSnapshot(q, (snap) => {
            document.querySelectorAll(`.VT-comment-count[data-post-id="${postId}"] .count-number`)
                    .forEach(el => el.innerText = snap.size);
        }, err => console.error("[Comments] Lỗi đếm comment:", err));
    };

    // =====================
    // LẮNG NGHE COMMENT REALTIME
    // Khởi tạo listener chính cho mỗi .VT-comment-app
    // =====================

    const startListening = (appBox, isForce = false) => {
        const postId = appBox.getAttribute('data-post-id');
        if (appBox.dataset.loaded === "true" && !isForce) return;
        appBox.dataset.loaded = "true";
        if (unsubscribeMap[postId]) unsubscribeMap[postId]();

        // Lắng nghe trạng thái bật/tắt bình luận (1 lần/postId)
        listenPostSettings(appBox);

        // Khởi động đếm comment - chỉ 1 lần/postId (guard bên trong updateCommentCount)
        updateCommentCount(postId);

        const q = query(
            collection(db, "comments"),
            where("postId", "==", postId),
            orderBy("createdAt", "asc")
        );

        unsubscribeMap[postId] = onSnapshot(q, (snap) => {
            const all     = [];
            snap.forEach(d => all.push({ id: d.id, ...d.data() }));
            const parents = all.filter(c => !c.parentId).reverse();

            const isSingleItem = window.location.pathname.endsWith('.html');
            const limitCount   = PAGINATION_STATE[postId] || (isSingleItem ? 5 : 2);
            const list         = appBox.querySelector('.VT-comment-list');

            if (list) {
                let hasNewElement = false; // Flag: chỉ refresh tooltip khi thực sự có element mới

                const dataToShow = parents.slice(0, limitCount);
                dataToShow.forEach((p, index) => {
                    let existing = list.querySelector(`#VT-cmt-${p.id}`);
                    if (!existing) {
                        // Element mới → render và đánh dấu cần refresh tooltip
                        hasNewElement = true;
                        const html = createHtml(p, auth.currentUser?.uid === p.uid, false, p.childCount || 0);
                        if (index === 0 && list.children.length > 0) {
                            list.insertAdjacentHTML('afterbegin', html);
                        } else {
                            list.insertAdjacentHTML('beforeend', html);
                        }
                    } else {
                        // Element đã có → chỉ cập nhật thời gian, không re-render
                        const timeEl = existing.querySelector('.VT-cmt-time');
                        if (timeEl) {
                            timeEl.innerHTML = `${timeAgo(p.createdAt)}${p.lastEdited ? ' (đã chỉnh sửa)' : ''}`;
                        }
                    }
                });

                // Xóa comment không còn trong danh sách
                const currentIds = dataToShow.map(d => `VT-cmt-${d.id}`);
                Array.from(list.children).forEach(el => {
                    if (el.id?.startsWith('VT-cmt-') && !currentIds.includes(el.id)) el.remove();
                });

                // Chỉ rebuild tooltip khi có element mới thực sự được thêm vào DOM
                if (hasNewElement) window.VT_RefreshTooltips();
            }

            const loadMoreBox = appBox.querySelector('.VT-load-more-box');
            if (loadMoreBox) toggleEl(loadMoreBox, parents.length > limitCount);

            // updateCommentCount đã được khởi động riêng - không gọi lại ở đây
        });
    };

    // =====================
    // LOAD MORE BÌNH LUẬN CHA
    // =====================

    window.VT_LoadMoreParents = async (btn) => {
        const appBox = btn.closest('.VT-comment-app');
        if (!appBox || IS_LOADING_MAP[appBox.id]) return;

        const postId    = appBox.getAttribute('data-post-id');
        const list      = appBox.querySelector('.VT-comment-list');
        const moreBox   = appBox.querySelector('.VT-load-more-box');

        // Hiện skeleton
        const skeWrap   = document.createElement('div');
        skeWrap.className = 'vt-ske-wrapper';
        skeWrap.innerHTML = renderSkeleton();
        list.appendChild(skeWrap);

        IS_LOADING_MAP[appBox.id] = true;
        if (moreBox) moreBox.style.setProperty('display', 'none', 'important');

        await new Promise(r => setTimeout(r, 1500));

        const isSingleItem   = window.location.pathname.endsWith('.html');
        const incrementValue = isSingleItem ? 5 : 2;
        const currentLimit   = PAGINATION_STATE[postId] || (isSingleItem ? 5 : 2);
        PAGINATION_STATE[postId] = currentLimit + incrementValue;

        startListening(appBox, true);
        skeWrap.style.display = 'none';
        setTimeout(() => {
            skeWrap.remove();
            IS_LOADING_MAP[appBox.id] = false;
        }, 300);
    };

    // =====================
    // MODAL THÔNG BÁO LỖI CHUNG (thay thế alert())
    // _showSimpleModal(title, body, iconClass?) — inject & show 1 lần, tự cleanup
    // =====================

    const _showSimpleModal = (title, body, iconClass = 'fa-circle-exclamation text-warning') => {
        const id = 'VTSimpleModal';
        const old = document.getElementById(id);
        if (old) { bootstrap?.Modal?.getInstance(old)?.dispose(); old.remove(); }

        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-md">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-body text-center p-4">
                            <div class="mb-3">
                                <i class="fad ${iconClass}" style="font-size:2rem"></i>
                            </div>
                            <h5 class="fw-bold mb-2">${title}</h5>
                            <p class="opacity-75 small mb-4">${body}</p>
                            <button class="btn btn-light btn-sm rounded-pill px-4"
                                    data-bs-dismiss="modal">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>`);

        const el  = document.getElementById(id);
        const obj = new bootstrap.Modal(el);
        el.addEventListener('hidden.bs.modal', () => { obj.dispose(); el.remove(); }, { once: true });
        obj.show();
    };

    // =====================
    // MODAL XÁC NHẬN CHUNG (thay thế confirm())
    // _showConfirmModal(title, body, onConfirm, btnLabel?, btnClass?)
    // =====================

    const _showConfirmModal = (title, body, onConfirm, btnLabel = 'Xác nhận', btnClass = 'btn-primary') => {
        const id = 'VTConfirmModal';
        const old = document.getElementById(id);
        if (old) { bootstrap?.Modal?.getInstance(old)?.dispose(); old.remove(); }

        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-md">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-body text-center p-4">
                            <h5 class="fw-bold mb-2">${title}</h5>
                            <p class="opacity-75 small mb-4">${body}</p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-light btn-sm rounded-pill flex-grow-1"
                                        data-bs-dismiss="modal">Hủy</button>
                                <button id="${id}ConfirmBtn"
                                        class="btn ${btnClass} btn-sm rounded-pill flex-grow-1 fw-medium">
                                    ${btnLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`);

        const el  = document.getElementById(id);
        const obj = new bootstrap.Modal(el);
        el.addEventListener('hidden.bs.modal', () => { obj.dispose(); el.remove(); }, { once: true });
        document.getElementById(`${id}ConfirmBtn`).addEventListener('click', () => {
            obj.hide();
            onConfirm();
        });
        obj.show();
    };

    // =====================
    // TOAST THÀNH CÔNG CHO ADMIN
    // _showAdminToast(message, isSuccess?) — autohide 3.5s, góc dưới phải
    // =====================

    const _showAdminToast = (message, isSuccess = true) => {
        if (typeof bootstrap === 'undefined') return;
        const old = document.getElementById('VTAdminToast');
        if (old) { bootstrap.Toast.getInstance(old)?.dispose(); old.closest('.toast-container')?.remove(); }

        const bgClass = isSuccess ? 'bg-success' : 'bg-danger';
        const icon    = isSuccess ? 'fa-circle-check' : 'fa-circle-xmark';

        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1080';
        container.innerHTML = `
            <div id="VTAdminToast" class="toast align-items-center text-white ${bgClass} border-0"
                 role="status" aria-live="polite" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fad ${icon} me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto"
                            data-bs-dismiss="toast"></button>
                </div>
            </div>`;
        document.body.appendChild(container);

        const toastEl  = document.getElementById('VTAdminToast');
        const toastObj = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 });
        toastEl.addEventListener('hidden.bs.toast', () => container.remove(), { once: true });
        toastObj.show();
    };

    // =====================
    // CACHE TRẠNG THÁI HẠN CHẾ — đồng bộ text "Hạn chế/Gỡ hạn chế" khi admin mở dropdown
    // Map<uid, boolean> — lưu trong phiên làm việc của admin
    // Cập nhật sau mỗi lệnh hạn chế/gỡ hạn chế thành công (không cần Firestore read lại)
    // =====================

    const _banStatusCache = new Map();  // uid → true (bị hạn chế) | false (không bị hạn chế)

    // Helper nội bộ: cập nhật label nút trong dropdown theo trạng thái hạn chế
    const _updateBanLabel = (banBtn, isBanned) => {
        if (!banBtn) return;
        banBtn.innerHTML = isBanned
            ? '<i class="fa-duotone fa-solid fa-ban me-2"></i>Gỡ hạn chế người dùng'
            : '<i class="fa-duotone fa-solid fa-ban me-2"></i>Hạn chế người dùng';
    };

    // Public: gọi từ onclick của trigger ellipsis — lazy-fetch 1 lần/uid rồi cache
    // Đảm bảo label "Hạn chế/Gỡ hạn chế" luôn chính xác kể cả sau reload trang
    window.VT_PrepBanLabel = async (triggerEl, uid) => {
        if (!uid || !auth.currentUser || !ADMIN_UIDS.includes(auth.currentUser.uid)) return;

        const dropdown = triggerEl.closest('.dropdown');
        const banBtn   = dropdown?.querySelector('.VT-ban-toggle');
        if (!banBtn) return;

        // Nếu cache có sẵn → cập nhật label ngay, không cần fetch Firestore
        if (_banStatusCache.has(uid)) {
            _updateBanLabel(banBtn, _banStatusCache.get(uid));
            // Đồng bộ class is-banned-user theo cache
            _updateBannedUserClass(uid, _banStatusCache.get(uid));
            return;
        }

        // Chưa có cache → fetch Firestore (1 lần duy nhất / uid / phiên)
        try {
            const snap     = await getDoc(doc(db, 'users', uid));
            const isBanned = snap.exists() && snap.data().banned === true;
            _banStatusCache.set(uid, isBanned);
            _updateBanLabel(banBtn, isBanned);
            // Đồng bộ class is-banned-user sau khi fetch
            _updateBannedUserClass(uid, isBanned);
        } catch(e) {
            console.warn('[Ban] VT_PrepBanLabel: không đọc được trạng thái uid:', uid, e);
        }
    };

    // =====================
    // MODAL XÁC NHẬN XÓA
    // =====================

    const injectDeleteModal = () => {
        if (!document.getElementById('VTDeleteModal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="VTDeleteModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-md">
                        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div class="modal-body text-center p-4">
                                <div class="mb-3 text-danger"><i class="fad fa-trash-can-list" style="font-size:2rem"></i></div>
                                <h5 class="fw-bold">Xác nhận xóa?</h5>
                                <p class="opacity-75 small">Bình luận này sẽ bị xóa vĩnh viễn.</p>
                                <div class="d-flex gap-2 mt-4">
                                    <button class="btn btn-light btn-sm rounded-pill flex-grow-1" data-bs-dismiss="modal">Hủy</button>
                                    <button id="VTConfirmDeleteBtn" class="btn btn-danger btn-sm rounded-pill flex-grow-1">Xóa</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`);
            deleteModalObj = new bootstrap.Modal(document.getElementById('VTDeleteModal'));
        } else {
            deleteModalObj = bootstrap.Modal.getInstance(document.getElementById('VTDeleteModal'))
                          || new bootstrap.Modal(document.getElementById('VTDeleteModal'));
        }

        const confirmBtn = document.getElementById('VTConfirmDeleteBtn');
        confirmBtn.onclick = async () => {
            if (!commentIdToDelete) return;
            confirmBtn.innerText  = 'Đang xóa';
            confirmBtn.disabled   = true;
            try {
                const docRef  = doc(db, "comments", commentIdToDelete);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data  = docSnap.data();
                    const batch = writeBatch(db);
                    // Nếu là reply → giảm childCount của cha
                    if (data.parentId) {
                        batch.update(doc(db, "comments", data.parentId), { childCount: increment(-1) });
                    }
                    batch.delete(docRef);
                    // Nếu là comment cha → xóa luôn toàn bộ reply con
                    if (!data.parentId) {
                        const qChild = query(collection(db, "comments"), where("parentId", "==", commentIdToDelete));
                        (await getDocs(qChild)).forEach(d => batch.delete(d.ref));
                    }
                    await batch.commit();
                    deleteModalObj.hide();

                    // Xóa DOM
                    const itemEl   = document.getElementById(`VT-cmt-${commentIdToDelete}`);
                    const parentId = data.parentId;
                    const parentItem = parentId ? document.getElementById(`VT-cmt-${parentId}`) : null;
                    setTimeout(() => {
                        itemEl?.remove();
                        if (parentId && parentItem) {
                            const childCont = parentItem.querySelector(`.VT-child-list-${parentId}`);
                            const loadBtn   = parentItem.querySelector('[onclick*="VT_LoadSubComments"]');
                            if (childCont && loadBtn) {
                                const cnt = childCont.querySelectorAll('.VT-comment-item').length;
                                if (cnt > 0) {
                                    loadBtn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${cnt} phản hồi`;
                                } else {
                                    childCont.style.display = 'none';
                                    loadBtn.remove();
                                }
                            }
                        }
                    }, 100);
                    commentIdToDelete = null;
                } else {
                    deleteModalObj.hide();
                }
                setTimeout(() => { confirmBtn.innerText = 'Xóa'; confirmBtn.disabled = false; }, 100);
            } catch(e) {
                console.error("[Comments] Lỗi xóa:", e);
                confirmBtn.innerText = 'Xóa';
                confirmBtn.disabled  = false;
                _showSimpleModal(
                    'Có lỗi xảy ra',
                    'Không thể xóa bình luận, hãy thử lại sau.',
                    'fa-circle-exclamation text-danger'
                );
            }
        };
    };

    // =====================
    // MODAL HẠN CHẾ NGƯỜI DÙNG (ADMIN)
    // Cho phép admin chọn lý do, lưu chi tiết vào Firestore users/{uid}
    //
    // ⚠️  KIẾN TRÚC QUAN TRỌNG — FIX ROOT CAUSE BUG v5.4.1:
    // Thay vì dùng closure variable _banContext (dễ bị stale khi VT_InitCommentSystem
    // bị gọi lại bởi vtzone-multipleitems hoặc các script khác), context hạn chế (uid, userName)
    // được lưu trực tiếp vào dataset của modal element (modalEl.dataset.targetUid, ...).
    // Reference nút được lưu vào modalEl._vtBtnRef (không serialize qua dataset).
    // confirmBtn.onclick đọc từ DOM → luôn lấy đúng giá trị, không phụ thuộc closure scope.
    // =====================

    // Lý do hạn chế: key → label hiển thị
    const BAN_REASONS = {
        spam:  'Spam',
        ads:   'Quảng cáo',
        adult: 'Nội dung đồi trụy',
        abuse: 'Xúc phạm và bôi nhọa',
        other: 'Khác'
    };

    const injectBanModal = () => {
        if (document.getElementById('VTBanModal')) return;

        const reasonOptions = Object.entries(BAN_REASONS)
            .map(([k, v]) => `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio"
                           name="vtBanReason" id="vtBanReason_${k}" value="${k}">
                    <label class="form-check-label" for="vtBanReason_${k}">${v}</label>
                </div>`).join('');

        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="VTBanModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-md">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-body p-4">
                            <div class="text-center mb-3 text-warning">
                                <i class="fad fa-ban" style="font-size:2rem"></i>
                            </div>
                            <h5 class="fw-bold text-center mb-1">Hạn chế người dùng</h5>
                            <p id="VTBanUserName" class="text-center opacity-75 small mb-3"></p>
                            <p class="fw-medium small mb-2">Chọn lý do hạn chế:</p>
                            ${reasonOptions}
                            <!-- Khung nhập lý do khác, hiện khi chọn "Khác" -->
                            <div id="vtBanOtherWrap" class="mt-2" style="display:none">
                                <input type="text" id="vtBanOtherReason"
                                       class="form-control form-control-sm rounded shadow-none border"
                                       placeholder="Nhập lý do cụ thể..." maxlength="200">
                            </div>
                            <div id="vtBanError" class="text-danger small mt-2"
                                 style="display:none">Vui lòng chọn lý do hạn chế.</div>
                            <div class="d-flex gap-2 mt-4">
                                <button class="btn btn-light btn-sm rounded-pill flex-grow-1"
                                        data-bs-dismiss="modal">Hủy</button>
                                <button id="VTConfirmBanBtn"
                                        class="btn btn-warning btn-sm rounded-pill flex-grow-1 fw-bold">
                                    Xác nhận hạn chế
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`);

        const banModalEl = document.getElementById('VTBanModal');
        const banModal   = new bootstrap.Modal(banModalEl);
        const confirmBtn = document.getElementById('VTConfirmBanBtn');
        const errorEl    = document.getElementById('vtBanError');
        const otherWrap  = document.getElementById('vtBanOtherWrap');
        const otherInput = document.getElementById('vtBanOtherReason');

        // Hiện/ẩn ô nhập khi chọn "Khác"
        document.querySelectorAll('input[name="vtBanReason"]').forEach(radio => {
            radio.addEventListener('change', () => {
                otherWrap.style.display = radio.value === 'other' ? 'block' : 'none';
                errorEl.style.display   = 'none';
            });
        });

        // Reset form khi modal đóng
        banModalEl.addEventListener('hidden.bs.modal', () => {
            document.querySelectorAll('input[name="vtBanReason"]').forEach(r => r.checked = false);
            otherInput.value        = '';
            otherWrap.style.display = 'none';
            errorEl.style.display   = 'none';
            confirmBtn.innerText    = 'Xác nhận hạn chế';
            confirmBtn.disabled     = false;
            // Xóa context sau khi modal đóng
            delete banModalEl.dataset.targetUid;
            delete banModalEl.dataset.targetUserName;
            banModalEl._vtBtnRef = null;
        });

        confirmBtn.onclick = async () => {
            // ── Đọc context từ dataset của modal element (không dùng closure variable) ──
            // Đảm bảo luôn đọc đúng uid dù VT_InitCommentSystem bị gọi bao nhiêu lần
            const targetUid  = banModalEl.dataset.targetUid;
            const targetName = banModalEl.dataset.targetUserName;
            const btnRef     = banModalEl._vtBtnRef;  // reference nút trong dropdown

            // Guard an toàn
            if (!targetUid) {
                console.error('[Ban] confirmBtn.onclick: không có targetUid trong modal dataset');
                _showSimpleModal('Lỗi', 'Không xác định được người dùng cần hạn chế.', 'fa-circle-xmark text-danger');
                return;
            }

            const selectedRadio = document.querySelector('input[name="vtBanReason"]:checked');
            if (!selectedRadio) {
                errorEl.style.display = 'block';
                return;
            }
            errorEl.style.display = 'none';

            const reasonType   = selectedRadio.value;
            const reasonLabel  = BAN_REASONS[reasonType];
            const customReason = (reasonType === 'other' && otherInput.value.trim())
                ? otherInput.value.trim()
                : reasonLabel;

            // Guard: xác nhận admin đang đăng nhập
            if (!auth.currentUser || !ADMIN_UIDS.includes(auth.currentUser.uid)) return;

            confirmBtn.innerText = 'Đang xử lý...';
            confirmBtn.disabled  = true;

            try {
                // Lưu chi tiết hạn chế vào Firestore users/{uid}:
                // banned        → trạng thái hạn chế (true/false)
                // bannedAt      → thời điểm hạn chế (serverTimestamp)
                // banReasonType → key lý do (spam/ads/adult/abuse/other) — dùng cho filter
                // banReason     → text lý do hiển thị cho user
                // bannedBy      → displayName admin thực thi lệnh
                await updateDoc(doc(db, 'users', targetUid), {
                    banned:        true,
                    bannedAt:      serverTimestamp(),
                    banReasonType: reasonType,
                    banReason:     customReason,
                    bannedBy:      auth.currentUser.displayName || auth.currentUser.email || 'Admin'
                });

                console.log(`[Ban] Đã hạn chế ${targetName} (${targetUid}) — lý do: ${customReason}`);

                // Cập nhật cache, label nút và class is-banned-user
                _banStatusCache.set(targetUid, true);
                _updateBanLabel(btnRef, true);
                _updateBannedUserClass(targetUid, true);

                // Toast thành công cho admin
                _showAdminToast(`Đã hạn chế tài khoản "${targetName}" — lý do: ${customReason}.`);

                banModal.hide();

            } catch(e) {
                console.error('[Ban] Lỗi hạn chế user:', e);
                confirmBtn.innerText = 'Xác nhận hạn chế';
                confirmBtn.disabled  = false;
                _showSimpleModal(
                    'Lỗi',
                    'Không thể thực hiện lệnh hạn chế, hãy thử lại sau.',
                    'fa-circle-xmark text-danger'
                );
            }
        };

        // Expose modal instance để VT_ToggleBanUser gọi được
        window._vtBanModalInstance = banModal;
    };

    // =====================
    // VT_ToggleBanUser — toggle hạn chế/gỡ hạn chế người dùng (chỉ Admin)
    // Gọi từ onclick trong dropdown ellipsis của comment
    // =====================

    window.VT_ToggleBanUser = async (uid, userName, btnEl) => {
        // Guard: phải là admin đang đăng nhập
        if (!auth.currentUser || !ADMIN_UIDS.includes(auth.currentUser.uid)) return;
        if (!uid) return;

        // Guard: không hạn chế admin khác hoặc tự hạn chế mình
        if (ADMIN_UIDS.includes(uid)) {
            _showSimpleModal(
                'Không thể thực hiện',
                'Không thể hạn chế tài khoản quản trị viên.',
                'fa-shield-halved text-warning'
            );
            return;
        }
        if (uid === auth.currentUser.uid) {
            _showSimpleModal(
                'Không thể thực hiện',
                'Bạn không thể tự hạn chế tài khoản của chính mình.',
                'fa-shield-halved text-warning'
            );
            return;
        }

        try {
            // Đọc trạng thái hạn chế hiện tại từ Firestore để toggle chính xác
            const userSnap = await getDoc(doc(db, 'users', uid));
            const isBanned = userSnap.exists() && userSnap.data().banned === true;

            if (isBanned) {
                // ── Gỡ hạn chế — hiện modal xác nhận Bootstrap 5 ──────────────────
                _showConfirmModal(
                    'Gỡ hạn chế người dùng',
                    `Gỡ hạn chế tài khoản <strong>${userName}</strong>?`,
                    async () => {
                        try {
                            await updateDoc(doc(db, 'users', uid), {
                                banned:        false,
                                bannedAt:      null,
                                banReasonType: null,
                                banReason:     null,
                                bannedBy:      null
                            });

                            // Cập nhật cache, label nút và class is-banned-user
                            _banStatusCache.set(uid, false);
                            _updateBanLabel(btnEl, false);
                            _updateBannedUserClass(uid, false);

                            console.log(`[Ban] Đã gỡ hạn chế ${userName} (${uid})`);
                            _showAdminToast(`Đã gỡ hạn chế tài khoản "${userName}" thành công.`);

                        } catch(e) {
                            console.error('[Ban] Lỗi gỡ hạn chế:', e);
                            _showSimpleModal(
                                'Lỗi',
                                'Không thể gỡ hạn chế, hãy thử lại sau.',
                                'fa-circle-xmark text-danger'
                            );
                        }
                    },
                    'Gỡ hạn chế',
                    'btn-success'
                );

            } else {
                // ── Hiện modal chọn lý do hạn chế ────────────────────────────────
                if (!document.getElementById('VTBanModal')) injectBanModal();

                // ⚠️  Ghi context vào dataset của modal element (không dùng closure variable)
                // Đây là fix chính cho bug "_banContext.uid is null" (v5.4.1)
                const banModalEl = document.getElementById('VTBanModal');
                banModalEl.dataset.targetUid      = uid;
                banModalEl.dataset.targetUserName = userName;
                banModalEl._vtBtnRef              = btnEl;  // reference nút trong dropdown

                // Cập nhật tên user hiển thị trong modal
                const nameEl = document.getElementById('VTBanUserName');
                if (nameEl) nameEl.innerText = `@${userName}`;

                // Reset radio selection
                document.querySelectorAll('input[name="vtBanReason"]').forEach(r => r.checked = false);

                window._vtBanModalInstance?.show();
            }

        } catch(e) {
            console.error('[Ban] Lỗi VT_ToggleBanUser:', e);
            _showSimpleModal('Lỗi', 'Có lỗi xảy ra, hãy thử lại.', 'fa-circle-xmark text-danger');
        }
    };

    // =====================
    // ĐỒNG BỘ UI THEO TRẠNG THÁI AUTH
    // Cập nhật avatar, placeholder, xóa reply box khi login/logout
    // =====================

    const VT_SyncUserUI = (user) => {
        const photoURL = user?.photoURL || DEFAULT_AVATAR;
        document.querySelectorAll('.VT-user-avatar').forEach(img => img.src = photoURL);

        document.querySelectorAll('.VT-comment-app').forEach(app => {
            // Bỏ qua nếu bình luận đang bị tắt
            if (app.dataset.commentDisabled === 'true') return;
            const input   = app.querySelector('.VT-comment-input');
            const ph      = app.querySelector('.VT-placeholder');
            const sendBtn = app.querySelector('.VT-input-area button[onclick*="VT_SendComment"]');

            if (input) {
                // User bị hạn chế: KHÔNG re-enable contenteditable
                input.contentEditable = (!!user && !window._vtUserBanned) ? 'true' : 'false';
                if (!user) { input.innerText = ""; VT_HandlePlaceholder(input); }
                if (ph) ph.innerText = window._vtUserBanned
                    ? 'Tài khoản của bạn đã bị hạn chế.'
                    : user
                        ? `Bình luận dưới tên ${user.displayName}`
                        : 'Đăng nhập để bình luận về bài viết này.';
            }
            // Ẩn nút Đăng bình luận khi chưa đăng nhập HOẶC đang bị hạn chế
            if (sendBtn) sendBtn.style.display = (user && !window._vtUserBanned) ? '' : 'none';
        });

        // Xóa hết reply box đang mở khi login/logout tránh hiện sai avatar/tên
        document.querySelectorAll('.VT-dynamic-reply-box').forEach(box => box.remove());
    };

    // =====================
    // AUTH STATE LISTENER
    // onAuthStateChanged luôn fire 1 lần ngay khi trang load (kể cả guest)
    // → là initializer duy nhất, không cần initApps() riêng
    // =====================

    onAuthStateChanged(auth, (user) => {
        // Hủy toàn bộ listener cũ để tránh duplicate
        Object.values(unsubscribeMap).forEach(unsub => unsub());
        unsubscribeMap = {};

        VT_SyncUserUI(user);
        injectDeleteModal();
        injectBanModal();
        document.querySelectorAll('.VT-comment-app').forEach(app => startListening(app, true));
    });

    // =====================
    // LOAD BÌNH LUẬN CON (PHẢN HỒI)
    // Thuần JS - không dùng jQuery
    // =====================

    window.VT_LoadSubComments = async (btn, parentId) => {
        const childList = document.querySelector(`.VT-child-list-${parentId}`);
        if (!childList) return;

        // Guard chống double-click trong lúc đang animate
        if (childList.dataset.animating === 'true') return;

        // Nếu đã có data → toggle show/hide (slideToggle thuần JS)
        if (childList.innerHTML.trim() !== '') {
            const isHidden = childList.style.display === 'none' || childList.style.display === '';
            const count    = childList.querySelectorAll('.VT-comment-item').length;

            childList.dataset.animating = 'true';

            if (isHidden) {
                childList.style.display  = 'block';
                childList.style.overflow = 'hidden';
                const h = childList.scrollHeight;
                childList.style.maxHeight = '0px';
                childList.style.transition = 'max-height 300ms ease';
                requestAnimationFrame(() => {
                    childList.style.maxHeight = h + 'px';
                });
                setTimeout(() => {
                    childList.style.maxHeight  = '';
                    childList.style.transition = '';
                    childList.style.overflow   = '';
                    childList.dataset.animating = 'false';
                    btn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${count} phản hồi`;
                }, 300);
            } else {
                childList.style.overflow   = 'hidden';
                childList.style.maxHeight  = childList.scrollHeight + 'px';
                childList.style.transition = 'max-height 300ms ease';
                requestAnimationFrame(() => {
                    childList.style.maxHeight = '0px';
                });
                setTimeout(() => {
                    childList.style.display    = 'none';
                    childList.style.maxHeight  = '';
                    childList.style.transition = '';
                    childList.style.overflow   = '';
                    childList.dataset.animating = 'false';
                    btn.innerHTML = `<i class="fa-duotone fa-turn-down-right me-2"></i>${count} phản hồi`;
                }, 300);
            }
            return;
        }

        // Chưa có data → fetch từ Firestore
        btn.innerHTML        = `<i class="fa-duotone fa-solid fa-spinner-third fa-spin me-2"></i>đang tải...`;
        btn.style.pointerEvents = 'none';

        try {
            const q    = query(
                collection(db, "comments"),
                where("parentId", "==", parentId),
                orderBy("createdAt", "asc")
            );
            const snap = await getDocs(q);
            let html   = '';
            snap.forEach(d => { html += createHtml({ id: d.id, ...d.data() }, auth.currentUser?.uid === d.data().uid, true); });
            childList.innerHTML = html;

            const count = snap.size;

            // Animate show
            childList.style.display  = 'block';
            childList.style.overflow = 'hidden';
            childList.style.maxHeight = '0px';
            childList.style.transition = 'max-height 300ms ease';
            requestAnimationFrame(() => {
                childList.style.maxHeight = childList.scrollHeight + 'px';
            });
            setTimeout(() => {
                childList.style.maxHeight  = '';
                childList.style.transition = '';
                childList.style.overflow   = '';
                btn.innerHTML              = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${count} phản hồi`;
                btn.style.pointerEvents    = 'auto';
            }, 300);

        } catch(e) {
            console.error("[Comments] Lỗi load reply:", e);
            btn.innerHTML         = 'Lỗi';
            btn.style.pointerEvents = 'auto';
        }
    };

    // =====================
    // FOCUS COMMENT TỪ URL HASH
    // =====================

    window.VT_FocusComment = () => {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#VT-cmt-')) return;
        const targetId = hash.replace('#', '');
        setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const bubble = el.querySelector('.VT-comment-bubble');
                if (bubble) {
                    // Fix lỗi cú pháp cũ: bubble.style.animation.iteration.count không tồn tại
                    bubble.style.animation = 'VT-heartbeat 1.5s ease-in-out 1';
                }
            }
        }, 500);
    };

    // =====================
    // XỬ LÝ PASTE - Chỉ dán text thuần, không cho dán HTML
    // Guard: chỉ đăng ký 1 lần dù VT_InitCommentSystem bị gọi nhiều lần (AJAX)
    // =====================

    if (!window._vtPasteHandlerRegistered) {
        window._vtPasteHandlerRegistered = true;
        document.addEventListener('paste', (e) => {
            const target = e.target.closest('[contenteditable="true"]');
            if (!target) return;
            e.preventDefault();
            const text = (e.originalEvent || e).clipboardData.getData('text/plain');
            document.execCommand("insertHTML", false, text);
        });
    }

    // =====================
    // MUTATION OBSERVER
    // Tự động init comment app mới khi AJAX load thêm bài viết vào DOM
    // =====================

    const observer = new MutationObserver((mutations) => {
        let hasNew = false;
        mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                const apps      = node.querySelectorAll('.VT-comment-app');
                const isDirect  = node.classList.contains('VT-comment-app');
                if (apps.length || isDirect) {
                    hasNew = true;
                    if (isDirect && node.dataset.loaded !== "true") startListening(node);
                    apps.forEach(app => { if (app.dataset.loaded !== "true") startListening(app); });
                }
            });
        });
        if (hasNew) VT_SyncUserUI(auth.currentUser);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // VT_FocusComment gọi 1 lần sau khi khởi tạo xong
    // setTimeout bên trong nó (500ms) đủ thời gian cho onSnapshot render lần đầu
    window.VT_FocusComment();
};

// =====================
// KHỞI CHẠY MODULE BÌNH LUẬN
// =====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VT_InitCommentSystem());
} else {
    window.VT_InitCommentSystem();
}

// =========================================================================================
// VT Zone Firebase System v5.6.0 - Ready
// =========================================================================================
