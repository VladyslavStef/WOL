// ========================================
// API HELPERS
// ========================================
// Єдине місце, звідки фронтенд ходить у бекенд.
// Підключати ПІСЛЯ config.js.

const apiRequest = async function (path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    // FIX (Етап 10): справжній мережевий збій (сервер недоступний, немає
    // інтернету) — fetch() кидає технічну помилку на кшталт "Failed to
    // fetch". Технічний текст лишається розробнику через console.error;
    // покупцю показуємо лише прапорець isNetworkError — саме його читає
    // toUserFriendlyErrorMessage() (user-message.js), щоб підставити
    // зрозумілий текст замість "Failed to fetch".
    console.error("Мережева помилка запиту до API:", path, networkError);

    const friendlyError = new Error("Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз.");
    friendlyError.isNetworkError = true;
    throw friendlyError;
  }

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    // сервер міг повернути порожнє тіло (напр. 500 без json) — не валимо все
  }

  if (!response.ok) {
    const message =
      (data && data.message) || `Помилка сервера (${response.status})`;

    const error = new Error(message);

    // FIX (catalog_enabled): переносимо додаткові поля відповіді
    // (наприклад, { catalogClosed: true } від POST /orders, коли бекенд
    // відхиляє замовлення через глобально вимкнений каталог) на сам
    // об'єкт помилки — щоб виклики (basket.js) могли розрізнити "каталог
    // закрито" від звичайної помилки без парсингу тексту повідомлення.
    if (data && typeof data === "object") {
      Object.assign(error, data);
    }

    throw error;
  }

  return data;
};

// ----------------------------
// PUBLIC: ПРОДУКТИ
// ----------------------------

const fetchAllProducts = function () {
  return apiRequest("/products", { method: "GET" });
};

const fetchCategoriesCatalogue = function () {
  return apiRequest("/categories", { method: "GET" });
};

const fetchAllCategories = function () {
  return apiRequest("/categories", { method: "GET" });
};

// ----------------------------
// PUBLIC: СТАН КАТАЛОГУ
// ----------------------------

const fetchCatalogStatus = function () {
  return apiRequest("/settings/catalog-status", { method: "GET" });
};

// ----------------------------
// PUBLIC: ЗАМОВЛЕННЯ / БРОНЮВАННЯ
// ----------------------------

const createOrder = function (payload) {
  return apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const createBooking = function (payload) {
  return apiRequest("/booking", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const fetchBusyDates = function (productId) {
  return apiRequest(`/booking/busy-dates?product_id=${productId}`, {
    method: "GET",
  });
};

// ----------------------------
// ADMIN: АВТОРИЗАЦІЯ
// ----------------------------

const ADMIN_TOKEN_KEY = "wol_admin_token";

const adminLogin = function (name, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ name, password }),
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
      ...(options.headers || {}),
    },
  });
};

const adminGetOrders = function () {
  return adminRequest("/orders/admin", { method: "GET" });
};

const adminUpdateOrderStatus = function (orderId, statusPayload) {
  return adminRequest(`/orders/admin/${orderId}`, {
    method: "PUT",
    body: JSON.stringify(statusPayload),
  });
};

const adminCreateProduct = function (payload) {
  return adminRequest("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const adminUpdateProduct = function (productId, payload) {
  return adminRequest(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

const adminDeleteProduct = function (productId) {
  return adminRequest(`/products/${productId}`, { method: "DELETE" });
};

// ----------------------------
// ADMIN: КАТЕГОРІЇ
// ----------------------------

const adminGetCategories = function () {
  return adminRequest("/categories/admin", { method: "GET" });
};

const adminCreateCategory = function (payload) {
  return adminRequest("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

const adminUpdateCategory = function (categoryId, payload) {
  return adminRequest(`/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

const adminDeleteCategory = function (categoryId) {
  return adminRequest(`/categories/${categoryId}`, { method: "DELETE" });
};

// ----------------------------
// ADMIN: БРОНЮВАННЯ
// ----------------------------

const adminGetBookings = function () {
  return adminRequest("/booking/admin", { method: "GET" });
};

const adminDeleteBooking = function (bookingId) {
  return adminRequest(`/booking/admin/${bookingId}`, { method: "DELETE" });
};

const adminGetProducts = function () {
  return adminRequest("/products/admin", { method: "GET" });
};

// ----------------------------
// ADMIN: СТАН КАТАЛОГУ
// ----------------------------

const adminGetCatalogStatus = function () {
  return apiRequest("/settings/catalog-status", { method: "GET" });
};

const adminUpdateCatalogStatus = function (catalogEnabled) {
  return adminRequest("/settings/catalog-status", {
    method: "PUT",
    body: JSON.stringify({ catalog_enabled: catalogEnabled }),
  });
};
