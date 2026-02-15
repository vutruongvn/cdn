// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG FIREBASE TỔNG HỢP
 * Các tính năng: Auth, Like, View, History...
 * Phiên bản: 3.0.0 (Firebase v10 + Fixed Compatibility + No jQuery)
 * Cập nhật: 15/2/2026
 * VT Zone - vutruong.vn
 */
// =========================================================================================

console.log('%c🚀 VT-Zone Firebase System', 'color: #4285F4; font-weight: bold; font-size: 14px;');
console.log('%c📦 Đang khởi tạo Firebase v10...', 'color: #666;');

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
// 🔧 COMPATIBILITY LAYER - FIX LỖI ĐỆ QUY
// =========================================================================================

// LƯU REFERENCE GỐC trước khi override
const _originalGoogleAuthProviderCredential = GoogleAuthProvider.credential.bind(GoogleAuthProvider);
const _originalGoogleAuthProvider = GoogleAuthProvider;

// Tạo firebase namespace giả lập
window.firebase = {
    apps: getApps(),
    initializeApp: (config) => initializeApp(config),
    
    // Auth namespace - trả về function
    auth: function() {
        return auth;
    },
    
    // Firestore namespace - trả về function  
    firestore: function() {
        return db;
    }
};

// Thêm GoogleAuthProvider - KHÔNG override credential ngay
window.firebase.auth.GoogleAuthProvider = class {
    constructor() {
        return new _originalGoogleAuthProvider();
    }
    
    setCustomParameters(params) {
        const provider = new _originalGoogleAuthProvider();
        provider.setCustomParameters(params);
        return provider;
    }
};

// Thêm static method credential - dùng reference gốc đã lưu
window.firebase.auth.GoogleAuthProvider.credential = function(idToken, accessToken) {
    console.log('%c🔑 [Auth] Creating credential from token', 'color: #34A853;');
    return _originalGoogleAuthProviderCredential(idToken, accessToken);
};

// Thêm FieldValue cho Firestore
window.firebase.firestore.FieldValue = {
    serverTimestamp: () => {
        console.log('%c⏰ [Firestore] Using serverTimestamp', 'color: #FBBC04;');
        return serverTimestamp();
    },
    increment: (n) => {
        console.log(`%c➕ [Firestore] Increment by ${n}`, 'color: #FBBC04;');
        return increment(n);
    }
};

console.log('%c✅ Firebase Compatibility Layer đã được tạo', 'color: #34A853; font-weight: bold;');

// =========================================================================================

// Export ra window để các file khác sử dụng
window.db = db;
window.auth = auth;

console.log('%c✅ Firebase App, Firestore và Auth đã sẵn sàng (v10)', 'color: #4285F4; font-weight: bold;');

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
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    signInWithPopup(auth, provider)
        .then(() => {
            console.log('%c✅ [Auth] Sign-in successful', 'color: #34A853; font-weight: bold;');
        })
        .catch((error) => {
            console.error('%c❌ [Auth] Sign-in failed:', 'color: #EA4335; font-weight: bold;', error.message);
        });
}

function signOut() {
    console.log('%c🚪 [Auth] Signing out...', 'color: #EA4335;');
    
    firebaseSignOut(auth)
        .then(() => {
            console.log('%c✅ [Auth] Sign-out successful', 'color: #34A853;');
        })
        .catch((error) => {
            console.error('%c❌ [Auth] Sign-out failed:', 'color: #EA4335;', error.message);
        });
}

// =========================================================================================
// PHẦN 2: CẬP NHẬT GIAO DIỆN - PURE JAVASCRIPT (NO JQUERY)
// =========================================================================================

function updateAuthUI(user) {
    console.log(`%c👤 [UI] Updating auth UI for: ${user ? user.displayName : 'Guest'}`, 'color: #4285F4;');
    
    const name = user ? user.displayName : '';
    const photo = user ? user.photoURL : '';

    console.log(`%c👤 [UI] User data:`, 'color: #4285F4;', { name, photo });
    console.log(`%c👤 [UI] Elements count:`, 'color: #4285F4;', {
        userNullContainers: userNullContainers.length,
        userTrueContainers: userTrueContainers.length,
        userNameDisplays: userNameDisplays.length,
        userPhotoDisplays: userPhotoDisplays.length
    });

    // Update visibility
    userNullContainers.forEach((el, index) => {
        if (el) {
            el.style.display = user ? 'none' : 'block';
            console.log(`%c👤 [UI] userNull[${index}] display set to: ${user ? 'none' : 'block'}`, 'color: #666;');
        }
    });
    
    userTrueContainers.forEach((el, index) => {
        if (el) {
            el.style.display = user ? 'block' : 'none';
            console.log(`%c👤 [UI] userTrue[${index}] display set to: ${user ? 'block' : 'none'}`, 'color: #666;');
        }
    });
    
    // Update name
    userNameDisplays.forEach((el, index) => {
        el.innerText = name;
        console.log(`%c👤 [UI] userName[${index}] set to: "${name}"`, 'color: #666;');
    });
    
    // Update photo
    userPhotoDisplays.forEach((el, index) => {
        el.src = photo;
        console.log(`%c👤 [UI] userPhoto[${index}] src set to: ${photo}`, 'color: #666;');
    });
    
    console.log('%c✅ [UI] Auth UI updated successfully', 'color: #34A853; font-weight: bold;');
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

    const viewDocRef = doc(db, 'views', postId);
    
    /* --- TẠM ĐÓNG BĂNG TÍNH NĂNG VIEW POST
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
            console.error(`%c❌ [Like] Error for post ${postId}:`, 'color: #EA4335;', err);
        });
    });
}

window.initLikeCountDisplay = initLikeCountDisplay;

// =========================================================================================
// PHẦN 5: XỬ LÝ LIKE/UNLIKE CÁ NHÂN - FIXED DATA EXTRACTION
// =========================================================================================

function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    const postId = button.getAttribute('data-post-id');
    
    // LẤY THÔNG TIN BÀI VIẾT - NHIỀU CÁCH DỰ PHÒNG
    let postTitle = button.getAttribute('data-post-title');
    let postUrl = button.getAttribute('data-post-url');
    
    // Nếu không có trong button, tìm trong DOM
    if (!postTitle || !postUrl) {
        // Tìm post container gần nhất
        const postContainer = button.closest('article.post, .post-outer, [data-post-id]');
        
        if (postContainer) {
            // Thử lấy từ container
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
    
    // Fallback cuối cùng
    if (!postTitle) postTitle = document.title;
    if (!postUrl) postUrl = window.location.href.split('?')[0];
    
    console.log(`%c❤️ [Like] Init button for post:`, 'color: #EA4335;', {
        postId,
        postTitle: postTitle.substring(0, 50) + '...',
        postUrl
    });

    const userLikeRef = doc(db, 'users', user.uid, 'likes', postId);
    const postMetricsRef = doc(db, 'postMetrics', postId);

    // Lắng nghe trạng thái like
    onSnapshot(userLikeRef, docSnap => {
        const isLiked = docSnap.exists();
        updateLikeUI(button, isLiked);
    });

    // Gán sự kiện click
    button.onclick = async (e) => {
        e.preventDefault();

        const currentLikeDoc = await getDoc(userLikeRef);
        const isCurrentlyLiked = currentLikeDoc.exists();

        if (isCurrentlyLiked) {
            // UNLIKE
            console.log(`%c💔 [Like] Unliking post: ${postId}`, 'color: #EA4335;');
            try {
                await deleteDoc(userLikeRef);
                await updateDoc(postMetricsRef, {
                    likeCount: increment(-1)
                });
                console.log(`%c✅ [Like] Unlike successful`, 'color: #34A853;');
            } catch (error) {
                if (error.code === 'not-found') {
                    await setDoc(postMetricsRef, {
                        likeCount: 0
                    });
                } else {
                    console.error('%c❌ [Like] Unlike error:', 'color: #EA4335;', error);
                }
            }
        } else {
            // LIKE
            console.log(`%c❤️ [Like] Liking post: ${postId}`, 'color: #EA4335;');
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
                console.log(`%c✅ [Like] Like successful`, 'color: #34A853;');
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
    
    // Lấy ID từ _WidgetManager
    if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.postId) {
        postId = _WidgetManager._GetAllData().blog.postId;
    }
    
    // Fallback: Lấy từ DOM
    if (!postId) {
        const postContainer = document.querySelector('article.post[data-post-id], .post-outer[data-post-id]');
        if (postContainer) {
            postId = postContainer.getAttribute('data-post-id');
        }
    }
    
    const title = document.title; 
    const url = window.location.href.split('?')[0]; 

    if (postId && db) {
        console.log(`%c📚 [History] Saving view history for post: ${postId}`, 'color: #FBBC04;');

        try {
            const historyRef = doc(db, 'users', user.uid, 'viewedHistory', postId);
            await setDoc(historyRef, {
                postId: postId,
                title: title, 
                url: url,
                timestamp: serverTimestamp()
            }, { merge: true });
            
            console.log('%c✅ [History] View history saved', 'color: #34A853;');
        } catch (error) {
            console.error('%c❌ [History] Save error:', 'color: #EA4335;', error);
        }
    } else {
        console.warn('%c⚠️ [History] Post ID not found', 'color: #FBBC04;');
    }
}

// =========================================================================================
// PHẦN 7: KHỞI TẠO KHI DOM READY - PURE JAVASCRIPT
// =========================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🎨 [DOM] DOM Content Loaded', 'color: #4285F4; font-weight: bold;');
    
    // Gán các biến UI - KHỚP VỚI HTML TEMPLATE
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

    // Gắn sự kiện đăng nhập
    signInLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    });

    // Gắn sự kiện đăng xuất
    signOutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut();
        });
    });

    // Khởi động bộ đếm lượt xem
    countView();

    // Khởi động bộ đếm lượt Like
    initLikeCountDisplay();

    // Lưu lịch sử xem
    if (auth && isItemPageByBlogger) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                saveViewHistory(user);
            }
        });
    }

    // Logic Like/Unlike - PURE JAVASCRIPT (NO JQUERY)
    const likeButtons = document.querySelectorAll('.likePost');
    let isPopupShowing = false;

    if (auth && likeButtons.length > 0) {
        console.log(`%c❤️ [Like] Found ${likeButtons.length} like buttons`, 'color: #EA4335;');
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log(`%c👤 [Auth] User logged in: ${user.email}`, 'color: #34A853; font-weight: bold;');
                console.log(`%c👤 [Auth] Display Name: ${user.displayName}`, 'color: #34A853;');
                console.log(`%c👤 [Auth] Photo URL: ${user.photoURL}`, 'color: #34A853;');
                
                // Cập nhật UI
                updateAuthUI(user);
                
                // Khởi tạo like buttons
                likeButtons.forEach(btn => {
                    initSingleLikeButton(btn, user);
                });
            } else {
                console.log('%c⚠️ [Auth] No user logged in', 'color: #FBBC04;');
                
                // Cập nhật UI
                updateAuthUI(null);
                
                // Xử lý chưa đăng nhập - PURE JAVASCRIPT
                const loginPopup = document.querySelector('.VTloginPopup');
                
                likeButtons.forEach(btn => {
                    updateLikeUI(btn, false);

                    btn.onclick = (e) => {
                        e.preventDefault();

                        if (loginPopup && !isPopupShowing) {
                            isPopupShowing = true;
                            
                            // Fade in
                            loginPopup.style.display = 'block';
                            loginPopup.style.opacity = '0';
                            
                            setTimeout(() => {
                                loginPopup.style.transition = 'opacity 300ms';
                                loginPopup.style.opacity = '1';
                            }, 10);
                            
                            // Fade out after 3 seconds
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
        });
    }
});

// =========================================================================================
// PHẦN 8: ONE TAP LOGIN - FIXED
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
        // Parse token để lấy thông tin
        const payload = parseJwt(response.credential);
        const googleName = payload.name;
        const googlePicture = payload.picture;
        const googleEmail = payload.email;

        console.log('%c👤 [One Tap] User Info:', 'color: #4285F4;', {
            name: googleName,
            email: googleEmail,
            picture: googlePicture
        });

        // Tạo credential - DÙNG REFERENCE GỐC
        console.log('%c🔑 [One Tap] Creating Firebase credential...', 'color: #34A853;');
        const credential = _originalGoogleAuthProviderCredential(response.credential);

        // Đăng nhập vào Firebase
        console.log('%c🔐 [One Tap] Signing in to Firebase...', 'color: #34A853;');
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        
        console.log('%c✅ [One Tap] Firebase login successful!', 'color: #34A853; font-weight: bold;');
        console.log('%c👤 [One Tap] Firebase User:', 'color: #34A853;', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        });

        // Cập nhật profile nếu cần
        if (user.displayName !== googleName || user.photoURL !== googlePicture) {
            console.log('%c🔄 [One Tap] Updating user profile...', 'color: #FBBC04;');
            await updateProfile(user, {
                displayName: googleName,
                photoURL: googlePicture
            });
            console.log('%c✅ [One Tap] Profile updated', 'color: #34A853;');
        }

        // Lưu vào localStorage để sync
        localStorage.setItem('vutruong_sync_name', googleName);
        localStorage.setItem('vutruong_sync_avatar', googlePicture);
        
        // Ẩn popup One Tap
        if (window.google && window.google.accounts) {
            window.google.accounts.id.cancel();
        }

        console.log('%c🔄 [One Tap] Reloading page...', 'color: #4285F4;');
        
        // Reload trang
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
    } catch (error) {
        console.error('%c❌ [One Tap] Login failed:', 'color: #EA4335; font-weight: bold;', error);
        console.error('%c❌ [One Tap] Error details:', 'color: #EA4335;', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    }
}

// Khởi chạy logic One Tap
var checkAuthInterval = setInterval(function() {
    if (auth) {
        clearInterval(checkAuthInterval);

        onAuthStateChanged(auth, function(user) {
            if (user) {
                console.log(`%c✅ [Auth] User already logged in: ${user.email}`, 'color: #34A853; font-weight: bold;');
                
                // Auto sync nếu cần
                if (localStorage.getItem('vutruong_sync_name') && window.VT_SyncUserMetadata) {
                    console.log('%c🔄 [Auth] Auto syncing user metadata...', 'color: #FBBC04;');
                    window.VT_SyncUserMetadata();
                }
                
                // Disable auto select
                if (window.google && window.google.accounts) {
                    window.google.accounts.id.disableAutoSelect();
                }
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
    }
}, 500);

// =========================================================================================
console.log('%c🎉 VT-Zone Firebase System Ready!', 'color: #4285F4; font-weight: bold; font-size: 16px;');
console.log('%c📦 Version: 3.0.0 (Firebase v10 + No jQuery + Fixed)', 'color: #666;');
// =========================================================================================
