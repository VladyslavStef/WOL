// ========================================
// КАТЕГОРІЇ (порядок відповідає старому product-data.js)
// ========================================

const PRODUCT_CATEGORY_ORDER = [
    "hydrolats", "oils", "soaps", "tea", "honey", "bouquettes", "candles"
];

const SEEDLING_CATEGORY_ORDER = [
    "lavender-seedlings", "rose-seedlings", "ornamental-grasses",
    "conifer-seedlings", "shrub-seedlings", "perennial-flowers"
];


// ----------------------------
// ПЕРЕТВОРЕННЯ ТОВАРУ З БЕКЕНДУ У ФОРМАТ, ЯКИЙ ОЧІКУЄ СТАРА UI-ЛОГІКА
// ----------------------------

const toFrontendProduct = function (product, isFirstInCategory) {

    const priceLabel = isFirstInCategory
        ? `Від ${product.price} грн`
        : `${product.price} грн`;

    return {
        id: product.id,
        name: product.title,
        description: product.description || "",
        price: priceLabel,
        priceValue: Number(product.price),
        image: product.image_url || "",
        icon: product.icon_url || "",
        alt: product.title
    };
};


// ----------------------------
// ОДНА КАТЕГОРІЯ -> ВІДСОРТОВАНИЙ МАСИВ ТОВАРІВ У СТАРОМУ ФОРМАТІ
// ----------------------------

const getProductsForCategory = function (allProducts, categoryKey) {

    return allProducts
        .filter((product) => product.category === categoryKey)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((product, index) => toFrontendProduct(product, index === 0));
};


// ----------------------------
// ГРУПУВАННЯ ПЛОСКОГО СПИСКУ ТОВАРІВ У МАСИВИ ПО КАТЕГОРІЯХ
// (той самий формат, що раніше давав product-data.js: масив масивів,
//  де products[i] — це список товарів однієї категорії, відсортований)
// ----------------------------

const groupProductsByCategories = function (allProducts, categoryOrder) {

    return categoryOrder
        .map((categoryKey) => getProductsForCategory(allProducts, categoryKey))
        .filter((categoryItems) => categoryItems.length > 0);
};
