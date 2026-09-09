// ========================================
// DOM: базові в'юхи
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

// ========================================
// DOM: стан каталогу + dashboard-статистика
// ========================================

const catalogStatusLabel = document.getElementById("catalogStatusLabel");
const toggleCatalogButton = document.getElementById("toggleCatalogButton");

const statOutOfStock = document.getElementById("statOutOfStock");
const statLowStock = document.getElementById("statLowStock");
const statNewOrders = document.getElementById("statNewOrders");
const statUpcomingBookings = document.getElementById("statUpcomingBookings");

// ========================================
// DOM: категорії
// ========================================

const categoryFormBox = document.getElementById("categoryFormBox");
const categoryFormSummary = document.getElementById("categoryFormSummary");
const categoryEditingBanner = document.getElementById("categoryEditingBanner");
const categoryEditingName = document.getElementById("categoryEditingName");
const cancelCategoryEditButton = document.getElementById("cancelCategoryEditButton");

const createCategoryForm = document.getElementById("createCategoryForm");
const createCategoryError = document.getElementById("createCategoryError");
const createCategorySubmitButton = document.getElementById("createCategorySubmitButton");
const refreshCategoriesButton = document.getElementById("refreshCategoriesButton");
const categoriesTableBody = document.getElementById("categoriesTableBody");

// ========================================
// DOM: товари
// ========================================

const productFormBox = document.getElementById("productFormBox");
const productFormSummary = document.getElementById("productFormSummary");
const productEditingBanner = document.getElementById("productEditingBanner");
const productEditingName = document.getElementById("productEditingName");
const cancelProductEditButton = document.getElementById("cancelProductEditButton");

const createProductForm = document.getElementById("createProductForm");
const createProductError = document.getElementById("createProductError");
const createProductSubmitButton = document.getElementById("createProductSubmitButton");
const refreshProductsButton = document.getElementById("refreshProductsButton");
const productsTableBody = document.getElementById("productsTableBody");
const productSearchInput = document.getElementById("productSearchInput");

// ========================================
// DOM: замовлення / бронювання
// ========================================

const refreshOrdersButton = document.getElementById("refreshOrdersButton");
const ordersTableBody = document.getElementById("ordersTableBody");

const refreshBookingsButton = document.getElementById("refreshBookingsButton");
const bookingsTableBody = document.getElementById("bookingsTableBody");

// ========================================
// СТАН (єдині кеші — без дублювання джерела даних)
// ========================================

let editingProductId = null;
let editingCategoryId = null;

let categoriesCache = [];
let productsCache = [];
let ordersCache = [];
let bookingsCache = [];

let currentCatalogEnabled = null;

const productsSortState = { column: null, direction: "asc" };

// ========================================
// ДРІБНІ ХЕЛПЕРИ
// ========================================

// Захист від зламаної розмітки/XSS, якщо назва товару чи ім'я клієнта
// містить символи на кшталт < > & " — рендеримо через innerHTML у таблицях.
const escapeHtml = function (value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
};

// Прев'ю зображення за URL: показуємо, якщо URL непорожній і реально
// завантажується; ховаємо, якщо порожньо або посилання бите.
const wireImagePreview = function (inputEl, previewEl) {
    const update = function () {
        const url = inputEl.value.trim();
        if (!url) {
            previewEl.classList.add("is-hidden");
            previewEl.removeAttribute("src");
            return;
        }
        previewEl.src = url;
        previewEl.classList.remove("is-hidden");
    };

    previewEl.addEventListener("error", () => {
        previewEl.classList.add("is-hidden");
    });

    inputEl.addEventListener("input", update);

    return update; // можна викликати вручну (напр. після fillFormForEdit)
};

const updateCategoryImagePreview = wireImagePreview(
    document.getElementById("categoryImageUrlInput"),
    document.getElementById("categoryImagePreview")
);

const updateProductImagePreview = wireImagePreview(
    document.getElementById("productImageUrlInput"),
    document.getElementById("productImagePreview")
);


// ========================================
// ПІДТВЕРДЖЕННЯ ДЕСТРУКТИВНИХ ДІЙ (Пункт 5)
// ========================================
// Заміна browser confirm() для адмінки. Той самий каркас .modal/
// .modal__container/.modal__close/is-open, що й скрізь на сайті (у т.ч.
// user-message.js) — друга незалежна modal-система тут НЕ створюється.
// Розмітка вже є в admin.html (#confirmModal) — тут лише поведінка.

const confirmModal = document.getElementById("confirmModal");
const confirmModalTitleEl = confirmModal.querySelector(".confirm-modal__title");
const confirmModalMessageEl = confirmModal.querySelector(".confirm-modal__message");
const confirmModalCancelButton = confirmModal.querySelector(".confirm-modal__cancel");
const confirmModalConfirmButton = confirmModal.querySelector(".confirm-modal__confirm");
const confirmModalCloseButton = confirmModal.querySelector(".confirm-modal__close");

let pendingConfirmAction = null;
let isConfirmModalBusy = false; // захист від подвійного кліку "Підтвердити"

const closeConfirmModal = function () {
    confirmModal.classList.remove("is-open");
    confirmModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    pendingConfirmAction = null;
    isConfirmModalBusy = false;
    confirmModalConfirmButton.disabled = false;
};

// showConfirmModal({ title, message, confirmText, cancelText, onConfirm })
// onConfirm сам відповідає за виклик closeConfirmModal() у своєму
// try/catch/finally — так виклики можуть показати проміжний стан
// ("Видаляємо...") і коректно обробити помилку, не закриваючи модалку
// завчасно. Cancel/Escape/клік-повз/хрестик НІКОЛИ не викликають дію.
const showConfirmModal = function ({ title, message, confirmText = "Підтвердити", cancelText = "Скасувати", onConfirm }) {

    // Гігієна модалок: не накладати overlay поверх overlay, якщо раптом
    // відкрите інше вікно сайту.
    document.querySelectorAll(".modal.is-open").forEach((modal) => {
        if (modal !== confirmModal) {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
        }
    });

    confirmModalTitleEl.textContent = title || "Підтвердіть дію";
    confirmModalMessageEl.textContent = message || "";
    confirmModalConfirmButton.textContent = confirmText;
    confirmModalCancelButton.textContent = cancelText;
    confirmModalConfirmButton.disabled = false;

    pendingConfirmAction = onConfirm;
    isConfirmModalBusy = false;

    confirmModal.classList.add("is-open");
    confirmModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    confirmModalCancelButton.focus();
};

confirmModalCancelButton.addEventListener("click", closeConfirmModal);
confirmModalCloseButton.addEventListener("click", closeConfirmModal);

confirmModal.addEventListener("click", (event) => {
    if (event.target === confirmModal) {
        closeConfirmModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && confirmModal.classList.contains("is-open")) {
        closeConfirmModal();
    }
});

confirmModalConfirmButton.addEventListener("click", async () => {
    if (isConfirmModalBusy) return; // захист від подвійного кліку
    if (typeof pendingConfirmAction !== "function") return;

    isConfirmModalBusy = true;
    confirmModalConfirmButton.disabled = true;

    await pendingConfirmAction();

    // Якщо onConfirm уже викликав closeConfirmModal() у своєму
    // try/catch (типовий випадок) — це просто ще раз безпечно скидає той
    // самий стан. Якщо ні — це запасний варіант, щоб кнопка не лишилась
    // заблокованою назавжди.
    isConfirmModalBusy = false;
    confirmModalConfirmButton.disabled = false;
});


// ========================================
// VIEW SWITCHING
// ========================================

const showDashboard = async function () {
    loginView.classList.add("is-hidden");
    dashboardView.classList.remove("is-hidden");

    loadCatalogStatus();
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
// FIX (Пункт 4 — loading states): кнопка входу тепер явно показує
// "Входимо..." і блокується на час запиту, щоб не можна було натиснути
// двічі. Помилка лишається у вже наявному inline-полі loginError
// (окремої модалки тут не потрібно — це вже коректний, невеликий
// user-friendly текст).

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    loginError.textContent = "";

    const formData = new FormData(loginForm);
    const name = formData.get("name");
    const password = formData.get("password");

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Входимо...";

    try {
        const result = await adminLogin(name, password);
        setAdminToken(result.token);
        showDashboard();

    } catch (error) {
        console.error("Помилка входу:", error);
        loginError.textContent = toUserFriendlyErrorMessage(error, "Не вдалося увійти. Перевірте логін і пароль.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
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
// СТАН КАТАЛОГУ (сезонне вимкнення)
// ========================================
// Не є частиною пунктів 2–8, але розмітка вже присутня на сторінці —
// без цієї логіки перемикач був би "мертвою" кнопкою.

const renderCatalogStatus = function () {
    if (currentCatalogEnabled === null) {
        catalogStatusLabel.textContent = "Завантаження...";
        return;
    }
    catalogStatusLabel.textContent = currentCatalogEnabled
        ? " Каталог відкритий"
        : " Каталог вимкнений";
    toggleCatalogButton.textContent = currentCatalogEnabled
        ? "Вимкнути каталог"
        : "Увімкнути каталог";
};

const loadCatalogStatus = async function () {
    try {
        const response = await adminGetCatalogStatus();
        currentCatalogEnabled = Boolean(response.catalogEnabled);
        renderCatalogStatus();
    } catch (error) {
        console.error("Не вдалося завантажити стан каталогу:", error);
        catalogStatusLabel.textContent = "Помилка завантаження статусу";
    }
};

const applyCatalogStatusChange = async function (nextValue) {
    toggleCatalogButton.disabled = true;

    try {
        const response = await adminUpdateCatalogStatus(nextValue);
        currentCatalogEnabled = Boolean(response.catalogEnabled);
        renderCatalogStatus();

        showUserMessage({
            type: "success",
            message: currentCatalogEnabled
                ? "Каталог увімкнено. Відвідувачі знову бачать товари."
                : "Каталог вимкнено. Відвідувачі бачать повідомлення про сезонну перерву."
        });
    } catch (error) {
        console.error("Не вдалося змінити стан каталогу:", error);
        showUserMessage({
            type: "error",
            message: toUserFriendlyErrorMessage(error, "Не вдалося змінити стан каталогу. Спробуйте ще раз.")
        });
    } finally {
        toggleCatalogButton.disabled = false;
    }
};

toggleCatalogButton.addEventListener("click", () => {
    if (currentCatalogEnabled === null) return;

    const nextValue = !currentCatalogEnabled;

    if (!nextValue) {
        // Вимкнення каталогу впливає на відвідувачів — просимо підтвердження.
        showConfirmModal({
            title: "Вимкнути каталог для відвідувачів?",
            message: "Після цього відвідувачі не зможуть переглядати каталог — замість нього вони побачать повідомлення «Лаванда спить, завітайте пізніше».",
            confirmText: "Вимкнути каталог",
            cancelText: "Скасувати",
            onConfirm: async () => {
                closeConfirmModal();
                await applyCatalogStatusChange(false);
            }
        });
    } else {
        // Увімкнення — миттєво, без зайвих кроків.
        applyCatalogStatusChange(true);
    }
});


// ========================================
// DASHBOARD-СТАТИСТИКА
// ========================================
// Рахується з уже завантажених кешів — без додаткових API-запитів.

const updateDashboardStats = function () {

    const outOfStock = productsCache.filter((p) =>
        p.productType === "physical" && (p.stock === null || p.stock <= 0)
    ).length;

    const lowStock = productsCache.filter((p) => p.isLowStock).length;

    const newOrders = ordersCache.filter((o) => o.status === "new").length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingBookings = bookingsCache.filter((b) => {
        if (b.status === "cancelled") return false;
        const bookingDate = new Date(b.booking_date);
        return bookingDate >= today;
    }).length;

    statOutOfStock.textContent = outOfStock;
    statLowStock.textContent = lowStock;
    statNewOrders.textContent = newOrders;
    statUpcomingBookings.textContent = upcomingBookings;
};


// ========================================
// КАТЕГОРІЇ (Пункт 2)
// ========================================

const populateCategorySelect = function () {
    const select = document.getElementById("categorySelect");
    const previousValue = select.value;

    const dynamicOptions = categoriesCache
        .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.displayGroup === "seedlings" ? " (саджанці)" : ""}</option>`)
        .join("");

    select.innerHTML = `
        <option value="" disabled>— Оберіть категорію —</option>
        <option value="none">— без категорії —</option>
        ${dynamicOptions}
    `;

    // Не скидаємо вибір користувача, якщо категорії оновились "під
    // капотом" (напр. хтось натиснув "Оновити список" деінде, поки форма
    // товару вже відкрита з обраним значенням).
    if (previousValue && Array.from(select.options).some((option) => option.value === previousValue)) {
        select.value = previousValue;
    }
};

const renderCategoriesTable = function (categories) {
    categoriesTableBody.innerHTML = "";

    if (categories.length === 0) {
        categoriesTableBody.innerHTML = `<tr><td colspan="7">Категорій ще немає. Додайте першу вище.</td></tr>`;
        return;
    }

    categories.forEach((c) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${c.id}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.slug)}</td>
            <td>${c.displayGroup === "seedlings" ? "Саджанці" : "Товари"}</td>
            <td>${c.sortOrder}</td>
            <td>${c.isActive ? "так" : "ні"}</td>
            <td>
                <button type="button" class="admin-btn-edit">Редагувати</button>
                <button type="button" class="admin-btn-delete">Видалити</button>
            </td>
        `;

        row.querySelector(".admin-btn-edit").addEventListener("click", () => {
            fillCategoryFormForEdit(c);
        });

        row.querySelector(".admin-btn-delete").addEventListener("click", () => {
            showConfirmModal({
                title: "Видалити категорію?",
                message: `Категорію "${c.name}" буде видалено. Товари цієї категорії НЕ видаляються — вони залишаться без категорії.`,
                confirmText: "Видалити",
                cancelText: "Скасувати",
                onConfirm: async () => {
                    confirmModalConfirmButton.textContent = "Видаляємо...";
                    try {
                        await adminDeleteCategory(c.id);
                        closeConfirmModal();
                        showUserMessage({ type: "success", message: `Категорію "${c.name}" видалено.` });
                        loadCategories();
                        loadProducts(); // товари могли втратити категорію — оновлюємо і їх список теж
                    } catch (error) {
                        closeConfirmModal();
                        console.error("Не вдалося видалити категорію:", error);
                        showUserMessage({
                            type: "error",
                            message: toUserFriendlyErrorMessage(error, "Не вдалося видалити категорію. Спробуйте ще раз.")
                        });
                    }
                }
            });
        });

        categoriesTableBody.append(row);
    });
};

const loadCategories = async function () {
    categoriesTableBody.innerHTML = `<tr><td colspan="7">Завантаження...</td></tr>`;
    try {
        const response = await adminGetCategories();
        categoriesCache = response.data || [];
        populateCategorySelect();
        renderCategoriesTable(categoriesCache);
    } catch (error) {
        console.error("Не вдалося завантажити категорії:", error);
        categoriesTableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(toUserFriendlyErrorMessage(error, "Не вдалося завантажити категорії."))}</td></tr>`;
    }
};

// FIX (Пункт 2): раніше ця функція існувала, але ніде не викликалась —
// кнопки "Редагувати" в таблиці категорій не було взагалі.
const fillCategoryFormForEdit = function (category) {

    editingCategoryId = category.id;

    createCategoryForm.name.value = category.name || "";
    createCategoryForm.slug.value = category.slug || "";
    createCategoryForm.description.value = category.description || "";
    createCategoryForm.price_label.value = category.priceLabel || "";
    createCategoryForm.alt.value = category.alt || "";
    createCategoryForm.display_group.value = category.displayGroup || "products";
    createCategoryForm.sort_order.value = category.sortOrder ?? 0;
    createCategoryForm.image_url.value = category.image || "";
    createCategoryForm.icon_url.value = category.icon || "";
    createCategoryForm.is_active.checked = Boolean(category.isActive);

    updateCategoryImagePreview();

    categoryEditingBanner.classList.remove("is-hidden");
    categoryEditingName.textContent = category.name;
    categoryFormSummary.textContent = "Редагування категорії";
    createCategorySubmitButton.textContent = "Зберегти зміни";

    categoryFormBox.open = true;
    createCategoryForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

const resetCategoryForm = function () {

    editingCategoryId = null;
    createCategoryForm.reset();
    updateCategoryImagePreview();

    categoryEditingBanner.classList.add("is-hidden");
    categoryFormSummary.textContent = "+ Додати категорію";
    createCategorySubmitButton.textContent = "Створити категорію";
    createCategoryError.textContent = "";
};

cancelCategoryEditButton.addEventListener("click", () => {
    resetCategoryForm();
});

// FIX (Пункт 2 — "не дублюй form handler"): один payload-білдер для
// СТВОРЕННЯ і РЕДАГУВАННЯ. Раніше поля slug/alt узагалі не потрапляли в
// запит створення (payload збирався вручну без них) — тепер обидва
// сценарії йдуть через ту саму функцію, тож поля завжди узгоджені.
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

createCategoryForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    createCategoryError.textContent = "";

    const formData = new FormData(createCategoryForm);
    const payload = buildCategoryPayload(formData);

    if (!payload.name || !payload.name.trim()) {
        createCategoryError.textContent = "Введіть назву категорії";
        return;
    }

    const isEditing = Boolean(editingCategoryId);

    createCategorySubmitButton.disabled = true;
    createCategorySubmitButton.textContent = "Зберігаємо...";

    try {
        if (isEditing) {
            await adminUpdateCategory(editingCategoryId, payload);
        } else {
            await adminCreateCategory(payload);
        }

        showUserMessage({
            type: "success",
            message: isEditing ? "Зміни в категорії збережено." : "Категорію створено."
        });

        resetCategoryForm();
        loadCategories();

    } catch (error) {
        console.error("Помилка збереження категорії:", error);
        createCategoryError.textContent = toUserFriendlyErrorMessage(error, "Не вдалося зберегти категорію. Спробуйте ще раз.");
    } finally {
        createCategorySubmitButton.disabled = false;
        // editingCategoryId вже null, якщо успіх (resetCategoryForm() відпрацював) —
        // тому напис коректний в обох випадках (успіх/помилка).
        createCategorySubmitButton.textContent = editingCategoryId ? "Зберегти зміни" : "Створити категорію";
    }
});

refreshCategoriesButton.addEventListener("click", loadCategories);


// ========================================
// ТОВАРИ (Пункти 3, 6, 7, 8 + low-stock)
// ========================================

const getCategoryNameById = function (categoryId) {
    if (categoryId === null || categoryId === undefined) {
        return "— без категорії —";
    }
    const category = categoriesCache.find((c) => c.id === categoryId);
    return category ? category.name : "— без категорії —";
};

// Пункт "Low stock у таблиці": використовує isLowStock, який бекенд уже
// рахує сам (config/stock.js → LOW_STOCK_THRESHOLD) — поріг тут ніде не
// продубльований, лише читається готовий прапорець.
const stockCellContent = function (product) {
    if (product.productType !== "physical") {
        return (product.stock === null || product.stock === undefined) ? "—" : product.stock;
    }
    if (product.stock === null || product.stock <= 0) {
        return `<span class="admin-badge admin-badge--danger">Немає в наявності</span>`;
    }
    if (product.isLowStock) {
        return `${product.stock} <span class="admin-badge admin-badge--warning">Залишилось мало</span>`;
    }
    return product.stock;
};

const renderProductsTable = function (products) {
    productsTableBody.innerHTML = "";

    if (products.length === 0) {
        const emptyText = productSearchInput.value.trim()
            ? "Нічого не знайдено за цим пошуком."
            : "Товарів ще немає. Додайте перший вище.";
        productsTableBody.innerHTML = `<tr><td colspan="8">${emptyText}</td></tr>`;
        return;
    }

    products.forEach((product) => {
        const categoryName = getCategoryNameById(product.categoryId);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${escapeHtml(product.title)}</td>
            <td>${escapeHtml(categoryName)}</td>
            <td>${product.displayGroup === "seedlings" ? "Саджанці" : "Товари"}</td>
            <td>${Number(product.price).toFixed(2)} грн</td>
            <td>${stockCellContent(product)}</td>
            <td>${product.isActive ? "так" : "ні"}</td>
            <td>
                <button type="button" class="admin-btn-edit">Редагувати</button>
                <button type="button" class="admin-btn-delete">Видалити</button>
            </td>
        `;

        row.querySelector(".admin-btn-edit").addEventListener("click", () => fillFormForEdit(product));

        row.querySelector(".admin-btn-delete").addEventListener("click", () => {
            showConfirmModal({
                title: "Видалити товар?",
                message: `Товар "${product.title}" буде видалено назавжди. Цю дію не можна скасувати.`,
                confirmText: "Видалити",
                cancelText: "Скасувати",
                onConfirm: async () => {
                    confirmModalConfirmButton.textContent = "Видаляємо...";
                    try {
                        await adminDeleteProduct(product.id);
                        closeConfirmModal();
                        showUserMessage({ type: "success", message: `Товар "${product.title}" видалено.` });
                        loadProducts();
                    } catch (error) {
                        closeConfirmModal();
                        console.error("Не вдалося видалити товар:", error);
                        showUserMessage({
                            type: "error",
                            message: toUserFriendlyErrorMessage(
                                error,
                                "Не вдалося видалити товар. Можливо, він уже є в замовленнях — спробуйте вимкнути його (Активний = ні) замість видалення."
                            )
                        });
                    }
                }
            });
        });

        productsTableBody.append(row);
    });
};

// ---- Пункт 6 (пошук) + Пункт 7 (сортування) — застосовуються ЛОКАЛЬНО,
// до вже завантаженого productsCache, без жодного нового запиту до API.

const compareProducts = function (a, b, column) {
    switch (column) {
        case "title":
            return String(a.title).localeCompare(String(b.title), "uk");
        case "category": {
            const nameA = getCategoryNameById(a.categoryId);
            const nameB = getCategoryNameById(b.categoryId);
            return nameA.localeCompare(nameB, "uk");
        }
        case "price":
            return Number(a.price) - Number(b.price);
        case "stock":
            return Number(a.stock) - Number(b.stock);
        default:
            return 0;
    }
};

const sortProducts = function (products, column, direction) {
    return [...products].sort((a, b) => {

        // Товари без stock (квитки, stock = null) не мають сенсу як
        // "найменший/найбільший залишок" — завжди виносимо їх у кінець,
        // незалежно від напрямку сортування.
        if (column === "stock") {
            const aNull = a.stock === null || a.stock === undefined;
            const bNull = b.stock === null || b.stock === undefined;
            if (aNull && !bNull) return 1;
            if (!aNull && bNull) return -1;
            if (aNull && bNull) return 0;
        }

        const result = compareProducts(a, b, column);
        return direction === "desc" ? -result : result;
    });
};

const getFilteredSortedProducts = function () {
    const term = productSearchInput.value.trim().toLowerCase();

    let list = productsCache;

    if (term) {
        list = list.filter((product) => product.title.toLowerCase().includes(term));
    }

    if (productsSortState.column) {
        list = sortProducts(list, productsSortState.column, productsSortState.direction);
    }

    return list;
};

const updateSortArrows = function () {
    document.querySelectorAll("#productsPanel .admin-sortable").forEach((th) => {
        const arrow = th.querySelector(".admin-sort-arrow");
        if (!arrow) return;
        arrow.textContent = (th.dataset.sort === productsSortState.column)
            ? (productsSortState.direction === "asc" ? "↑" : "↓")
            : "";
    });
};

const refreshProductsView = function () {
    renderProductsTable(getFilteredSortedProducts());
    updateSortArrows();
};

productSearchInput.addEventListener("input", () => {
    refreshProductsView();
});

document.querySelectorAll("#productsPanel .admin-sortable").forEach((th) => {
    th.addEventListener("click", () => {
        const column = th.dataset.sort;

        if (productsSortState.column === column) {
            productsSortState.direction = productsSortState.direction === "asc" ? "desc" : "asc";
        } else {
            productsSortState.column = column;
            productsSortState.direction = "asc";
        }

        refreshProductsView();
    });
});

const loadProducts = async function () {
    productsTableBody.innerHTML = `<tr><td colspan="8">Завантаження...</td></tr>`;
    try {
        const response = await adminGetProducts();
        productsCache = response.data || [];
        refreshProductsView();
        updateDashboardStats();
    } catch (error) {
        console.error("Не вдалося завантажити товари:", error);
        productsTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(toUserFriendlyErrorMessage(error, "Не вдалося завантажити товари."))}</td></tr>`;
    }
};

// FIX (Пункт 8): select категорії тепер завжди явний —
// "— Оберіть категорію —" / "— без категорії —" / реальні назви, ніколи
// не голий category_id.
const fillFormForEdit = function (product) {

    editingProductId = product.id;

    createProductForm.title.value = product.title || "";
    createProductForm.description.value = product.description || "";
    createProductForm.price.value = product.price ?? "";
    createProductForm.category_id.value = (product.categoryId === null || product.categoryId === undefined)
        ? "none"
        : String(product.categoryId);
    createProductForm.display_group.value = product.displayGroup || "products";
    createProductForm.product_type.value = product.productType || "physical";
    createProductForm.pricing_mode.value = product.pricingMode || "";
    createProductForm.stock.value = (product.stock === null || product.stock === undefined) ? "" : product.stock;
    createProductForm.sort_order.value = product.sortOrder ?? 0;
    createProductForm.image_url.value = product.image || "";
    createProductForm.icon_url.value = product.icon || "";
    createProductForm.slug.value = product.slug || "";
    createProductForm.sku.value = product.sku || "";
    createProductForm.alt.value = product.alt || "";
    createProductForm.is_active.checked = Boolean(product.isActive);

    updateProductImagePreview();

    productEditingBanner.classList.remove("is-hidden");
    productEditingName.textContent = product.title;
    productFormSummary.textContent = "Редагування товару";
    createProductSubmitButton.textContent = "Зберегти зміни";

    productFormBox.open = true;
    createProductForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

const resetProductForm = function () {

    editingProductId = null;
    createProductForm.reset();
    createProductForm.category_id.value = ""; // назад до "— Оберіть категорію —"
    updateProductImagePreview();

    productEditingBanner.classList.add("is-hidden");
    productFormSummary.textContent = "+ Додати товар";
    createProductSubmitButton.textContent = "Створити товар";
    createProductError.textContent = "";
};

cancelProductEditButton.addEventListener("click", () => {
    resetProductForm();
});

const buildProductPayload = function (formData) {
    const pricingMode = formData.get("pricing_mode");
    const categoryRaw = formData.get("category_id");

    return {
        title: formData.get("title"),
        description: formData.get("description") || null,
        price: Number(formData.get("price")),
        // "none" — свідомий вибір "без категорії"; порожньо — категорію
        // ще не обрали взагалі (форма не дасть надіслати завдяки required).
        category_id: categoryRaw === "none" ? null : (categoryRaw ? Number(categoryRaw) : null),
        display_group: formData.get("display_group"),
        product_type: formData.get("product_type"),
        pricing_mode: pricingMode ? pricingMode : null,
        stock: formData.get("stock") !== "" ? Number(formData.get("stock")) : null,
        sort_order: Number(formData.get("sort_order") || 0),
        image_url: formData.get("image_url") || null,
        icon_url: formData.get("icon_url") || null,
        slug: formData.get("slug") || undefined,
        sku: formData.get("sku") || null,
        alt: formData.get("alt") || null,
        is_active: formData.get("is_active") === "on"
    };
};

createProductForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    createProductError.textContent = "";

    const formData = new FormData(createProductForm);
    const payload = buildProductPayload(formData);

    // FIX (Пункт 3 — "не дозволяй випадково зберегти некоректні дані"):
    // клієнтська валідація ще ДО відправки на сервер.
    if (!payload.title || !payload.title.trim()) {
        createProductError.textContent = "Введіть назву товару";
        return;
    }
    if (isNaN(payload.price) || payload.price < 0) {
        createProductError.textContent = "Ціна повинна бути коректним невід'ємним числом";
        return;
    }
    if (payload.stock !== null && (isNaN(payload.stock) || payload.stock < 0)) {
        createProductError.textContent = "Залишок на складі не може бути від'ємним";
        return;
    }

    const isEditing = Boolean(editingProductId);

    createProductSubmitButton.disabled = true;
    createProductSubmitButton.textContent = "Зберігаємо...";

    try {
        if (isEditing) {
            await adminUpdateProduct(editingProductId, payload);
        } else {
            await adminCreateProduct(payload);
        }

        showUserMessage({
            type: "success",
            message: isEditing ? "Зміни в товарі збережено." : "Товар створено."
        });

        resetProductForm();
        loadProducts();

    } catch (error) {
        console.error("Помилка збереження товару:", error);
        createProductError.textContent = toUserFriendlyErrorMessage(error, "Не вдалося зберегти товар. Спробуйте ще раз.");
    } finally {
        createProductSubmitButton.disabled = false;
        createProductSubmitButton.textContent = editingProductId ? "Зберегти зміни" : "Створити товар";
    }
});

refreshProductsButton.addEventListener("click", loadProducts);


// ========================================
// ЗАМОВЛЕННЯ
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

    if (orders.length === 0) {
        ordersTableBody.innerHTML = `<tr><td colspan="8">Замовлень ще немає.</td></tr>`;
        return;
    }

    orders.forEach((order) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.id}</td>
            <td>${escapeHtml(order.order_code)}</td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${escapeHtml(order.customer_phone)}</td>
            <td>${Number(order.total_price).toFixed(2)} грн</td>
            <td><select class="status-select">${buildStatusSelect(ORDER_STATUSES, order.status)}</select></td>
            <td><select class="payment-select">${buildStatusSelect(PAYMENT_STATUSES, order.payment_status)}</select></td>
            <td><button type="button" class="admin-btn-edit save-status">Зберегти</button></td>
        `;

        const saveButton = row.querySelector(".save-status");

        saveButton.addEventListener("click", async () => {

            const status = row.querySelector(".status-select").value;
            const payment_status = row.querySelector(".payment-select").value;

            const originalText = saveButton.textContent;
            saveButton.disabled = true;
            saveButton.textContent = "Зберігаємо...";

            try {
                await adminUpdateOrderStatus(order.id, { status, payment_status });
                showUserMessage({ type: "success", message: `Статус замовлення ${order.order_code} оновлено.` });
                loadOrders();
            } catch (error) {
                console.error("Не вдалося оновити статус замовлення:", error);
                showUserMessage({
                    type: "error",
                    message: toUserFriendlyErrorMessage(error, "Не вдалося оновити статус замовлення. Спробуйте ще раз.")
                });
                saveButton.disabled = false;
                saveButton.textContent = originalText;
            }
        });

        ordersTableBody.append(row);
    });
};

const loadOrders = async function () {

    ordersTableBody.innerHTML = `<tr><td colspan="8">Завантаження...</td></tr>`;

    try {
        const response = await adminGetOrders();
        ordersCache = response.data || [];
        renderOrdersTable(ordersCache);
        updateDashboardStats();

    } catch (error) {
        console.error("Не вдалося завантажити замовлення:", error);
        ordersTableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(toUserFriendlyErrorMessage(error, "Не вдалося завантажити замовлення."))}</td></tr>`;
    }
};

refreshOrdersButton.addEventListener("click", loadOrders);


// ========================================
// БРОНЮВАННЯ
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
            <td>${escapeHtml(booking.booking_code)}</td>
            <td>${escapeHtml(booking.customer_name)}</td>
            <td>${escapeHtml(booking.customer_phone)}</td>
            <td>${escapeHtml(booking.product_title)}</td>
            <td>${formatBookingDateShort(booking.booking_date)}</td>
            <td>${formatBookingTimes(booking.times)}</td>
            <td>${booking.visitors}</td>
            <td>${Number(booking.total_price).toFixed(2)} грн</td>
            <td>${escapeHtml(booking.status)}</td>
            <td><button type="button" class="admin-btn-delete">Видалити</button></td>
        `;

        row.querySelector(".admin-btn-delete").addEventListener("click", () => {
            showConfirmModal({
                title: "Видалити бронювання?",
                message: `Бронювання "${booking.booking_code}" буде видалено. Цю дію не можна скасувати.`,
                confirmText: "Видалити",
                cancelText: "Скасувати",
                onConfirm: async () => {
                    confirmModalConfirmButton.textContent = "Видаляємо...";
                    try {
                        await adminDeleteBooking(booking.id);
                        closeConfirmModal();
                        showUserMessage({ type: "success", message: `Бронювання "${booking.booking_code}" видалено.` });
                        loadBookings();
                    } catch (error) {
                        closeConfirmModal();
                        console.error("Не вдалося видалити бронювання:", error);
                        showUserMessage({
                            type: "error",
                            message: toUserFriendlyErrorMessage(error, "Не вдалося видалити бронювання. Спробуйте ще раз.")
                        });
                    }
                }
            });
        });

        bookingsTableBody.append(row);
    });
};

const loadBookings = async function () {

    bookingsTableBody.innerHTML = `<tr><td colspan="11">Завантаження...</td></tr>`;

    try {
        const response = await adminGetBookings();
        bookingsCache = response.data || [];
        renderBookingsTable(bookingsCache);
        updateDashboardStats();

    } catch (error) {
        console.error("Не вдалося завантажити бронювання:", error);
        bookingsTableBody.innerHTML = `<tr><td colspan="11">${escapeHtml(toUserFriendlyErrorMessage(error, "Не вдалося завантажити бронювання."))}</td></tr>`;
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
