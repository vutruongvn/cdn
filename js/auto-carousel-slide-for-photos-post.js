  // js lấy tất cả link ảnh trong bài viết để làm slide carousel
  document.addEventListener('DOMContentLoaded', function() {
  	const carouselContainers = document.querySelectorAll('.VT_postSlide');
  	carouselContainers.forEach((container, index) => {
  		// 1. Lấy tất cả các thẻ img
  		const images = container.querySelectorAll('img');
  		if(images.length === 0) return;
  		// 2. Tạo ID duy nhất - không trùng lặp
  		const carouselId = 'VT_postSlide-' + index;
  		// 3. Xây dựng cấu trúc HTML
  		let carouselHTML = `
            <div id="${carouselId}" class="carousel slide overflow-hidden" data-bs-ride="carousel">
                <div class="carousel-inner">`;
  		images.forEach((img, imgIndex) => {
  			// --- FIX LỖI Ở ĐÂY ---
  			const parentLink = img.closest('a');
  			// 1. Cố gắng lấy src từ nhiều nguồn khác nhau (đề phòng lazyload)
  			let finalSrc = img.getAttribute('data-src') || img.getAttribute('src');
  			// 2. Nếu src vẫn null hoặc là chuỗi "null", lấy luôn href của thẻ a bao ngoài
  			if(!finalSrc || finalSrc === 'null') {
  				if(parentLink) {
  					finalSrc = parentLink.getAttribute('href');
  				}
  			}
  			// Lấy alt để làm caption
  			const alt = img.getAttribute('alt') || '';
  			// Link cho Fancybox (ưu tiên link gốc của thẻ a)
  			const fullSizeLink = parentLink ? parentLink.getAttribute('href') : finalSrc;
  			// Item đầu tiên active
  			const activeClass = imgIndex === 0 ? 'active' : '';
  			carouselHTML += `
                <div class="carousel-item ${activeClass}">
                    <a href="${fullSizeLink}" data-fancybox="gallery-${index}" data-caption="${alt}">
                        <img loading="lazy" src="${finalSrc}" class="d-block w-100 vt-carousel-img m-0" alt="${alt}">
                    </a>
                </div>`;
  		});
  		carouselHTML += `
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                </button>
            </div>`;
  		// 4. Thay thế div gốc
  		container.outerHTML = carouselHTML;
  	});
  });
