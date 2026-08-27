// ========================================
// API HELPERS
// ========================================
// Єдине місце, звідки фронтенд ходить у бекенд.
// Підключати ПІСЛЯ config.js.

const apiRequest = async function (path, options = {}) {

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        // сервер міг повернути порожнє тіло (напр. 500 без json) — не валимо все
    }

    if (!response.ok) {
        const message =
            (data && data.message) ||
            `Помилка сервера (${response.status})`;

        throw new Error(message);
    }

    return data;
};


// ----------------------------
// PUBLIC: ПРОДУКТИ
// ----------------------------

const fetchAllProducts = function () {
    return apiRequest("/products", { method: "GET" });
};


// ----------------------------
// PUBLIC: ЗАМОВЛЕННЯ / БРОНЮВАННЯ
// ----------------------------

const createOrder = function (payload) {
    return apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify(payload)
    });
};

const createBooking = function (payload) {
    return apiRequest("/booking", {
        method: "POST",
        body: JSON.stringify(payload)
    });
};


// ----------------------------
// ADMIN: АВТОРИЗАЦІЯ
// ----------------------------

const ADMIN_TOKEN_KEY = "wol_admin_token";

const adminLogin = function (name, password) {
    return apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ name, password })
    });
};

const getAdminToken = function () {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
};

const setAdminToken = function (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

const clearAdminToken = function () {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
};

const isAdminLoggedIn = function () {
    return Boolean(getAdminToken());
};


// ----------------------------
// ADMIN: ЗАХИЩЕНІ ЗАПИТИ
// ----------------------------

const adminRequest = function (path, options = {}) {
    const token = getAdminToken();

    return apiRequest(path, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
};

const adminGetOrders = function () {
    return adminRequest("/orders/admin", { method: "GET" });
};

const adminUpdateOrderStatus = function (orderId, statusPayload) {
    return adminRequest(`/orders/admin/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(statusPayload)
    });
};

const adminCreateProduct = function (payload) {
    return adminRequest("/products", {
        method: "POST",
        body: JSON.stringify(payload)
    });
};

const adminUpdateProduct = function (productId, payload) {
    return adminRequest(`/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    });
};

const adminDeleteProduct = function (productId) {
    return adminRequest(`/products/${productId}`, { method: "DELETE" });
};
