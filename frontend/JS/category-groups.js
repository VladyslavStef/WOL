// ГРУПУВАННЯ ТЕПЕР ПРИХОДИТЬ ГОТОВИМ З БЕКЕНДУ (GET /categories, вкладені products[]).
// Категорія відображається як "картка" з власним фото/описом (стан -1),
// товари категорії — наступні слайди (кнопка кошика активна лише на них).
// FIX: це ЄДИНА версія цього файлу в проєкті. Стара "плоска" модель
// (buildCategoryArticle/toFrontendItem/групування у масив [header,...products])
// повністю видалена — вона конфліктувала з цією версією і ламала каталог.

// ----------------------------
// РОЗБИТТЯ КАТЕГОРІЙ ПО ГРУПІ ВІДОБРАЖЕННЯ
// ----------------------------

const filterCategoriesByDisplayGroup = function (categories, displayGroup) {
    return categories.filter((category) => category.displayGroup === displayGroup);
};

const findCategoryBySlug = function (categories, slug) {
    return categories.find((category) => category.slug === slug);
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

    // FIX: API повертає товар з полем "title", не "name" — раніше тут
    // читалось лише product.name, яке завжди undefined -> назва товару
    // ніколи не показувалась при перемиканні слайдів.
    return {
        name: product.name || product.title,
        description: product.description || "",
        priceText: `${product.price} грн`,
        image: product.image || "",
        icon: product.icon || "",
        alt: product.alt || product.name || product.title,
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

const setupCategoryCard = function (article, category) {

    let currentIndex = -1; // ЗАВЖДИ стартуємо з категорії
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

    renderState(getCategoryCardStateData(category, currentIndex));
    updateControls();

    basketButton.addEventListener("click", () => {

        if (currentIndex === -1) {
            return; // безпека: категорію не можна покласти в кошик
        }

        const product = products[currentIndex];

        // FIX: API віддає товар як {title, price, image, icon, alt, ...} —
        // а basket.js по всьому коду очікує {name, priceValue, image, alt}.
        // Без цієї нормалізації кошик показував би NaN грн.
        addToBasket({
            id: product.id,
            name: product.name || product.title,
            priceValue: Number(product.price),
            image: product.image,
            alt: product.alt || product.name || product.title
        });

        if (isBasketAnimating) {
            return;
        }

        isBasketAnimating = true;
        showAddedAnimation(basketImage);

        setTimeout(() => {
            isBasketAnimating = false;
        }, 1000);
    });

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
        goToIndex(currentIndex - 1);
    });
};