// ========================================
// TOP PRODUCTS
// ========================================

const articleAll = document.querySelectorAll(".sell__article");
const PREFERRED_TOP_SLUGS = ["hydrolats", "oils", "soaps"];
const TOP_PRODUCTS_CARD_COUNT = 3;

const pickTopCategories = function (allCategories) {
    const productCategories = allCategories
        .filter((category) => category.displayGroup === "products")
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const picked = [];
    const usedIds = new Set();

    PREFERRED_TOP_SLUGS.forEach((slug) => {
        const category = productCategories.find((item) => item.slug === slug);
        if (category && !usedIds.has(category.id)) {
            picked.push(category);
            usedIds.add(category.id);
        }
    });

    productCategories.forEach((category) => {
        if (picked.length < TOP_PRODUCTS_CARD_COUNT && !usedIds.has(category.id)) {
            picked.push(category);
            usedIds.add(category.id);
        }
    });

    return picked.slice(0, TOP_PRODUCTS_CARD_COUNT);
};

const initTopProducts = async function () {
    try {
        const response = await fetchAllCategories();
        const topCategories = pickTopCategories(response.data || []);

        articleAll.forEach((article, index) => {
            const category = topCategories[index];
            if (!category) {
                article.remove();
                return;
            }
            setupCategoryCard(article, category);
        });
    } catch (error) {
        console.error("Не вдалося завантажити топ-товари:", error.message);
    }
};

initTopProducts();

// ========================================
// PHOTO GALLERY
// ========================================

const fallbackPhotos = [
    "/frontend/IMG/1.png",
    "/frontend/IMG/2.png",
    "/frontend/IMG/3.png",
    "/frontend/IMG/4.png",
    "/frontend/IMG/5.png",
    "/frontend/IMG/6.png",
    "/frontend/IMG/7.png",
    "/frontend/IMG/8.png",
    "/frontend/IMG/9.png"
];

let allPhotos = [...fallbackPhotos];
const mobileGalleryQuery = window.matchMedia("(max-width: 768px)");

const loadGalleryPhotos = async function () {
    try {
        const response = await fetchGalleryPhotos();
        const photoUrls = (response.data || [])
            .map((photo) => photo.imageUrl)
            .filter(Boolean);

        if (photoUrls.length > 0) {
            return photoUrls;
        }
    } catch (error) {
        // Until the database migration reaches the server, the old gallery
        // continues to work with the existing nine static photos.
        console.warn("Не вдалося завантажити фото з бази:", error.message);
    }

    return [...fallbackPhotos];
};

// ========================================
// MOBILE STORY: wide photos can be dragged all the way to either edge.
// ========================================

const initMobileStory = function () {
    if (!mobileGalleryQuery.matches) {
        return false;
    }

    const track = document.querySelector(".slider__story-track");
    const count = document.querySelector(".slider__story-count");
    const progress = document.querySelector(".slider__story-progress-fill");

    if (!track) {
        return false;
    }

    track.innerHTML = allPhotos.map((photo, index) => `
        <figure class="slider__story-card">
            <img
                class="slider__story-image"
                src="${photo}"
                alt="Лавандове поле — фото ${index + 1}"
                ${index === 0 ? "" : 'loading="lazy"'}
            />
        </figure>
    `).join("");

    const cards = Array.from(track.querySelectorAll(".slider__story-card"));

    const updateStoryMeta = function () {
        const trackLeft = track.getBoundingClientRect().left;
        let closestIndex = 0;
        let closestDistance = Infinity;

        cards.forEach((card, index) => {
            const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        if (count) {
            count.textContent = `${String(closestIndex + 1).padStart(2, "0")} / ${String(allPhotos.length).padStart(2, "0")}`;
        }

        if (progress) {
            progress.style.width = `${((closestIndex + 1) / allPhotos.length) * 100}%`;
        }
    };

    // The couple on the first wide photo is at approximately 46% of the
    // frame. This runs once after the image loads and never resets user swipes.
    const centerFirstPhotoOnce = function () {
        const firstCard = cards[0];
        if (!firstCard || !track.clientWidth || !firstCard.scrollWidth) {
            return;
        }

        const couplePosition = firstCard.scrollWidth * 0.46;
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        track.scrollLeft = Math.min(
            maxScroll,
            Math.max(0, couplePosition - track.clientWidth / 2)
        );
        updateStoryMeta();
    };

    const firstImage = cards[0]?.querySelector("img");
    const scheduleFirstPosition = function () {
        requestAnimationFrame(() => requestAnimationFrame(centerFirstPhotoOnce));
    };

    if (firstImage?.complete && firstImage.naturalWidth > 0) {
        scheduleFirstPosition();
    } else {
        firstImage?.addEventListener("load", scheduleFirstPosition, { once: true });
    }

    let storyFrame;
    track.addEventListener("scroll", () => {
        cancelAnimationFrame(storyFrame);
        storyFrame = requestAnimationFrame(updateStoryMeta);
    }, { passive: true });

    return true;
};

// ========================================
// DESKTOP SLIDER
// ========================================

const initDesktopSlider = function () {
    const slideButton = document.querySelector(".slider__button");
    const currentSlide = document.querySelector(
        ".slider__photos-item:not(.slider__photos-item--next)"
    );
    const nextSlide = document.querySelector(".slider__photos-item--next");

    if (!slideButton || !currentSlide || !nextSlide || allPhotos.length === 0) {
        return;
    }

    let currentSlideIndex = 0;
    let isAnimating = false;
    let autoSlideInterval = null;
    currentSlide.src = allPhotos[currentSlideIndex];

    const getNextIndex = function () {
        return (currentSlideIndex + 1) % allPhotos.length;
    };

    const finishTransition = function () {
        if (!isAnimating) {
            return;
        }

        const nextIndex = getNextIndex();
        currentSlide.classList.add("slider__photos-item--no-transition");
        nextSlide.classList.add("slider__photos-item--no-transition");
        currentSlide.src = nextSlide.src;
        currentSlideIndex = nextIndex;
        currentSlide.classList.remove("slider__photos-item--out");
        nextSlide.classList.add("slider__photos-item--next");

        requestAnimationFrame(() => requestAnimationFrame(() => {
            currentSlide.classList.remove("slider__photos-item--no-transition");
            nextSlide.classList.remove("slider__photos-item--no-transition");
        }));

        isAnimating = false;
    };

    const switchSlide = function () {
        if (isAnimating) {
            return;
        }

        isAnimating = true;
        nextSlide.src = allPhotos[getNextIndex()];

        const startTransition = function () {
            nextSlide.classList.remove("slider__photos-item--next");
            currentSlide.classList.add("slider__photos-item--out");
        };

        if (nextSlide.complete && nextSlide.naturalWidth > 0) {
            startTransition();
        } else {
            nextSlide.addEventListener("load", startTransition, { once: true });
            nextSlide.addEventListener("error", () => {
                isAnimating = false;
            }, { once: true });
        }
    };

    currentSlide.addEventListener("transitionend", (event) => {
        if (event.target === currentSlide) {
            finishTransition();
        }
    });

    const restartAutoSlide = function () {
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(switchSlide, 4000);
    };

    slideButton.addEventListener("click", () => {
        switchSlide();
        restartAutoSlide();
    });

    restartAutoSlide();
};

// ========================================
// FULL-SCREEN GALLERY MODAL
// ========================================

const initGalleryModal = function () {
    const modal = document.getElementById("galleryModal");
    const openButton = document.getElementById("openGalleryButton");
    const closeButton = modal?.querySelector(".gallery-modal__close");
    const previousButton = modal?.querySelector(".gallery-modal__nav--previous");
    const nextButton = modal?.querySelector(".gallery-modal__nav--next");
    const image = document.getElementById("galleryModalImage");
    const counter = document.getElementById("galleryModalCounter");

    if (!modal || !openButton || !closeButton || !previousButton || !nextButton || !image || !counter) {
        return;
    }

    let activeIndex = 0;
    let lastFocusedElement = null;

    const renderModalPhoto = function () {
        image.src = allPhotos[activeIndex];
        image.alt = `Лавандове поле — фото ${activeIndex + 1}`;
        counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(allPhotos.length).padStart(2, "0")}`;
    };

    const closeModal = function () {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("gallery-modal-open");
        lastFocusedElement?.focus();
    };

    const move = function (direction) {
        activeIndex = (activeIndex + direction + allPhotos.length) % allPhotos.length;
        renderModalPhoto();
    };

    openButton.addEventListener("click", () => {
        if (allPhotos.length === 0) {
            return;
        }
        lastFocusedElement = document.activeElement;
        activeIndex = 0;
        renderModalPhoto();
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("gallery-modal-open");
        closeButton.focus();
    });

    closeButton.addEventListener("click", closeModal);
    previousButton.addEventListener("click", () => move(-1));
    nextButton.addEventListener("click", () => move(1));
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!modal.classList.contains("is-open")) {
            return;
        }
        if (event.key === "Escape") closeModal();
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
    });
};

const initPhotoGallery = async function () {
    allPhotos = await loadGalleryPhotos();

    if (mobileGalleryQuery.matches) {
        initMobileStory();
    } else {
        initDesktopSlider();
    }

    initGalleryModal();
};

initPhotoGallery();
