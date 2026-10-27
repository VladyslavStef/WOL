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
        const found = productCategories.find((category) => category.slug === slug);

        if (found && !usedIds.has(found.id)) {
            picked.push(found);
            usedIds.add(found.id);
        }
    });

    for (const category of productCategories) {
        if (picked.length >= TOP_PRODUCTS_CARD_COUNT) {
            break;
        }

        if (!usedIds.has(category.id)) {
            picked.push(category);
            usedIds.add(category.id);
        }
    }

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

const allPhotos = [
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

const mobileQuery = window.matchMedia("(max-width: 768px)");

// Цей стиль додається самим main.js. Тому не потрібно редагувати HTML або CSS.
const addMobileStoryStyles = function () {
    if (document.getElementById("mobile-photo-story-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "mobile-photo-story-styles";
    style.textContent = `
        @media (max-width: 768px) {
            .slider__wrapper {
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                background: transparent !important;
            }

            .slider__gradient,
            .slider__decor,
            .slider__textholder-decor {
                display: none !important;
            }

            .slider__textholder {
                position: static !important;
                display: contents !important;
                width: auto !important;
                max-width: none !important;
                transform: none !important;
                color: inherit !important;
                text-align: center !important;
            }

            .slider__textholder-heading {
                order: 1;
                display: flex !important;
                justify-content: center !important;
                width: 100% !important;
                padding: 0.8rem 1.2rem !important;
                box-sizing: border-box !important;
                color: var(--text-color) !important;
                text-align: center !important;
            }

            .slider__textholder-header {
                margin: 0 !important;
            }

            .slider__story {
                order: 2;
                position: relative;
                display: block !important;
                width: 100% !important;
                height: 25rem !important;
                overflow: hidden !important;
                background: #f5f2f6;
            }

            .slider__story-track {
                display: flex !important;
                gap: 0.8rem;
                width: 100% !important;
                height: 100% !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                overscroll-behavior-x: contain;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                touch-action: pan-x pinch-zoom;
            }

            .slider__story-track::-webkit-scrollbar {
                display: none;
            }

            .slider__story-card {
                flex: 0 0 auto !important;
                width: auto !important;
                height: 100% !important;
                aspect-ratio: 1905 / 630;
                margin: 0 !important;
            }

            .slider__story-image {
                display: block !important;
                width: 100% !important;
                max-width: none !important;
                height: 100% !important;
                object-fit: cover !important;
            }

            .slider__story-meta {
                position: absolute;
                right: 1.2rem;
                bottom: 1.2rem;
                left: 1.2rem;
                display: flex;
                align-items: center;
                gap: 0.9rem;
                pointer-events: none;
            }

            .slider__story-count {
                color: #fff;
                font-family: Montserrat, sans-serif;
                font-size: 1.2rem;
                font-weight: 600;
                letter-spacing: 0.08em;
                text-shadow: 0 0.1rem 0.5rem rgba(0, 0, 0, 0.55);
                white-space: nowrap;
            }

            .slider__story-progress {
                display: block;
                flex: 1;
                height: 0.3rem;
                overflow: hidden;
                border-radius: 99rem;
                background: rgba(255, 255, 255, 0.48);
            }

            .slider__story-progress-fill {
                display: block;
                width: 11.111%;
                height: 100%;
                border-radius: inherit;
                background: #fff;
                transition: width 0.25s ease;
            }

            .slider__photos,
            .slider__button {
                display: none !important;
            }

            .slider__textholder-paragraph {
                order: 3;
                width: 100% !important;
                max-width: 58rem !important;
                margin: 0.8rem auto 0 !important;
                padding: 0 1.2rem !important;
                box-sizing: border-box;
                color: var(--text-color) !important;
                text-align: center !important;
            }

            .slider__textholder-contacts {
                order: 4;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                width: 100% !important;
                margin: 0.8rem auto !important;
                padding: 0 1.2rem !important;
                box-sizing: border-box;
                color: var(--text-color) !important;
                text-align: center !important;
            }

            .slider__textholder-info {
                width: 100%;
                max-width: 36rem;
                color: var(--text-color) !important;
                overflow-wrap: break-word;
            }
        }
    `;

    document.head.append(style);
};

const createMobileStory = function () {
    if (!mobileQuery.matches) {
        return false;
    }

    const sliderWrapper = document.querySelector(".slider__wrapper");

    if (!sliderWrapper) {
        return false;
    }

    addMobileStoryStyles();

    let story = sliderWrapper.querySelector(".slider__story");

    if (!story) {
        story = document.createElement("div");
        story.className = "slider__story";
        story.setAttribute("aria-label", "Галерея лавандового поля");
        sliderWrapper.append(story);
    }

    story.innerHTML = `
        <div class="slider__story-track" aria-label="Проведіть пальцем, щоб подивитися всі фото"></div>
        <div class="slider__story-meta" aria-hidden="true">
            <span class="slider__story-count">01 / ${String(allPhotos.length).padStart(2, "0")}</span>
            <span class="slider__story-progress">
                <span class="slider__story-progress-fill"></span>
            </span>
        </div>
    `;

    const track = story.querySelector(".slider__story-track");
    const count = story.querySelector(".slider__story-count");
    const progress = story.querySelector(".slider__story-progress-fill");

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

    const updateMeta = function () {
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

        count.textContent = `${String(closestIndex + 1).padStart(2, "0")} / ${String(allPhotos.length).padStart(2, "0")}`;
        progress.style.width = `${((closestIndex + 1) / allPhotos.length) * 100}%`;
    };

    const centerFirstPhotoOnce = function () {
        const firstCard = cards[0];

        if (!firstCard || track.clientWidth === 0 || firstCard.scrollWidth === 0) {
            return;
        }

        // Люди на першому знімку розташовані приблизно на 46% ширини кадру.
        // Центрування відбувається тільки при відкритті сторінки й не заважає свайпу.
        const peoplePosition = firstCard.scrollWidth * 0.46;
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        track.scrollLeft = Math.min(
            maxScroll,
            Math.max(0, peoplePosition - track.clientWidth / 2)
        );
        updateMeta();
    };

    const firstImage = cards[0]?.querySelector("img");

    const scheduleInitialPosition = function () {
        requestAnimationFrame(() => {
            requestAnimationFrame(centerFirstPhotoOnce);
        });
    };

    if (firstImage?.complete && firstImage.naturalWidth > 0) {
        scheduleInitialPosition();
    } else {
        firstImage?.addEventListener("load", scheduleInitialPosition, { once: true });
    }

    let animationFrame;

    track.addEventListener("scroll", () => {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(updateMeta);
    }, { passive: true });

    return true;
};

const mobileStoryIsActive = createMobileStory();

// ========================================
// DESKTOP PHOTO SLIDER
// ========================================

let currentSlideIndex = 0;
let isSliderAnimating = false;
let autoSlideInterval = null;

const slideButton = document.querySelector(".slider__button");
const currentSlide = document.querySelector(
    ".slider__photos-item:not(.slider__photos-item--next)"
);
const nextSlide = document.querySelector(".slider__photos-item--next");

if (
    !mobileStoryIsActive &&
    slideButton &&
    currentSlide &&
    nextSlide &&
    allPhotos.length > 0
) {
    currentSlide.src = allPhotos[currentSlideIndex];

    const getNextSlideIndex = function () {
        return (currentSlideIndex + 1) % allPhotos.length;
    };

    const switchSlide = function () {
        if (isSliderAnimating) {
            return;
        }

        isSliderAnimating = true;
        const nextIndex = getNextSlideIndex();
        nextSlide.src = allPhotos[nextIndex];

        const startTransition = function () {
            nextSlide.classList.remove("slider__photos-item--next");
            currentSlide.classList.add("slider__photos-item--out");
        };

        if (nextSlide.complete && nextSlide.naturalWidth > 0) {
            startTransition();
            return;
        }

        nextSlide.addEventListener("load", startTransition, { once: true });
        nextSlide.addEventListener("error", () => {
            console.error("Слайдер: не вдалося завантажити", nextSlide.src);
            isSliderAnimating = false;
        }, { once: true });
    };

    const finishTransition = function () {
        if (!isSliderAnimating) {
            return;
        }

        const finishedIndex = getNextSlideIndex();
        currentSlide.classList.add("slider__photos-item--no-transition");
        nextSlide.classList.add("slider__photos-item--no-transition");
        currentSlide.src = nextSlide.src;
        currentSlideIndex = finishedIndex;
        currentSlide.classList.remove("slider__photos-item--out");
        nextSlide.classList.add("slider__photos-item--next");

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                currentSlide.classList.remove("slider__photos-item--no-transition");
                nextSlide.classList.remove("slider__photos-item--no-transition");
            });
        });

        isSliderAnimating = false;
    };

    currentSlide.addEventListener("transitionend", (event) => {
        if (event.target === currentSlide) {
            finishTransition();
        }
    });

    const startAutoSlide = function () {
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(switchSlide, 4000);
    };

    slideButton.addEventListener("click", () => {
        clearInterval(autoSlideInterval);
        switchSlide();
        startAutoSlide();
    });

    startAutoSlide();
}
