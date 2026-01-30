// Chức năng Popup đăng nhập bằng Google cho Blogspot by VTZone
// --- 1. DEFINITION PHASE (Khai báo hàm trước để tránh lỗi not a function) ---
    
    // Hàm xử lý khi đăng nhập thành công
    window.handleCredentialResponse = function(response) {
        console.log("Token received. Authenticating with Firebase...");
        const googleIdToken = response.credential;
        const credential = firebase.auth.GoogleAuthProvider.credential(googleIdToken);

        firebase.auth().signInWithCredential(credential)
            .then((result) => {
                console.log("Firebase Login Success:", result.user.email);
                
                // Ẩn popup ngay lập tức nếu nó đang hiện
                if (window.google && window.google.accounts) {
                    window.google.accounts.id.cancel();
                }
                
                // Reload lại trang để cập nhật giao diện
                // window.location.reload();

            })
            .catch((error) => {
                console.error("Firebase Login Error:", error);
            });
    }

    // --- 2. EXECUTION PHASE (Chờ Firebase tải xong mới chạy logic) ---
    
    // Sử dụng interval để đợi Firebase Auth sẵn sàng
    var checkAuthInterval = setInterval(function() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(checkAuthInterval); // Dừng kiểm tra khi Firebase đã load

            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    // --- CASE A: ĐÃ ĐĂNG NHẬP (LOGGED IN) ---
                    console.log("User is ALREADY logged in. One Tap will NOT show.");
                    // Đảm bảo tắt popup nếu lỡ có lệnh gọi nào đó
                    if (window.google && window.google.accounts) {
                        window.google.accounts.id.disableAutoSelect();
                    }

                } else {
                    // --- CASE B: CHƯA ĐĂNG NHẬP (NOT LOGGED IN) ---
                    console.log("User is NOT logged in. Preparing One Tap...");

                    // Đợi thư viện Google GSI tải xong
                    var checkGSIInterval = setInterval(function() {
                        if (window.google && window.google.accounts && window.google.accounts.id) {
                            clearInterval(checkGSIInterval);

                            // Khởi tạo One Tap
                            window.google.accounts.id.initialize({
                                client_id: "129635740050-2htdgc0rf6sq0dmmqa9uvkgefumbm3qm.apps.googleusercontent.com",
                                callback: window.handleCredentialResponse,
                                auto_select: true,
                                cancel_on_tap_outside: false
                            });

                            // Ra lệnh hiển thị
                            window.google.accounts.id.prompt(function(notification) {
                                if (notification.isNotDisplayed()) {
                                    // Log lý do nếu không hiện (quan trọng để debug)
                                    console.log("Popup skipped reason:", notification.getNotDisplayedReason());
                                } else {
                                    console.log("Popup is displaying now!");
                                }
                            });
                        }
                    }, 500); // Check GSI mỗi 0.5s
                }
            });
        }
    }, 500); // Check Firebase mỗi 0.5s
