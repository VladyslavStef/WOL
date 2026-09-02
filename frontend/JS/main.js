// ========================================
// TOP PRODUCTS (нова модель: categories → products)
// ========================================
// FIX: раніше тут будувався productsByCategory з product-data.js/бекенду
// плоским списком і власна (дубльована з catalogue.js) карусельна логіка.
// Тепер: 3 картки на головній ("hydrolats", "oils", "soaps") — це
// data-category === category.slug, і вся поведінка "категорія ⇄ товари"
// уже визначена один раз у category-groups.js (setupCategoryCard),
// спільно з catalogue.js.

const articleAll = document.querySelectorAll(".sell__article");

let topCategories = [];

const initTopProducts = async function () {

    try {
        const response = await fetchAllCategories();
        const allCategories = response.data || [];

        articleAll.forEach((article) => {
            const slug = article.dataset.category;
            const category = findCategoryBySlug(allCategories, slug);

            if (category) {
                setupCategoryCard(article, category);
            } else {
                console.warn(`Категорію "${slug}" не знайдено серед активних категорій`);
            }
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


        // Чекаємо, поки картинка завантажиться
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

    startAutoSlide();
}
