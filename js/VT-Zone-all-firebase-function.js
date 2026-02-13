// JS cho các tính năng: Firebase, Auth, Like, View, History...
// VT Zone
// vutruong.vn

// --- PHẦN 1: CẤU HÌNH VÀ KHỞI TẠO FIREBASE ---

const firebaseConfig = {
    apiKey: "AIzaSyD0t0UgJlOjZEdhbmznGN5hRKCSMLkA_yU",
    authDomain: "vutruong-vn.firebaseapp.com",
    databaseURL: "https://vutruong-vn-default-rtdb.firebaseio.com",
    projectId: "vutruong-vn",
    storageBucket: "vutruong-vn.firebasestorage.app",
    messagingSenderId: "417755493462",
    appId: "1:417755493462:web:3102aba63f638f7"
};

// --- BẢO VỆ CỐT LÕI: KIỂM TRA & KHỞI TẠO AN TOÀN ---
let db, auth;

if (typeof firebase === 'undefined') {
    console.error("LỖI CỐT LÕI: Firebase SDKs chưa được tải. Đã dừng logic.");
} else {
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (e) {
            console.error("Lỗi khi khởi tạo Firebase App:", e);
        }
    }

    // Gán các dịch vụ ra biến TOÀN CỤC (window) và biến cục bộ
    window.db = (typeof firebase.firestore === 'function') ? firebase.firestore() : undefined;
    window.auth = (typeof firebase.auth === 'function') ? firebase.auth() : undefined;

    db = window.db;
    auth = window.auth;

    if (!db || !auth) {
        console.warn("CẢNH BÁO: Firestore hoặc Auth service chưa sẵn sàng. Một số tính năng sẽ không hoạt động.");
    } else {
        console.log("Firebase App, Firestore và Auth đã được khởi tạo thành công.");
    }
}

const isPostPage = window.location.pathname.indexOf(".html") > -1;
const isItemPageByBlogger = typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.pageType === "item";


// --- PHẦN 2: KHAI BÁO BIẾN UI (Sẽ được gán giá trị trong DOMContentLoaded) ---
let userNullContainers, userTrueContainers, signInLinks, signOutButtons, userNameDisplays, userPhotoDisplays;


// --- PHẦN 3: HÀM XỬ LÝ ĐĂNG NHẬP/ĐĂNG XUẤT ---

function signInWithGoogle() {
    if (!auth) {
        alert("Tính năng Đăng nhập không khả dụng. Vui lòng thử lại sau.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error("Đăng nhập thất bại: " + error.message);
        });
}

function signOut() {
    if (!auth) return;
    auth.signOut()
        .catch((error) => {
            console.error("Lỗi đăng xuất:", error.message);
        });
}


// --- PHẦN 4: HÀM CẬP NHẬT GIAO DIỆN CHUNG (AUTH UI) ---
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


// --- PHẦN 5: HÀM CẬP NHẬT GIAO DIỆN NÚT LIKE ---
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


// --- PHẦN 6: HÀM XỬ LÝ LƯỢT XEM BÀI VIẾT (VIEW COUNT) ---

function countView() {
    if (!isPostPage || !db) return;

    const viewElement = document.querySelector('.post-view-count');
    const viewDisplay = viewElement ? (viewElement.querySelector('#view-count-number') || viewElement.querySelector('span')) : null;

    if (!viewElement || !viewDisplay) return;

    const postId = viewElement.getAttribute('data-id');
    if (!postId) return;

    const viewDocRef = db.collection('views').doc(postId);
    /* --- TẠM ĐÓNG BĂNG TÍNH NĂNG VIEW POST, KHI NÀO DÙNG THÌ MỞ CMT NÀY RA
    viewDocRef.set({
            count: firebase.firestore.FieldValue.increment(1)
        }, {
            merge: true
        })
        .then(() => {
            viewDocRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const count = doc.data().count;
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
    // DÒNG THÔNG BÁO
    viewDisplay.innerText = 'Đang tạm ngừng đếm lượt xem';
}


// --- PHẦN 7: HÀM HIỂN THỊ TỔNG LƯỢT LIKE (AGGREGATION COUNT) ---
function initLikeCountDisplay() {
    if (!db) return;

    const likeButtons = document.querySelectorAll('.likePost[data-post-id]');
    const postIds = new Set();

    likeButtons.forEach(btn => {
        const postId = btn.getAttribute('data-post-id');
        if (postId) postIds.add(postId);
    });

    postIds.forEach(postId => {
        const postCountRef = db.collection('postMetrics').doc(postId);

        postCountRef.onSnapshot(doc => {
            const countElements = document.querySelectorAll('.likePost[data-post-id="' + postId + '"] .like-count');

            if (doc.exists) {
                const count = doc.data().likeCount || 0;
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


// --- PHẦN 8: HÀM XỬ LÝ LIKE/UNLIKE CÁ NHÂN ---
function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    const postId = button.getAttribute('data-post-id');
    const postTitle = button.getAttribute('data-post-title');
    const postUrl = button.getAttribute('data-post-url');

    const userLikeRef = db.collection('users').doc(user.uid).collection('likes').doc(postId);
    const postMetricsRef = db.collection('postMetrics').doc(postId);

    // 1. LẮNG NGHE TRẠNG THÁI LIKE BAN ĐẦU
    userLikeRef.onSnapshot(doc => {
        const isLiked = doc.exists;
        updateLikeUI(button, isLiked);
    });

    // 2. GÁN SỰ KIỆN CLICK
    button.onclick = async (e) => {
        e.preventDefault();

        const currentLikeDoc = await userLikeRef.get();
        const isCurrentlyLiked = currentLikeDoc.exists;

        try {
            if (isCurrentlyLiked) {
                // --- UNLIKE ---
                await userLikeRef.delete();

                // Giảm bộ đếm tổng hợp
                await postMetricsRef.set({
                    likeCount: firebase.firestore.FieldValue.increment(-1)
                }, {
                    merge: true
                }).catch(err => {
                    console.error("LỖI CỐT LÕI (UNLIKE):", err);
                    throw new Error("Lỗi khi giảm bộ đếm tổng hợp. Vui lòng kiểm tra Quy tắc bảo mật Firestore.");
                });

            } else {
                // --- LIKE ---
                await userLikeRef.set({
                    postId: postId,
                    title: postTitle,
                    url: postUrl,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Tăng bộ đếm tổng hợp
                await postMetricsRef.set({
                    likeCount: firebase.firestore.FieldValue.increment(1)
                }, {
                    merge: true
                }).catch(err => {
                    console.error("LỖI CỐT LÕI (LIKE):", err);
                    throw new Error("Lỗi khi tăng bộ đếm tổng hợp. Vui lòng kiểm tra Quy tắc bảo mật Firestore.");
                });
            }

        } catch (error) {
            console.error("LỖI GHI POSTMETRICS CUỐI CÙNG:", error);
            alert("Lỗi Ghi dữ liệu: " + error.message);
        }
    };
}


// --- PHẦN 9: HÀM LƯU LỊCH SỬ XEM ---
async function saveViewHistory(user) {
    if (!auth || !db) return;

    // 1. CÁCH 1: Lấy ID từ biến Blogger (ổn định nhất)
    let postId = null;
    if (typeof _WidgetManager !== 'undefined' && _WidgetManager._GetAllData().blog.postId) {
        postId = _WidgetManager._GetAllData().blog.postId;
    }

    // 2. CÁCH 2 (Fallback JS Thuần): Lấy ID từ data-post-id trên DOM
    if (!postId) {
        const postContainer = document.querySelector('.blog-posts article.post, .blog-posts .post-outer');
        if (postContainer) {
            postId = postContainer.getAttribute('data-post-id');
        }
    }

    const title = document.title;
    const url = window.location.href.split('?')[0];

    if (postId) {
        try {
            // Lưu vào collection: users/{uid}/viewedHistory/{postId}
            await db.collection('users').doc(user.uid).collection('viewedHistory').doc(postId).set({
                postId: postId,
                title: title,
                url: url,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, {
                merge: true
            });

            console.log("Đã lưu lịch sử xem thành công cho ID: " + postId);
        } catch (error) {
            console.error("Lỗi lưu lịch sử xem (Kiểm tra Security Rules):", error);
        }
    }
}


// --- PHẦN 10: GẮN SỰ KIỆN VÀ CHẠY CHƯƠNG TRÌNH (DOMContentLoaded thuần JS) ---

document.addEventListener('DOMContentLoaded', function() {

    // Khai báo lại các phần tử UI sau khi DOM đã sẵn sàng
    userNullContainers = document.querySelectorAll('.user-auth-null');
    userTrueContainers = document.querySelectorAll('.user-auth-true');
    signInLinks = document.querySelectorAll('.sign-in-link');
    signOutButtons = document.querySelectorAll('.sign-out-button-class');
    userNameDisplays = document.querySelectorAll('.user-name-display');
    userPhotoDisplays = document.querySelectorAll('.user-photo-display');
    const likeButtons = document.querySelectorAll('.likePost[data-post-id]');

    // 1. GẮN SỰ KIỆN ĐĂNG NHẬP/ĐĂNG XUẤT
    signInLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            signInWithGoogle();
        });
    });

    signOutButtons.forEach(function(button) {
        button.addEventListener('click', signOut);
    });

    // 2. Theo dõi trạng thái Auth và cập nhật UI CHUNG
    if (auth) auth.onAuthStateChanged(updateAuthUI);

    // 3. Khởi động bộ đếm lượt xem (Chỉ chạy trên trang bài viết)
    countView();

    // 4. Khởi động Bộ đếm tổng số lượt Like
    initLikeCountDisplay();

    // 5. LOGIC XỬ LÝ LƯU LỊCH SỬ XEM (Dành cho người dùng đã đăng nhập)
    if (auth && isItemPageByBlogger) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                saveViewHistory(user);
            }
        });
    }

    // 6. LOGIC XỬ LÝ HÀNH ĐỘNG LIKE/UNLIKE CỐT LÕI
    // KHAI BÁO CỜ TRẠNG THÁI:
    // Dùng biến này để theo dõi xem popup có đang hoạt động hay không.
    let isPopupShowing = false;

    if (auth && likeButtons.length > 0) {
        auth.onAuthStateChanged((user) => {
            // Lấy phần tử popup JQuery một lần
            const loginPopup = $(".VTloginPopup");

            if (user) {
                likeButtons.forEach(btn => {
                    initSingleLikeButton(btn, user);
                });
            } else {
                likeButtons.forEach(btn => {
                    updateLikeUI(btn, false);

                    btn.onclick = (e) => {
                        e.preventDefault();

                        // KIỂM TRA ĐIỀU KIỆN: Chỉ thực thi nếu cờ đang FALSE (popup đang ẩn)
                        if (!isPopupShowing) {
                            isPopupShowing = true; // Đặt cờ thành TRUE (Đang hiển thị)

                            loginPopup.fadeIn(300)
                                .delay(3000)

                                // Quan trọng: Sử dụng callback của .fadeOut() để đặt lại cờ
                                // JQuery .fadeOut() có tham số callback để chạy hàm khi hiệu ứng kết thúc.
                                .fadeOut(300, function() {
                                    // HÀM CALLBACK: Chạy sau khi hiệu ứng mờ dần (300ms) kết thúc
                                    isPopupShowing = false; // Đặt cờ thành FALSE (Đã sẵn sàng cho click tiếp theo)
                                });
                        }
                    };
                });
            }
        });
    }

});



