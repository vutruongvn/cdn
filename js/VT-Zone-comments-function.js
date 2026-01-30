/**
 * JS cho chức năng bình luận của Blog by VT Zone - vutruong.vn (Vanilla JS Version)
 * Tối ưu tốc độ, không phụ thuộc jQuery.
 */

var data = {
    view: { isHomepage: false, isPost: true },
    blog: {
        blogId: "<data:blog.blogId/>",
        postId: "<data:blog.postId/>",
        homepageUrl: "<data:blog.canonicalHomepageUrl/>",
        url: "<data:blog.canonicalUrl/>"
    }
};

// Hàm hỗ trợ tải CSS/JS vào Head
function appendChildHead(name, type) {
    let fileref;
    if (type === 'css') {
        fileref = document.createElement('link');
        fileref.setAttribute('rel', 'stylesheet');
        fileref.setAttribute('href', name);
    } else if (type === 'js') {
        fileref = document.createElement('script');
        fileref.setAttribute('type', 'text/javascript');
        fileref.setAttribute('async', '');
        fileref.setAttribute('src', name);
    }
    if (fileref) {
        document.head.appendChild(fileref);
    }
}

// Hàm thay thế $.getScript của jQuery
function getScriptPure(source, callback) {
    let script = document.createElement('script');
    script.async = 1;
    script.src = source;
    script.onload = script.onreadystatechange = function(_, isAbort) {
        if (isAbort || !script.readyState || /loaded|complete/.test(script.readyState)) {
            script.onload = script.onreadystatechange = null;
            if (!isAbort && callback) callback();
        }
    };
    document.head.appendChild(script);
}

const url = window.location.href;
var original_comments_html = '';

function initCommentLogic() {
    const commentsEl = document.getElementById('comments');
    if (!commentsEl) return;

    const data_embed = commentsEl.getAttribute('data-embed');
    const data_allow_comments = commentsEl.getAttribute('data-allow-comments');
    const elem = document.querySelector('.commentForm');
    
    // Lưu HTML gốc khi khởi tạo lần đầu
    if (original_comments_html === '') {
        original_comments_html = commentsEl.innerHTML;
    }

    if (data_embed === 'true' && data_allow_comments === 'true') {

        // --- HÀM TẠI IFRAME CHUNG ---
        const createBloggerIframe = () => {
            if (document.getElementById('comment-editor')) return;
            
            if (commentsEl.classList.contains('threaded')) {
                appendChildHead(`https://www.blogger.com/dyn-css/authorization.css?targetBlogID=${data.blog.blogId}`, 'css');
            }

            const iframe = document.createElement('iframe');
            iframe.className = 'blogger-iframe-colorize blogger-comment-from-post';
            iframe.id = 'comment-editor';
            iframe.name = 'comment-editor';
            iframe.src = '';
            iframe.title = 'comment iframe';
            elem.appendChild(iframe);

            getScriptPure('https://www.blogger.com/static/v1/jsbin/2567313873-comment_from_post_iframe.js', function() {
                if (typeof BLOG_CMT_createIframe === 'function') {
                    BLOG_CMT_createIframe('https://www.blogger.com/rpc_relay.html');
                }
                elem.classList.remove('loading');
            });
        };

        // --- KỊCH BẢN 1: Tải Ngay ---
        if (url.includes('#comments') || url.includes('?showComment')) {
            if (url.includes('?showComment')) {
                appendChildHead(`https://www.blogger.com/dyn-css/authorization.css?targetBlogID=${data.blog.blogId}`, 'css');
            }
            createBloggerIframe();
        } else {
            // --- KỊCH BẢN 2: Lazy Load ---
            let isLoaded = false;
            const lazyLoadTrigger = () => {
                if (!isLoaded) {
                    isLoaded = true;
                    createBloggerIframe();
                    window.removeEventListener('scroll', lazyLoadTrigger);
                    window.removeEventListener('mousemove', lazyLoadTrigger);
                }
            };
            window.addEventListener('scroll', lazyLoadTrigger);
            window.addEventListener('mousemove', lazyLoadTrigger);
            setTimeout(lazyLoadTrigger, 3000);
        }

        // --- LOGIC XỬ LÝ TRẢ LỜI (Dùng Event Delegation thay .on('click')) ---
        document.addEventListener('click', function(e) {
            const replyBtn = e.target.closest('.comment a.comment-reply');
            if (replyBtn) {
                e.preventDefault();
                const iframe = document.getElementById('comment-editor');
                let currentSrc = iframe.getAttribute('src');
                const commentId = replyBtn.getAttribute('data-comment-id');

                // Xóa nút hủy cũ nếu có
                const oldCancel = document.querySelector('.calcel-reply');
                if (oldCancel) oldCancel.remove();

                // Cập nhật ParentID vào src iframe
                if (!currentSrc.includes('&parentID=')) {
                    currentSrc += `&parentID=${commentId}`;
                } else {
                    currentSrc = currentSrc.replace(/&parentID=.*$/, `&parentID=${commentId}`);
                }

                iframe.setAttribute('src', currentSrc);
                replyBtn.parentElement.style.display = 'none';

                const parentLi = replyBtn.closest('.comment-thread > ol > li') || replyBtn.closest('li');
                const replyBox = parentLi.querySelector('.comment-replybox-single');
                
                if (replyBox) {
                    replyBox.appendChild(elem);
                    const cancelDiv = document.createElement('div');
                    cancelDiv.className = 'calcel-reply';
                    cancelDiv.innerHTML = '<a style="font-size:14px;font-weight:500" class="btn btn-dark w-100 text-decoration-none mb-3 mt-2" role="button">Hủy trả lời</a>';
                    replyBox.appendChild(cancelDiv);

                    cancelDiv.onclick = function() {
                        commentsEl.innerHTML = original_comments_html;
                        initCommentLogic(); // Re-init
                        commentsEl.scrollIntoView({ behavior: 'smooth' });
                    };
                }
            }

            // Xử lý nút "Xem phản hồi"
            const viewRepliesSpan = e.target.closest('.comment .view-replies > span');
            if (viewRepliesSpan) {
                const parent = viewRepliesSpan.parentElement;
                parent.style.display = 'none';
                parent.nextElementSibling.classList.remove('hidden');
            }
        });

        // --- LOGIC HIỆN NÚT "XEM PHẢN HỒI" ---
        document.querySelectorAll('.toplevel-thread > ol > li > .comment-replies').forEach(replyArea => {
            if (replyArea.querySelectorAll('.comment-thread > ol > li').length > 0 && !replyArea.previousElementSibling.classList.contains('view-replies')) {
                const count = replyArea.querySelectorAll('.comment-thread > ol > li').length;
                const viewBtn = document.createElement('div');
                viewBtn.className = 'view-replies';
                viewBtn.innerHTML = `<span class="has-hover"><i class="fa-regular fa-angle-down"></i> ${count} phản hồi</span>`;
                replyArea.before(viewBtn);
            }
        });

        // --- PHÂN TRANG BÌNH LUẬN (Pagination) ---
        const topComments = document.querySelectorAll('.toplevel-thread > ol > li');
        const limit = 10;
        const total = topComments.length;

        topComments.forEach((item, index) => {
            if (index < limit) item.classList.remove('hidden');
            else item.classList.add('hidden');
        });

        const loadMoreArea = document.querySelector('#comments .loadmore');
        const showLessArea = document.querySelector('#comments .showless');

        if (total > limit && loadMoreArea) loadMoreArea.classList.remove('hidden');

        // Nút Load More
        const btnLoadMore = document.querySelector('#comments .loadmore > a');
        if (btnLoadMore) {
            btnLoadMore.onclick = (e) => {
                e.preventDefault();
                const hiddenItems = document.querySelectorAll('.toplevel-thread > ol > li.hidden');
                const currentlyShown = total - hiddenItems.length;
                
                for (let i = 0; i < limit && i < hiddenItems.length; i++) {
                    hiddenItems[i].classList.remove('hidden');
                }

                if (document.querySelectorAll('.toplevel-thread > ol > li.hidden').length === 0) {
                    loadMoreArea.classList.add('hidden');
                    if (showLessArea) showLessArea.classList.remove('hidden');
                }
            };
        }

        // Nút Show Less
        const btnShowLess = document.querySelector('#comments .showless > a');
        if (btnShowLess) {
            btnShowLess.onclick = (e) => {
                e.preventDefault();
                topComments.forEach((item, index) => {
                    if (index >= limit) item.classList.add('hidden');
                });
                showLessArea.classList.add('hidden');
                loadMoreArea.classList.remove('hidden');
                elem.scrollIntoView({ behavior: 'smooth' });
            };
        }
    }
}

// Khởi chạy
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommentLogic);
} else {
    initCommentLogic();
}