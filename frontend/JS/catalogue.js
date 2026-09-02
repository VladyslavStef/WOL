// НОВА МОДЕЛЬ: рендер категорій напряму з вкладеними products[] з бекенду.
// FIX: раніше тут була суміш двох реалізацій — виклик
// filterCategoriesByDisplayGroup на змінній catalogueCategories, яку ніхто
// не заповнював (замість цього код помилково писав у products/seedlings
// через застарілий groupCategoriesByDisplayGroup/buildCategoryArticle,
// яких більше не існує). Тепер лишається один шлях даних.

const fillButton = document.querySelectorAll(".button-container__button");
const catalogContainer = document.querySelector(".sell__article__container");
const articleTemplate = document.getElementById("article-template");

let catalogueCategories = [];

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

        setupCategoryCard(articleElement, category);
    });
};

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

const initCatalogue = async function () {

    catalogContainer.innerHTML = `<p class="catalog-empty">Завантаження каталогу...</p>`;

    try {
        const response = await fetchAllCategories();
        catalogueCategories = response.data || [];

        renderCatalog("products");

    } catch (error) {
        console.error("Не вдалося завантажити каталог:", error.message);
        catalogContainer.innerHTML = `<p class="catalog-empty">Не вдалося завантажити каталог. Спробуйте оновити сторінку.</p>`;
    }
};

initCatalogue();