// ========================================
// ЄДИНА СИСТЕМА ПОВІДОМЛЕНЬ ДЛЯ ПОКУПЦЯ
// ========================================
// Централізована заміна browser alert()/window.alert() для всього, що
// бачить ПОКУПЕЦЬ (кошик, checkout, замовлення, бронювання). Адмінка сюди
// не входить — її alert()/confirm() лишені без змін (інша аудиторія, поза
// зоною цього завдання).
//
// showUserMessage({ type, title, message, restoreUnderlyingModal }) —
// ОДНА функція, яку викликає бізнес-логіка (basket.js, booking.js). Вона
// нічого не знає про DOM: просто каже "покажи покупцю success/error/
// warning/info з таким текстом". Ця функція вирішує:
//
//   1. Якщо в момент виклику вже відкрите інше модальне вікно сайту
//      (кошик/бронювання) — воно ховається (is-open знімається, ВНУТРІШНІЙ
//      стан НЕ скидається), а замість нього показується ЦЕ повідомлення.
//      Так ніколи не виникає двох overlay одночасно (заборонено —
//      "nested modal").
//   2. Якщо передано restoreUnderlyingModal: true — після того, як
//      покупець закриє повідомлення, приховану модалку (кошик/бронювання)
//      автоматично показують знову, у тому самому стані, в якому вона
//      була (наприклад, "Наявність товару змінилась" → закрив → знову
//      бачить кошик з уже оновленими кількостями).
//   3. Якщо restoreUnderlyingModal не передано (за замовчуванням false) —
//      після закриття повідомлення сторінка просто повертається у звичайний
//      стан (саме так поводиться success після успішного замовлення чи
//      бронювання — модалка мала закритись назавжди).
//
// Каркас — ТОЙ САМИЙ .modal/.modal__container/.modal__close/is-open, що й
// решта модалок сайту (кошик, бронювання, "Лаванда спить"). Нова
// незалежна modal-система тут НЕ створюється — лише один додатковий
// екземпляр існуючого паттерну.

const USER_MESSAGE_TYPE_LABELS = {
    success: "Готово",
    error: "Помилка",
    warning: "Увага",
    info: "Інформація"
};

const userMessageModal = document.getElementById("userMessageModal");
const userMessageTitleEl = userMessageModal ? userMessageModal.querySelector(".user-message-modal__title") : null;
const userMessageTextEl = userMessageModal ? userMessageModal.querySelector(".user-message-modal__text") : null;
const userMessageOkButton = userMessageModal ? userMessageModal.querySelector(".user-message-modal__ok") : null;
const userMessageCloseButton = userMessageModal ? userMessageModal.querySelector(".user-message-modal__close") : null;

// Модалка, яку потрібно показати знову після закриття поточного
// повідомлення (кошик/бронювання), якщо викликач попросив про це через
// restoreUnderlyingModal. null — нічого відновлювати не треба.
let modalToRestoreAfterMessage = null;

// ----------------------------
// ЗНАЙТИ БУДЬ-ЯКЕ ІНШЕ ВІДКРИТЕ МОДАЛЬНЕ ВІКНО САЙТУ
// ----------------------------
// Кошик (.modal-basket) і бронювання (.modal-booking) обидва мають
// спільний базовий клас .modal — тому один селектор ловить будь-яке з них.

const findOtherOpenModal = function () {
    return Array.from(document.querySelectorAll(".modal.is-open"))
        .find((modal) => modal !== userMessageModal) || null;
};

// ----------------------------
// ВІДКРИТТЯ / ЗАКРИТТЯ
// ----------------------------

const openStandaloneUserMessage = function (type, title, message, restoreUnderlyingModal) {

    if (!userMessageModal) {
        // Розмітку модалки ще не додали на цю сторінку — не валимо сайт,
        // лишаємо технічний слід для розробника.
        console.error("userMessageModal відсутній у DOM. Повідомлення:", { type, title, message });
        return;
    }

    // Крок 1: якщо вже відкрита інша модалка сайту — ховаємо її (без
    // скидання внутрішнього стану), щоб не накладати два overlay.
    const openModal = findOtherOpenModal();

    if (openModal) {
        openModal.classList.remove("is-open");
        openModal.setAttribute("aria-hidden", "true");
    }

    modalToRestoreAfterMessage = (restoreUnderlyingModal && openModal) ? openModal : null;

    // Крок 2: наповнюємо і показуємо повідомлення.
    userMessageModal.classList.remove(
        "user-message-modal--success",
        "user-message-modal--error",
        "user-message-modal--warning",
        "user-message-modal--info"
    );
    userMessageModal.classList.add(`user-message-modal--${type}`);

    if (userMessageTitleEl) userMessageTitleEl.textContent = title || USER_MESSAGE_TYPE_LABELS[type] || USER_MESSAGE_TYPE_LABELS.info;
    if (userMessageTextEl) userMessageTextEl.textContent = message || "";

    userMessageModal.classList.add("is-open");
    userMessageModal.setAttribute("aria-hidden", "false");

    // Скрол лишається заблокованим незалежно від того, чи була відкрита
    // інша модалка — або продовжуємо показувати повідомлення, або зараз
    // одразу відновимо підпорядковану модалку.
    document.body.classList.add("modal-open");

    if (userMessageOkButton) userMessageOkButton.focus();
};

const closeStandaloneUserMessage = function () {

    if (!userMessageModal) return;

    userMessageModal.classList.remove("is-open");
    userMessageModal.setAttribute("aria-hidden", "true");

    if (modalToRestoreAfterMessage) {
        modalToRestoreAfterMessage.classList.add("is-open");
        modalToRestoreAfterMessage.setAttribute("aria-hidden", "false");
        modalToRestoreAfterMessage = null;
        // body.modal-open лишається — підпорядкована модалка знову активна.
    } else {
        document.body.classList.remove("modal-open");
    }
};

if (userMessageModal) {
    if (userMessageOkButton) userMessageOkButton.addEventListener("click", closeStandaloneUserMessage);
    if (userMessageCloseButton) userMessageCloseButton.addEventListener("click", closeStandaloneUserMessage);

    userMessageModal.addEventListener("click", (event) => {
        if (event.target === userMessageModal) {
            closeStandaloneUserMessage();
        }
    });

    // FIX (Етап 9, accessibility): Escape закриває повідомлення так само,
    // як і решту модалок сайту (кошик, бронювання, "Лаванда спить").
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && userMessageModal.classList.contains("is-open")) {
            closeStandaloneUserMessage();
        }
    });
}

// ----------------------------
// ЦЕНТРАЛЬНА ТОЧКА ВХОДУ
// ----------------------------

const showUserMessage = function ({ type = "info", title = "", message = "", restoreUnderlyingModal = false } = {}) {

    if (!["success", "error", "warning", "info"].includes(type)) {
        type = "info";
    }

    openStandaloneUserMessage(type, title, message, restoreUnderlyingModal);
};

// ----------------------------
// РОЗРІЗНЕННЯ "ТЕХНІЧНОГО" ТА "ЗРОЗУМІЛОГО" ТЕКСТУ ПОМИЛКИ (Етап 10)
// ----------------------------
// apiRequest (api.js) кидає Error, чиє .message — це або власне
// user-friendly повідомлення бекенду (напр. "Недостатньо товару... на
// складі"), або (при мережевому збої) вже позначене error.isNetworkError.
// Ця функція — єдине місце, де вирішується, чи можна показати покупцю
// error.message напряму, чи краще підставити fallbackMessage. Технічний
// оригінал завжди лишається доступним розробнику через console.error(error)
// у місці виклику — тут він НЕ губиться, лише не потрапляє в UI.

const toUserFriendlyErrorMessage = function (error, fallbackMessage) {

    if (!error) {
        return fallbackMessage;
    }

    if (error.isNetworkError) {
        return fallbackMessage;
    }

    const message = error.message;

    if (!message || typeof message !== "string") {
        return fallbackMessage;
    }

    const looksTechnical = /failed to fetch|networkerror|typeerror|is not defined|cannot read propert|unexpected token|json\.parse|internal server error|^\s*\d{3}\b/i.test(message);

    if (looksTechnical) {
        return fallbackMessage;
    }

    return message;
};
