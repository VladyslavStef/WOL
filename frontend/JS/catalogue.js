// ========================================
// НОВА МОДЕЛЬ: рендер категорій (не товарів "замаскованих" під категорію)
// ========================================

const fillButton = document.querySelectorAll(".button-container__button");
const catalogContainer = document.querySelector(".sell__article__container");
const articleTemplate = document.getElementById("article-template");

// Повний список категорій з GET /categories (кожна вже містить products[])
let catalogueCategories = [];


// ----------------------------
// RENDER CATALOG
// ----------------------------

const renderCatalog = function (displayGroup) {

    const categories = filterCategoriesByDisplayGroup(catalogueCategories, displayGroup);

    catalogContainer.innerHTML = "";

    if (categories.length === 0) {
        catalogContainer.innerHTML = `<p class="catalog-empty">Наразі категорій немає. Спробуйте пізніше.</p>`;
        return;
    }

    categories.forEach((category) => {

        const cloneArticle = articleTemplate.content.cloneNode(true);
        const articleElement = cloneArticle.querySelector(".sell__article");

        catalogContainer.append(cloneArticle);

        // Уся логіка стану "категорія ⇄ товари" — спільна з main.js,
        // визначена в category-groups.js. Тут не дублюється.
        setupCategoryCard(articleElement, category);
    });
};


// ----------------------------
// CATEGORY BUTTONS (перемикач "Наша продукція" / "Саджанці")
// ----------------------------

fillButton.forEach((button) => {

    const displayGroup = button.dataset.category; // "products" | "seedlings"

    button.addEventListener("click", () => {

        fillButton.forEach((item) => {
            item.classList.remove("is-active");
        });

        button.classList.add("is-active");
        button.classList.add("is-filled");

        setTimeout(() => {
            button.classList.remove("is-filled");
        }, 400);

        renderCatalog(displayGroup);
    });
});


// ----------------------------
// INIT: тягнемо каталог з бекенду й тільки тоді рендеримо
// ----------------------------

const initCatalogue = async function () {

    catalogContainer.innerHTML = `<p class="catalog-empty">Завантаження каталогу...</p>`;

    try {
        const response = await fetchCategoriesCatalogue();
        catalogueCategories = response.data || [];

        renderCatalog("products");

    } catch (error) {
        console.error("Не вдалося завантажити каталог:", error.message);
        catalogContainer.innerHTML = `<p class="catalog-empty">Не вдалося завантажити каталог. Спробуйте оновити сторінку.</p>`;
    }
};

initCatalogue();
