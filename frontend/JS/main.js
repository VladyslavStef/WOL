// ========================================
// TOP PRODUCTS
// ========================================

const articleAll = document.querySelectorAll(".sell__article");

// FIX: раніше productsByCategory будувався одразу з product-data.js.
// Тепер дані приходять з бекенду асинхронно — ініціалізація винесена
// в initTopProducts() внизу файлу.
let productsByCategory = {
    hydrolats: [],
    oils: [],
    soaps: []
};


// ========================================
// ADD TO BASKET ANIMATION
// ========================================

const showAddedAnimation = function (image) {

    const originalSrc = image.src;

    image.classList.add("is-changing");


    setTimeout(() => {

        image.src = "/frontend/IMG/confirmed.png";

        image.classList.remove("is-changing");
        image.classList.add("is-added");

    }, 200);


    setTimeout(() => {

        image.classList.remove("is-added");
        image.classList.add("is-changing");

    }, 800);


    setTimeout(() => {

        image.src = originalSrc;

        image.classList.remove("is-changing");

    }, 1000);
};


// ========================================
// PRODUCT CARDS
// ========================================

const setupProductCard = function (article) {

    const category = article.dataset.category;
    const products = productsByCategory[category] || [];

    if (products.length === 0) {
        return;
    }

    let currentProductIndex = 0;

    let isAnimating = false;
    let isBasketAnimating = false;


    // ----------------------------------------
    // ELEMENTS
    // ----------------------------------------

    const nextButton =
        article.querySelector(".sell__article-nav--next");

    const previousButton =
        article.querySelector(".sell__article-nav--previous");


    const hydrolatImageNext =
        article.querySelector(".hydrolat-image--under");

    const hydrolatImage =
        article.querySelector(
            ".hydrolat-image:not(.hydrolat-image--under)"
        );


    const plantIconNext =
        article.querySelector(".sell__article-icon--next");

    const plantIcon =
        article.querySelector(
            ".sell__article-icon:not(.sell__article-icon--next)"
        );


    const hydrolatText =
        article.querySelector(".sell__article__info__text");


    const hydrolatTitle =
        article.querySelector(".sell__article__info-title");

    const hydrolatDescr =
        article.querySelector(".sell__article__info-description");

    const hydrolatPrice =
        article.querySelector(".sell__article__info-price");


    const basketImage =
        article.querySelector(".button__image");

    // вся кнопка
    const basketButton =
        basketImage.closest("button");


    basketImage.classList.remove("is-hidden");


    if (currentProductIndex === 0) {
        basketButton.classList.add("is-hidden");
    }


    // ========================================
    // CHANGE PRODUCT DATA
    // ========================================

    const changeData = function (currentInfo) {

        plantIcon.src = currentInfo.icon;

        hydrolatImage.src = currentInfo.image;
        hydrolatImage.alt = currentInfo.alt;

        hydrolatTitle.textContent = currentInfo.name;
        hydrolatDescr.textContent = currentInfo.description;
        hydrolatPrice.textContent = currentInfo.price;
    };


    changeData(products[currentProductIndex]);


    if (products.length === 1) {
        nextButton.classList.add("is-hidden");
    }


    // ========================================
    // ADD TO BASKET
    // ========================================

    basketButton.addEventListener("click", () => {

        addToBasket(products[currentProductIndex]);


        if (isBasketAnimating) {
            return;
        }


        isBasketAnimating = true;

        showAddedAnimation(basketImage);


        setTimeout(() => {
            isBasketAnimating = false;
        }, 1000);
    });


    // ========================================
    // TEXT ANIMATION
    // ========================================

    const changeAppearance = function () {
        hydrolatText.classList.add("is-changing");
    };


    const showAppearance = function () {
        hydrolatText.classList.remove("is-changing");
    };


    // ========================================
    // IMAGE ANIMATION
    // ========================================

    const addFadeIn = function () {

        hydrolatImageNext.classList.add("is-fading-in");
        plantIconNext.classList.add("is-fading-in");
    };


    const addFadeOut = function () {

        hydrolatImage.classList.add("is-fading-out");
        plantIcon.classList.add("is-fading-out");
    };


    const removeFadeIn = function () {

        hydrolatImageNext.classList.remove("is-fading-in");
        plantIconNext.classList.remove("is-fading-in");
    };


    const removeFadeOut = function () {

        hydrolatImage.classList.remove("is-fading-out");
        plantIcon.classList.remove("is-fading-out");
    };


    // ========================================
    // NEXT PRODUCT
    // ========================================

    nextButton.addEventListener("click", () => {

        if (currentProductIndex >= products.length - 1) {
            return;
        }


        if (isAnimating) {
            return;
        }


        isAnimating = true;

        changeAppearance();


        const nextInfo =
            products[currentProductIndex + 1];


        plantIconNext.src = nextInfo.icon;


        hydrolatImageNext.addEventListener(
            "load",
            () => {

                addFadeIn();
                addFadeOut();


                setTimeout(() => {

                    currentProductIndex++;


                    const currentInfo =
                        products[currentProductIndex];


                    changeData(currentInfo);


                    removeFadeIn();
                    removeFadeOut();


                    previousButton.classList.remove("is-hidden");

                    // показуємо ВСЮ кнопку кошика
                    basketButton.classList.remove("is-hidden");


                    if (
                        currentProductIndex ===
                        products.length - 1
                    ) {
                        nextButton.classList.add("is-hidden");
                    }


                    showAppearance();

                    isAnimating = false;

                }, 400);

            },
            { once: true }
        );


        hydrolatImageNext.src = nextInfo.image;
    });


    // ========================================
    // PREVIOUS PRODUCT
    // ========================================

    previousButton.addEventListener("click", () => {

        if (currentProductIndex <= 0) {
            return;
        }


        if (isAnimating) {
            return;
        }


        isAnimating = true;

        changeAppearance();


        const previousInfo =
            products[currentProductIndex - 1];


        plantIconNext.src = previousInfo.icon;


        hydrolatImageNext.addEventListener(
            "load",
            () => {

                addFadeIn();
                addFadeOut();


                setTimeout(() => {

                    currentProductIndex--;


                    const currentInfo =
                        products[currentProductIndex];


                    changeData(currentInfo);


                    // якщо повернулися на категорію
                    if (currentProductIndex === 0) {

                        previousButton.classList.add("is-hidden");

                        // ховаємо ВСЮ кнопку
                        basketButton.classList.add("is-hidden");
                    }


                    if (
                        currentProductIndex <
                        products.length - 1
                    ) {
                        nextButton.classList.remove("is-hidden");
                    }


                    showAppearance();

                    removeFadeIn();
                    removeFadeOut();


                    isAnimating = false;

                }, 400);

            },
            { once: true }
        );


        hydrolatImageNext.src = previousInfo.image;
    });
};


// ========================================
// INIT: тягнемо товари з бекенду й тільки тоді вішаємо логіку карток
// ========================================

const initTopProducts = async function () {

    try {
        const response = await fetchAllProducts();
        const allProducts = response.data || [];

        productsByCategory = {
            hydrolats: getProductsForCategory(allProducts, "hydrolats"),
            oils: getProductsForCategory(allProducts, "oils"),
            soaps: getProductsForCategory(allProducts, "soaps")
        };

        articleAll.forEach(setupProductCard);

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
let nextSlideIndex = 0;

let isSliderAnimating = false;


const slideButton =
    document.querySelector(".slider__button");


const currentSlide =
    document.querySelector(
        ".slider__photos-item:not(.slider__photos-item--next)"
    );


const nextSlide =
    document.querySelector(".slider__photos-item--next");


// ========================================
// SWITCH SLIDE
// ========================================

const switchSlide = function () {

    if (isSliderAnimating === true) {
        return;
    }


    isSliderAnimating = true;


    if (currentSlideIndex === allPhotos.length - 1) {

        nextSlideIndex = 0;

    } else {

        nextSlideIndex = currentSlideIndex + 1;
    }


    nextSlide.src = allPhotos[nextSlideIndex];


    currentSlide.classList.add(
        "slider__photos-item--out"
    );


    nextSlide.classList.remove(
        "slider__photos-item--next"
    );
};


// ========================================
// AUTO SLIDER
// ========================================

let autoSlideInterval =
    setInterval(switchSlide, 4000);


// ========================================
// SLIDER BUTTON
// ========================================

slideButton.addEventListener("click", () => {

    clearInterval(autoSlideInterval);

    switchSlide();


    autoSlideInterval =
        setInterval(switchSlide, 4000);
});


// ========================================
// SLIDER TRANSITION END
// ========================================

currentSlide.addEventListener(
    "transitionend",
    () => {

        currentSlide.classList.add(
            "slider__photos-item--no-transition"
        );


        nextSlide.classList.add(
            "slider__photos-item--no-transition"
        );


        currentSlide.src = nextSlide.src;

        currentSlideIndex = nextSlideIndex;


        currentSlide.classList.remove(
            "slider__photos-item--out"
        );


        nextSlide.classList.add(
            "slider__photos-item--next"
        );


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
    }
);
