const fillButton = document.querySelectorAll(".button-container__button");
const catalogContainer = document.querySelector(".sell__article__container");
const articleTemplate = document.getElementById("article-template");

// FIX: раніше тут були захардкоджені масиви з product-data.js.
// Тепер товари (з id, реальними числовими цінами і т.д.) приходять з бекенду.
let products = [];
let seedlings = [];

// ----------------------------
// ADD TO BASKET ANIMATION
// ----------------------------

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


// ----------------------------
// RENDER CATALOG
// ----------------------------

const renderCatalog = function (category) {

    let selectedCategories = [];

    if (category === "products") {
        selectedCategories = products;
    } else {
        selectedCategories = seedlings;
    }

    catalogContainer.innerHTML = "";

    if (selectedCategories.length === 0) {
        catalogContainer.innerHTML = `<p class="catalog-empty">Наразі товарів немає. Спробуйте пізніше.</p>`;
        return;
    }


    selectedCategories.forEach((productsCurrentCategory) => {

        let isAnimating = false;
        let isBasketAnimating = false;

        let currentProductIndex = 0;
        let currentProduct = productsCurrentCategory[0];


        const cloneArticle =
            articleTemplate.content.cloneNode(true);


        const nextButton =
            cloneArticle.querySelector(".sell__article-nav--next");

        const previousButton =
            cloneArticle.querySelector(".sell__article-nav--previous");


        const selectTitle =
            cloneArticle.querySelector(".sell__article__info-title");

        const selectDescription =
            cloneArticle.querySelector(".sell__article__info-description");

        const selectPrice =
            cloneArticle.querySelector(".sell__article__info-price");


        const selectImage =
            cloneArticle.querySelector(
                ".hydrolat-image:not(.hydrolat-image--under)"
            );

        const selectImageUnder =
            cloneArticle.querySelector(".hydrolat-image--under");


        const selectIcon =
            cloneArticle.querySelector(
                ".sell__article-icon:not(.sell__article-icon--next)"
            );

        const selectNextIcon =
            cloneArticle.querySelector(".sell__article-icon--next");


        // IMAGE INSIDE BASKET BUTTON
        const selectBasket =
            cloneArticle.querySelector(".button__image");

        const selectBasketButton =
            selectBasket.closest("button");

        selectBasket.classList.remove("is-hidden");

        if (currentProductIndex === 0) {
            selectBasketButton.classList.add("is-hidden");
        }


        // ----------------------------
        // CHANGE PRODUCT DATA
        // ----------------------------

        const changeData = function (product) {

            selectTitle.textContent = product.name;
            selectDescription.textContent = product.description;
            selectPrice.textContent = product.price;

            selectImage.src = product.image;
            selectImage.alt = product.alt;

            selectIcon.src = product.icon;
        };


        changeData(currentProduct);


        // ----------------------------
        // BASKET BUTTON
        // ----------------------------

        selectBasketButton.addEventListener("click", () => {

            addToBasket(currentProduct);


            if (isBasketAnimating) {
                return;
            }

            isBasketAnimating = true;

            showAddedAnimation(selectBasket);


            setTimeout(() => {
                isBasketAnimating = false;
            }, 1000);
        });


        // ----------------------------
        // IMAGE FADE FUNCTIONS
        // ----------------------------

        const addFadeIn = function () {

            selectImageUnder.classList.add("is-fading-in");
            selectNextIcon.classList.add("is-fading-in");
        };


        const addFadeOut = function () {

            selectImage.classList.add("is-fading-out");
            selectIcon.classList.add("is-fading-out");
        };


        const removeFadeIn = function () {

            selectImageUnder.classList.remove("is-fading-in");
            selectNextIcon.classList.remove("is-fading-in");
        };


        const removeFadeOut = function () {

            selectImage.classList.remove("is-fading-out");
            selectIcon.classList.remove("is-fading-out");
        };


        // ----------------------------
        // NEXT PRODUCT
        // ----------------------------

        nextButton.addEventListener("click", () => {

            if (
                currentProductIndex ===
                productsCurrentCategory.length - 1
            ) {
                return;
            }

            if (isAnimating) {
                return;
            }


            isAnimating = true;


            const nextProduct =
                productsCurrentCategory[
                    currentProductIndex + 1
                ];


            selectNextIcon.src = nextProduct.icon;


            selectImageUnder.addEventListener(
                "load",
                () => {

                    addFadeIn();
                    addFadeOut();


                    setTimeout(() => {

                        currentProductIndex++;

                        currentProduct =
                            productsCurrentCategory[
                                currentProductIndex
                            ];


                        changeData(currentProduct);


                        removeFadeIn();
                        removeFadeOut();


                        previousButton.classList.remove("is-hidden");

                        // show whole basket button
                        selectBasketButton.classList.remove("is-hidden");


                        if (
                            currentProductIndex ===
                            productsCurrentCategory.length - 1
                        ) {
                            nextButton.classList.add("is-hidden");
                        }


                        isAnimating = false;

                    }, 400);

                },
                { once: true }
            );


            selectImageUnder.src = nextProduct.image;
        });


        // ----------------------------
        // PREVIOUS PRODUCT
        // ----------------------------

        previousButton.addEventListener("click", () => {

            if (currentProductIndex === 0) {
                return;
            }

            if (isAnimating) {
                return;
            }


            isAnimating = true;


            const previousProduct =
                productsCurrentCategory[
                    currentProductIndex - 1
                ];


            selectNextIcon.src = previousProduct.icon;


            selectImageUnder.addEventListener(
                "load",
                () => {

                    addFadeIn();
                    addFadeOut();


                    setTimeout(() => {

                        currentProductIndex--;

                        currentProduct =
                            productsCurrentCategory[
                                currentProductIndex
                            ];


                        changeData(currentProduct);


                        removeFadeIn();
                        removeFadeOut();


                        if (currentProductIndex === 0) {

                            previousButton.classList.add("is-hidden");
                            selectBasketButton.classList.add("is-hidden");
                        }


                        nextButton.classList.remove("is-hidden");


                        isAnimating = false;

                    }, 400);

                },
                { once: true }
            );


            selectImageUnder.src = previousProduct.image;
        });


        catalogContainer.append(cloneArticle);
    });
};


// ----------------------------
// CATEGORY BUTTONS
// ----------------------------

fillButton.forEach((button) => {

    const category = button.dataset.category;


    button.addEventListener("click", () => {

        fillButton.forEach((item) => {
            item.classList.remove("is-active");
        });


        button.classList.add("is-active");
        button.classList.add("is-filled");


        setTimeout(() => {
            button.classList.remove("is-filled");
        }, 400);


        renderCatalog(category);
    });
});


// ----------------------------
// INIT: тягнемо товари з бекенду й тільки тоді рендеримо
// ----------------------------

const initCatalogue = async function () {

    catalogContainer.innerHTML = `<p class="catalog-empty">Завантаження каталогу...</p>`;

    try {
        const response = await fetchAllProducts();
        const allProducts = response.data || [];

        products = groupProductsByCategories(allProducts, PRODUCT_CATEGORY_ORDER);
        seedlings = groupProductsByCategories(allProducts, SEEDLING_CATEGORY_ORDER);

        renderCatalog("products");

    } catch (error) {
        console.error("Не вдалося завантажити каталог:", error.message);
        catalogContainer.innerHTML = `<p class="catalog-empty">Не вдалося завантажити каталог. Спробуйте оновити сторінку.</p>`;
    }
};

initCatalogue();
