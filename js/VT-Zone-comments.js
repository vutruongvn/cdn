// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG BÌNH LUẬN REALTIME
 * Phiên bản: 4.0
 * Tính năng: CRUD, Realtime, Phân trang, Skeleton Loading, Google Auth, Admin Badge.
 * Full base code - backup!!!
 */

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, deleteDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch, getCountFromServer, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Đóng gói
window.VT_InitCommentSystem = function() {

    // --- 1. CẤU HÌNH ---
    const firebaseConfig = {
        apiKey: "AIzaSyD0t0UgJlOjZEdhbmznGN5hRKCSMLkA_yU",
        authDomain: "vutruong-vn.firebaseapp.com",
        databaseURL: "https://vutruong-vn-default-rtdb.firebaseio.com",
        projectId: "vutruong-vn",
        storageBucket: "vutruong-vn.firebasestorage.app",
        messagingSenderId: "417755493462",
        appId: "1:417755493462:web:3102aba63f638f7"
    };

    // Khởi tạo Firebase (Tránh khởi tạo lại nhiều lần)
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    const ADMIN_UIDS = ["u9U3j9O63jbipOgai3o88X4008q2"];
    const DEFAULT_AVATAR = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhS34MMIbvh9P6obSup4qu4xfE2LrXkhY8rAXLJGX3PzwvolCMWTeXSU0hgm3fETQnfGbcEd0jklsAzNV9NIA-v3XQblgT6DTLHsC9zVuTrEuifK3h9P1Fq7PIAha8Z9TER64RIcfAzSgtq7uHbZL4iLJuR5XGhqn3ju4ZXoTHYjXCclA/s35/vtzone-default-avatar.jpg';

    // --- 2. QUẢN LÝ TRẠNG THÁI (STATE) ---
    let unsubscribeMap = {};      // Lưu các hàm hủy lắng nghe realtime
    const PAGINATION_STATE = {};  // Lưu số lượng cmt đang hiển thị cho từng post
    let commentIdToDelete = null; // ID cmt đang chờ xóa
    let deleteModalObj = null;    // Instance của Bootstrap Modal
    const IS_LOADING_MAP = {};    // Trạng thái đang tải cho nút Load More

    // --- 3. TIỆN ÍCH (UTILITIES) ---
    
    // Xử lý thời gian kiểu Facebook/Zalo
    const timeAgo = (date) => {
    if (!date) return "<i class='fa-regular fa-spinner-third fa-spin me-1'></i> Đang đăng bình luận";
    
    // Chuyển date sang đối tượng Date nếu nó là Firestore Timestamp
    const d = date.toDate ? date.toDate() : new Date(date);
    const seconds = Math.floor((new Date() - d) / 1000);
    
    // Các mốc thời gian của ní
    const intervals = { 'năm': 31536000, 'tháng': 2592000, 'tuần': 604800, 'ngày': 86400, 'giờ': 3600, 'phút': 60 };
    
    // 1. Dưới 5 giây thì hiện "Vừa xong" cho nó mượt
    if (seconds < 5) return 'Vừa xong';
    
    // 2. Dưới 1 phút thì hiện "x giây trước" theo ý ní
    if (seconds < 60) return seconds + ' giây trước';
    
    // 3. Các mốc còn lại giữ nguyên logic cũ của ní
    for (let key in intervals) {
        const counter = Math.floor(seconds / intervals[key]);
        if (counter > 0) {
            if (key === 'ngày' && counter === 1) return 'Hôm qua';
            return counter + ' ' + key;
        }
    }
    
    return 'Vừa xong';
};

    // Tạo bộ xương khi đang tải thêm bình luận
    const renderSkeleton = () => {
        return `
        <div class="VT-comment-item mt-3">
            <div class="d-flex align-items-start">
                <div class="vt-ske-avatar vt-ske-loading me-2"></div>
                <div class="flex-grow-1">
                    <div class="vt-ske-bubble vt-ske-loading"></div>
                    <div class="d-flex align-items-center gap-2 mt-2 ms-2">
                        <div class="vt-ske-text vt-ske-loading" style="width: 50px;"></div>
                        <div class="vt-ske-text vt-ske-loading" style="width: 30px;"></div>
                        <div class="vt-ske-text vt-ske-loading" style="width: 25px;"></div>
                        <div class="vt-ske-text vt-ske-loading" style="width: 25px; background-color: #ffeef0 !important;"></div>
                    </div>
                </div>
            </div>
        </div>`;
    };

    // Render nội dung cmt: BBCode [img], in đậm *, in nghiêng _
    const formatCommentText = (str, cId) => {
        if (!str) return "";
        const p = document.createElement('p'); p.textContent = str;
        let safeStr = p.innerHTML;
        safeStr = safeStr.replace(/\[img\](.*?)\[\/img\]/gi, (match, url) => `<a loading="lazy" data-fancybox="photo-cmt-${cId}" src="${url.trim()}" class="cursor-pointer" onerror="this.src='https://placehold.co/600x400?text=Error';"><i class="me-1 fa-duotone fa-image"></i>Xem ảnh</a>`);
        safeStr = safeStr.replace(/\*([^\s][^*]*[^\s])\*/g, '<b>$1</b>').replace(/(?<!\w)_([^\s][^_]*[^\s])_(?!\w)/g, '<i>$1</i>');
        return safeStr;
    };

    const toggleEl = (el, show) => {
        if (el) el.style.setProperty('display', show ? 'block' : 'none', 'important');
    };

    window.VT_RefreshTooltips = () => {
        if (typeof bootstrap === 'undefined') return;
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(el => {
            const inst = bootstrap.Tooltip.getInstance(el);
            if (inst) inst.dispose();
            new bootstrap.Tooltip(el);
        });
    };

    window.VT_HandlePlaceholder = (el) => {
        const ph = el.parentElement.querySelector('.VT-placeholder');
        if (ph) ph.style.display = el.innerText.trim() === '' ? 'block' : 'none';
    };

    // --- 4. XỬ LÝ DỮ LIỆU (CRUD) ---

    // Modal xác nhận xóa
    const injectDeleteModal = () => {
        if (!document.getElementById('VTDeleteModal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="VTDeleteModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-sm">
                        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div class="modal-body text-center p-4">
                                <div class="mb-3 text-danger"><i class="fa-solid fa-trash-can-list" style="font-size: 2rem"></i></div>
                                <h5 class="fw-bold">Xác nhận xóa?</h5>
                                <p class="text-muted small">Bình luận này sẽ bị xóa vĩnh viễn và không thể khôi phục.</p>
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
            deleteModalObj = bootstrap.Modal.getInstance(document.getElementById('VTDeleteModal')) || new bootstrap.Modal(document.getElementById('VTDeleteModal'));
        }

        const confirmBtn = document.getElementById('VTConfirmDeleteBtn');
        confirmBtn.innerText = 'Xóa';
        confirmBtn.disabled = false;

        confirmBtn.onclick = async () => {
    if (commentIdToDelete) {
        confirmBtn.innerText = 'Đang xóa...';
        confirmBtn.disabled = true;

        try {
            // 1. Lấy data để check quyền và parentId
            const docRef = doc(db, "comments", commentIdToDelete);
            const docSnap = await getDoc(docRef); // Cần import getDoc ở trên
            
            if (docSnap.exists()) {
                const commentData = docSnap.data();
                const batch = writeBatch(db);
                
                // --- LOGIC CẬP NHẬT CHA ---
                // Rules: allow update ... affectedKeys().hasOnly(['childCount']) sẽ cho phép dòng này chạy
                if (commentData.parentId) {
                    const parentRef = doc(db, "comments", commentData.parentId);
                    batch.update(parentRef, {
                        childCount: increment(-1)
                    });
                }
                
                // --- LOGIC XÓA ---
                // Rules: request.auth.uid == resource.data.uid sẽ cho phép dòng này chạy
                batch.delete(docRef);

                // --- LOGIC XÓA CON (Nếu là cha) ---
                if (!commentData.parentId) {
                    const qChild = query(collection(db, "comments"), where("parentId", "==", commentIdToDelete));
                    const childSnap = await getDocs(qChild);
                    childSnap.forEach(d => batch.delete(d.ref));
                }

                await batch.commit();

                // --- CHÈN ĐOẠN NÀY ĐỂ XÓA REALTIME (NHẢY RA LIỀN) ---
                const itemToRemove = document.getElementById(`VT-cmt-${commentIdToDelete}`);
                if (itemToRemove) {
                    // Nếu là cmt con, mình cần cập nhật lại cái text của nút "Phản hồi" ở thằng cha nó
                    const parentId = commentData.parentId;
                    const parentItem = parentId ? document.getElementById(`VT-cmt-${parentId}`) : null;

                    // Hiệu ứng biến mất cho mượt
                    itemToRemove.style.transition = "0.3s";
                    itemToRemove.style.opacity = "0";
                    
                    setTimeout(() => {
                        itemToRemove.remove(); // Xóa khỏi giao diện ngay lập tức

                        // Nếu là cmt con, cập nhật lại số lượng hiển thị trên nút cmt cha
                        if (parentId && parentItem) {
                            const childContainer = parentItem.querySelector(`.VT-child-list-${parentId}`);
                            const loadBtn = parentItem.querySelector(`[onclick*="VT_LoadSubComments"]`);
                            if (childContainer && loadBtn) {
                                const currentCount = childContainer.querySelectorAll('.VT-comment-item').length;
                                if (currentCount > 0) {
                                    loadBtn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${currentCount} phản hồi`;
                                } else {
                                    // 1. Ẩn luôn box chứa cmt con cho sạch
                                    childContainer.style.display = 'none';
                                    
                                    // 2. Xóa hẳn cái nút "Ẩn 0 phản hồi" này đi khỏi DOM
                                    loadBtn.remove(); // Đây chính là dòng ní cần để mất cái chữ "Ủa" kia đó
                                }
                            }
                        }
                    }, 300);
                }
                // ----------------------------------------------------
                
                // Ẩn modal và báo thành công
                deleteModalObj.hide();
                commentIdToDelete = null;
            } else {
                deleteModalObj.hide();
            }

            // Reset nút
            setTimeout(() => {
                confirmBtn.innerText = 'Xóa';
                confirmBtn.disabled = false;
            }, 300);

        } catch (e) {
            console.error("Lỗi khi xóa:", e);
            confirmBtn.innerText = 'Lỗi! Thử lại';
            confirmBtn.disabled = false;
            alert("Lỗi: Bạn không có quyền xóa bình luận này!");
        }
    }
};
    };

window.VT_SendComment = async function(btn, parentId = null) {
        const appBox = btn.closest('.VT-comment-app');
        const input = parentId ? appBox.querySelector(`.VT-rep-in-${parentId}`) : appBox.querySelector('.VT-comment-input');
        const content = input.innerText.trim();
        
        if (!auth.currentUser || !content) return;

        let finalPostUrl = window.location.href.split('?')[0].split('#')[0];
        const postContainer = btn.closest('.post');
        if (postContainer) {
            const titleSpan = postContainer.querySelector('.postTitle span');
            if (titleSpan && titleSpan.getAttribute('data-post-url')) {
                finalPostUrl = titleSpan.getAttribute('data-post-url').split('?')[0].split('#')[0];
            }
        }

        const backupContent = content; 
        input.innerText = ''; 
        VT_HandlePlaceholder(input);

        if (parentId) toggleEl(btn.closest(`.VT-rep-box-${parentId}`), false);

        const postId = appBox.getAttribute('data-post-id');

        try {
            const docRef = await addDoc(collection(db, "comments"), { 
                postId,
                postUrl: finalPostUrl,
                parentId, 
                uid: auth.currentUser.uid, 
                userName: auth.currentUser.displayName, 
                userAvatar: auth.currentUser.photoURL, 
                content: backupContent,
                createdAt: serverTimestamp() 
            });

            if (parentId) {
                const parentDocRef = doc(db, "comments", parentId);
                await updateDoc(parentDocRef, {
                    childCount: increment(1)
                });

                const childContainer = appBox.querySelector(`.VT-child-list-${parentId}`);
                const parentItem = appBox.querySelector(`#VT-cmt-${parentId}`);
                
                if (childContainer) {
                    const hasLoadedBefore = childContainer.querySelectorAll('.VT-comment-item').length > 0;
                    
                    if (!hasLoadedBefore && parentItem.querySelector(`[onclick*="VT_LoadSubComments"]`)) {
                        await window.VT_LoadSubComments(parentItem.querySelector(`[onclick*="VT_LoadSubComments"]`), parentId);
                    } else {
                        // Tên biến đã đồng nhất: myNewChildHtml
                        const myNewChildHtml = createHtml({
                            id: docRef.id, // ID thật từ Firebase vừa trả về
                            userName: auth.currentUser.displayName,
                            userAvatar: auth.currentUser.photoURL,
                            content: backupContent,
                            createdAt: { toDate: () => new Date() },
                            uid: auth.currentUser.uid
                        }, true, true); 

                        childContainer.insertAdjacentHTML('beforeend', myNewChildHtml);
                        childContainer.style.display = 'block';

                        // --- MẸO ĐỂ XÓA ĐƯỢC NGAY ---
                        // Đảm bảo các tooltip hoặc sự kiện JS nếu có được khởi tạo lại cho phần tử mới
                        if (window.VT_RefreshTooltips) window.VT_RefreshTooltips(); 
                    }

                    // Cập nhật số lượng nút phản hồi
                    const loadBtn = parentItem?.querySelector(`[onclick*="VT_LoadSubComments"]`);
                    if (loadBtn) {
                        const currentCount = childContainer.querySelectorAll('.VT-comment-item').length;
                        loadBtn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${currentCount} phản hồi`;
                    }
                }
            }
            console.log("Đã đăng bình luận tại bài viết:", finalPostUrl);
        } catch (e) { 
            console.error("Lỗi gửi comment:", e);
            if (parentId) toggleEl(btn.closest(`.VT-rep-box-${parentId}`), true);
            input.innerText = backupContent;
            VT_HandlePlaceholder(input);
            alert("Có lỗi xảy ra, hãy thử reload trang!");
        }
    };

    window.VT_DeleteComment = (id) => { commentIdToDelete = id; deleteModalObj.show(); };

    window.VT_EditMode = (btn, cId) => {
        const row = btn.closest(`#VT-cmt-${cId}`);
        const txt = row.querySelector('.VT-comment-text');
        txt.dataset.oldContent = txt.innerText.trim();
        txt.contentEditable = true; txt.focus();
        toggleEl(row.querySelector('.VT-edit-btns'), true);
    };

    window.VT_CancelEdit = (btn, cId) => {
        const row = btn.closest(`#VT-cmt-${cId}`);
        const txt = row.querySelector('.VT-comment-text');
        txt.innerText = txt.dataset.oldContent || ""; txt.contentEditable = false;
        toggleEl(row.querySelector('.VT-edit-btns'), false);
    };

    window.VT_SaveEdit = async (btn, cId) => {
        const row = btn.closest(`#VT-cmt-${cId}`);
        const txt = row.querySelector('.VT-comment-text');
        const newText = txt.innerText.trim();
        if (newText) {
            try {
                await updateDoc(doc(db, "comments", cId), { content: newText, lastEdited: serverTimestamp() });
                txt.contentEditable = false; toggleEl(row.querySelector('.VT-edit-btns'), false);
            } catch (e) { console.error(e); }
        }
    };

    // --- 5. GIAO DIỆN (RENDER HTML) ---
    const createHtml = (data, isOwner, isChild, childCount = 0, childHtml = '') => {
    const cId = data.id;
    const isCmtAdmin = ADMIN_UIDS.includes(data.uid);
    const canDelete = isOwner || (auth.currentUser && ADMIN_UIDS.includes(auth.currentUser.uid));
    const fullDate = data.createdAt ? data.createdAt.toDate().toLocaleString() : "";
    const isLogged = !!auth.currentUser;

    // Lấy avatar của người đang dùng để hiện ở khung reply
    const currentUserAvatar = isLogged ? auth.currentUser.photoURL : DEFAULT_AVATAR;

    return `<div class="VT-comment-item ${isChild ? 'ms-3 VT-comment-item-reply' : ''}" id="VT-cmt-${cId}">
        <div class="d-flex align-items-start gap-2">
            <img src="${data.userAvatar || DEFAULT_AVATAR}" class="rounded-circle m-0" width="${isChild ? 28 : 32}" height="${isChild ? 28 : 32}" style="object-fit:cover;">
            <div class="flex-grow-1">
                <div class="VT-comment-bubble py-2 px-3 rounded-4">
                    <div class="d-inline-block me-1 ${isCmtAdmin ? 'is-admin-name fw-medium' : 'is-not-admin-name fw-medium'}">
                        ${data.userName}${isCmtAdmin ? '<i class="fa-solid fa-badge-check ms-1 text-primary small" data-bs-toggle="tooltip" title="Tài khoản đã được xác thực"></i>' : ''}
                    </div>
                    <div class="VT-comment-text d-inline-block border-0" style="outline:none;word-break:break-word">${formatCommentText(data.content, cId)}</div>
                    <div class="VT-edit-btns mt-1" style="display: none;">
                        <small class="text-primary fw-bold cursor-pointer me-2" onclick="VT_SaveEdit(this, '${cId}')">Lưu</small>
                        <small class="text-muted cursor-pointer" onclick="VT_CancelEdit(this, '${cId}')">Hủy</small>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-3 opacity-75 mt-1 ms-3 small">
                    <a href="${window.location.href.split('#')[0]}#VT-cmt-${cId}" class="VT-cmt-time opacity-75 text-decoration-none" title="${fullDate}">${timeAgo(data.createdAt?.toDate())}${data.lastEdited ? ' (đã chỉnh sửa)' : ''}</a>
                    ${!isChild ? `<span class="VT-action-link" onclick="VT_ToggleReply(this, '${cId}', '${data.userName}')">Trả lời</span>` : ''}
                    ${isOwner ? `<span class="VT-action-link" onclick="VT_EditMode(this, '${cId}')">Sửa</span>` : ''}
                    ${canDelete ? `<span class="VT-action-link text-danger" onclick="VT_DeleteComment('${cId}')">Xóa</span>` : ''}
                </div>

                <div class="VT-rep-box-${cId} p-0 m-0 ms-3 mt-3" style="display: none;">
                    <div class="d-flex align-items-start gap-2">
                        <img src="${currentUserAvatar}" class="rounded-circle m-0" width="28" height="28" style="object-fit:cover;">
                        <div class="flex-grow-1">
                            <div class="VT-rep-box d-flex align-items-center rounded-5 px-3 py-2 position-relative">
                                <div class="VT-rep-in-${cId} flex-grow-1" contenteditable="${isLogged}" oninput="VT_HandlePlaceholder(this)" style="outline:none; min-height:1rem; z-index:2"></div>
                                <div class="VT-rep-placeholder VT-placeholder position-absolute opacity-75" style="left:15px; z-index:1">${isLogged ? 'Trả lời...' : 'Đăng nhập để trả lời'}</div>
                                ${isLogged ? `<button onclick="VT_SendComment(this, '${cId}')" class="btn btn-link p-0 ms-2 text-primary shadow-none border-0"><i class="fa-duotone fa-solid fa-paper-plane-top"></i></button>` : ''}
                            </div>
                            <small class="cursor-pointer ms-2 fw-medium opacity-75" style="font-size: 12px;" onclick="VT_CancelReply('${cId}')">Hủy trả lời</small>
                        </div>
                    </div>
                </div>

                ${!isChild && childCount > 0 ? `
    			<div class="ms-3 mt-2 fw-medium opacity-75 cursor-pointer small" onclick="VT_LoadSubComments(this, '${cId}')">
        			<i class="fa-duotone fa-turn-down-right me-2"></i>${childCount} phản hồi
    			</div>` : ""}
				<div class="VT-child-list VT-child-list-${cId}" style="display: none;"></div>
            </div>
        </div>
    </div>`;
};

    // --- 6. HÀM ĐẾM ---
	const updateCommentCount = (postId) => {
	    // 1. Tạo câu truy vấn lấy tất cả cmt của bài viết này
	    const q = query(collection(db, "comments"), where("postId", "==", postId));
	
	    // 2. Dùng onSnapshot để lắng nghe thay đổi liên tục
	    onSnapshot(q, (snapshot) => {
	        const totalCount = snapshot.size; // Firestore tự đếm số lượng tài liệu trong snapshot
	        
	        // 3. Tìm container và cập nhật số lượng
	        const countContainer = document.querySelector(`.VT-comment-count[data-post-id="${postId}"]`);
	        if (countContainer) {
	            const countNumber = countContainer.querySelector('.count-number');
	            if (countNumber) {
	                // Thêm hiệu ứng nhẹ nếu muốn số nó nhảy nhìn cho "mượt"
	                countNumber.innerText = totalCount;
	            }
	        }
	    }, (error) => {
	        console.error("Lỗi lắng nghe số lượng cmt:", error);
	    });
	};
    // --- 7. CORE LISTENING (LẮNG NGHE REALTIME) ---
    const startListening = (appBox, isForce = false) => {
        const postId = appBox.getAttribute('data-post-id');
        if (appBox.dataset.loaded === "true" && !isForce) return;
        appBox.dataset.loaded = "true";
        if (unsubscribeMap[postId]) unsubscribeMap[postId]();

        const q = query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc"));
        
        unsubscribeMap[postId] = onSnapshot(q, (snap) => {
            const all = []; snap.forEach(d => all.push({ id: d.id, ...d.data() }));
            const parents = all.filter(c => !c.parentId).reverse();
            const children = all.filter(c => c.parentId);

            const isSingleItem = window.location.pathname.endsWith('.html');
            const limitCount = PAGINATION_STATE[postId] || (isSingleItem ? 5 : 2);
            
            const list = appBox.querySelector('.VT-comment-list');
            if (list) {
                const dataToShow = parents.slice(0, limitCount);
                
                dataToShow.forEach((p, index) => {
                    let existingP = list.querySelector(`#VT-cmt-${p.id}`);
                    
                    if (!existingP) {
                        // CHÈN MỚI: Mới nhất (index 0) thì cho lên đầu, còn lại cho xuống cuối
                        const html = createHtml(p, auth.currentUser?.uid === p.uid, false, p.childCount || 0, '');
                        if (index === 0 && list.children.length > 0) {
                            list.insertAdjacentHTML('afterbegin', html);
                        } else {
                            list.insertAdjacentHTML('beforeend', html);
                        }
                    } else {
                        // CẬP NHẬT: Chỉ sửa mốc thời gian để tránh lỗi "Loading"
                        const timeEl = existingP.querySelector('.VT-cmt-time');
                        if (timeEl) timeEl.innerHTML = p.createdAt ? timeAgo(p.createdAt) : "Vừa xong";
                    }
                });

                // Dọn dẹp cmt bị xóa để list luôn đồng bộ
                const currentIds = dataToShow.map(d => `VT-cmt-${d.id}`);
                Array.from(list.children).forEach(el => {
                    if (el.id?.startsWith('VT-cmt-') && !currentIds.includes(el.id)) el.remove();
                });
            }
            
            const loadMoreBox = appBox.querySelector('#VT-load-more-box');
            if (loadMoreBox) toggleEl(loadMoreBox, parents.length > limitCount);
            
            updateCommentCount(postId);
            window.VT_RefreshTooltips();
            window.VT_FocusComment();
        });
    };

    window.VT_LoadMoreParents = async (btn) => {
        const appBox = btn.closest('.VT-comment-app');
        if (!appBox || IS_LOADING_MAP[appBox.id]) return;
        
        const postId = appBox.getAttribute('data-post-id');
        const list = appBox.querySelector('.VT-comment-list');
        const loadMoreBox = appBox.querySelector('#VT-load-more-box');

        // 1. Tạo Skeleton và chèn vào cuối danh sách (giữ cho list không bị trống)
        const skeletonWrap = document.createElement('div');
        skeletonWrap.className = 'vt-ske-wrapper';
        skeletonWrap.innerHTML = Array(1).fill(renderSkeleton()).join('');
        list.appendChild(skeletonWrap);
        
        // 2. Trạng thái đang tải
        IS_LOADING_MAP[appBox.id] = true;
        if (loadMoreBox) loadMoreBox.style.setProperty('display', 'none', 'important'); // Ẩn nút gốc đi để hiện ske

        // 3. Đợi 1 giây để người dùng thấy hiệu ứng Skeleton (như ní muốn)
        await new Promise(res => setTimeout(res, 1000));

        // 4. Tính toán limit mới
        const isSingleItem = window.location.pathname.endsWith('.html');
        const incrementValue = isSingleItem ? 5 : 2; 
        const currentLimit = PAGINATION_STATE[postId] || (isSingleItem ? 5 : 2);
        PAGINATION_STATE[postId] = currentLimit + incrementValue;

        // 5. Cập nhật dữ liệu
        // startListening sẽ tự động kiểm tra 'parents.length > limitCount' 
        // để quyết định hiện lại nút loadMoreBox hay không.
        startListening(appBox, true);
        
        // 6. Dọn dẹp Skeleton mượt mà
        skeletonWrap.style.display = 'none';
        
        setTimeout(() => {
            skeletonWrap.remove();
            IS_LOADING_MAP[appBox.id] = false;
            // Không cần ép btn hiện lại ở đây vì startListening đã lo phần hiển thị nút dựa trên data thật rồi
        }, 300);
    };

    const VT_SyncUserUI = (user) => {
        const photoURL = user?.photoURL || DEFAULT_AVATAR;
        document.querySelectorAll('.VT-user-avatar').forEach(img => img.src = photoURL);
        document.querySelectorAll('.VT-comment-app').forEach(app => {
            const input = app.querySelector('.VT-comment-input');
            const ph = app.querySelector('.VT-placeholder');
            if (input) {
                input.contentEditable = !!user;
                if (!user) { input.innerText = ""; VT_HandlePlaceholder(input); }
                if (ph) ph.innerText = user ? `Bình luận dưới tên ${user.displayName}` : "Đăng nhập để bình luận";
            }
        });
    };

    onAuthStateChanged(auth, (user) => {
        Object.values(unsubscribeMap).forEach(unsub => unsub());
        unsubscribeMap = {};
        VT_SyncUserUI(user);
        injectDeleteModal();
        document.querySelectorAll('.VT-comment-app').forEach(app => startListening(app, true));
    });

    // --- 8. UI EVENTS ---
    window.VT_ToggleReply = (btn, id, name = "") => {
        const box = btn.closest('.VT-comment-item').querySelector(`.VT-rep-box-${id}`);
        const input = box.querySelector(`.VT-rep-in-${id}`);
        const ph = box.querySelector('.VT-rep-placeholder');
        if (box.style.display === 'none' || box.style.display === '') {
            toggleEl(box, true); 
            if (auth.currentUser && ph && name) ph.innerText = `Trả lời ${name}...`; 
            input.focus();
        } else { toggleEl(box, false); }
    };

    window.VT_CancelReply = (id) => {
        const cmtItem = document.getElementById(`VT-cmt-${id}`);
        if (cmtItem) {
            const box = cmtItem.querySelector(`.VT-rep-box-${id}`);
            const input = cmtItem.querySelector(`.VT-rep-in-${id}`);
            if (input) { input.innerText = ""; VT_HandlePlaceholder(input); }
            toggleEl(box, false);
        }
    };

	window.VT_LoadSubComments = async (btn, parentId) => {
    const childListContainer = document.querySelector(`.VT-child-list-${parentId}`);
    if (!childListContainer) return;

    // Chặn click khi đang chạy hiệu ứng trượt để tránh loạn xà ngầu
    if ($(childListContainer).is(':animated')) return;

    // 1. Nếu đã tải dữ liệu rồi (Đã có nội dung bên trong)
    if (childListContainer.innerHTML.trim() !== '') {
        $(childListContainer).slideToggle(200, function() {
            // Đếm số lượng thực tế các cmt con đang có trong DOM
            const count = childListContainer.querySelectorAll('.VT-comment-item').length;
            const isHidden = childListContainer.style.display === 'none';
            
            if (isHidden) {
                // Khi đóng lại: hiện "x phản hồi"
                btn.innerHTML = `<i class="fa-duotone fa-turn-down-right me-2"></i>${count} phản hồi`;
            } else {
                // Khi mở ra: hiện "Ẩn x phản hồi" như ní muốn
                btn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${count} phản hồi`;
            }
        });
        return;
    }

    // 2. Nếu chưa tải, tiến hành gọi Firestore
    // Lưu lại icon gốc hoặc trạng thái đang tải
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner-third fa-spin me-2"></i>Đang tải...`;
    btn.style.pointerEvents = 'none'; // Khóa nút tạm thời
    
    try {
        const q = query(collection(db, "comments"), where("parentId", "==", parentId), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        
        let subHtml = '';
        querySnapshot.forEach((doc) => {
            // Render từng cmt con vào chuỗi HTML
            subHtml += createHtml({id: doc.id, ...doc.data()}, auth.currentUser?.uid === doc.data().uid, true);
        });

        childListContainer.innerHTML = subHtml;
        const count = querySnapshot.size; // Lấy số lượng từ query result

        $(childListContainer).slideDown(200, function() {
            // Sau khi tải xong và hiện ra, đổi text thành "Ẩn x phản hồi"
            btn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${count} phản hồi`;
            btn.style.pointerEvents = 'auto';
        });

    } catch (e) {
        console.error("Lỗi tải cmt con:", e);
        btn.innerHTML = `Lỗi, thử lại?`;
        btn.style.pointerEvents = 'auto';
    }
};


    window.VT_ToggleChildList = (btn, id) => { 
        toggleEl(btn.closest('.VT-comment-item').querySelector(`.VT-child-list-${id}`), true); 
        btn.style.display = 'none'; 
    };

    window.VT_FocusComment = () => {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#VT-cmt-')) {
            const targetId = hash.replace('#', '');
            setTimeout(() => {
                const el = document.getElementById(targetId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const bubble = el.querySelector('.VT-comment-bubble');
                    if (bubble) {
                        bubble.style.transition = 'all 0.4s'; 
                        bubble.style.backgroundColor = '#dcefff'; 
                        bubble.style.border = '1px solid #0084ff';
                        setTimeout(() => { bubble.style.backgroundColor = ''; bubble.style.border = ''; }, 10000);
                    }
                }
            }, 800);
        }
    };

    // Loại bỏ HTML rác khi dán văn bản
    document.addEventListener('paste', (e) => {
        const target = e.target.closest('[contenteditable="true"]');
        if (!target) return;
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand("insertHTML", false, text);
    });

    // Khởi chạy lắng nghe cho các box đã có sẵn trong DOM
    document.querySelectorAll('.VT-comment-app').forEach(app => startListening(app));
};

// Khởi chạy khi tài liệu sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VT_InitCommentSystem());
} else {
    window.VT_InitCommentSystem();
}
// =========================================================================================