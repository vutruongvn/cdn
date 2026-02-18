// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG FIREBASE TỔNG HỢP
 * Tính năng: Auth, Like, View History, Session Cache, Admin Tools
 * Phiên bản: 5.0.0
 * Cập nhật: 18/2/2026
 */
// =========================================================================================

// =====================
// IMPORT FIREBASE v10
// =====================
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =====================
// CẤU HÌNH & KHỞI TẠO FIREBASE
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

const app  = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db   = getFirestore(app);
const auth = getAuth(app);

// Export ra window để các file khác dùng chung
window.db   = db;
window.auth = auth;

console.log("[Firebase] App, Firestore, Auth sẵn sàng (v10)");

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
// ADMIN TOOLS
// Hiển thị/Ẩn .VT-admin-tools dựa trên UID - không reload trang
// =====================

const VT_ADMIN_UID = 'u9U3j9O63jbipOgai3o88X4008q2';

function applyAdminToolsUI(uid) {
    const isAdmin    = uid === VT_ADMIN_UID;
    const adminTools = document.querySelectorAll('.VT-admin-tools');

    if (isAdmin) {
        // Là admin: gỡ class ẩn, KHÔNG xóa khỏi DOM
        adminTools.forEach(el => el.classList.remove('d-none'));
        sessionStorage.setItem('VT_AdminLogged', 'true');
    } else {
        // Không phải admin: XÓA khỏi DOM để bảo mật
        adminTools.forEach(el => el.remove());
        sessionStorage.removeItem('VT_AdminLogged');
    }
}

// Export để các file khác (multiple-items, body) gọi sau AJAX load
window.VT_ApplyAdminUI = function() {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    applyAdminToolsUI(uid);
};

// Tương thích với body.js (VT_InitAdminSystem dùng firebase.auth().onAuthStateChanged)
// Hàm này đã được thay thế hoàn toàn bởi logic trong onAuthStateChanged dưới đây
// Giữ lại để không break bất kỳ lời gọi nào từ code cũ
window.VT_InitAdminSystem = function() {
    // Không làm gì - logic đã được gộp vào onAuthStateChanged bên dưới
    // Admin tools được xử lý trong applyAdminToolsUI
    updateAuthUI(user);
};

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

    // Áp dụng admin tools theo uid của user
    const uid = user ? user.uid : null;
    applyAdminToolsUI(uid);
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
// KHỞI TẠO KHI DOM READY
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
            .then(() => console.log("[Auth] Đăng nhập thành công"))
            .catch(err => console.error("[Auth] Lỗi đăng nhập:", err.message));
    }));

    // Sự kiện đăng xuất
    signOutButtons.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        clearUserSession(); // Xóa cache ngay - UI cập nhật tức thì không cần reload
        firebaseSignOut(auth)
            .then(() => console.log("[Auth] Đăng xuất thành công"))
            .catch(err => console.error("[Auth] Lỗi đăng xuất:", err.message));
    }));

    countView();
    initLikeCountDisplay();

    // =====================
    // AUTH STATE LISTENER DUY NHẤT
    // Gộp tất cả logic phụ thuộc auth vào 1 listener - tối ưu Firebase calls
    // =====================
    const likeButtons  = document.querySelectorAll('.likePost');
    let isPopupShowing = false;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("[Auth] Đã đăng nhập:", user.email);

            // Cập nhật cache và UI
            saveUserSession(user);
            updateAuthUI(user);

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
            console.log("[Auth] Guest mode");

            clearUserSession();
            updateAuthUI(null);

            // Like buttons: chuyển về trạng thái guest + hiện popup khi click
            const loginPopup = document.querySelector('.VTloginPopup');
            likeButtons.forEach(btn => {
                updateLikeUI(btn, false);
                btn.onclick = (e) => {
                    e.preventDefault();
                    if (loginPopup && !isPopupShowing) {
                        isPopupShowing            = true;
                        loginPopup.style.display  = 'block';
                        loginPopup.style.opacity  = '0';
                        setTimeout(() => {
                            loginPopup.style.transition = 'opacity 300ms';
                            loginPopup.style.opacity    = '1';
                        }, 10);
                        setTimeout(() => {
                            loginPopup.style.opacity = '0';
                            setTimeout(() => {
                                loginPopup.style.display = 'none';
                                isPopupShowing           = false;
                            }, 300);
                        }, 3000);
                    }
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
        setTimeout(() => window.location.reload(), 500);

    } catch(err) {
        console.error("[One Tap] Lỗi:", err.message);
    }
};

// =========================================================================================
// VT Zone Firebase System v5.0.0 - Ready
// =========================================================================================
