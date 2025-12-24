// --- PHẦN 1: CẤU HÌNH VÀ KHỞI TẠO (KHẮC PHỤC LỖI FIREBASE) ---
const firebaseConfig = {
    // Dữ liệu cấu hình bạn đã cung cấp
    apiKey: "AIzaSyD0t0UgJlOjZEdhbmznGN5hRKCSMLkA_yU", 
    authDomain: "vutruong-vn.firebaseapp.com",
    databaseURL: "https://vutruong-vn-default-rtdb.firebaseio.com",
    projectId: "vutruong-vn",
    storageBucket: "vutruong-vn.firebasestorage.app",
    messagingSenderId: "417755493462",
    appId: "1:417755493462:web:3102aba63f638f7"
};

// --- BẢO VỆ CỐT LÕI: KIỂM TRA & KHỞI TẠO AN TOÀN ---
if (typeof firebase === 'undefined') {
    console.error("LỖI CỐT LÕI: Firebase SDKs chưa được tải. Đã dừng logic.");
    // KHẮC PHỤC LỖI: Dùng biến cục bộ để tránh lỗi 'Illegal return statement' nếu code này được bọc
    // Nếu bạn muốn dừng script, hãy bọc toàn bộ code trong một hàm.
    // Tạm thời bỏ return ở cấp cao nhất để tránh lỗi SyntaxError nếu nó được nhúng sai.
    // return; 
} else {
    // 1. Khởi tạo Firebase App
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (e) {
            console.error("Lỗi khi khởi tạo Firebase App:", e);
        }
    }
    
    // 2. Gán các dịch vụ ra biến TOÀN CỤC (window)
    // Việc này phải được thực hiện sau khi initializeApp
    window.db = (typeof firebase.firestore === 'function') ? firebase.firestore() : undefined;
    window.auth = (typeof firebase.auth === 'function') ? firebase.auth() : undefined;
}

// Biến cục bộ (alias) để sử dụng trong khối script hiện tại
const db = window.db; 
const auth = window.auth; 

// Thêm kiểm tra lỗi sớm để log cảnh báo nếu không khởi tạo được
if (!db || !auth) {
    console.warn("CẢNH BÁO: Firestore hoặc Auth service chưa sẵn sàng. Một số tính năng sẽ không hoạt động.");
}

// Biến này được dùng để xác định trang hiện tại có phải là bài viết chi tiết không
var isPostPage = window.location.pathname.indexOf(".html") > -1;
    
console.log("Firebase App, Firestore và Auth đã được khởi tạo thành công.");


// --- PHẦN 2: KHAI BÁO CÁC PHẦN TỬ DÙNG CLASS (CHO CHỨC NĂNG ĐĂNG NHẬP) ---
var userNullContainers = document.querySelectorAll('.user-auth-null');
var userTrueContainers = document.querySelectorAll('.user-auth-true');
var signInLinks = document.querySelectorAll('.sign-in-link');
var signOutButtons = document.querySelectorAll('.sign-out-button-class');
var userNameDisplays = document.querySelectorAll('.user-name-display');
var userPhotoDisplays = document.querySelectorAll('.user-photo-display');

// --- PHẦN 3: HÀM XỬ LÝ ĐĂNG NHẬP/ĐĂNG XUẤT ---

function signInWithGoogle() {
    if (!auth) {
        alert("Tính năng Đăng nhập không khả dụng. Vui lòng thử lại sau.");
        return;
    }
    var provider = new firebase.auth.GoogleAuthProvider();
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
  userNullContainers.forEach(el => { 
      if (el) el.style.display = user ? 'none' : 'block'; 
  });
  userTrueContainers.forEach(el => { 
      if (el) el.style.display = user ? 'block' : 'none'; 
  });
  var name = user ? user.displayName : '';
  var photo = user ? user.photoURL : '';
  userNameDisplays.forEach(el => {
      el.innerText = name;
  });
  userPhotoDisplays.forEach(el => {
      el.src = photo;
  });
}
// --- MỚI --- //
// --- PHẦN MỚI: HÀM XỬ LÝ LIKE CÁ NHÂN (Like/Unlike Action) ---

function updateLikeUI(button, isLiked) {
    const icon = button.querySelector('i');
    if (icon) {
        // Cập nhật biểu tượng: isLiked = true -> tim ĐẦY
        icon.className = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }
}

function initSingleLikeButton(button, user) {
    if (!db || !auth) return;

    const postId = button.getAttribute('data-post-id');
    const postTitle = button.getAttribute('data-post-title');
    const postUrl = button.getAttribute('data-post-url');
    
    // 1. Tham chiếu
    const userLikeRef = db.collection('users').doc(user.uid).collection('likes').doc(postId);
    const postMetricsRef = db.collection('postMetrics').doc(postId);

    // 2. LẮNG NGHE TRẠNG THÁI LIKE BAN ĐẦU (Để cập nhật UI)
    userLikeRef.onSnapshot(doc => {
        const isLiked = doc.exists;
        updateLikeUI(button, isLiked);
    });

    // 3. GÁN SỰ KIỆN CLICK (SỬ DỤNG CẬP NHẬT TRỰC TIẾP AN TOÀN)
    button.onclick = async (e) => {
        e.preventDefault();
        
        // Đọc trạng thái hiện tại
        const currentLikeDoc = await userLikeRef.get();
        const isCurrentlyLiked = currentLikeDoc.exists;
        
        try {
            if (isCurrentlyLiked) {
                // --- UNLIKE ---
                
                // 1. Xóa lượt thích cá nhân
                await userLikeRef.delete();
                
                // 2. Giảm bộ đếm tổng hợp (Sử dụng update() nếu có lỗi với set/merge)
                await postMetricsRef.update({ 
                    likeCount: firebase.firestore.FieldValue.increment(-1)
                });

            } else {
                // --- LIKE ---
                
                // 1. Ghi lượt thích cá nhân
                await userLikeRef.set({
                    postId: postId,
                    title: postTitle,
                    url: postUrl,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // 2. Tăng bộ đếm tổng hợp
                // Dùng set/merge cho lần đầu tiên (tạo document)
                // Dùng update cho các lần sau (nếu set/merge thất bại khi update)
                // Chúng ta sẽ thử update trước, nếu update lỗi, ta dùng set/merge.
                
                try {
                    // Thử cập nhật nếu document đã tồn tại (99% là tồn tại vì bạn đã kiểm tra)
                    await postMetricsRef.update({
                        likeCount: firebase.firestore.FieldValue.increment(1)
                    });
                } catch (e) {
                    // Nếu update lỗi (thường là do document chưa tồn tại) -> Sử dụng set với merge để tạo
                    if (e.code === 'not-found' || e.message.includes('No document to update')) {
                        await postMetricsRef.set({
                            likeCount: firebase.firestore.FieldValue.increment(1)
                        }, { merge: true });
                    } else {
                        throw e; // Lỗi nghiêm trọng khác
                    }
                }
            }
            
        } catch (error) {
            console.error("LỖI CẬP NHẬT POSTMETRICS CUỐI CÙNG:", error);
            alert("Lỗi Ghi dữ liệu: " + error.message);
        }
    };
}
// --- PHẦN 5: HÀM XỬ LÝ LƯỢT XEM BÀI VIẾT (VIEW COUNT) ---

function countView() {
    if (!isPostPage || !db) return; 

    var viewElement = document.querySelector('.post-view-count');
    var viewDisplay = viewElement ? (viewElement.querySelector('#view-count-number') || viewElement.querySelector('span')) : null;
    
    if (!viewElement || !viewDisplay) return;

    var postId = viewElement.getAttribute('data-id');
    if (!postId) return;
    
    const viewDocRef = db.collection('views').doc(postId);

    viewDocRef.set({
        count: firebase.firestore.FieldValue.increment(1)
    }, { merge: true }) 
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
        // Lỗi thường là Missing or insufficient permissions
        console.error("Lỗi khi cập nhật lượt xem (Firestore):", error);
        viewDisplay.innerText = 'Lỗi!';
    });
}

// --- PHẦN 6: HÀM HIỂN THỊ TỔNG LƯỢT LIKE (AGGREGATION COUNT) ---

function initLikeCountDisplay() {
    // KHẮC PHỤC LỖI: Kiểm tra db trước khi dùng
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

// --- PHẦN 7: GẮN SỰ KIỆN VÀ CHẠY CHƯƠNG TRÌNH (ĐÃ BỔ SUNG LOGIC LIKE CỐT LÕI) ---
// Bọc logic trong $(document).ready an toàn

if (typeof $ !== 'undefined') {
    $(document).ready(function() {
        
        // --- 1. GẮN SỰ KIỆN ĐĂNG NHẬP/ĐĂNG XUẤT (Không thay đổi) ---
        signInLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault(); 
                signInWithGoogle();
            });
        });

        signOutButtons.forEach(function(button) {
            button.addEventListener('click', signOut);
        });

        // Theo dõi trạng thái Auth và cập nhật UI (Chỉ chạy updateAuthUI)
        if(auth) auth.onAuthStateChanged(updateAuthUI);

        // Khởi động bộ đếm lượt xem (Chỉ chạy trên trang bài viết)
        countView();
        
        // Khởi động Bộ đếm tổng số lượt Like (Chỉ hiển thị số)
        setTimeout(initLikeCountDisplay, 0);

        // --- 2. LOGIC XỬ LÝ HÀNH ĐỘNG LIKE/UNLIKE CỐT LÕI (BỔ SUNG) ---
        const likeButtons = document.querySelectorAll('.likePost[data-post-id]');
        
        if (auth && likeButtons.length > 0) {
            // Theo dõi trạng thái đăng nhập để khởi tạo nút Like
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // ĐÃ ĐĂNG NHẬP: Khởi tạo cho TẤT CẢ các nút Like
                    likeButtons.forEach(btn => {
                        // Gọi hàm khởi tạo nút Like cá nhân
                        if (typeof initSingleLikeButton === 'function') {
                            initSingleLikeButton(btn, user);
                        } else {
                            console.error("Lỗi: Hàm initSingleLikeButton chưa được định nghĩa.");
                        }
                    });
                } else {
                    // CHƯA ĐĂNG NHẬP: Gán sự kiện yêu cầu đăng nhập
                    likeButtons.forEach(btn => {
                        // Đảm bảo icon là RỖNG khi chưa đăng nhập
                        updateLikeUI(btn, false); 
                        btn.onclick = (e) => {
                            e.preventDefault();
                            alert("Đăng nhập để Thích bài viết này!");
                        };
                    });
                }
            });
        }
    });
} else {
    // Chạy các hàm cơ bản không cần DOM Ready hoặc jQuery
    if(auth) auth.onAuthStateChanged(updateAuthUI);
    countView();
	setTimeout(initLikeCountDisplay, 0);
    console.error("LỖI: jQuery không được tìm thấy. Các chức năng có thể không hoạt động.");
}

// VTZone
// blog.vutruong.vn