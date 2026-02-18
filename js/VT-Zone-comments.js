// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG BÌNH LUẬN REALTIME
 * Tính năng: Đăng/Trả lời/Xóa/Chỉnh sửa bình luận, Bật/Tắt bình luận, Đếm realtime
 * Phiên bản: 5.0.0
 * Cập nhật: 18/2/2026
 */
// =========================================================================================

// =====================
// IMPORT FIREBASE v10
// Dùng initializeFirestore với persistent cache để tối ưu offline & đa tab
// =====================
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection, addDoc, doc, getDoc, deleteDoc, setDoc, updateDoc,
    query, where, orderBy, onSnapshot, serverTimestamp, getDocs,
    writeBatch, increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =====================
// CẤU HÌNH FIREBASE
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

// Khởi tạo Firestore với persistent cache - hỗ trợ đa tab, offline
const db   = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
const auth = getAuth(app);

// =====================
// HẰNG SỐ
// =====================
const ADMIN_UIDS     = ["u9U3j9O63jbipOgai3o88X4008q2"];
const DEFAULT_AVATAR = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhS34MMIbvh9P6obSup4qu4xfE2LrXkhY8rAXLJGX3PzwvolCMWTeXSU0hgm3fETQnfGbcEd0jklsAzNV9NIA-v3XQblgT6DTLHsC9zVuTrEuifK3h9P1Fq7PIAha8Z9TER64RIcfAzSgtq7uHbZL4iLJuR5XGhqn3ju4ZXoTHYjXCclA/s44/vtzone-default-avatar.jpg';

// =========================================================================================
// ĐÓNG GÓI MODULE - Tất cả logic bên trong window.VT_InitCommentSystem
// =========================================================================================

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
        <div class="VT-disabled-notice flex-grow-1 position-relative d-flex align-items-center gap-2">
            <img src="${photoURL || DEFAULT_AVATAR}"
                 class="VT-user-avatar rounded-circle m-0 pe-none"
                 loading="lazy" width="44" height="44"
                 style="object-fit:cover; flex-shrink:0;">
            <div class="VT-comment-input VT-comment-disabled-noty flex-grow-1 d-flex align-items-center opacity-75 text-nowrap" style="cursor:not-allowed;user-select:none">
                Quản trị viên đã tắt bình luận
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

            console.log(`[Comments] Bài ${postId}: đã tắt bình luận`);

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
                    ? `Bình luận bằng tên ${user.displayName}`
                    : 'Đăng nhập để thích hoặc bình luận';
                if (restoredSend) restoredSend.style.display   = user ? '' : 'none';
            }

            // 3. Force re-render để khôi phục đầy đủ nút Trả lời/Chỉnh sửa trên các comment
            startListening(appBox, true);

            console.log(`[Comments] Bài ${postId}: đã bật bình luận`);
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
        settingsUnsubMap[postId] = onSnapshot(
            settingsRef,
            (snap) => {
                const disabled = snap.exists() && snap.data().commentsDisabled === true;

                // Chỉ áp dụng khi trạng thái thực sự thay đổi
                if (commentDisabledCache[postId] === disabled) return;

                applyCommentDisabledState(appBox, disabled);

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
        `<div class="VT-comment-item mt-3"><div class="d-flex align-items-start gap-2"><div class="vt-ske-avatar vt-loading-effect-loading" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div><div class="flex-grow-1"><div class="vt-ske-bubble vt-loading-effect-loading" style="width:18rem;height:1rem;border-radius:4px"></div><div class="d-flex align-items-center gap-2 mt-1"><div class="vt-ske-text vt-loading-effect-loading" style="width:2.75rem;height:.8rem;border-radius:4px"></div><div class="vt-ske-text vt-loading-effect-loading" style="width:2.75rem;height:.8rem;border-radius:4px"></div></div></div></div></div>`;

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
                <img src="${avatar}" class="VT-user-avatar rounded-circle m-0" loading="lazy" width="28" height="28" style="object-fit:cover;">
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
            alert("Có lỗi xảy ra, hãy thử reload trang!");
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
        const cId       = data.id;
        const isAdmin   = ADMIN_UIDS.includes(data.uid);
        const canDelete = isOwner || (auth.currentUser && ADMIN_UIDS.includes(auth.currentUser.uid));
        const fullDate  = data.createdAt ? data.createdAt.toDate().toLocaleString() : "";

        // Disabled state: ẩn Trả lời và Chỉnh sửa, chỉ giữ Xóa
        const isDisabled = (() => {
            const appBox = document.querySelector(`.VT-comment-app[data-post-id="${data.postId}"]`);
            return appBox && appBox.dataset.commentDisabled === 'true';
        })();

        return `<div class="VT-comment-item m-0 mt-3 ${isChild ? 'VT-comment-item-reply' : ''}" id="VT-cmt-${cId}">
            <div class="d-flex align-items-start gap-2">
                <img src="${data.userAvatar || DEFAULT_AVATAR}" class="rounded-circle m-0 object-fit-cover pe-none" loading="lazy" width="${isChild ? 28 : 44}" height="${isChild ? 28 : 44}">
                <div class="flex-grow-1">
                    <div class="VT-comment-bubble">
                        <div class="d-inline ${isAdmin ? 'is-admin-name fw-medium' : 'is-not-admin-name fw-medium'}">
                            ${data.userName}${isAdmin ? '<i class="fa-solid fa-badge-check ms-1 text-primary small" data-bs-toggle="tooltip" title="Tài khoản đã được xác thực"></i>' : ''}
                        </div>
                        <div class="VT-comment-text d-inline border-0">${formatCommentText(data.content, cId)}</div>
                    </div>
                    <div class="VT-edit-btns mt-1" style="display:none">
                        <small class="text-primary fw-bold cursor-pointer me-2" onclick="VT_SaveEdit(this,'${cId}')">Lưu chỉnh sửa</small>
                        <small class="opacity-75 cursor-pointer" onclick="VT_CancelEdit(this,'${cId}')">Hủy</small>
                    </div>
                    <div class="d-flex align-items-center gap-3 opacity-75 mt-1 small">
                        <a href="${window.location.href.split('#')[0]}#VT-cmt-${cId}" class="VT-cmt-time opacity-75 text-decoration-none" title="${fullDate}">${timeAgo(data.createdAt?.toDate())}${data.lastEdited ? ' (đã chỉnh sửa)' : ''}</a>
                        ${!isChild && !isDisabled ? `<span class="VT-action-link" onclick="VT_ToggleReply(this,'${cId}','${data.userName}')">Trả lời</span>` : ''}
                        ${isOwner && !isDisabled  ? `<span class="VT-action-link" onclick="VT_EditMode(this,'${cId}')">Chỉnh sửa</span>` : ''}
                        ${canDelete               ? `<span class="VT-action-link text-danger" onclick="VT_DeleteComment('${cId}')">Xóa</span>` : ''}
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
    // Dùng onSnapshot để đếm realtime tổng bình luận của postId
    // =====================

    const updateCommentCount = (postId) => {
        const q = query(collection(db, "comments"), where("postId", "==", postId));
        onSnapshot(q, (snap) => {
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
                const dataToShow = parents.slice(0, limitCount);
                dataToShow.forEach((p, index) => {
                    let existing = list.querySelector(`#VT-cmt-${p.id}`);
                    if (!existing) {
                        const html = createHtml(p, auth.currentUser?.uid === p.uid, false, p.childCount || 0);
                        if (index === 0 && list.children.length > 0) {
                            list.insertAdjacentHTML('afterbegin', html);
                        } else {
                            list.insertAdjacentHTML('beforeend', html);
                        }
                    } else {
                        // Chỉ cập nhật thời gian (tránh re-render toàn bộ)
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
            }

            const loadMoreBox = appBox.querySelector('.VT-load-more-box');
            if (loadMoreBox) toggleEl(loadMoreBox, parents.length > limitCount);

            updateCommentCount(postId);
            window.VT_RefreshTooltips();
            window.VT_FocusComment();
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
    // MODAL XÁC NHẬN XÓA
    // =====================

    const injectDeleteModal = () => {
        if (!document.getElementById('VTDeleteModal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="VTDeleteModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-sm">
                        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div class="modal-body text-center p-4">
                                <div class="mb-3 text-danger"><i class="fa-solid fa-trash-can-list" style="font-size:2rem"></i></div>
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
                confirmBtn.innerText  = 'Lỗi';
                confirmBtn.disabled   = false;
                alert("Lỗi!");
            }
        };
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
                input.contentEditable = String(!!user);
                if (!user) { input.innerText = ""; VT_HandlePlaceholder(input); }
                if (ph) ph.innerText = user
                    ? `Bình luận bằng tên ${user.displayName}`
                    : "Đăng nhập để thích hoặc bình luận";
            }
            // Ẩn nút Đăng bình luận (icon máy bay) khi chưa đăng nhập
            if (sendBtn) sendBtn.style.display = user ? '' : 'none';
        });

        // Xóa hết reply box đang mở khi login/logout tránh hiện sai avatar/tên
        document.querySelectorAll('.VT-dynamic-reply-box').forEach(box => box.remove());
    };

    // =====================
    // AUTH STATE LISTENER
    // Mỗi khi auth thay đổi: reset + reinit toàn bộ comment apps
    // =====================

    onAuthStateChanged(auth, (user) => {
        // Hủy toàn bộ listener cũ để tránh duplicate
        Object.values(unsubscribeMap).forEach(unsub => unsub());
        unsubscribeMap = {};

        VT_SyncUserUI(user);
        injectDeleteModal();
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
        btn.innerHTML        = `<i class="fa-solid fa-spinner-third fa-spin me-2"></i>đang tải...`;
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
    // =====================

    document.addEventListener('paste', (e) => {
        const target = e.target.closest('[contenteditable="true"]');
        if (!target) return;
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand("insertHTML", false, text);
    });

    // =====================
    // KHỞI TẠO CÁC COMMENT APP
    // =====================

    const initApps = () => {
        document.querySelectorAll('.VT-comment-app').forEach(app => {
            if (app.dataset.loaded !== "true") startListening(app);
        });
        VT_SyncUserUI(auth.currentUser);
    };

    initApps();

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
};

// =====================
// KHỞI CHẠY
// =====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VT_InitCommentSystem());
} else {
    window.VT_InitCommentSystem();
}
// ========================================================================================
