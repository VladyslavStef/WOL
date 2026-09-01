// ========================================
// НОВА МОДЕЛЬ: categories → products
// ========================================
// FIX: цей файл раніше хардкодив списки категорій
// (PRODUCT_CATEGORY_ORDER/SEEDLING_CATEGORY_ORDER) і мав toFrontendProduct()
// із прапорцем isFirstInCategory, що імітував "перший елемент масиву — це
// категорія". Це і була стара неправильна модель. Тепер бекенд (GET
// /categories) сам повертає категорії окремо від товарів, уже відсортовані,
// і поля вже узгоджені з тим, що очікує рендер — тому тут лишається лише
// групування по displayGroup і спільна логіка картки категорія→товари.


// ----------------------------
// РОЗБИТТЯ КАТЕГОРІЙ ПО ГРУПІ ВІДОБРАЖЕННЯ
// ----------------------------

const filterCategoriesByDisplayGroup = function (categories, displayGroup) {
    return categories.filter((category) => category.displayGroup === displayGroup);
};


// ----------------------------
// ЧИСТІ ФУНКЦІЇ СТАНУ КАРТКИ (тестуються окремо, без DOM)
// ----------------------------
// currentIndex === -1  → СТАН 1: показуємо саму категорію
// currentIndex === 0..N-1 → СТАН 2/3: показуємо products[currentIndex]

const getCategoryCardStateData = function (category, index) {

    if (index === -1) {
        return {
            name: category.name,
            description: category.description || "",
            priceText: category.priceLabel || "",
            image: category.image || "",
            icon: category.icon || "",
            alt: category.alt || category.name,
            isCategory: true
        };
    }

    const product = (category.products || [])[index];

    return {
        name: product.name,
        description: product.description || "",
        priceText: `${product.price} грн`,
        image: product.image || "",
        icon: product.icon || "",
        alt: product.alt || product.name,
        isCategory: false
    };
};

const getCategoryCardNavState = function (category, currentIndex) {

    const products = category.products || [];

    return {
        canGoNext: currentIndex < products.length - 1,
        canGoPrev: currentIndex > -1,
        isCategoryState: currentIndex === -1
    };
};


// ----------------------------
// СПІЛЬНА АНІМАЦІЯ ДОДАВАННЯ В КОШИК
// ----------------------------
// FIX: раніше ця функція була продубльована ідентично в catalogue.js і main.js.

const showAddedAnimation = function (image) {

    const originalSrc = image.src;

    image.classList.add("is-changing");

    setTimeout(() => {
        image.src = "../IMG/confirmed.png";
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


// ----------------------------
// СПІЛЬНА ЛОГІКА КАРТКИ: категорія ⇄ товари
// ----------------------------
// Використовується і в catalogue.js (усі категорії), і в main.js
// (3 обрані категорії топ-товарів на головній) — та сама поведінка.

const setupCategoryCard = function (article, category) {

    let currentIndex = -1; // ЗАВЖДИ стартуємо з категорії, ніколи не з products[0]
    let isAnimating = false;
    let isBasketAnimating = false;

    const products = category.products || [];

    const nextButton = article.querySelector(".sell__article-nav--next");
    const previousButton = article.querySelector(".sell__article-nav--previous");

    const imageEl = article.querySelector(".hydrolat-image:not(.hydrolat-image--under)");
    const imageNextEl = article.querySelector(".hydrolat-image--under");

    const iconEl = article.querySelector(".sell__article-icon:not(.sell__article-icon--next)");
    const iconNextEl = article.querySelector(".sell__article-icon--next");

    const titleEl = article.querySelector(".sell__article__info-title");
    const descriptionEl = article.querySelector(".sell__article__info-description");
    const priceEl = article.querySelector(".sell__article__info-price");

    const basketImage = article.querySelector(".button__image");
    const basketButton = basketImage.closest("button");

    basketImage.classList.remove("is-hidden");

    // ---- рендер даних у DOM ----
    const renderState = function (data) {
        titleEl.textContent = data.name;
        descriptionEl.textContent = data.description;
        priceEl.textContent = data.priceText;
        imageEl.src = data.image;
        imageEl.alt = data.alt;
        iconEl.src = data.icon;
    };

    const updateControls = function () {
        const nav = getCategoryCardNavState(category, currentIndex);
        previousButton.classList.toggle("is-hidden", !nav.canGoPrev);
        nextButton.classList.toggle("is-hidden", !nav.canGoNext);
        basketButton.classList.toggle("is-hidden", nav.isCategoryState);
    };

    // ---- ПОЧАТКОВИЙ RENDER: завжди СТАН 1 (категорія) ----
    // FIX: category.image НІКОЛИ не бере дані з products[0] — тут явно
    // рендериться getCategoryCardStateData(category, -1), а не products[0].
    renderState(getCategoryCardStateData(category, currentIndex));
    updateControls();

    // ---- ДОДАВАННЯ В КОШИК: лише в товарному стані ----
    basketButton.addEventListener("click", () => {

        if (currentIndex === -1) {
            return; // безпека: категорію не можна покласти в кошик
        }

        addToBasket(products[currentIndex]);

        if (isBasketAnimating) {
            return;
        }

        isBasketAnimating = true;
        showAddedAnimation(basketImage);

        setTimeout(() => {
            isBasketAnimating = false;
        }, 1000);
    });

    // ---- анімація переходу (той самий fade, що й раніше) ----
    const addFadeIn = () => { imageNextEl.classList.add("is-fading-in"); iconNextEl.classList.add("is-fading-in"); };
    const addFadeOut = () => { imageEl.classList.add("is-fading-out"); iconEl.classList.add("is-fading-out"); };
    const removeFadeIn = () => { imageNextEl.classList.remove("is-fading-in"); iconNextEl.classList.remove("is-fading-in"); };
    const removeFadeOut = () => { imageEl.classList.remove("is-fading-out"); iconEl.classList.remove("is-fading-out"); };

    const goToIndex = function (targetIndex) {

        if (isAnimating) {
            return;
        }

        isAnimating = true;

        const targetData = getCategoryCardStateData(category, targetIndex);

        iconNextEl.src = targetData.icon;

        imageNextEl.addEventListener(
            "load",
            () => {
                addFadeIn();
                addFadeOut();

                setTimeout(() => {
                    currentIndex = targetIndex;
                    renderState(getCategoryCardStateData(category, currentIndex));
                    removeFadeIn();
                    removeFadeOut();
                    updateControls();
                    isAnimating = false;
                }, 400);
            },
            { once: true }
        );

        imageNextEl.src = targetData.image;
    };

    nextButton.addEventListener("click", () => {
        const nav = getCategoryCardNavState(category, currentIndex);
        if (!nav.canGoNext) {
            return;
        }
        goToIndex(currentIndex + 1);
    });

    previousButton.addEventListener("click", () => {
        const nav = getCategoryCardNavState(category, currentIndex);
        if (!nav.canGoPrev) {
            return;
        }
        // FIX: якщо currentIndex був 0 (перший товар), goToIndex(-1)
        // повертає саме СТАН категорії — вимога "Повернення ← з першого
        // товару повинно повертати саме category state".
        goToIndex(currentIndex - 1);
    });
};
