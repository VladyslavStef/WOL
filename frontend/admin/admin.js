// ========================================
// DOM
// ========================================

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const logoutButton = document.getElementById("logoutButton");

const tabs = document.querySelectorAll(".admin-tab");
const categoriesPanel = document.getElementById("categoriesPanel");
const productsPanel = document.getElementById("productsPanel");
const ordersPanel = document.getElementById("ordersPanel");
const bookingsPanel = document.getElementById("bookingsPanel");

const createCategoryForm = document.getElementById("createCategoryForm");
const createCategoryError = document.getElementById("createCategoryError");
const refreshCategoriesButton = document.getElementById("refreshCategoriesButton");
const categoriesTableBody = document.getElementById("categoriesTableBody");

const createProductForm = document.getElementById("createProductForm");
const createProductError = document.getElementById("createProductError");
const refreshProductsButton = document.getElementById("refreshProductsButton");
const productsTableBody = document.getElementById("productsTableBody");
const productCategorySelect = document.getElementById("productCategorySelect");

const refreshOrdersButton = document.getElementById("refreshOrdersButton");
const ordersTableBody = document.getElementById("ordersTableBody");

const refreshBookingsButton = document.getElementById("refreshBookingsButton");
const bookingsTableBody = document.getElementById("bookingsTableBody");

let editingProductId = null;
let editingCategoryId = null;

// Кешований останній список категорій — щоб не тягнути з бекенду щоразу
// при відкритті форми товару, і щоб select завжди відображав актуальний стан
let cachedCategories = [];


// ========================================
// VIEW SWITCHING
// ========================================

const showDashboard = async function () {
    loginView.classList.add("is-hidden");
    dashboardView.classList.remove("is-hidden");

    // Категорії мають завантажитись ПЕРШИМИ — і для таблиці категорій,
    // і для select у формі товару, і щоб таблиця товарів одразу показувала
    // назву категорії, а не "без категорії" до довантаження.
    loadCategories();
    loadProducts();
    loadOrders();
    loadBookings();
};

const showLogin = function () {
    dashboardView.classList.add("is-hidden");
    loginView.classList.remove("is-hidden");
};


// ========================================
// LOGIN / LOGOUT
// ========================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    loginError.textContent = "";

    const formData = new FormData(loginForm);
    const name = formData.get("name");
    const password = formData.get("password");

    try {
        const result = await adminLogin(name, password);
        setAdminToken(result.token);
        showDashboard();

    } catch (error) {
        loginError.textContent = error.message;
    }
});

logoutButton.addEventListener("click", () => {
    clearAdminToken();
    showLogin();
});


// ========================================
// TABS
// ========================================

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {

        tabs.forEach((item) => item.classList.remove("is-active"));
        tab.classList.add("is-active");

        const target = tab.dataset.tab;

        categoriesPanel.classList.toggle("is-active", target === "categories");
        productsPanel.classList.toggle("is-active", target === "products");
        ordersPanel.classList.toggle("is-active", target === "orders");
        bookingsPanel.classList.toggle("is-active", target === "bookings");
    });
});


// ========================================
// CATEGORIES
// ========================================

const populateCategorySelect = function () {
    const select = document.getElementById("categorySelect");
    select.innerHTML = categoriesCache
        .map((c) => `<option value="${c.id}">${c.name} (${c.displayGroup})</option>`)
        .join("");
};

const renderCategoriesTable = function (categories) {
    const body = document.getElementById("categoriesTableBody");
    body.innerHTML = "";
    categories.forEach((c) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${c.id}</td><td>${c.name}</td><td>${c.slug}</td>
            <td>${c.displayGroup}</td><td>${c.isActive ? "так" : "ні"}</td>
            <td><button type="button" class="admin-btn-delete" data-id="${c.id}">Видалити</button></td>
        `;
        row.querySelector(".admin-btn-delete").addEventListener("click", async () => {
            if (!confirm(`Видалити категорію "${c.name}"?`)) return;
            try {
                await adminDeleteCategory(c.id);
                loadCategories();
            } catch (error) {
                alert(`Не вдалося видалити: ${error.message}`);
            }
        });
        body.append(row);
    });
};

const loadCategories = async function () {
    try {
        const response = await adminGetCategories();
        categoriesCache = response.data || [];
        populateCategorySelect();
        renderCategoriesTable(categoriesCache);
    } catch (error) {
        console.error("Не вдалося завантажити категорії:", error.message);
    }
};

const fillCategoryFormForEdit = function (category) {

    editingCategoryId = category.id;

    createCategoryForm.name.value = category.name || "";
    createCategoryForm.slug.value = category.slug || "";
    createCategoryForm.description.value = category.description || "";
    createCategoryForm.price_label.value = category.price_label || "";
    createCategoryForm.alt.value = category.alt || "";
    createCategoryForm.display_group.value = category.display_group || "products";
    createCategoryForm.sort_order.value = category.sort_order ?? 0;
    createCategoryForm.image_url.value = category.image_url || "";
    createCategoryForm.icon_url.value = category.icon_url || "";
    createCategoryForm.is_active.checked = Boolean(category.is_active);

    createCategoryForm.querySelector("button[type=submit]").textContent =
        "Зберегти зміни";

    createCategoryForm.closest("details").open = true;
    createCategoryForm.scrollIntoView({ behavior: "smooth" });
};

const resetCategoryForm = function () {

    editingCategoryId = null;
    createCategoryForm.reset();
    createCategoryForm.querySelector("button[type=submit]").textContent =
        "Створити категорію";
};

const buildCategoryPayload = function (formData) {

    return {
        name: formData.get("name"),
        slug: formData.get("slug") || undefined,
        description: formData.get("description") || null,
        price_label: formData.get("price_label") || null,
        alt: formData.get("alt") || null,
        display_group: formData.get("display_group"),
        sort_order: Number(formData.get("sort_order") || 0),
        image_url: formData.get("image_url") || null,
        icon_url: formData.get("icon_url") || null,
        is_active: formData.get("is_active") === "on"
    };
};

document.getElementById("createCategoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorSpan = document.getElementById("createCategoryError");
    errorSpan.textContent = "";
    const formData = new FormData(event.target);
    const payload = {
        name: formData.get("name"),
        description: formData.get("description") || null,
        price_label: formData.get("price_label") || null,
        display_group: formData.get("display_group"),
        sort_order: Number(formData.get("sort_order") || 0),
        image_url: formData.get("image_url") || null,
        icon_url: formData.get("icon_url") || null,
        is_active: formData.get("is_active") === "on"
    };
    try {
        await adminCreateCategory(payload);
        event.target.reset();
        loadCategories();
    } catch (error) {
        errorSpan.textContent = error.message;
    }
});

document.getElementById("refreshCategoriesButton").addEventListener("click", loadCategories);

// ========================================
// PRODUCTS
// ========================================

const getCategoryNameById = function (categoryId) {

    const category = cachedCategories.find((item) => item.id === categoryId);
    return category ? category.name : "— без категорії —";
};

const renderProductsTable = function (products) {
    productsTableBody.innerHTML = "";
    products.forEach((product) => {
        const categoryName = categoriesCache.find((c) => c.id === product.categoryId)?.name || "—";
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td>${categoryName}</td>
            <td>${product.displayGroup || "—"}</td>
            <td>${product.price} грн</td>
            <td>${product.stock === null ? "—" : product.stock}</td>
            <td>${product.isActive ? "так" : "ні"}</td>
            <td>
                <button type="button" class="admin-btn-edit" data-id="${product.id}">Редагувати</button>
                <button type="button" class="admin-btn-delete" data-id="${product.id}">Видалити</button>
            </td>
        `;
        row.querySelector(".admin-btn-edit").addEventListener("click", () => fillFormForEdit(product));
        row.querySelector(".admin-btn-delete").addEventListener("click", async () => {
            if (!confirm(`Видалити товар "${product.title}"?`)) return;
            try {
                await adminDeleteProduct(product.id);
                loadProducts();
            } catch (error) {
                alert(`Не вдалося видалити товар: ${error.message}`);
            }
        });
        productsTableBody.append(row);
    });
};

const loadProducts = async function () {
    productsTableBody.innerHTML = `<tr><td colspan="8">Завантаження...</td></tr>`;
    try {
        const response = await adminGetProducts(); // FIX: не публічний fetchAllProducts
        renderProductsTable(response.data || []);
    } catch (error) {
        productsTableBody.innerHTML = `<tr><td colspan="8">Помилка: ${error.message}</td></tr>`;
    }
};

const fillFormForEdit = function (product) {
    editingProductId = product.id;
    createProductForm.title.value = product.title || "";
    createProductForm.description.value = product.description || "";
    createProductForm.price.value = product.price || "";
    createProductForm.category_id.value = product.categoryId || "";
    createProductForm.display_group.value = product.displayGroup || "products";
    createProductForm.product_type.value = product.productType || "physical";
    createProductForm.pricing_mode.value = product.pricingMode || "";
    createProductForm.stock.value = product.stock ?? "";
    createProductForm.sort_order.value = product.sortOrder ?? 0;
    createProductForm.image_url.value = product.image || "";
    createProductForm.icon_url.value = product.icon || "";
    createProductForm.is_active.checked = Boolean(product.isActive);
    createProductForm.querySelector("button[type=submit]").textContent = "Зберегти зміни";
    createProductForm.closest("details").open = true;
    createProductForm.scrollIntoView({ behavior: "smooth" });
};

const resetProductForm = function () {

    editingProductId = null;
    createProductForm.reset();
    createProductForm.querySelector("button[type=submit]").textContent =
        "Створити товар";
};

const buildProductPayload = function (formData) {
    const pricingMode = formData.get("pricing_mode");
    return {
        title: formData.get("title"),
        description: formData.get("description") || null,
        price: Number(formData.get("price")),
        category_id: formData.get("category_id") || null,
        display_group: formData.get("display_group"),
        product_type: formData.get("product_type"),
        pricing_mode: pricingMode ? pricingMode : null,
        stock: formData.get("stock") ? Number(formData.get("stock")) : null,
        sort_order: Number(formData.get("sort_order") || 0),
        image_url: formData.get("image_url") || null,
        icon_url: formData.get("icon_url") || null,
        is_active: formData.get("is_active") === "on"
    };
};

createProductForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    createProductError.textContent = "";

    const formData = new FormData(createProductForm);
    const payload = buildProductPayload(formData);

    try {

        if (editingProductId) {
            await adminUpdateProduct(editingProductId, payload);
        } else {
            await adminCreateProduct(payload);
        }

        resetProductForm();
        loadProducts();

    } catch (error) {
        createProductError.textContent = error.message;
    }
});

refreshProductsButton.addEventListener("click", loadProducts);


// ========================================
// ORDERS
// ========================================

const ORDER_STATUSES = ["new", "processing", "confirmed", "completed", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"];

const buildStatusSelect = function (options, currentValue) {

    return options
        .map((option) => `<option value="${option}" ${option === currentValue ? "selected" : ""}>${option}</option>`)
        .join("");
};

const renderOrdersTable = function (orders) {

    ordersTableBody.innerHTML = "";

    orders.forEach((order) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.order_code}</td>
            <td>${order.customer_name}</td>
            <td>${order.customer_phone}</td>
            <td>${order.total_price} грн</td>
            <td><select class="status-select">${buildStatusSelect(ORDER_STATUSES, order.status)}</select></td>
            <td><select class="payment-select">${buildStatusSelect(PAYMENT_STATUSES, order.payment_status)}</select></td>
            <td><button type="button" class="admin-btn-edit save-status">Зберегти</button></td>
        `;

        row.querySelector(".save-status").addEventListener("click", async () => {

            const status = row.querySelector(".status-select").value;
            const payment_status = row.querySelector(".payment-select").value;

            try {
                await adminUpdateOrderStatus(order.id, { status, payment_status });
                alert("Статус оновлено");
            } catch (error) {
                alert(`Не вдалося оновити статус: ${error.message}`);
            }
        });

        ordersTableBody.append(row);
    });
};

const loadOrders = async function () {

    ordersTableBody.innerHTML = `<tr><td colspan="8">Завантаження...</td></tr>`;

    try {
        const response = await adminGetOrders();
        renderOrdersTable(response.data || []);

    } catch (error) {
        ordersTableBody.innerHTML = `<tr><td colspan="8">Помилка: ${error.message}</td></tr>`;
    }
};

refreshOrdersButton.addEventListener("click", loadOrders);


// ========================================
// BOOKINGS
// ========================================

const formatBookingTimes = function (times) {

    if (!times || times.length === 0) {
        return "—";
    }

    return times
        .map((slot) => `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`)
        .join(", ");
};

const formatBookingDateShort = function (dateString) {

    const date = new Date(dateString);
    return date.toLocaleDateString("uk-UA");
};

const renderBookingsTable = function (bookings) {

    bookingsTableBody.innerHTML = "";

    if (bookings.length === 0) {
        bookingsTableBody.innerHTML = `<tr><td colspan="11">Бронювань немає.</td></tr>`;
        return;
    }

    bookings.forEach((booking) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${booking.id}</td>
            <td>${booking.booking_code}</td>
            <td>${booking.customer_name}</td>
            <td>${booking.customer_phone}</td>
            <td>${booking.product_title}</td>
            <td>${formatBookingDateShort(booking.booking_date)}</td>
            <td>${formatBookingTimes(booking.times)}</td>
            <td>${booking.visitors}</td>
            <td>${booking.total_price} грн</td>
            <td>${booking.status}</td>
            <td><button type="button" class="admin-btn-delete">Видалити</button></td>
        `;

        row.querySelector(".admin-btn-delete").addEventListener("click", async () => {

            if (!confirm(`Видалити бронювання "${booking.booking_code}"? Цю дію не можна скасувати.`)) {
                return;
            }

            try {
                await adminDeleteBooking(booking.id);
                loadBookings();
            } catch (error) {
                alert(`Не вдалося видалити бронювання: ${error.message}`);
            }
        });

        bookingsTableBody.append(row);
    });
};

const loadBookings = async function () {

    bookingsTableBody.innerHTML = `<tr><td colspan="11">Завантаження...</td></tr>`;

    try {
        const response = await adminGetBookings();
        renderBookingsTable(response.data || []);

    } catch (error) {
        bookingsTableBody.innerHTML = `<tr><td colspan="11">Помилка: ${error.message}</td></tr>`;
    }
};

refreshBookingsButton.addEventListener("click", loadBookings);


// ========================================
// INIT
// ========================================

if (isAdminLoggedIn()) {
    showDashboard();
} else {
    showLogin();
}
