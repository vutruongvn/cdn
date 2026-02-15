// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG FIREBASE TỔNG HỢP
 * Các tính năng: Auth, Like, View, History...
 * Phiên bản: 2.1.0 (Firebase v10 + Compatibility Layer)
 * Cập nhật: 15/2/2026
 * VT Zone - vutruong.vn
 */
// =========================================================================================

// --- IMPORT FIREBASE v10 MODULES ---
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
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
// 🔧 COMPATIBILITY LAYER - QUAN TRỌNG ĐỂ TƯƠNG THÍCH VỚI CODE CŨ
// =========================================================================================

// Tạo firebase namespace giả lập để các code v8 cũ vẫn hoạt động
window.firebase = {
    // App
    apps: getApps(),
    initializeApp: (config) => initializeApp(config),
    
    // Auth namespace
    auth: function() {
        return auth;
    },
    
    // Firestore namespace
    firestore: function() {
        return db;
    }
};

// Thêm GoogleAuthProvider vào auth namespace
window.firebase.auth.GoogleAuthProvider = GoogleAuthProvider;

// Thêm các static methods cho GoogleAuthProvider
window.firebase.auth.GoogleAuthProvider.credential = function(idToken, accessToken) {
    return GoogleAuthProvider.credential(idToken, accessToken);
};

// Thêm FieldValue cho Firestore (để tương thích với code cũ)
window.firebase.firestore.FieldValue = {
    serverTimestamp: () => serverTimestamp(),
    increment: (n) => increment(n)
};

console.log("✅ Firebase Compatibility Layer đã được tạo (Hỗ trợ code v8 cũ)");

// =========================================================================================

// Export ra window để các file khác sử dụng
window.db = db;
window.auth = auth;

console.log("✅ Firebase App, Firestore và Auth đã được khởi tạo thành công (v10).");

// --- BIẾN KIỂM TRA TRANG ---
const isPostPage = window.location.pathname.indexOf(".html") > -1;
const isItemPageByBlogger = typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.pageType === "item";

// --- BIẾN UI (Sẽ được gán trong DOMContentLoaded) ---
let userNullContainers, userTrueContainers, signInLinks, signOutButtons, userNameDisplays, userPhotoDisplays;

// =========================================================================================
// PHẦN 1: XỬ LÝ ĐĂNG NHẬP/ĐĂNG XUẤT
// =========================================================================================

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    signInWithPopup(auth, provider)
        .catch((error) => {
            console.error("Đăng nhập thất bại: " + error.message);
        });
}

function signOut() {
    firebaseSignOut(auth)
        .catch((error) => {
            console.error("Lỗi đăng xuất:", error.message);
        });
}

// =========================================================================================
// PHẦN 2: CẬP NHẬT GIAO DIỆN
// =========================================================================================

function updateAuthUI(user) {
    const name = user ? user.displayName : '';
    const photo = user ? user.photoURL : '';

    userNullContainers.forEach(el => {
        if (el) el.style.display = user ? 'none' : 'block';
    });
    userTrueContainers.forEach(el => {
        if (el) el.style.display = user ? 'block' : 'none';
    });
    userNameDisplays.forEach(el => {
        el.innerText = name;
    });
    userPhotoDisplays.forEach(el => {
        el.src = photo;
    });
}

function updateLikeUI(btnElement, isLiked) {
    const iconElement = btnElement.querySelector('i');

    if (isLiked) {
        btnElement.classList.add('active-like');
    } else {
        btnElement.classList.remove('active-like');
    }

    if (iconElement) {
        if (isLiked) {
            iconElement.classList.remove('fad');
            iconElement.classList.add('fa-solid');
        } else {
            iconElement.classList.remove('fa-solid');
            iconElement.classList.add('fad');
        }
    }
}

// Export hàm updateLikeUI ra window
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

    const viewDocRef = doc(db, 'views', postId);
    
    /* --- TẠM ĐÓNG BĂNG TÍNH NĂNG VIEW POST THÌ CMT TỪ ĐÂY, KHI NÀO DÙNG THÌ MỞ CMT RA
    setDoc(viewDocRef, {
            count: increment(1)
        }, {
            merge: true
        })
        .then(() => {
            onSnapshot(viewDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const count = docSnap.data().count;
                    viewDisplay.innerText = count.toLocaleString('en-US');
                } else {
                    viewDisplay.innerText = '1';
                }
            }, (error) => {
                console.error("Lỗi khi theo dõi lượt xem (onSnapshot):", error);
                viewDisplay.innerText = 'Lỗi!';
            });
        })
        .catch((error) => {
            console.error("Lỗi khi cập nhật lượt xem (Firestore):", error);
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

    postIds.forEach(postId => {
        const postCountRef = doc(db, 'postMetrics', postId);

        onSnapshot(postCountRef, docSnap => {
            const countElements = document.querySelectorAll('.likePost[data-post-id="' + postId + '"] .like-count');

            if (docSnap.exists()) {
                const count = docSnap.data().likeCount || 0;
                const formattedCount = count.toLocaleString('en-US');
                countElements.forEach(el => el.innerText = formattedCount);
            } else {
                countElements.forEach(el => el.innerText = '0');
            }
        }, err => {
            console.error("Lỗi hiển thị lượt like cho Post ID " + postId + ":", err);
        });
    });
}

// Export hàm ra window
window.initLikeCountDisplay = initLikeCountDisplay;

// =========================================================================================
// PHẦN 5: XỬ LÝ LIKE/UNLIKE CÁ NHÂN
// =========================================================================================

function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    const postId = button.getAttribute('data-post-id');
    const postTitle = button.getAttribute('data-post-title');
    const postUrl = button.getAttribute('data-post-url');

    const userLikeRef = doc(db, 'users', user.uid, 'likes', postId);
    const postMetricsRef = doc(db, 'postMetrics', postId);

    // 1. LẮNG NGHE TRẠNG THÁI LIKE BAN ĐẦU
    onSnapshot(userLikeRef, docSnap => {
        const isLiked = docSnap.exists();
        updateLikeUI(button, isLiked);
    });

    // 2. GÁN SỰ KIỆN CLICK
    button.onclick = async (e) => {
        e.preventDefault();

        const currentLikeDoc = await getDoc(userLikeRef);
        const isCurrentlyLiked = currentLikeDoc.exists();

        if (isCurrentlyLiked) {
            // UNLIKE
            try {
                await deleteDoc(userLikeRef);
                await updateDoc(postMetricsRef, {
                    likeCount: increment(-1)
                });
            } catch (error) {
                if (error.code === 'not-found') {
                    await setDoc(postMetricsRef, {
                        likeCount: 0
                    });
                } else {
                    console.error("Lỗi khi UNLIKE:", error);
                }
            }
        } else {
            // LIKE
            try {
                await setDoc(userLikeRef, {
                    postId: postId,
                    postTitle: postTitle,
                    postUrl: postUrl,
                    timestamp: serverTimestamp()
                });

                const postMetricDoc = await getDoc(postMetricsRef);
                if (postMetricDoc.exists()) {
                    await updateDoc(postMetricsRef, {
                        likeCount: increment(1)
                    });
                } else {
                    await setDoc(postMetricsRef, {
                        likeCount: 1
                    });
                }
            } catch (error) {
                console.error("Lỗi khi LIKE:", error);
            }
        }
    };
}

// Export hàm ra window
window.initSingleLikeButton = initSingleLikeButton;

// =========================================================================================
// PHẦN 6: LƯU LỊCH SỬ XEM BÀI VIẾT
// =========================================================================================

async function saveViewHistory(user) {
    // CÁCH 1: Lấy ID từ biến Blogger (ổn định nhất)
    let postId = null;
    if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.postId) {
        postId = _WidgetManager._GetAllData().blog.postId;
    }
    
    // CÁCH 2 (Fallback): Lấy ID từ data-post-id trên DOM
    if (!postId && typeof $ !== 'undefined') {
         const postContainer = $('.blog-posts article.post, .blog-posts .post-outer').first();
         if (postContainer.length) {
             postId = postContainer.attr('data-post-id');
         }
    }
    
    // Lấy Tiêu đề và URL
    const title = document.title; 
    const url = window.location.href.split('?')[0]; 

    if (postId && db) {
        console.log("DEBUG Ghi Lịch Sử: Post ID = " + postId); 

        try {
            const historyRef = doc(db, 'users', user.uid, 'viewedHistory', postId);
            await setDoc(historyRef, {
                postId: postId,
                title: title, 
                url: url,
                timestamp: serverTimestamp()
            }, { merge: true });
            
            console.log("Đã lưu lịch sử xem thành công cho ID: " + postId);
        } catch (error) {
            console.error("Lỗi lưu lịch sử xem (Kiểm tra Security Rules):", error);
        }
    } else {
         console.log("DEBUG Ghi Lịch Sử: Không tìm thấy Post ID hoặc DB chưa sẵn sàng.");
    }
}

// =========================================================================================
// PHẦN 7: KHỞI TẠO KHI DOM READY
// =========================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Gán các biến UI
    userNullContainers = document.querySelectorAll('.user-null');
    userTrueContainers = document.querySelectorAll('.user-true');
    signInLinks = document.querySelectorAll('.sign-in');
    signOutButtons = document.querySelectorAll('.sign-out');
    userNameDisplays = document.querySelectorAll('.user-name');
    userPhotoDisplays = document.querySelectorAll('.user-photo');

    // 2. Gắn sự kiện đăng nhập/đăng xuất
    signInLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    });

    signOutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut();
        });
    });

    // 3. Khởi động bộ đếm lượt xem
    countView();

    // 4. Khởi động bộ đếm tổng số lượt Like
    initLikeCountDisplay();

    // 5. Logic xử lý lưu lịch sử xem
    if (auth && isItemPageByBlogger) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                saveViewHistory(user);
            }
        });
    }

    // 6. Logic xử lý hành động LIKE/UNLIKE
    const likeButtons = document.querySelectorAll('.likePost');
    let isPopupShowing = false;

    if (auth && likeButtons.length > 0) {
        onAuthStateChanged(auth, (user) => {
            const loginPopup = typeof $ !== 'undefined' ? $(".VTloginPopup") : null;

            if (user) {
                // CẬP NHẬT UI AUTH
                updateAuthUI(user);
                
                // KHỞI TẠO LIKE BUTTONS
                likeButtons.forEach(btn => {
                    initSingleLikeButton(btn, user);
                });
            } else {
                // CẬP NHẬT UI AUTH
                updateAuthUI(null);
                
                // XỬ LÝ CHƯA ĐĂNG NHẬP
                likeButtons.forEach(btn => {
                    updateLikeUI(btn, false);

                    btn.onclick = (e) => {
                        e.preventDefault();

                        if (loginPopup && !isPopupShowing) {
                            isPopupShowing = true;

                            loginPopup.fadeIn(300)
                                .delay(3000)
                                .fadeOut(300, function() {
                                    isPopupShowing = false;
                                });
                        }
                    };
                });
            }
        });
    }
});

// =========================================================================================
// PHẦN 8: ONE TAP LOGIN
// =========================================================================================

// Hàm giải mã JWT Token
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Xử lý khi đăng nhập thành công với One Tap
window.handleCredentialResponse = async function(response) {
    console.log("✅ One Tap: Token received. Extracting profile data...");
    
    try {
        const payload = parseJwt(response.credential);
        const googleName = payload.name;
        const googlePicture = payload.picture;

        console.log("✅ One Tap: Google Name =", googleName);

        // Tạo credential từ token
        const credential = GoogleAuthProvider.credential(response.credential);

        // Đăng nhập vào Firebase
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        
        console.log("✅ Firebase Login Success:", user.email);

        // Kiểm tra và cập nhật Profile nếu tên bị cũ
        if (user.displayName !== googleName) {
            console.log("🔄 Detected name change! Updating Profile to:", googleName);
            await updateProfile(user, {
                displayName: googleName,
                photoURL: googlePicture
            });
        }

        // Lưu vào localStorage để sync
        localStorage.setItem('vutruong_sync_name', googleName);
        localStorage.setItem('vutruong_sync_avatar', googlePicture);
        
        // Ẩn popup One Tap
        if (window.google && window.google.accounts) {
            window.google.accounts.id.cancel();
        }

        console.log("✅ One Tap: Login completed. Reloading page...");
        
        // Reload trang để cập nhật UI
        window.location.reload(); 
        
    } catch (error) {
        console.error("❌ Firebase Login Error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
    }
}

// Khởi chạy logic One Tap
var checkAuthInterval = setInterval(function() {
    if (auth) {
        clearInterval(checkAuthInterval);

        onAuthStateChanged(auth, function(user) {
            if (user) {
                console.log("✅ User đã đăng nhập:", user.email);
                
                // Tự động sync nếu có dữ liệu trong localStorage
                if (localStorage.getItem('vutruong_sync_name') && window.VT_SyncUserMetadata) {
                    console.log("🔄 Auto syncing user metadata...");
                    window.VT_SyncUserMetadata();
                }
                
                // Disable auto select sau khi đã đăng nhập
                if (window.google && window.google.accounts) {
                    window.google.accounts.id.disableAutoSelect();
                }
            } else {
                console.log("⚠️ Chưa đăng nhập, đang chuẩn bị One Tap...");
                
                var checkGSIInterval = setInterval(function() {
                    if (window.google && window.google.accounts && window.google.accounts.id) {
                        clearInterval(checkGSIInterval);
                        
                        console.log("🚀 Initializing One Tap...");
                        
                        window.google.accounts.id.initialize({
                            client_id: "129635740050-2htdgc0rf6sq0dmmqa9uvkgefumbm3qm.apps.googleusercontent.com",
                            callback: window.handleCredentialResponse,
                            auto_select: true,
                            cancel_on_tap_outside: false
                        });
                        
                        window.google.accounts.id.prompt();
                        console.log("✅ One Tap prompt displayed");
                    }
                }, 500);
            }
        });
    }
}, 500);

// =========================================================================================
// PHẦN 9: LƯU LỊCH SỬ XEM - JQUERY VERSION
// =========================================================================================

if (typeof $ !== 'undefined') {
    $(document).ready(function() {
        // Chỉ chạy trên trang bài viết chi tiết
        const isItemPage = typeof _WidgetManager !== 'undefined' && 
                           _WidgetManager._GetAllData().blog.pageType === "item";
                           
        if (!isItemPage) {
            return;
        }
        
        // Chờ đăng nhập
        onAuthStateChanged(auth, (user) => {
            if (user) {
                saveViewHistory(user);
            }
        });
    });
}

// =========================================================================================
console.log("✅ VT-Zone All Firebase Functions đã tải xong (Firebase v10 + Compatibility)");
// =========================================================================================
