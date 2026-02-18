// =========================================================================================
/**
 * VUTRUONG.VN - HỆ THỐNG BÌNH LUẬN REALTIME
 * Phiên bản: 4.7.0
 * Cập nhật lần cuối: 18/2/2026
 */
// =========================================================================================

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager,
    collection, addDoc, doc, getDoc, deleteDoc, setDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, writeBatch, getCountFromServer, increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    
    // Khởi tạo Firestore với Cache v10 chuẩn (Không gây lỗi đa tab)
    const db = initializeFirestore(app, { 
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager() 
        })
    });
    const auth = getAuth(app);

    const ADMIN_UIDS = ["u9U3j9O63jbipOgai3o88X4008q2"];
    const DEFAULT_AVATAR = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhS34MMIbvh9P6obSup4qu4xfE2LrXkhY8rAXLJGX3PzwvolCMWTeXSU0hgm3fETQnfGbcEd0jklsAzNV9NIA-v3XQblgT6DTLHsC9zVuTrEuifK3h9P1Fq7PIAha8Z9TER64RIcfAzSgtq7uHbZL4iLJuR5XGhqn3ju4ZXoTHYjXCclA/s44/vtzone-default-avatar.jpg';

// Đóng gói module
window.VT_InitCommentSystem = function() {

    // --- 2. QUẢN LÝ TRẠNG THÁI ---
    let unsubscribeMap = {};     
    const PAGINATION_STATE = {};  
    let commentIdToDelete = null; 
    let deleteModalObj = null;    
    const IS_LOADING_MAP = {};    

    // =============================================================
    // --- 2b. BẬT / TẮT BÌNH LUẬN THEO BÀI VIẾT ---
    // =============================================================

    const POST_SETTINGS_COL = 'postSettings';
    const commentDisabledCache = {};
    const settingsUnsubMap = {};

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

    const applyCommentDisabledState = (appBox, disabled) => {
        const postId = appBox.getAttribute('data-post-id');
        commentDisabledCache[postId] = disabled;
        appBox.dataset.commentDisabled = disabled ? 'true' : '';

        if (disabled) {
            const inputArea = appBox.querySelector('.VT-input-area');
            if (inputArea && !appBox._vtSavedInputNode) {
                appBox._vtSavedInputNode = inputArea;
                inputArea.remove();
            }
            if (!appBox.querySelector('.VT-disabled-notice')) {
                const photoURL = auth.currentUser?.photoURL || DEFAULT_AVATAR;
                appBox.insertAdjacentHTML('afterbegin', getDisabledNoticeHtml(photoURL));
            }
            appBox.querySelectorAll('[onclick*="VT_ToggleReply"]').forEach(btn => btn.remove());
            appBox.querySelectorAll('.VT-dynamic-reply-box').forEach(box => box.remove());
            console.log(`%c🔕 [VT Comments] Bài viết ${postId}: bình luận đã tắt → DOM đã xóa ô nhập`, 'color:#e67e22;');
        } else {
            appBox.querySelector('.VT-disabled-notice')?.remove();
            if (!appBox.querySelector('.VT-input-area') && appBox._vtSavedInputNode) {
                appBox.insertBefore(appBox._vtSavedInputNode, appBox.firstChild);
                appBox._vtSavedInputNode = null;
                const user = auth.currentUser;
                const restoredImg   = appBox.querySelector('.VT-user-avatar');
                const restoredInput = appBox.querySelector('.VT-comment-input');
                const restoredPh    = appBox.querySelector('.VT-placeholder');
                if (restoredImg)   restoredImg.src         = user?.photoURL || DEFAULT_AVATAR;
                if (restoredInput) restoredInput.contentEditable = String(!!user);
                if (restoredPh)    restoredPh.innerText    = user
                    ? `Bình luận bằng tên ${user.displayName}`
                    : 'Đăng nhập để thích hoặc bình luận';
            }
            console.log(`%c🔔 [VT Comments] Bài viết ${postId}: bình luận đã bật → DOM đã khôi phục ô nhập`, 'color:#27ae60;');
        }
    };

    const listenPostSettings = (appBox) => {
        const postId = appBox.getAttribute('data-post-id');
        if (!postId || settingsUnsubMap[postId]) return;

        console.log(`%c📡 [VT Comments] Đăng ký lắng nghe postSettings cho bài viết ${postId}`, 'color:#3498db;');

        const settingsRef = doc(db, POST_SETTINGS_COL, postId);
        settingsUnsubMap[postId] = onSnapshot(
            settingsRef,
            (snap) => {
                const disabled = snap.exists() && snap.data().commentsDisabled === true;
                if (commentDisabledCache[postId] === disabled) return;
                console.log(`%c📨 [VT Comments] Trạng thái bình luận của bài viết ${postId}: ${disabled ? 'TẮT' : 'BẬT'}`, 'color:#8e44ad;');
                applyCommentDisabledState(appBox, disabled);
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
                console.warn(
                    `%c⚠️ [VT Comments] Không thể đọc postSettings cho bài viết ${postId}.\n` +
                    `Nguyên nhân: ${err.message}\n` +
                    `→ Kiểm tra Firestore Rules: collection "postSettings" cần có allow read: if true`,
                    'color:#e74c3c;'
                );
            }
        );
    };

    window.VT_offComment = async function(btn) {
        const postContainer = btn.closest('.post');
        if (!postContainer) {
            console.warn('%c⚠️ [VT Comments] VT_offComment: Không tìm thấy .post cha', 'color:#e74c3c;');
            return;
        }
        const appBox = postContainer.querySelector('.VT-comment-app');
        if (!appBox) {
            console.warn('%c⚠️ [VT Comments] VT_offComment: Không tìm thấy .VT-comment-app', 'color:#e74c3c;');
            return;
        }
        const postId = appBox.getAttribute('data-post-id');
        if (!postId) {
            console.warn('%c⚠️ [VT Comments] VT_offComment: Không có data-post-id', 'color:#e74c3c;');
            return;
        }

        const currentlyDisabled = commentDisabledCache[postId] === true;
        const willDisable = !currentlyDisabled;

        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';

        try {
            const settingsRef = doc(db, POST_SETTINGS_COL, postId);
            if (willDisable) {
                await setDoc(settingsRef, { commentsDisabled: true, updatedAt: serverTimestamp() });
            } else {
                await deleteDoc(settingsRef);
            }
        } catch (err) {
            console.error(
                `%c❌ [VT Comments] Lỗi khi thay đổi trạng thái bình luận bài viết ${postId}:\n` +
                `${err.message}`,
                'color:#e74c3c; font-weight:bold;'
            );
        } finally {
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        }
    };

    // --- 3. TIỆN ÍCH & HELPER ---
    
    const getReplyBoxHtml = (parentId, replyToName) => {
        const user = auth.currentUser;
        const isLogged = !!user;
        const avatar = user ? user.photoURL : DEFAULT_AVATAR;
        const placeholder = isLogged ? (replyToName ? `Trả lời ${replyToName}` : 'Trả lời') : `Đăng nhập để trả lời ${replyToName}`;

        return `
        <div class="VT-rep-box-${parentId} VT-dynamic-reply-box p-0 m-0 mt-3">
            <div class="d-flex align-items-start gap-2">
                <img src="${avatar}" class="VT-user-avatar rounded-circle m-0" loading="lazy" width="28" height="28" style="object-fit:cover;">
                <div class="flex-grow-1">
                    <div class="VT-rep-box d-flex align-items-center py-1 m-0 position-relative">
                        <div class="VT-rep-in-${parentId} flex-grow-1" contenteditable="${isLogged}" oninput="VT_HandlePlaceholder(this)" style="outline:none; min-height:1rem; z-index:2"></div>
                        <div class="VT-rep-placeholder VT-placeholder position-absolute opacity-75" style="z-index:1">${placeholder}</div>
                        ${isLogged ? `<button onclick="VT_SendComment(this, '${parentId}')" class="btn btn-link p-0 m-0 text-primary shadow-none border-0"><i class="fa-duotone fa-solid fa-paper-plane-top"></i></button>` : ''}
                    </div>
                    <a class="d-inline-flex mt-2 fw-bold small opacity-75 cursor-pointer" onclick="VT_CancelReply('${parentId}')">Hủy</a>
                </div>
            </div>
        </div>`;
    };

    // FIX: Đồng nhất key localStorage với firebase.js ('vutruong_sync_name' thay vì 'vutruong_temp_name')
    window.VT_SyncUserMetadata = async function() {
        if (!auth || !auth.currentUser) return;
        try {
            const savedName = localStorage.getItem('vutruong_sync_name') || auth.currentUser.displayName;
            const savedAvatar = localStorage.getItem('vutruong_sync_avatar') || auth.currentUser.photoURL;
            const q = query(collection(db, "comments"), where("uid", "==", auth.currentUser.uid));
            const snap = await getDocs(q);
            if (snap.empty) return;
            const batch = writeBatch(db);
            let count = 0;
            snap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.userName !== savedName) {
                    batch.update(docSnap.ref, { userName: savedName, userAvatar: savedAvatar });
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
                localStorage.removeItem('vutruong_sync_name');
                localStorage.removeItem('vutruong_sync_avatar');
            }
        } catch (e) { console.error("Sync error:", e); }
    };

    const timeAgo = (date) => {
        if (!date) return "Đang viết";
        const d = date.toDate ? date.toDate() : new Date(date);
        const seconds = Math.floor((new Date() - d) / 1000);
        const intervals = { 'năm': 31536000, 'tháng': 2592000, 'tuần': 604800, 'ngày': 86400, 'giờ': 3600, 'phút': 60 };
        if (seconds < 30) return 'Vừa xong';
        if (seconds < 60) return '1 phút';
        for (let key in intervals) {
            const counter = Math.floor(seconds / intervals[key]);
            if (counter > 0) return (key === 'ngày' && counter === 1) ? 'Hôm qua' : counter + ' ' + key;
        }
        return 'Vừa xong';
    };

    const renderSkeleton = () => {
        return `<div class="VT-comment-item mt-3"><div class="d-flex align-items-start gap-2"><div class="vt-ske-avatar vt-loading-effect-loading" style="width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0"></div><div class="flex-grow-1"><div class="vt-ske-bubble vt-loading-effect-loading" style="width: 18rem; height: 1rem; border-radius: 4px"></div><div class="d-flex align-items-center gap-2 mt-1"><div class="vt-ske-text vt-loading-effect-loading" style="width: 2.75rem; height: .8rem; border-radius: 4px"></div><div class="vt-ske-text vt-loading-effect-loading" style="width: 2.75rem; height: .8rem; border-radius: 4px"></div></div></div></div></div>`;
    };

    const formatCommentText = (str, cId) => {
        if (!str) return "";
        const p = document.createElement('p'); p.textContent = str;
        let safeStr = p.innerHTML;
        safeStr = safeStr.replace(/\[img\](.*?)\[\/img\]/gi, (match, url) => `<a loading="lazy" data-fancybox="photo-cmt-${cId}" src="${url.trim()}" class="cursor-pointer" onerror="this.src='https://placehold.co/600x400?text=Error';"><i class="me-1 fa-duotone fa-image"></i>Xem ảnh</a>`);
        safeStr = safeStr.replace(/\*([^\s][^*]*[^\s])\*/g, '<b>$1</b>').replace(/(?<!\w)_([^\s][^_]*[^\s])_(?!\w)/g, '<i>$1</i>');
        return safeStr;
    };

    const toggleEl = (el, show) => { if (el) el.style.setProperty('display', show ? 'block' : 'none', 'important'); };

    window.VT_RefreshTooltips = () => {
        if (typeof bootstrap === 'undefined') return;
        [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')).forEach(el => {
            const inst = bootstrap.Tooltip.getInstance(el);
            if (inst) inst.dispose();
            new bootstrap.Tooltip(el);
        });
    };

    window.VT_HandlePlaceholder = (el) => {
        const ph = el.parentElement.querySelector('.VT-placeholder');
        if (ph) ph.style.display = el.innerText.trim() === '' ? 'block' : 'none';
    };

    // --- 4. CÁC HÀM SỰ KIỆN CHÍNH (ACTION) ---

    window.VT_SendComment = async function(btn, parentId = null) {
        const appBox = btn.closest('.VT-comment-app');

        if (appBox && appBox.dataset.commentDisabled === 'true') {
            console.warn('%c🚫 [VT Comments] Bình luận đã bị tắt, không thể gửi', 'color:#e74c3c;');
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
                await updateDoc(parentDocRef, { childCount: increment(1) });

                const childContainer = appBox.querySelector(`.VT-child-list-${parentId}`);
                const parentItem = appBox.querySelector(`#VT-cmt-${parentId}`);
                
                if (childContainer) {
                    const hasLoadedBefore = childContainer.querySelectorAll('.VT-comment-item').length > 0;
                    
                    if (!hasLoadedBefore && parentItem.querySelector(`[onclick*="VT_LoadSubComments"]`)) {
                        await window.VT_LoadSubComments(parentItem.querySelector(`[onclick*="VT_LoadSubComments"]`), parentId);
                    } else {
                        const myNewChildHtml = createHtml({
                            id: docRef.id, 
                            userName: auth.currentUser.displayName,
                            userAvatar: auth.currentUser.photoURL,
                            content: backupContent,
                            createdAt: { toDate: () => new Date() },
                            uid: auth.currentUser.uid
                        }, true, true); 

                        childContainer.insertAdjacentHTML('beforeend', myNewChildHtml);
                        childContainer.style.display = 'block';
                        if (window.VT_RefreshTooltips) window.VT_RefreshTooltips(); 
                    }
                    
                    const loadBtn = parentItem?.querySelector(`[onclick*="VT_LoadSubComments"]`);
                    if (loadBtn) {
                        const currentCount = childContainer.querySelectorAll('.VT-comment-item').length;
                        loadBtn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${currentCount} phản hồi`;
                    }
                }
            }
			window.VT_SyncUserMetadata();
        } catch (e) { 
            console.error("Lỗi gửi comment:", e);
            if (parentId) {
                window.VT_ToggleReply(btn, parentId);
                setTimeout(() => {
                    const newItem = document.getElementById(`VT-cmt-${parentId}`);
                    const newInput = newItem.querySelector(`.VT-rep-in-${parentId}`);
                    if (newInput) {
                        newInput.innerText = backupContent;
                        VT_HandlePlaceholder(newInput);
                    }
                }, 100);
            } else {
                input.innerText = backupContent;
                VT_HandlePlaceholder(input);
            }
            alert("Có lỗi xảy ra, hãy thử reload trang!");
        }
    };

    window.VT_ToggleReply = (btn, id, name = "") => {
        const cmtItem = document.getElementById(`VT-cmt-${id}`);
        if (!cmtItem) return;

        const parentApp = cmtItem.closest('.VT-comment-app');
        if (parentApp && parentApp.dataset.commentDisabled === 'true') {
            console.warn('%c🚫 [VT Comments] Bình luận đã bị tắt, không thể trả lời', 'color:#e74c3c;');
            return;
        }

        const existingBox = cmtItem.querySelector(`.VT-rep-box-${id}`);
        if (existingBox) {
            existingBox.remove();
        } else {
            const html = getReplyBoxHtml(id, name);
            const container = cmtItem.querySelector('.flex-grow-1');
            container.insertAdjacentHTML('beforeend', html);
            const newInput = cmtItem.querySelector(`.VT-rep-in-${id}`);
            if (newInput) newInput.focus();
        }
    };

    window.VT_CancelReply = (id) => {
        const cmtItem = document.getElementById(`VT-cmt-${id}`);
        if (cmtItem) {
            const box = cmtItem.querySelector(`.VT-rep-box-${id}`);
            if (box) box.remove();
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

    // --- 5. RENDER HTML ---
    const createHtml = (data, isOwner, isChild, childCount = 0, childHtml = '') => {
        const cId = data.id;
        const isCmtAdmin = ADMIN_UIDS.includes(data.uid);
        const canDelete = isOwner || (auth.currentUser && ADMIN_UIDS.includes(auth.currentUser.uid));
        const fullDate = data.createdAt ? data.createdAt.toDate().toLocaleString() : "";

        return `<div class="VT-comment-item m-0 mt-3 ${isChild ? 'VT-comment-item-reply' : ''}" id="VT-cmt-${cId}">
            <div class="d-flex align-items-start gap-2">
                <img src="${data.userAvatar || DEFAULT_AVATAR}" class="rounded-circle m-0 object-fit-cover pe-none" loading="lazy" width="${isChild ? 28 : 44}" height="${isChild ? 28 : 44}">
                <div class="flex-grow-1">
                    <div class="VT-comment-bubble">
                        <div class="d-inline ${isCmtAdmin ? 'is-admin-name fw-medium' : 'is-not-admin-name fw-medium'}">
                            ${data.userName}${isCmtAdmin ? '<i class="fa-solid fa-badge-check ms-1 text-primary small" data-bs-toggle="tooltip" title="Tài khoản đã được xác thực"></i>' : ''}
                        </div>
                        <div class="VT-comment-text d-inline border-0">${formatCommentText(data.content, cId)}</div>
                    </div>
                        <div class="VT-edit-btns mt-1" style="display:none">
                            <small class="text-primary fw-bold cursor-pointer me-2" onclick="VT_SaveEdit(this, '${cId}')">Lưu chỉnh sửa</small>
                            <small class="opacity-75 cursor-pointer" onclick="VT_CancelEdit(this, '${cId}')">Hủy</small>
                        </div>
                    <div class="d-flex align-items-center gap-3 opacity-75 mt-1 small">
                        <a href="${window.location.href.split('#')[0]}#VT-cmt-${cId}" class="VT-cmt-time opacity-75 text-decoration-none" title="${fullDate}">${timeAgo(data.createdAt?.toDate())}${data.lastEdited ? ' (đã chỉnh sửa)' : ''}</a>
                        ${!isChild ? `<span class="VT-action-link" onclick="VT_ToggleReply(this, '${cId}', '${data.userName}')">Trả lời</span>` : ''}
                        ${isOwner ? `<span class="VT-action-link" onclick="VT_EditMode(this, '${cId}')">Chỉnh sửa</span>` : ''}
                        ${canDelete ? `<span class="VT-action-link text-danger" onclick="VT_DeleteComment('${cId}')">Xóa</span>` : ''}
                    </div>

                    ${!isChild && childCount > 0 ? `
                    <div class="d-inline-block mt-2 fw-medium opacity-75 cursor-pointer small" onclick="VT_LoadSubComments(this, '${cId}')">
                        <i class="fa-duotone fa-turn-down-right me-2"></i>${childCount} phản hồi
                    </div>` : ""}
                    <div class="VT-child-list VT-child-list-${cId}"></div>
                </div>
            </div>
        </div>`;
    };

    // --- 6 & 7. LISTENING & LOADING ---
    const updateCommentCount = (postId) => {
        const q = query(collection(db, "comments"), where("postId", "==", postId));
        onSnapshot(q, (snapshot) => {
            const totalCount = snapshot.size; 
            document.querySelectorAll(`.VT-comment-count[data-post-id="${postId}"] .count-number`).forEach(el => el.innerText = totalCount);
        }, (error) => console.error(error));
    };

    const startListening = (appBox, isForce = false) => {
        const postId = appBox.getAttribute('data-post-id');
        if (appBox.dataset.loaded === "true" && !isForce) return;
        appBox.dataset.loaded = "true";
        if (unsubscribeMap[postId]) unsubscribeMap[postId]();

        listenPostSettings(appBox);

        const q = query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc"));
        
        unsubscribeMap[postId] = onSnapshot(q, (snap) => {
            const all = []; snap.forEach(d => all.push({ id: d.id, ...d.data() }));
            const parents = all.filter(c => !c.parentId).reverse();
            const isSingleItem = window.location.pathname.endsWith('.html');
            const limitCount = PAGINATION_STATE[postId] || (isSingleItem ? 5 : 2);
            
            const list = appBox.querySelector('.VT-comment-list');
            if (list) {
                const dataToShow = parents.slice(0, limitCount);
                dataToShow.forEach((p, index) => {
                    let existingP = list.querySelector(`#VT-cmt-${p.id}`);
                    if (!existingP) {
                        const html = createHtml(p, auth.currentUser?.uid === p.uid, false, p.childCount || 0, '');
                        if (index === 0 && list.children.length > 0) list.insertAdjacentHTML('afterbegin', html);
                        else list.insertAdjacentHTML('beforeend', html);
                    } else {
                        const timeEl = existingP.querySelector('.VT-cmt-time');
                        if (timeEl) {
                            const timeStr = p.createdAt ? timeAgo(p.createdAt) : "Vừa xong";
                            const editedStr = p.lastEdited ? ' (đã chỉnh sửa)' : '';
                            timeEl.innerHTML = `${timeStr}${editedStr}`;
                        }
                    }
                });
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

    window.VT_LoadMoreParents = async (btn) => {
        const appBox = btn.closest('.VT-comment-app');
        if (!appBox || IS_LOADING_MAP[appBox.id]) return;
        const postId = appBox.getAttribute('data-post-id');
        const list = appBox.querySelector('.VT-comment-list');
        const loadMoreBox = appBox.querySelector('.VT-load-more-box');
        const skeletonWrap = document.createElement('div');
        skeletonWrap.className = 'vt-ske-wrapper';
        skeletonWrap.innerHTML = Array(1).fill(renderSkeleton()).join('');
        list.appendChild(skeletonWrap);
        IS_LOADING_MAP[appBox.id] = true;
        if (loadMoreBox) loadMoreBox.style.setProperty('display', 'none', 'important'); 
        await new Promise(res => setTimeout(res, 1500));
        const isSingleItem = window.location.pathname.endsWith('.html');
        const incrementValue = isSingleItem ? 5 : 2; 
        const currentLimit = PAGINATION_STATE[postId] || (isSingleItem ? 5 : 2); 
        PAGINATION_STATE[postId] = currentLimit + incrementValue;
        startListening(appBox, true);
        skeletonWrap.style.display = 'none';
        setTimeout(() => {
            skeletonWrap.remove();
            IS_LOADING_MAP[appBox.id] = false;
        }, 300);
    };

    const injectDeleteModal = () => {
        if (!document.getElementById('VTDeleteModal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="VTDeleteModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered modal-sm">
                        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div class="modal-body text-center p-4">
                                <div class="mb-3 text-danger"><i class="fa-solid fa-trash-can-list" style="font-size: 2rem"></i></div>
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
            deleteModalObj = bootstrap.Modal.getInstance(document.getElementById('VTDeleteModal')) || new bootstrap.Modal(document.getElementById('VTDeleteModal'));
        }
        const confirmBtn = document.getElementById('VTConfirmDeleteBtn');
        confirmBtn.onclick = async () => {
            if (commentIdToDelete) {
                confirmBtn.innerText = 'Đang xóa'; confirmBtn.disabled = true;
                try {
                    const docRef = doc(db, "comments", commentIdToDelete);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const commentData = docSnap.data();
                        const batch = writeBatch(db);
                        if (commentData.parentId) {
                            batch.update(doc(db, "comments", commentData.parentId), { childCount: increment(-1) });
                        }
                        batch.delete(docRef);
                        if (!commentData.parentId) {
                            const qChild = query(collection(db, "comments"), where("parentId", "==", commentIdToDelete));
                            (await getDocs(qChild)).forEach(d => batch.delete(d.ref));
                        }
                        await batch.commit();
                        deleteModalObj.hide();
                        const itemToRemove = document.getElementById(`VT-cmt-${commentIdToDelete}`);
                        if (itemToRemove) {
                            const parentId = commentData.parentId;
                            const parentItem = parentId ? document.getElementById(`VT-cmt-${parentId}`) : null;
                            setTimeout(() => {
                                itemToRemove.remove();
                                if (parentId && parentItem) {
                                    const childContainer = parentItem.querySelector(`.VT-child-list-${parentId}`);
                                    const loadBtn = parentItem.querySelector(`[onclick*="VT_LoadSubComments"]`);
                                    if (childContainer && loadBtn) {
                                        const currentCount = childContainer.querySelectorAll('.VT-comment-item').length;
                                        if (currentCount > 0) loadBtn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${currentCount} phản hồi`;
                                        else { childContainer.style.display = 'none'; loadBtn.remove(); }
                                    }
                                }
                            }, 100);
                        }
                        commentIdToDelete = null;
                    } else deleteModalObj.hide();
                    setTimeout(() => { confirmBtn.innerText = 'Xóa'; confirmBtn.disabled = false; }, 100);
                } catch (e) { console.error(e); confirmBtn.innerText = 'Lỗi'; confirmBtn.disabled = false; alert("Lỗi!"); }
            }
        };
    };

    const VT_SyncUserUI = (user) => {
        const photoURL = user?.photoURL || DEFAULT_AVATAR;
        document.querySelectorAll('.VT-user-avatar').forEach(img => img.src = photoURL);
        
        document.querySelectorAll('.VT-comment-app').forEach(app => {
            if (app.dataset.commentDisabled === 'true') return;
            const input = app.querySelector('.VT-comment-input');
            const ph = app.querySelector('.VT-placeholder');
            if (input) {
                input.contentEditable = !!user;
                if (!user) { input.innerText = ""; VT_HandlePlaceholder(input); }
                if (ph) ph.innerText = user ? `Bình luận bằng tên ${user.displayName}` : "Đăng nhập để thích hoặc bình luận";
            }
        });

        document.querySelectorAll('.VT-dynamic-reply-box').forEach(box => box.remove());
    };

    onAuthStateChanged(auth, (user) => {
        Object.values(unsubscribeMap).forEach(unsub => unsub());
        unsubscribeMap = {};
        VT_SyncUserUI(user);
        injectDeleteModal();
        document.querySelectorAll('.VT-comment-app').forEach(app => startListening(app, true));
    });

    // FIX: Thay thế jQuery slideToggle bằng vanilla JS
    window.VT_LoadSubComments = async (btn, parentId) => {
        const childListContainer = document.querySelector(`.VT-child-list-${parentId}`);
        if (!childListContainer) return;

        // FIX: Thay $(childListContainer).is(':animated') bằng data attribute
        if (childListContainer.dataset.animating === 'true') return;

        if (childListContainer.innerHTML.trim() !== '') {
            // Toggle ẩn/hiện bằng vanilla JS
            const isHidden = childListContainer.style.display === 'none';
            childListContainer.style.display = isHidden ? 'block' : 'none';
            const count = childListContainer.querySelectorAll('.VT-comment-item').length;
            btn.innerHTML = isHidden
                ? `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${count} phản hồi`
                : `<i class="fa-duotone fa-turn-down-right me-2"></i>${count} phản hồi`;
            return;
        }

        btn.innerHTML = `<i class="fa-solid fa-spinner-third fa-spin me-2"></i>đang tải...`;
        btn.style.pointerEvents = 'none'; 
        try {
            const q = query(collection(db, "comments"), where("parentId", "==", parentId), orderBy("createdAt", "asc"));
            const querySnapshot = await getDocs(q);
            let subHtml = '';
            querySnapshot.forEach((d) => {
                subHtml += createHtml({id: d.id, ...d.data()}, auth.currentUser?.uid === d.data().uid, true);
            });
            childListContainer.innerHTML = subHtml;
            const count = querySnapshot.size;
            childListContainer.style.display = 'block';
            btn.innerHTML = `<i class="fa-duotone fa-angle-up me-2"></i>Ẩn ${count} phản hồi`;
            btn.style.pointerEvents = 'auto';
        } catch (e) {
            console.error(e); btn.innerHTML = `Lỗi`; btn.style.pointerEvents = 'auto';
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
                        // FIX: Cú pháp đúng để gán animation
                        bubble.style.animation = 'VT-heartbeat 1.5s ease-in-out 1';
                    }
                }
            }, 500);
        }
    };

    document.addEventListener('paste', (e) => {
        const target = e.target.closest('[contenteditable="true"]');
        if (!target) return;
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand("insertHTML", false, text);
    });

    const initApps = () => {
        const apps = document.querySelectorAll('.VT-comment-app');
        apps.forEach(app => {
            if (app.dataset.loaded !== "true") startListening(app);
        });
        if (typeof VT_SyncUserUI === "function") VT_SyncUserUI(auth.currentUser);
    };

    initApps();

    const observer = new MutationObserver((mutations) => {
        let hasNewApp = false;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { 
                    const apps = node.querySelectorAll('.VT-comment-app');
                    const isDirectApp = node.classList.contains('VT-comment-app');
                    if (apps.length > 0 || isDirectApp) {
                        hasNewApp = true;
                        if (isDirectApp && node.dataset.loaded !== "true") startListening(node);
                        apps.forEach(app => {
                            if (app.dataset.loaded !== "true") startListening(app);
                        });
                    }
                }
            });
        });
        if (hasNewApp && typeof VT_SyncUserUI === "function") VT_SyncUserUI(auth.currentUser);
    });

    observer.observe(document.body, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VT_InitCommentSystem());
} else {
    window.VT_InitCommentSystem();
}
// =========================================================================================

