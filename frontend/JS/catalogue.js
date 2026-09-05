// ========================================
// НОВА МОДЕЛЬ: рендер категорій (не товарів "замаскованих" під категорію)
// ========================================

const fillButton = document.querySelectorAll(".button-container__button");
const catalogContainer = document.querySelector(".sell__article__container");
const articleTemplate = document.getElementById("article-template");

// Повний список категорій з GET /categories (кожна вже містить products[],
// і бекенд вже гарантує, що там лише товари в наявності — див. аудит stock).
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
// FIX (catalog_enabled): ці кнопки явно згадані як точка входу, яку
// потрібно блокувати. Перед перемиканням завжди перевіряємо АКТУАЛЬНИЙ
// (не кешований на момент завантаження сторінки) стан каталогу через
// guardCatalogAction() з catalog-state.js — та сама функція, що й для
// посилань, логіка не дублюється.

fillButton.forEach((button) => {

    const displayGroup = button.dataset.category; // "products" | "seedlings"

    button.addEventListener("click", () => {

        guardCatalogAction(() => {

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
});


// ----------------------------
// INIT: тягнемо каталог з бекенду й тільки тоді рендеримо
// ----------------------------
// FIX (root cause): перед будь-яким запитом товарів перевіряємо ЖИВИЙ
// стан каталогу (refreshCatalogStatus), а не покладаємось на те, що якась
// інша частина коду вже це зробила раніше. Якщо каталог вимкнено — товари
// взагалі не запитуються й не рендеряться, показується лише заблокований
// стан + спільна модалка "Лаванда спить".
//
// Далі стартує легкий polling (catalog-state.js), щоб без ручного reload
// відреагувати, якщо адмін змінить статус, поки користувач залишається
// саме на цій сторінці (і в той, і в інший бік).

const buildCatalogueReenableHandler = function () {
    // Якщо каталог знову увімкнули, поки користувач залишається на
    // сторінці, і товари ще не були завантажені (бо на момент відкриття
    // каталог був закритий) — довантажуємо їх автоматично, без reload.
    return function () {
        if (catalogueCategories.length === 0) {
            fetchAllCategories()
                .then((response) => {
                    catalogueCategories = response.data || [];
                    renderCatalog("products");
                })
                .catch((error) => {
                    console.error("Не вдалося довантажити каталог:", error.message);
                });
        }
    };
};

const initCatalogue = async function () {

    catalogContainer.innerHTML = `<p class="catalog-empty">Завантаження каталогу...</p>`;

    const catalogEnabled = await refreshCatalogStatus();

    if (!catalogEnabled) {
        catalogContainer.innerHTML = "";
        applyCatalogBlockedState();
        onCatalogReenabled = buildCatalogueReenableHandler();
        startCatalogStatusPolling();
        return;
    }

    try {
        const response = await fetchAllCategories();
        catalogueCategories = response.data || [];

        renderCatalog("products");

    } catch (error) {
        console.error("Не вдалося завантажити каталог:", error.message);
        catalogContainer.innerHTML = `<p class="catalog-empty">Не вдалося завантажити каталог. Спробуйте оновити сторінку.</p>`;
    }

    onCatalogReenabled = buildCatalogueReenableHandler();
    startCatalogStatusPolling();
};

initCatalogue();
