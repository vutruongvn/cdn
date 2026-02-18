// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG FIREBASE TỔNG HỢP
 * Các tính năng: Auth, Like, View, History...
 * Phiên bản: 4.1.0 (Firebase v10 + Session Cache + Unified Auth Listener)
 * Cập nhật: 18/2/2026
 * VT Zone - vutruong.vn
 */
// =========================================================================================

console.log('%c🚀 VT-Zone Firebase System', 'color: #4285F4; font-weight: bold; font-size: 14px;');
console.log('%c📦 Đang khởi tạo Firebase v10 + Session Cache...', 'color: #666;');

// --- IMPORT FIREBASE v10 MODULES ---
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

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyD0t0UgJlOjZEdhbmznGN5hRKCSMLkA_yU",
    authDomain: "vutruong-vn.firebaseapp.com",
    databaseURL: "https://vutruong-vn-default-rtdb.firebaseio.com",
    projectId: "vutruong-vn",
    storageBucket: "vutruong-vn.firebasestorage.app",
    messagingSenderId: "417755493462",
    appId: "1:417755493462:web:3102aba63f638f7"
};

// --- KHỞI TẠO FIREBASE ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// =========================================================================================
// 🔧 COMPATIBILITY LAYER - FIX LỖI ĐỆ QUY
// =========================================================================================

// LƯU REFERENCE GỐC trước khi override
const _originalGoogleAuthProviderCredential = GoogleAuthProvider.credential.bind(GoogleAuthProvider);
const _originalGoogleAuthProvider = GoogleAuthProvider;

// Tạo firebase namespace giả lập
window.firebase = {
    apps: getApps(),
    initializeApp: (config) => initializeApp(config),
    auth: function() { return auth; },
    firestore: function() { return db; }
};

// Thêm GoogleAuthProvider - KHÔNG override credential ngay
window.firebase.auth.GoogleAuthProvider = class {
    constructor() {
        return new _originalGoogleAuthProvider();
    }
};

// Thêm static method credential - dùng reference gốc đã lưu
window.firebase.auth.GoogleAuthProvider.credential = function(idToken, accessToken) {
    console.log('%c🔑 [Auth] Creating credential from token', 'color: #34A853;');
    return _originalGoogleAuthProviderCredential(idToken, accessToken);
};

// Thêm FieldValue cho Firestore
window.firebase.firestore.FieldValue = {
    serverTimestamp: () => serverTimestamp(),
    increment: (n) => increment(n)
};

console.log('%c✅ Firebase Compatibility Layer đã được tạo', 'color: #34A853; font-weight: bold;');

// =========================================================================================

// Export ra window để các file khác sử dụng
window.db = db;
window.auth = auth;

console.log('%c✅ Firebase App, Firestore và Auth đã sẵn sàng (v10)', 'color: #4285F4; font-weight: bold;');

// =========================================================================================
// SESSION CACHE - LƯU PHIÊN ĐĂNG NHẬP VÀO LOCALSTORAGE
// Mục đích: Render UI ngay lập tức khi load trang, không chờ Firebase resolve
// =========================================================================================

const SESSION_KEY = 'vt_user_session';
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 ngày

function saveUserSession(user) {
    if (!user) return;
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            cachedAt: Date.now()
        }));
        console.log('%c💾 [Session] Phiên đăng nhập đã được lưu', 'color: #34A853;');
    } catch (e) {
        console.warn('%c⚠️ [Session] Không thể lưu session:', 'color: #FBBC04;', e);
    }
}

function getCachedUser() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data.cachedAt || Date.now() - data.cachedAt > SESSION_TTL) {
            localStorage.removeItem(SESSION_KEY);
            console.log('%c⏰ [Session] Cache hết hạn, đã xóa', 'color: #FBBC04;');
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

function clearUserSession() {
    localStorage.removeItem(SESSION_KEY);
    console.log('%c🗑️ [Session] Đã xóa phiên đăng nhập', 'color: #EA4335;');
}

// Đọc cache ngay lập tức - trước khi Firebase resolve
const _cachedUser = getCachedUser();
if (_cachedUser) {
    console.log(`%c⚡ [Session] Phát hiện phiên cache: ${_cachedUser.displayName}`, 'color: #34A853; font-weight: bold;');
}

// =========================================================================================

// --- BIẾN KIỂM TRA TRANG ---
const isPostPage = window.location.pathname.indexOf(".html") > -1;
const isItemPageByBlogger = typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.pageType === "item";

console.log(`%c📄 [Page] Type: ${isItemPageByBlogger ? 'Item Page' : 'Index Page'}`, 'color: #666;');

// --- BIẾN UI ---
let userNullContainers, userTrueContainers, signInLinks, signOutButtons, userNameDisplays, userPhotoDisplays;

// =========================================================================================
// PHẦN 1: XỬ LÝ ĐĂNG NHẬP/ĐĂNG XUẤT
// =========================================================================================

function signInWithGoogle() {
    console.log('%c🔐 [Auth] Initiating Google Sign-in...', 'color: #EA4335;');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithPopup(auth, provider)
        .then(() => console.log('%c✅ [Auth] Sign-in successful', 'color: #34A853; font-weight: bold;'))
        .catch((error) => console.error('%c❌ [Auth] Sign-in failed:', 'color: #EA4335; font-weight: bold;', error.message));
}

function signOut() {
    console.log('%c🚪 [Auth] Signing out...', 'color: #EA4335;');
    // Xóa cache ngay lập tức - không chờ Firebase
    clearUserSession();
    firebaseSignOut(auth)
        .then(() => console.log('%c✅ [Auth] Sign-out successful', 'color: #34A853;'))
        .catch((error) => console.error('%c❌ [Auth] Sign-out failed:', 'color: #EA4335;', error.message));
}

// =========================================================================================
// PHẦN 2: CẬP NHẬT GIAO DIỆN - PURE JAVASCRIPT (NO JQUERY)
// =========================================================================================

function updateAuthUI(user) {
    console.log(`%c👤 [UI] Updating auth UI for: ${user ? user.displayName : 'Guest'}`, 'color: #4285F4;');
    const name = user ? user.displayName : '';
    const photo = user ? user.photoURL : '';

    userNullContainers.forEach(el => { if (el) el.style.display = user ? 'none' : 'block'; });
    userTrueContainers.forEach(el => { if (el) el.style.display = user ? 'block' : 'none'; });
    userNameDisplays.forEach(el => { el.innerText = name; });
    userPhotoDisplays.forEach(el => { el.src = photo; });

    console.log('%c✅ [UI] Auth UI updated successfully', 'color: #34A853; font-weight: bold;');
}

function updateLikeUI(btnElement, isLiked) {
    const iconElement = btnElement.querySelector('i');
    btnElement.classList.toggle('active-like', isLiked);
    if (iconElement) {
        iconElement.classList.toggle('fad', !isLiked);
        iconElement.classList.toggle('fa-solid', isLiked);
    }
}

window.updateLikeUI = updateLikeUI;

// =========================================================================================
// PHẦN 3: XỬ LÝ LƯỢT XEM BÀI VIẾT
// =========================================================================================

function countView() {
    if (!isPostPage || !db) return;
    const viewElement = document.querySelector('.post-view-count');
    const viewDisplay = viewElement ? (viewElement.querySelector('#view-count-number') || viewElement.querySelector('span')) : null;
    if (!viewElement || !viewDisplay) return;
    const postId = viewElement.getAttribute('data-id');
    if (!postId) return;

    console.log(`%c📊 [View] Tracking view for post: ${postId}`, 'color: #FBBC04;');

    /* --- TẠM ĐÓNG BĂNG TÍNH NĂNG VIEW POST
    const viewDocRef = doc(db, 'views', postId);
    setDoc(viewDocRef, { count: increment(1) }, { merge: true })
        .then(() => {
            onSnapshot(viewDocRef, (docSnap) => {
                viewDisplay.innerText = docSnap.exists() ? docSnap.data().count.toLocaleString('en-US') : '1';
            }, (error) => {
                console.error("Lỗi khi theo dõi lượt xem:", error);
                viewDisplay.innerText = 'Lỗi!';
            });
        })
        .catch((error) => {
            console.error("Lỗi khi cập nhật lượt xem:", error);
            viewDisplay.innerText = 'Lỗi!';
        });
    --- KẾT THÚC COMMENT --- */
    viewDisplay.innerText = 'x';
}

// =========================================================================================
// PHẦN 4: HIỂN THỊ TỔNG LƯỢT LIKE
// =========================================================================================

function initLikeCountDisplay() {
    if (!db) return;
    const likeButtons = document.querySelectorAll('.likePost[data-post-id]');
    const postIds = new Set();
    likeButtons.forEach(btn => {
        const postId = btn.getAttribute('data-post-id');
        if (postId) postIds.add(postId);
    });

    console.log(`%c❤️ [Like] Monitoring ${postIds.size} posts`, 'color: #EA4335;');

    postIds.forEach(postId => {
        onSnapshot(doc(db, 'postMetrics', postId), docSnap => {
            const count = docSnap.exists() ? (docSnap.data().likeCount || 0) : 0;
            const formattedCount = count.toLocaleString('en-US');
            document.querySelectorAll(`.likePost[data-post-id="${postId}"] .like-count`)
                .forEach(el => el.innerText = formattedCount);
        }, err => console.error(`%c❌ [Like] Error for post ${postId}:`, 'color: #EA4335;', err));
    });
}

window.initLikeCountDisplay = initLikeCountDisplay;

// =========================================================================================
// PHẦN 5: XỬ LÝ LIKE/UNLIKE CÁ NHÂN
// =========================================================================================

function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    const postId = button.getAttribute('data-post-id');
    
    // LẤY THÔNG TIN BÀI VIẾT - NHIỀU CÁCH DỰ PHÒNG
    let postTitle = button.getAttribute('data-post-title');
    let postUrl = button.getAttribute('data-post-url');
    
    if (!postTitle || !postUrl) {
        const postContainer = button.closest('article.post, .post-outer, [data-post-id]');
        if (postContainer) {
            if (!postTitle) {
                const titleElement = postContainer.querySelector('.post-title a, h2.post-title, h1.post-title, [itemprop="name"]');
                postTitle = titleElement ? titleElement.textContent.trim() : '';
            }
            if (!postUrl) {
                const linkElement = postContainer.querySelector('.post-title a, a[rel="bookmark"], [itemprop="url"]');
                postUrl = linkElement ? linkElement.href : window.location.href;
            }
        }
    }
    
    if (!postTitle) postTitle = document.title;
    if (!postUrl) postUrl = window.location.href.split('?')[0];

    console.log(`%c❤️ [Like] Init button for post: ${postId}`, 'color: #EA4335;');

    const userLikeRef = doc(db, 'users', user.uid, 'likes', postId);
    const postMetricsRef = doc(db, 'postMetrics', postId);

    // Lắng nghe trạng thái like
    onSnapshot(userLikeRef, docSnap => updateLikeUI(button, docSnap.exists()));

    // Gán sự kiện click
    button.onclick = async (e) => {
        e.preventDefault();
        const currentLikeDoc = await getDoc(userLikeRef);

        if (currentLikeDoc.exists()) {
            // UNLIKE
            console.log(`%c💔 [Like] Unliking post: ${postId}`, 'color: #EA4335;');
            try {
                await deleteDoc(userLikeRef);
                await updateDoc(postMetricsRef, { likeCount: increment(-1) });
            } catch (error) {
                if (error.code === 'not-found') {
                    await setDoc(postMetricsRef, { likeCount: 0 });
                } else {
                    console.error('%c❌ [Like] Unlike error:', 'color: #EA4335;', error);
                }
            }
        } else {
            // LIKE
            console.log(`%c❤️ [Like] Liking post: ${postId}`, 'color: #EA4335;');
            try {
                await setDoc(userLikeRef, { postId, postTitle, postUrl, timestamp: serverTimestamp() });
                const postMetricDoc = await getDoc(postMetricsRef);
                if (postMetricDoc.exists()) {
                    await updateDoc(postMetricsRef, { likeCount: increment(1) });
                } else {
                    await setDoc(postMetricsRef, { likeCount: 1 });
                }
            } catch (error) {
                console.error('%c❌ [Like] Like error:', 'color: #EA4335;', error);
            }
        }
    };
}

window.initSingleLikeButton = initSingleLikeButton;

// =========================================================================================
// PHẦN 6: LƯU LỊCH SỬ XEM BÀI VIẾT
// =========================================================================================

async function saveViewHistory(user) {
    let postId = null;
    if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.postId) {
        postId = _WidgetManager._GetAllData().blog.postId;
    }
    if (!postId) {
        const postContainer = document.querySelector('article.post[data-post-id], .post-outer[data-post-id]');
        if (postContainer) postId = postContainer.getAttribute('data-post-id');
    }

    if (!postId || !db) {
        console.warn('%c⚠️ [History] Post ID not found', 'color: #FBBC04;');
        return;
    }

    console.log(`%c📚 [History] Saving view history for post: ${postId}`, 'color: #FBBC04;');
    try {
        await setDoc(doc(db, 'users', user.uid, 'viewedHistory', postId), {
            postId,
            title: document.title,
            url: window.location.href.split('?')[0],
            timestamp: serverTimestamp()
        }, { merge: true });
        console.log('%c✅ [History] View history saved', 'color: #34A853;');
    } catch (error) {
        console.error('%c❌ [History] Save error:', 'color: #EA4335;', error);
    }
}

// =========================================================================================
// PHẦN 7: KHỞI TẠO KHI DOM READY
// =========================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🎨 [DOM] DOM Content Loaded', 'color: #4285F4; font-weight: bold;');
    
    // Gán các biến UI
    userNullContainers = document.querySelectorAll('.user-auth-null');
    userTrueContainers = document.querySelectorAll('.user-auth-true');
    signInLinks = document.querySelectorAll('.sign-in-link');
    signOutButtons = document.querySelectorAll('.sign-out-button-class');
    userNameDisplays = document.querySelectorAll('.user-name-display');
    userPhotoDisplays = document.querySelectorAll('.user-photo-display');

    console.log(`%c🎨 [DOM] Found UI elements:`, 'color: #666;', {
        userAuthNull: userNullContainers.length,
        userAuthTrue: userTrueContainers.length,
        signInLinks: signInLinks.length,
        signOutButtons: signOutButtons.length,
        userNameDisplays: userNameDisplays.length,
        userPhotoDisplays: userPhotoDisplays.length
    });

    // ⚡ RENDER UI NGAY LẬP TỨC TỪ CACHE - không chờ Firebase
    if (_cachedUser) {
        console.log('%c⚡ [Session] Render UI từ cache ngay lập tức', 'color: #34A853; font-weight: bold;');
        updateAuthUI(_cachedUser);
    }

    // Gắn sự kiện đăng nhập
    signInLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); signInWithGoogle(); }));

    // Gắn sự kiện đăng xuất
    signOutButtons.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); signOut(); }));

    // Khởi động bộ đếm lượt xem
    countView();

    // Khởi động bộ đếm lượt Like
    initLikeCountDisplay();

    // ✅ MỘT LISTENER DUY NHẤT cho toàn bộ auth logic (Like + History + UI)
    const likeButtons = document.querySelectorAll('.likePost');
    let isPopupShowing = false;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log(`%c👤 [Auth] User logged in: ${user.email}`, 'color: #34A853; font-weight: bold;');

            // Lưu phiên đăng nhập vào cache
            saveUserSession(user);

            // Cập nhật UI
            updateAuthUI(user);

            // Lưu lịch sử xem (chỉ trên bài viết đơn)
            if (isItemPageByBlogger) saveViewHistory(user);

            // Khởi tạo like buttons
            if (likeButtons.length > 0) {
                likeButtons.forEach(btn => initSingleLikeButton(btn, user));
            }
        } else {
            console.log('%c⚠️ [Auth] No user logged in', 'color: #FBBC04;');

            // Xóa cache phiên đăng nhập
            clearUserSession();

            // Cập nhật UI
            updateAuthUI(null);

            // Xử lý chưa đăng nhập
            if (likeButtons.length > 0) {
                const loginPopup = document.querySelector('.VTloginPopup');
                likeButtons.forEach(btn => {
                    updateLikeUI(btn, false);
                    btn.onclick = (e) => {
                        e.preventDefault();
                        if (loginPopup && !isPopupShowing) {
                            isPopupShowing = true;
                            loginPopup.style.display = 'block';
                            loginPopup.style.opacity = '0';
                            setTimeout(() => {
                                loginPopup.style.transition = 'opacity 300ms';
                                loginPopup.style.opacity = '1';
                            }, 10);
                            setTimeout(() => {
                                loginPopup.style.opacity = '0';
                                setTimeout(() => {
                                    loginPopup.style.display = 'none';
                                    isPopupShowing = false;
                                }, 300);
                            }, 3000);
                        }
                    };
                });
            }
        }
    });
});

// =========================================================================================
// PHẦN 8: ONE TAP LOGIN
// =========================================================================================

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

window.handleCredentialResponse = async function(response) {
    console.log('%c🎫 [One Tap] Token received', 'color: #4285F4; font-weight: bold;');
    try {
        const payload = parseJwt(response.credential);
        const googleName = payload.name;
        const googlePicture = payload.picture;

        console.log('%c👤 [One Tap] User Info:', 'color: #4285F4;', { name: googleName, email: payload.email });

        const credential = _originalGoogleAuthProviderCredential(response.credential);
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        
        console.log('%c✅ [One Tap] Firebase login successful!', 'color: #34A853; font-weight: bold;');

        // Cập nhật profile nếu cần
        if (user.displayName !== googleName || user.photoURL !== googlePicture) {
            console.log('%c🔄 [One Tap] Updating user profile...', 'color: #FBBC04;');
            await updateProfile(user, { displayName: googleName, photoURL: googlePicture });
            console.log('%c✅ [One Tap] Profile updated', 'color: #34A853;');
        }

        // Lưu phiên đăng nhập vào cache session
        saveUserSession(result.user);
        
        // Lưu vào localStorage để sync
        localStorage.setItem('vutruong_sync_name', googleName);
        localStorage.setItem('vutruong_sync_avatar', googlePicture);
        
        if (window.google && window.google.accounts) window.google.accounts.id.cancel();

        console.log('%c🔄 [One Tap] Reloading page...', 'color: #4285F4;');
        setTimeout(() => window.location.reload(), 500);
        
    } catch (error) {
        console.error('%c❌ [One Tap] Login failed:', 'color: #EA4335; font-weight: bold;', error);
    }
};

// Khởi chạy logic One Tap - auth đã sẵn sàng ngay, không cần setInterval
onAuthStateChanged(auth, function(user) {
    if (user) {
        console.log(`%c✅ [Auth] User already logged in: ${user.email}`, 'color: #34A853; font-weight: bold;');
        
        if (localStorage.getItem('vutruong_sync_name') && window.VT_SyncUserMetadata) {
            console.log('%c🔄 [Auth] Auto syncing user metadata...', 'color: #FBBC04;');
            window.VT_SyncUserMetadata();
        }
        
        if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect();
    } else {
        console.log('%c⚠️ [Auth] No user logged in, initializing One Tap...', 'color: #FBBC04;');
        
        var checkGSIInterval = setInterval(function() {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                clearInterval(checkGSIInterval);
                console.log('%c🚀 [One Tap] Initializing Google Sign-In...', 'color: #4285F4;');
                window.google.accounts.id.initialize({
                    client_id: "129635740050-2htdgc0rf6sq0dmmqa9uvkgefumbm3qm.apps.googleusercontent.com",
                    callback: window.handleCredentialResponse,
                    auto_select: true,
                    cancel_on_tap_outside: false
                });
                window.google.accounts.id.prompt();
                console.log('%c✅ [One Tap] Prompt displayed', 'color: #34A853;');
            }
        }, 500);
    }
});

// =========================================================================================
console.log('%c🎉 VT-Zone Firebase System Ready!', 'color: #4285F4; font-weight: bold; font-size: 16px;');
console.log('%c📦 Version: 4.1.0 (Firebase v10 + Session Cache + Unified Auth Listener)', 'color: #666;');
// =========================================================================================
