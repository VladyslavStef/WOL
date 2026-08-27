// ========================================
// DOM
// ========================================

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const logoutButton = document.getElementById("logoutButton");

const tabs = document.querySelectorAll(".admin-tab");
const productsPanel = document.getElementById("productsPanel");
const ordersPanel = document.getElementById("ordersPanel");

const createProductForm = document.getElementById("createProductForm");
const createProductError = document.getElementById("createProductError");
const refreshProductsButton = document.getElementById("refreshProductsButton");
const productsTableBody = document.getElementById("productsTableBody");

const refreshOrdersButton = document.getElementById("refreshOrdersButton");
const ordersTableBody = document.getElementById("ordersTableBody");

let editingProductId = null;


// ========================================
// VIEW SWITCHING
// ========================================

const showDashboard = function () {
    loginView.classList.add("is-hidden");
    dashboardView.classList.remove("is-hidden");

    loadProducts();
    loadOrders();
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

        productsPanel.classList.toggle("is-active", target === "products");
        ordersPanel.classList.toggle("is-active", target === "orders");
    });
});


// ========================================
// PRODUCTS
// ========================================

const renderProductsTable = function (products) {

    productsTableBody.innerHTML = "";

    products.forEach((product) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td>${product.category || "—"}</td>
            <td>${product.display_group || "—"}</td>
            <td>${product.price} грн</td>
            <td>${product.stock === null ? "—" : product.stock}</td>
            <td>${product.is_active ? "так" : "ні"}</td>
            <td>
                <button type="button" class="admin-btn-edit" data-id="${product.id}">Редагувати</button>
                <button type="button" class="admin-btn-delete" data-id="${product.id}">Видалити</button>
            </td>
        `;

        row.querySelector(".admin-btn-edit").addEventListener("click", () => {
            fillFormForEdit(product);
        });

        row.querySelector(".admin-btn-delete").addEventListener("click", async () => {

            if (!confirm(`Видалити товар "${product.title}"?`)) {
                return;
            }

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
        const response = await fetchAllProducts();
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
    createProductForm.category.value = product.category || "";
    createProductForm.display_group.value = product.display_group || "products";
    createProductForm.product_type.value = product.product_type || "physical";
    createProductForm.pricing_mode.value = product.pricing_mode || "";
    createProductForm.stock.value = product.stock ?? "";
    createProductForm.sort_order.value = product.sort_order ?? 0;
    createProductForm.image_url.value = product.image_url || "";
    createProductForm.icon_url.value = product.icon_url || "";
    createProductForm.is_active.checked = Boolean(product.is_active);

    createProductForm.querySelector("button[type=submit]").textContent =
        "Зберегти зміни";

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
        category: formData.get("category") || null,
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
// INIT
// ========================================

if (isAdminLoggedIn()) {
    showDashboard();
} else {
    showLogin();
}
