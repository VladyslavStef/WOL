// ========================================
// TOP PRODUCTS (нова модель: categories → products, з урахуванням stock)
// ========================================
// FIX: раніше тут будувався productsByCategory через buildCategoryArticle()
// (несумісний, "мертвий" формат — див. category-groups.js) і виклик
// articleAll.forEach(setupProductCard) — функції setupProductCard ніде не
// існувало, тобто це падало з ReferenceError і топ-товари на головній
// ніколи не рендерились.
//
// Тепер: GET /categories вже повертає лише активні категорії групи
// "products", у яких є хоча б один товар в наявності (is_active=true,
// stock>0 для physical) — фільтрація за stock відбувається ОДИН РАЗ на
// бекенді, тут вона не дублюється.
//
// Логіка вибору 3 карток на головній (Частина 5 ТЗ):
//   1. Пріоритетно беремо категорії "hydrolats", "oils", "soaps", якщо вони
//      є серед доступних.
//   2. Якщо якоїсь із них немає (наприклад, весь stock=0) — вільну позицію
//      займає інша доступна категорія групи "products" (без дублів).
//   3. Якщо доступних категорій менше 3 — показуємо стільки, скільки є,
//      і прибираємо зайві картки з DOM, а не показуємо порожні "заглушки".

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

    // 1. Пріоритетні категорії — якщо доступні
    PREFERRED_TOP_SLUGS.forEach((slug) => {
        const found = productCategories.find((category) => category.slug === slug);
        if (found && !usedIds.has(found.id)) {
            picked.push(found);
            usedIds.add(found.id);
        }
    });

    // 2. Доповнюємо іншими доступними категоріями до потрібної кількості,
    // без дублів (усі вже в usedIds пропускаються).
    for (const category of productCategories) {
        if (picked.length >= TOP_PRODUCTS_CARD_COUNT) {
            break;
        }
        if (usedIds.has(category.id)) {
            continue;
        }
        picked.push(category);
        usedIds.add(category.id);
    }

    return picked.slice(0, TOP_PRODUCTS_CARD_COUNT);
};

const initTopProducts = async function () {

    try {
        const response = await fetchAllCategories();
        const allCategories = response.data || [];

        const topCategories = pickTopCategories(allCategories);

        articleAll.forEach((article, index) => {

            const category = topCategories[index];

            if (!category) {
                // Доступних категорій менше, ніж карток на сторінці —
                // прибираємо зайву картку, а не показуємо фіктивну/порожню.
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
// PHOTO SLIDER
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

let currentSlideIndex = 0;
let isSliderAnimating = false;
let autoSlideInterval = null;

const slideButton = document.querySelector(".slider__button");

const currentSlide = document.querySelector(
    ".slider__photos-item:not(.slider__photos-item--next)"
);

const nextSlide = document.querySelector(
    ".slider__photos-item--next"
);

// ========================================
// MOBILE PHOTO STORY
// На телефоні широкі фото можна провести пальцем до кінця, без обрізання.
// ========================================

const mobileStoryTrack = document.querySelector(".slider__story-track");
const mobileStoryCount = document.querySelector(".slider__story-count");
const mobileStoryProgress = document.querySelector(".slider__story-progress-fill");
const isMobileStory = window.matchMedia("(max-width: 768px)").matches;

if (isMobileStory && mobileStoryTrack) {
    mobileStoryTrack.innerHTML = allPhotos.map((photo, index) => `
        <figure class="slider__story-card">
            <img
                class="slider__story-image"
                src="${photo}"
                alt="Лавандове поле — фото ${index + 1}"
                ${index > 0 ? 'loading="lazy"' : ""}
            />
        </figure>
    `).join("");

    const storyCards = Array.from(
        mobileStoryTrack.querySelectorAll(".slider__story-card")
    );

    const updateMobileStoryMeta = function () {
        const trackLeft = mobileStoryTrack.getBoundingClientRect().left;
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        storyCards.forEach((card, index) => {
            const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        if (mobileStoryCount) {
            mobileStoryCount.textContent = `${String(nearestIndex + 1).padStart(2, "0")} / ${String(allPhotos.length).padStart(2, "0")}`;
        }

        if (mobileStoryProgress) {
            mobileStoryProgress.style.width = `${((nearestIndex + 1) / allPhotos.length) * 100}%`;
        }
    };

    let mobileStoryFrame;
    mobileStoryTrack.addEventListener("scroll", () => {
        cancelAnimationFrame(mobileStoryFrame);
        mobileStoryFrame = requestAnimationFrame(updateMobileStoryMeta);
    }, { passive: true });
}


// ========================================
// SAFETY CHECK
// ========================================

if (
    !slideButton ||
    !currentSlide ||
    !nextSlide ||
    allPhotos.length === 0
) {
    console.warn("Слайдер: не знайдено необхідні елементи.");
} else {

    // ========================================
    // PRELOAD FIRST IMAGE
    // ========================================

    currentSlide.src = allPhotos[currentSlideIndex];


    // ========================================
    // GET NEXT INDEX
    // ========================================

    const getNextSlideIndex = function () {

        return (
            currentSlideIndex + 1
        ) % allPhotos.length;
    };


    // ========================================
    // SWITCH SLIDE
    // ========================================

    const switchSlide = function () {

        if (isSliderAnimating) {
            return;
        }

        isSliderAnimating = true;


        const nextIndex =
            getNextSlideIndex();


        // Завантажуємо наступне зображення
        nextSlide.src =
            allPhotos[nextIndex];


        // Чекаємо, поки картинка реально завантажиться
        const startTransition = function () {

            nextSlide.classList.remove(
                "slider__photos-item--next"
            );

            currentSlide.classList.add(
                "slider__photos-item--out"
            );
        };


        // Якщо картинка вже в кеші
        if (
            nextSlide.complete &&
            nextSlide.naturalWidth > 0
        ) {
            startTransition();
        } else {

            nextSlide.addEventListener(
                "load",
                startTransition,
                { once: true }
            );

            nextSlide.addEventListener(
                "error",
                () => {

                    console.error(
                        "Слайдер: не вдалося завантажити",
                        nextSlide.src
                    );

                    isSliderAnimating = false;

                },
                { once: true }
            );
        }
    };


    // ========================================
    // FINISH TRANSITION
    // ========================================

    const finishTransition = function () {

        /*
         * Якщо transitionend прийшов повторно,
         * не запускаємо завершення ще раз.
         */
        if (!isSliderAnimating) {
            return;
        }


        const finishedIndex =
            getNextSlideIndex();


        // Вимикаємо transition
        currentSlide.classList.add(
            "slider__photos-item--no-transition"
        );

        nextSlide.classList.add(
            "slider__photos-item--no-transition"
        );


        // Поточний слайд стає наступним
        currentSlide.src =
            nextSlide.src;


        currentSlideIndex =
            finishedIndex;


        // Повертаємо початковий стан
        currentSlide.classList.remove(
            "slider__photos-item--out"
        );

        nextSlide.classList.add(
            "slider__photos-item--next"
        );


        /*
         * Даємо браузеру застосувати
         * новий стан без анімації,
         * а потім повертаємо transition.
         */
        requestAnimationFrame(() => {

            requestAnimationFrame(() => {

                currentSlide.classList.remove(
                    "slider__photos-item--no-transition"
                );

                nextSlide.classList.remove(
                    "slider__photos-item--no-transition"
                );

            });

        });


        isSliderAnimating = false;
    };


    // ========================================
    // TRANSITION END
    // ========================================

    currentSlide.addEventListener(
        "transitionend",
        (event) => {

            /*
             * Реагуємо тільки на transition
             * самого currentSlide.
             */
            if (
                event.target !== currentSlide
            ) {
                return;
            }


            finishTransition();
        }
    );


    // ========================================
    // AUTO SLIDER
    // ========================================

    const startAutoSlide = function () {

        clearInterval(autoSlideInterval);

        autoSlideInterval = setInterval(
            () => {
                switchSlide();
            },
            4000
        );
    };


    // ========================================
    // BUTTON
    // ========================================

    slideButton.addEventListener(
        "click",
        () => {

            clearInterval(autoSlideInterval);

            switchSlide();

            startAutoSlide();
        }
    );


    // ========================================
    // START
    // ========================================

    // На телефоні працює ручна панорамна галерея вище. Автоперемикання
    // старого слайдера там не потрібне.
    if (!isMobileStory) {
        startAutoSlide();
    }
}
