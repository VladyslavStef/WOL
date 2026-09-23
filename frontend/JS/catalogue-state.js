// ========================================
// ГЛОБАЛЬНИЙ СТАН КАТАЛОГУ (site_settings.catalog_enabled)
// ========================================
// Єдине джерело істини для "чи можна зараз показувати/продавати каталог".
// Кожна дія, що веде до перегляду каталогу або продажу (клік на посилання
// каталогу, "Наша продукція"/"Саджанці", додавання в кошик, відкриття
// checkout, фінальне оформлення замовлення) звіряється з АКТУАЛЬНИМ станом
// через guardCatalogAction()/refreshCatalogStatus() — НЕ з кешем,
// записаним один раз при завантаженні сторінки. Це і є механізм
// "без ручного reload": перевірка відбувається перед кожною критичною
// дією, а не одноразово.

let catalogEnabledCache = true;

const catalogClosedModal = document.getElementById("catalogClosedModal");

// ----------------------------
// МОДАЛЬНЕ ВІКНО — використовується ЄДИНЕ існуюче на сторінці, ніякого
// другого/дубльованого modal тут не створюється.
// ----------------------------

const openCatalogClosedModal = function () {
    if (!catalogClosedModal) return;
    catalogClosedModal.classList.add("is-open");
    catalogClosedModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
};

const closeCatalogClosedModal = function () {
    if (!catalogClosedModal) return;
    catalogClosedModal.classList.remove("is-open");
    catalogClosedModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
};

if (catalogClosedModal) {
    const closeBtn = catalogClosedModal.querySelector(".catalog-closed-modal__close");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeCatalogClosedModal);
    }

    catalogClosedModal.addEventListener("click", (event) => {
        if (event.target === catalogClosedModal) {
            closeCatalogClosedModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && catalogClosedModal.classList.contains("is-open")) {
            closeCatalogClosedModal();
        }
    });
}

// ----------------------------
// АКТУАЛЬНИЙ СТАН — завжди мережевий запит, ніколи не "довіряємо" старому
// значенню при прийнятті рішення про блокування дії.
// ----------------------------
// Якщо мережевий запит не вдався — НЕ скидаємо стан на true, лишаємо
// останнє відоме значення. Короткий збій мережі не повинен "тихо" знову
// відкрити щойно закритий каталог. Виняток — найперший запуск сторінки:
// поки не було жодної успішної відповіді, значення за замовчуванням true,
// щоб мережева помилка при завантаженні не заблокувала весь сайт.

const refreshCatalogStatus = async function () {
    try {
        const response = await fetchCatalogStatus();
        catalogEnabledCache = Boolean(response.catalogEnabled);
    } catch (error) {
        console.error("Не вдалося перевірити стан каталогу:", error.message);
    }
    return catalogEnabledCache;
};

// ----------------------------
// GUARD: перевірити АКТУАЛЬНИЙ стан ПЕРЕД дією; виконати дію лише якщо
// каталог відкритий, інакше — заблокований стан + модалка.
// ----------------------------

const guardCatalogAction = async function (action) {
    const enabled = await refreshCatalogStatus();

    if (!enabled) {
        applyCatalogBlockedState();
        return false;
    }

    if (typeof action === "function") {
        action();
    }

    return true;
};

// ----------------------------
// ВІЗУАЛЬНИЙ "READ-ONLY" СТАН СТОРІНКИ КАТАЛОГУ
// ----------------------------
// FIX (BUG: catalog_enabled вимикав товари на головній): .sell —
// та сама CSS-назва використовується і на catalogue.html (секція
// повного каталогу), і на main.html (секція "НАШІ ТОП ПРОДУКТИ").
// Без цієї перевірки document.querySelector(".sell") знаходив би
// "перший-ліпший" .sell на поточній сторінці — на main.html це
// помилково вимикало (pointer-events:none, сіре) топ-товари, хоча
// вони мають лишатись доступними для перегляду навіть при закритому
// каталозі (закритий лише сам АКТ КУПІВЛІ, не перегляд).
//
// isOnFullCataloguePage() визначає "це справжня сторінка каталогу?"
// за вже наявним у розмітці, УНІКАЛЬНИМ для неї маркером —
// .sell__decor-holder рендериться лише на catalogue.html (main.html
// використовує окрему, іншу за назвою декорацію .sell__decor). Жоден
// CSS-клас і жодна розмітка тут НЕ перейменовується й НЕ додається —
// це суто JS-side уточнення області дії вже існуючої функції.
//
// Модалка "Лаванда спить" відкривається завжди, незалежно від сторінки
// — спроба реально купити (додати в кошик/оформити) з ГОЛОВНОЇ сторінки
// теж має коректно показати це повідомлення, лише саму секцію
// топ-товарів більше не блокуємо візуально.

const isOnFullCataloguePage = function () {
    return Boolean(document.querySelector(".sell__decor-holder"));
};

const applyCatalogBlockedState = function () {
    if (isOnFullCataloguePage()) {
        const catalogSection = document.querySelector(".sell");
        if (catalogSection) catalogSection.classList.add("is-catalog-blocked");
    }

    const heroButtons = document.querySelector(".hero__button-container");
    if (heroButtons) heroButtons.classList.add("is-catalog-blocked");

    openCatalogClosedModal();
};

const removeCatalogBlockedState = function () {
    if (isOnFullCataloguePage()) {
        const catalogSection = document.querySelector(".sell");
        if (catalogSection) catalogSection.classList.remove("is-catalog-blocked");
    }

    const heroButtons = document.querySelector(".hero__button-container");
    if (heroButtons) heroButtons.classList.remove("is-catalog-blocked");
};

// ----------------------------
// ЛЕГКИЙ POLLING — лише для сторінки каталогу, де користувач може довго
// "сидіти", поки адмін змінить статус. НЕ агресивний (20с), і взагалі не
// запускається на інших сторінках сайту.
// ----------------------------

const CATALOG_STATUS_POLL_INTERVAL_MS = 20000;

let catalogStatusPollTimer = null;

// Хук, який catalogue.js може перевизначити, щоб довантажити товари, якщо
// каталог знову увімкнули, поки користувач залишався на сторінці.
let onCatalogReenabled = null;

const startCatalogStatusPolling = function () {
    if (catalogStatusPollTimer) return; // не плодимо кілька таймерів

    catalogStatusPollTimer = setInterval(async () => {
        const wasEnabled = catalogEnabledCache;
        const nowEnabled = await refreshCatalogStatus();

        if (wasEnabled && !nowEnabled) {
            // Каталог вимкнули, поки користувач був на сторінці.
            applyCatalogBlockedState();
        }

        if (!wasEnabled && nowEnabled) {
            // Каталог знову увімкнули — знімаємо блокування без reload.
            removeCatalogBlockedState();
            if (typeof onCatalogReenabled === "function") {
                onCatalogReenabled();
            }
        }
    }, CATALOG_STATUS_POLL_INTERVAL_MS);
};

// ----------------------------
// ГЕЙТУВАННЯ ВСІХ ПОСИЛАНЬ НА КАТАЛОГ (navbar, hero CTA "До каталогу" тощо)
// ----------------------------
// Один селектор ловить будь-яке посилання на catalogue.html з будь-якої
// сторінки сайту — перевірку не потрібно дублювати окремо в main.js чи
// catalogue.js для кожної конкретної кнопки/лінка. Це навмисно НЕ
// зачіпається цим патчем — посилання на сам каталог мають лишатись
// заблокованими з будь-якої сторінки (включно з головною), це коректна,
// уже наявна поведінка.

const guardCatalogEntryPoints = function () {

    const catalogLinks = document.querySelectorAll('a[href*="catalogue.html"], [data-catalog-link]');

    catalogLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            // preventDefault викликається СИНХРОННО й ЗАВЖДИ — рішення
            // "пускати чи ні" приймається вже потім, всередині
            // guardCatalogAction, після живої мережевої перевірки. Це
            // унеможливлює "порожній" перехід на сторінку каталогу.
            event.preventDefault();

            const targetHref = link.href;

            guardCatalogAction(() => {
                window.location.href = targetHref;
            });
        });
    });
};

// Викликається СИНХРОННО, у момент виконання цього скрипта — тобто ще до
// того, як користувач фізично встигне щось натиснути. Саме це закриває
// root cause бага.
guardCatalogEntryPoints();