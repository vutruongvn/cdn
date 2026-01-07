// JS cho chức năng bình luận của Blog by VTZone
// ====================================================================
// KHỐI 1, 2, 3: KHAI BÁO DỮ LIỆU & HÀM HỖ TRỢ (GIỮ NGUYÊN)
// ====================================================================
var data = {
    view: { isHomepage: false, isPost: true },
    blog: {
        blogId: "<data:blog.blogId/>",
        postId: "<data:blog.postId/>",
        homepageUrl: "<data:blog.canonicalHomepageUrl/>",
        url: "<data:blog.canonicalUrl/>"
    }
};

function appendChildHead(name, type) {
    var fileref;
    if (type == 'css') {
        fileref = document.createElement('link')
        fileref.setAttribute('rel', 'stylesheet')
        fileref.setAttribute('href', name)
    } else if (type == 'js') {
        fileref = document.createElement('script')
        fileref.setAttribute('type', 'text/javascript')
        fileref.setAttribute('async', '')
        fileref.setAttribute('src', name)
    }
    if (typeof fileref != 'undefined') {
        document.getElementsByTagName('head')[0].appendChild(fileref)
    }
}

var url = window.location.href;

// Biến toàn cục để lưu HTML gốc và src của iframe
var original_comments_html = '';
var original_iframe_src = '';


// ====================================================================
// KHỐI 4: HÀM LOGIC CHÍNH ĐỂ KHỞI TẠO BÌNH LUẬN
// ====================================================================
function initCommentLogic() {
    // --- Kiểm tra điều kiện đầu tiên ---
    if ($('#comments').length === 0) return;

    // --- Khai báo các biến cục bộ ---
    var data_embed = $('#comments').attr('data-embed');
    var data_allow_comments = $('#comments').attr('data-allow-comments');
    var elem = document.querySelector('.commentForm');
    var l = '',
        id = '',
        li = '';

    // LƯU HTML GỐC CHỈ KHI CHƯA ĐƯỢC LƯU
    if (original_comments_html === '') {
        original_comments_html = $('#comments').html();
    }

    // --- Logic Tải Form Bình luận bằng Iframe ---
    if (data_embed == 'true' && data_allow_comments == 'true') {

        // ----------------------------------------------------
        // KỊCH BẢN 1: Tải Ngay Lập tức (Khi có tham số URL)
        // ----------------------------------------------------
        if (url.indexOf('#comments') != -1 || url.indexOf('?showComment') != -1) {

            if (url.indexOf('?showComment') != -1) {
                appendChildHead('https://www.blogger.com/dyn-css/authorization.css?targetBlogID=' + data.blog.blogId, 'css')
            }

            $(elem).append('<iframe class="blogger-iframe-colorize blogger-comment-from-post" id="comment-editor" name="comment-editor" src="" title="comment iframe"></iframe>')

            $.getScript('https://www.blogger.com/static/v1/jsbin/2567313873-comment_from_post_iframe.js').done(function() {
                BLOG_CMT_createIframe('https://www.blogger.com/rpc_relay.html');
                // Lưu lại src gốc sau khi khởi tạo
                original_iframe_src = $('#comment-editor').attr('src');
                $(elem).removeClass('loading');
            })

        } else {
            // ----------------------------------------------------
            // KỊCH BẢN 2: Tải Lười (Lazy Load)
            // ----------------------------------------------------
            var load_iframe = 0

            function append_iframe() {
                if (load_iframe == 0) {
                    load_iframe = 1

                    if ($('#comments').hasClass('threaded')) {
                        appendChildHead('https://www.blogger.com/dyn-css/authorization.css?targetBlogID=' + data.blog.blogId, 'css')
                    }

                    $(elem).append('<iframe class="blogger-iframe-colorize blogger-comment-from-post" id="comment-editor" name="comment-editor" src="" title="comment iframe"></iframe>')
                    $.getScript('https://www.blogger.com/static/v1/jsbin/2567313873-comment_from_post_iframe.js').done(function() {
                        BLOG_CMT_createIframe('https://www.blogger.com/rpc_relay.html');
                        // Lưu lại src gốc sau khi khởi tạo
                        original_iframe_src = $('#comment-editor').attr('src');
                        $(elem).removeClass('loading');
                    })
                }
            }

            window.addEventListener('scroll', function() { append_iframe() })
            window.addEventListener('mousemove', function() { append_iframe() })
            setTimeout(function() { append_iframe() }, 3000)
        }

        // ----------------------------------------------------
        // LOGIC XỬ LÝ NÚT TRẢ LỜI (Reply Button Handler)
        // ----------------------------------------------------
        // Sử dụng .off().on() để đảm bảo sự kiện chỉ gắn 1 lần sau khi init lại
        $(document).off('click', '.comment a.comment-reply').on('click', '.comment a.comment-reply', function(e) {
            l = $('#comment-editor').attr('src')

            $('.calcel-reply').remove()
            // $('.comment-actions').removeAttr('style')

            var $this = $(this),
                id = $this.attr('data-comment-id')

            if (l.indexOf('&parentID=') == -1) {
                l = l + '&parentID=' + id;
            } else {
                l = l.replace(/&parentID=.*$/, '&parentID=' + id);
            }

            li = $this.parent().parent().parent().attr('id')

            $('#comment-editor').attr('src', l)
            $this.parent().hide()

            $(elem).appendTo($('#' + li + '>.comment-replybox-single'))

            // Chèn nút "Hủy" Trả lời (Cancel Reply)
            $('#' + li + '>.comment-replybox-single').append('<div class="calcel-reply"><a style="font-size:14px;font-weight:500" class="btn btn-dark w-100 text-decoration-none mb-3 mt-2" role="button">Hủy trả lời</a></div>')

            // Xử lý sự kiện click Hủy (ĐÃ SỬA ĐỔI)
            $('.calcel-reply').click(function() {
                // 1. KHÔI PHỤC HTML
                $('#comments').html(original_comments_html);
                
                // 2. KHỞI TẠO LẠI LOGIC
                initCommentLogic(); 
                
                // 3. CUỘN MƯỢT VỀ VỊ TRÍ #COMMENTS (YÊU CẦU MỚI)
                $('html, body').animate({
                //    scrollTop: $('#comments').offset().top - 120
                }, 1500);
            })
        })

        // ----------------------------------------------------
        // LOGIC XỬ LÝ XEM THÊM CÂU TRẢ LỜI (View Replies) - Gắn lại sự kiện
        // ----------------------------------------------------
        $('.toplevel-thread>ol>li>.comment-replies').each(function() {
            if ($(this).find('.comment-thread>ol>li').length > 0) {
                $(this).before('<div class="view-replies"><span class="has-hover"><i class="fa-regular fa-angle-down"></i> ' + $(this).find('.comment-thread>ol>li').length + ' phản hồi</span></div>')
            }
        })

        $('.comment .view-replies>span').off('click').click(function() {
            $(this).parent().hide()
            $(this).parent().next().removeClass('hidden')
        })


        // ----------------------------------------------------
        // LOGIC PHÂN TRANG BÌNH LUẬN CẤP CAO NHẤT (Pagination)
        // ----------------------------------------------------
        var str = $('.toplevel-thread>ol>li'),
            m = 10,
            n = str.length,
            k = 0,
            p = 0;

        for (var i = 0; i < m; i++) {
            $(str[i]).removeClass('hidden')
        }
        if (n > m) {
            $('#comments .loadmore').removeClass('hidden')
        }

        // ----------------------------------------------------
        // NÚT XEM THÊM (Load More) - Gắn lại sự kiện
        // ----------------------------------------------------
        $('#comments .loadmore>a').off('click').click(function(e) {
            e.preventDefault();

            p = $('.toplevel-thread>ol>li.comment.hidden').length
            k = n - p

            if (p == 0) {
                $(this).parent().addClass('hidden')
                $('#comments .showless').removeClass('hidden')
            } else {
                for (var i = k; i < k + m; i++) {
                    $(str[i]).removeClass('hidden')
                }
            }
        })

        // ----------------------------------------------------
        // NÚT THU GỌN (Show Less) - Gắn lại sự kiện
        // ----------------------------------------------------
        $('#comments .showless>a').off('click').click(function(e) {
            e.preventDefault();
            n = str.length

            for (var i = m; i < n; i++) {
                $(str[i]).addClass('hidden')
            }

            $(this).parent().addClass('hidden')
            $('#comments .loadmore').removeClass('hidden')

            elem.scrollIntoView({
                behavior: 'smooth'
            })
        })
    }
}

// ====================================================================
// GỌI HÀM KHỞI TẠO KHI TẢI TRANG
// ====================================================================
window.addEventListener('load', function() {
    initCommentLogic();

});
