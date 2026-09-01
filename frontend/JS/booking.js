// ========================================
// SETTINGS
// ========================================

const BOOKING_MAX_VISITORS = 30;


// ========================================
// TICKETS
// ========================================
// FIX: раніше тут була захардкоджена ціна/pricingMode. Тепер лишається лише
// презентаційна інформація (картинка, опис, доступні часові слоти), а id
// товару, ціна та pricingMode підтягуються з бекенду при завантаженні —
// щоб ціна на сайті завжди відповідала базі даних.

const bookingTicketTemplates = [

    {
        key: "day",
        category: "day-ticket",

        image:
            "/frontend/IMG/Layer 3.png",

        title:
            "Денний квиток",

        time:
            "З 10.00 до 18.00",

        description:
            "Денні загальні відвідування",

        times: [
            "10:00–11:00",
            "11:00–12:00",
            "12:00–13:00",
            "13:00–14:00",
            "14:00–15:00",
            "15:00–16:00",
            "16:00–17:00",
            "17:00–18:00"
        ]
    },


    {
        key: "evening",
        category: "evening-ticket",

        image:
            "/frontend/IMG/Layer 2.png",

        title:
            "Вечірній квиток",

        time:
            "З 18.00 до 21.00",

        description:
            "Індивідуальне відвідування",

        times: [
            "18:00–19:00",
            "19:00–20:00",
            "20:00–21:00"
        ]
    }

];

// Заповнюється в initBooking() після завантаження товарів з бекенду.
let bookingTickets = [];


// ========================================
// AVAILABILITY (реальні дані з бекенду)
// ========================================
// FIX: раніше тут були захардкоджені Set з номерами днів місяця
// (bookingBusyDays) і назвами часових проміжків (bookingBusyTimes),
// що взагалі не залежало від реальних бронювань і навіть мало логічну
// помилку — перевірка йшла тільки по числу дня, тобто "5-те число
// будь-якого місяця" вважалось зайнятим у КОЖНОМУ місяці.
// Тепер зайняті дати запитуються з бекенду окремо для кожного квитка
// (GET /booking/busy-dates?product_id=...) і зберігаються як рядки
// формату YYYY-MM-DD, щоб коректно порівнювати дати з різних місяців.

let bookingBusyDatesSet = new Set();


// ========================================
// STATE
// ========================================

let bookingState = {

    ticket: null,

    date: null,

    times: [],

    quantity: 1,

    name: "",

    phone: ""

};


let pendingBooking =
    null;


let bookingCalendarDate =
    new Date();


bookingCalendarDate =
    new Date(
        bookingCalendarDate.getFullYear(),
        bookingCalendarDate.getMonth(),
        1
    );


// ========================================
// DOM
// ========================================

const bookingOpenButtons =
    document.querySelectorAll(
        ".booking-open"
    );


const bookingModal =
    document.querySelector(
        ".modal-booking"
    );


const bookingClose =
    bookingModal.querySelector(
        ".booking-close"
    );


const bookingViews =
    bookingModal.querySelectorAll(
        ".booking-view"
    );


// ========================================
// VIEWS
// ========================================

const bookingTypeView =
    bookingModal.querySelector(
        ".booking-type-view"
    );


const bookingDateView =
    bookingModal.querySelector(
        ".booking-date-view"
    );


const bookingTimeView =
    bookingModal.querySelector(
        ".booking-time-view"
    );


const bookingDetailsView =
    bookingModal.querySelector(
        ".booking-details-view"
    );


const bookingConfirmationView =
    bookingModal.querySelector(
        ".booking-confirmation-view"
    );


// ========================================
// TICKET DOM
// ========================================

const bookingTicketsList =
    bookingModal.querySelector(
        ".booking-tickets-list"
    );


const bookingTicketTemplate =
    document.getElementById(
        "booking-ticket-template"
    );


const bookingSelectedType =
    bookingModal.querySelector(
        ".booking-selected-type"
    );


// ========================================
// DATE DOM
// ========================================

const bookingMonth =
    bookingModal.querySelector(
        ".booking-month"
    );


const bookingDays =
    bookingModal.querySelector(
        ".booking-days"
    );


const bookingMonthPrev =
    bookingModal.querySelector(
        ".booking-month-prev"
    );


const bookingMonthNext =
    bookingModal.querySelector(
        ".booking-month-next"
    );


const bookingDateNext =
    bookingModal.querySelector(
        ".booking-date-next"
    );


const bookingDateError =
    bookingModal.querySelector(
        ".booking-date-error"
    );


const bookingSelectedDate =
    bookingModal.querySelector(
        ".booking-selected-date"
    );


// ========================================
// TIME DOM
// ========================================

const bookingTimeList =
    bookingModal.querySelector(
        ".booking-time-list"
    );


const bookingTimeNext =
    bookingModal.querySelector(
        ".booking-time-next"
    );


const bookingTimeError =
    bookingModal.querySelector(
        ".booking-time-error"
    );


const bookingSelectedTime =
    bookingModal.querySelector(
        ".booking-selected-time"
    );


// ========================================
// COUNTER
// ========================================

const bookingCounterMinus =
    bookingModal.querySelector(
        ".booking-counter__minus"
    );


const bookingCounterPlus =
    bookingModal.querySelector(
        ".booking-counter__plus"
    );


const bookingCounterValue =
    bookingModal.querySelector(
        ".booking-counter__value"
    );


const bookingPriceValue =
    bookingModal.querySelector(
        ".booking-price__value"
    );


// ========================================
// FORM
// ========================================

const bookingForm =
    bookingModal.querySelector(
        ".booking-form"
    );


const bookingNameInput =
    bookingModal.querySelector(
        'input[name="bookingName"]'
    );


const bookingPhoneInput =
    bookingModal.querySelector(
        'input[name="bookingPhone"]'
    );


const bookingNameError =
    bookingModal.querySelector(
        ".booking-name-error"
    );


const bookingPhoneError =
    bookingModal.querySelector(
        ".booking-phone-error"
    );


// ========================================
// BACK BUTTONS
// ========================================

const bookingBackType =
    bookingModal.querySelector(
        ".booking-back--type"
    );


const bookingBackDate =
    bookingModal.querySelector(
        ".booking-back--date"
    );


const bookingBackTime =
    bookingModal.querySelector(
        ".booking-back--time"
    );


const bookingBackDetails =
    bookingModal.querySelector(
        ".booking-back--details"
    );


// ========================================
// CONFIRMATION DOM
// ========================================

const bookingConfirmationType =
    bookingModal.querySelector(
        ".booking-confirmation__type"
    );


const bookingConfirmationDate =
    bookingModal.querySelector(
        ".booking-confirmation__date"
    );


const bookingConfirmationTime =
    bookingModal.querySelector(
        ".booking-confirmation__time"
    );


const bookingConfirmationQuantity =
    bookingModal.querySelector(
        ".booking-confirmation__quantity"
    );


const bookingConfirmationName =
    bookingModal.querySelector(
        ".booking-confirmation__name"
    );


const bookingConfirmationPhone =
    bookingModal.querySelector(
        ".booking-confirmation__phone"
    );


const bookingConfirmationTotal =
    bookingModal.querySelector(
        ".booking-confirmation__total"
    );


const bookingConfirmationAction =
    bookingModal.querySelector(
        ".booking-confirmation__action"
    );


// ========================================
// SHOW VIEW
// ========================================

const showBookingView =
    function (view) {

        bookingViews.forEach(
            (item) => {

                item.classList.remove(
                    "is-active"
                );

            }
        );


        view.classList.add(
            "is-active"
        );
    };


// ========================================
// FORMAT DATE
// ========================================

const formatBookingDate =
    function (date) {

        return new Intl.DateTimeFormat(
            "uk-UA",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(date);
    };


// ========================================
// FORMAT MONTH
// ========================================

const formatBookingMonth =
    function (date) {

        const month =
            new Intl.DateTimeFormat(
                "uk-UA",
                {
                    month: "long",
                    year: "numeric"
                }
            ).format(date);


        return (
            month.charAt(0).toUpperCase()
            +
            month.slice(1)
        );
    };


// ========================================
// DATE FOR BACKEND
// ========================================

const formatBookingDateForBackend =
    function (date) {

        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;
    };


// ========================================
// SAME DAY
// ========================================

const isSameBookingDay =
    function (
        first,
        second
    ) {

        return (

            first.getFullYear()
            ===
            second.getFullYear()

            &&

            first.getMonth()
            ===
            second.getMonth()

            &&

            first.getDate()
            ===
            second.getDate()

        );
    };


// ========================================
// RENDER TICKETS
// ========================================

const renderBookingTickets =
    function () {

        bookingTicketsList.innerHTML =
            "";


        bookingTickets.forEach(
            (ticket) => {

                const clone =
                    bookingTicketTemplate
                        .content
                        .cloneNode(true);


                const image =
                    clone.querySelector(
                        ".booking-ticket__image"
                    );


                const time =
                    clone.querySelector(
                        ".booking-ticket__time"
                    );


                const description =
                    clone.querySelector(
                        ".booking-ticket__description"
                    );


                const price =
                    clone.querySelector(
                        ".booking-ticket__price"
                    );


                const button =
                    clone.querySelector(
                        ".booking-ticket__button"
                    );


                image.src =
                    ticket.image;


                image.alt =
                    ticket.title;


                time.textContent =
                    ticket.time;


                description.textContent =
                    ticket.description;


                price.textContent =
                    ticket.priceText;


                button.addEventListener(
                    "click",
                    async () => {

                        bookingState.ticket = ticket;

                        bookingState.date = null;

                        bookingState.times = [];


                        bookingState.quantity =  1;

                        bookingSelectedType.textContent =
                            `${ticket.time} · ${ticket.description}`;


                        // FIX: тягнемо реальні зайняті дати саме для цього
                        // квитка перед показом календаря, замість
                        // захардкодженого списку.
                        bookingBusyDatesSet = new Set();

                        try {
                            const response = await fetchBusyDates(ticket.productId);
                            bookingBusyDatesSet = new Set(response.busyDates || []);
                        } catch (error) {
                            console.error("Не вдалося завантажити зайняті дати:", error.message);
                        }


                        renderBookingCalendar();


                        showBookingView(
                            bookingDateView
                        );

                    }
                );


                bookingTicketsList.append(
                    clone
                );

            }
        );
    };


// ========================================
// CALENDAR
// ========================================

const renderBookingCalendar =
    function () {

        bookingDays.innerHTML =
            "";


        bookingMonth.textContent =
            formatBookingMonth(
                bookingCalendarDate
            );


        const year =
            bookingCalendarDate
                .getFullYear();


        const month =
            bookingCalendarDate
                .getMonth();


        const firstDay =
            new Date(
                year,
                month,
                1
            );


        const lastDay =
            new Date(
                year,
                month + 1,
                0
            );


        const startOffset =
            (
                firstDay.getDay()
                +
                6
            ) % 7;


        for (
            let index = 0;
            index < startOffset;
            index++
        ) {

            const empty =
                document.createElement(
                    "span"
                );


            empty.className =
                "booking-day booking-day--empty";


            bookingDays.append(
                empty
            );
        }


        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );


        for (
            let day = 1;
            day <= lastDay.getDate();
            day++
        ) {

            const date =
                new Date(
                    year,
                    month,
                    day
                );


            date.setHours(
                0,
                0,
                0,
                0
            );


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "booking-day";


            button.textContent =
                day;


            const isPast =
                date < today;


            const isBusy =
                bookingBusyDatesSet.has(
                    formatBookingDateForBackend(date)
                );


            if (
                isPast ||
                isBusy
            ) {

                button.disabled =
                    true;


                button.classList.add(
                    "is-busy"
                );
            }


            if (
                bookingState.date
                &&
                isSameBookingDay(
                    bookingState.date,
                    date
                )
            ) {

                button.classList.add(
                    "is-selected"
                );
            }


            button.addEventListener(
                "click",
                () => {

                    bookingState.date =date;

                    bookingState.times = [];


                    bookingDateError.textContent = "";

                    renderBookingCalendar();
                }
            );


            bookingDays.append(
                button
            );
        }


        const currentMonth =
            new Date();


        currentMonth.setDate(1);


        currentMonth.setHours(
            0,
            0,
            0,
            0
        );


        bookingMonthPrev.disabled =
            bookingCalendarDate <=
            currentMonth;
    };


// ========================================
// MONTH PREVIOUS
// ========================================

bookingMonthPrev.addEventListener(
    "click",
    () => {

        bookingCalendarDate =
            new Date(
                bookingCalendarDate.getFullYear(),
                bookingCalendarDate.getMonth() - 1,
                1
            );


        renderBookingCalendar();
    }
);


// ========================================
// MONTH NEXT
// ========================================

bookingMonthNext.addEventListener(
    "click",
    () => {

        bookingCalendarDate =
            new Date(
                bookingCalendarDate.getFullYear(),
                bookingCalendarDate.getMonth() + 1,
                1
            );


        renderBookingCalendar();
    }
);


// ========================================
// DATE NEXT
// ========================================

bookingDateNext.addEventListener(
    "click",
    () => {

        if (!bookingState.date) {

            bookingDateError.textContent =
                "Оберіть доступну дату";


            return;
        }


        bookingSelectedDate.textContent =
            formatBookingDate(
                bookingState.date
            );


        renderBookingTimes();


        showBookingView(
            bookingTimeView
        );
    }
);


// ========================================
// RENDER TIMES
// ========================================

const renderBookingTimes = function () {

    bookingTimeList.innerHTML = "";

    bookingState.ticket.times.forEach((time) => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "booking-time";

        button.textContent =
            time;


        const isSelected =
            bookingState.times.includes(time);

        const limitReached =
            bookingState.times.length >= 3;


        if (isSelected) {

            button.classList.add(
                "is-selected"
            );
        }

        // FIX: часові проміжки більше не блокуються окремим списком —
        // якщо дата обрана, вона за визначенням вільна (недоступні дати
        // вже відфільтровані в календарі), тож усі часи на ній доступні.
        if (limitReached && !isSelected) {

            button.disabled = true;
        }


        button.addEventListener(
            "click",
            () => {

                const index =
                    bookingState.times.indexOf(
                        time
                    );


                // Якщо вже вибраний —
                // прибираємо його

                if (index !== -1) {

                    bookingState.times.splice(
                        index,
                        1
                    );

                } else {

                    // Максимум 3

                    if (
                        bookingState.times.length >= 3
                    ) {

                        bookingTimeError.textContent =
                            "Можна обрати максимум 3 часові проміжки";

                        return;
                    }


                    bookingState.times.push(
                        time
                    );
                }


                bookingTimeError.textContent =
                    "";


                renderBookingTimes();
            }
        );


        bookingTimeList.append(
            button
        );
    });
};

// ========================================
// TIME NEXT
// ========================================

bookingTimeNext.addEventListener(
    "click",
    () => {

        if (bookingState.times.length === 0) {

            bookingTimeError.textContent = "Оберіть хоча б один часовий проміжок";
            return;
        }  


        bookingSelectedTime.textContent = `${formatBookingDate(bookingState.date)} · ${bookingState.times.join(", ")}`;


        updateBookingCounter();


        showBookingView(
            bookingDetailsView
        );
    }
);


// ========================================
// CALCULATE PRICE
// ========================================

const calculateBookingTotal = function () {

    if (!bookingState.ticket) {
        return 0;
    }


    // Денний:
    // 200 грн за одну людину

    if (
        bookingState.ticket.pricingMode ===
        "person"
    ) {

        return (
            bookingState.ticket.priceValue *
            bookingState.quantity
        );
    }


    // Вечірній:
    // 500 грн за кожну обрану годину

    return (
        bookingState.ticket.priceValue *
        bookingState.times.length
    );
};


// ========================================
// UPDATE COUNTER
// ========================================

const updateBookingCounter =
    function () {

        bookingCounterValue.textContent =
            bookingState.quantity;


        bookingCounterMinus.disabled =
            bookingState.quantity <= 1;


        bookingCounterPlus.disabled =
            bookingState.quantity >=
            BOOKING_MAX_VISITORS;


        bookingPriceValue.textContent =
            calculateBookingTotal()
            +
            " грн";
    };


// ========================================
// MINUS
// ========================================

bookingCounterMinus.addEventListener(
    "click",
    () => {

        if (
            bookingState.quantity > 1
        ) {

            bookingState.quantity--;


            updateBookingCounter();
        }
    }
);


// ========================================
// PLUS
// ========================================

bookingCounterPlus.addEventListener(
    "click",
    () => {

        if (
            bookingState.quantity <
            BOOKING_MAX_VISITORS
        ) {

            bookingState.quantity++;


            updateBookingCounter();
        }
    }
);


// ========================================
// FORM
// ========================================

bookingForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const name =
            bookingNameInput
                .value
                .trim();


        const phone =
            bookingPhoneInput
                .value
                .trim();


        const phonePattern =
            /^(?:0\d{9}|\+380\d{9})$/;


        let isValid =
            true;


        if (
            name.length < 2
        ) {

            bookingNameError.textContent =
                "Введіть правильне ім’я";


            isValid =
                false;

        } else {

            bookingNameError.textContent =
                "";
        }


        if (
            !phonePattern.test(
                phone
            )
        ) {

            bookingPhoneError.textContent =
                "Введіть номер у форматі 0XXXXXXXXX або +380XXXXXXXXX";


            isValid =
                false;

        } else {

            bookingPhoneError.textContent =
                "";
        }


        if (!isValid) {
            return;
        }


        bookingState.name =
            name;


        bookingState.phone =
            phone;


        renderBookingConfirmation();


        showBookingView(
            bookingConfirmationView
        );
    }
);


// ========================================
// RENDER CONFIRMATION
// ========================================

const renderBookingConfirmation =
    function () {

        const total =
            calculateBookingTotal();


        bookingConfirmationType.textContent =
            bookingState.ticket.title;


        bookingConfirmationDate.textContent =
            formatBookingDate(
                bookingState.date
            );


        bookingConfirmationTime.textContent = bookingState.times.join(", ");


        bookingConfirmationQuantity.textContent =
            bookingState.quantity;


        bookingConfirmationName.textContent =
            bookingState.name;


        bookingConfirmationPhone.textContent =
            bookingState.phone;


        bookingConfirmationTotal.textContent =
            total + " грн";


        // ========================================
        // DATA READY FOR BACKEND
        // ========================================

        pendingBooking = {

            ticket: {

                id:
                    bookingState.ticket.key,

                productId:
                    bookingState.ticket.productId,

                title:
                    bookingState.ticket.title,

                price:
                    bookingState.ticket.priceValue,

                pricingMode:
                    bookingState.ticket.pricingMode

            },


            date:formatBookingDateForBackend(
                    bookingState.date
                ),


            times:[...bookingState.times],

            visitors:bookingState.quantity,


            total:total,

            customer: {

                name:
                    bookingState.name,

                phone:
                    bookingState.phone
            }

        };
    };


// ========================================
// BACK BUTTONS
// ========================================

bookingBackType.addEventListener(
    "click",
    () => {

        showBookingView(
            bookingTypeView
        );
    }
);


bookingBackDate.addEventListener(
    "click",
    () => {

        showBookingView(
            bookingDateView
        );
    }
);


bookingBackTime.addEventListener(
    "click",
    () => {

        showBookingView(
            bookingTimeView
        );
    }
);


bookingBackDetails.addEventListener(
    "click",
    () => {

        showBookingView(
            bookingDetailsView
        );
    }
);


// ========================================
// RESET
// ========================================

const resetBooking =
    function () {

        bookingState = {

            ticket: null,

            date: null,

            time: null,

            quantity: 1,

            name: "",

            phone: ""

        };


        pendingBooking =
            null;


        bookingCalendarDate =
            new Date();


        bookingCalendarDate =
            new Date(
                bookingCalendarDate.getFullYear(),
                bookingCalendarDate.getMonth(),
                1
            );


        bookingNameInput.value =
            "";


        bookingPhoneInput.value =
            "";


        bookingDateError.textContent =
            "";


        bookingTimeError.textContent =
            "";


        bookingNameError.textContent =
            "";


        bookingPhoneError.textContent =
            "";


        updateBookingCounter();


        renderBookingCalendar();


        showBookingView(
            bookingTypeView
        );
    };


// ========================================
// OPEN
// ========================================

const openBooking =
    function () {

        resetBooking();


        bookingModal.classList.add(
            "is-open"
        );


        bookingModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );
    };


// ========================================
// CLOSE
// ========================================

const closeBooking =
    function () {

        bookingModal.classList.remove(
            "is-open"
        );


        bookingModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );
    };


// ========================================
// OPEN BUTTON
// ========================================

bookingOpenButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();


                openBooking();
            }
        );
    }
);


// ========================================
// CLOSE BUTTON
// ========================================

bookingClose.addEventListener(
    "click",
    () => {

        closeBooking();
    }
);


// ========================================
// CLICK OUTSIDE
// ========================================

bookingModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            bookingModal
        ) {

            closeBooking();
        }
    }
);


// ========================================
// ESC
// ========================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"

            &&

            bookingModal.classList.contains(
                "is-open"
            )
        ) {

            closeBooking();
        }
    }
);


// ========================================
// FINAL ACTION
// FIX: раніше тут був лише console.log — бронювання ніколи не долітало
// до бекенду. Тепер реальний виклик POST /booking.
// ========================================

let isSubmittingBooking = false;

bookingConfirmationAction.addEventListener(
    "click",
    async () => {

        if (!pendingBooking) {
            return;
        }

        if (isSubmittingBooking) {
            return;
        }

        isSubmittingBooking = true;

        const originalActionText =
            bookingConfirmationAction.textContent;

        bookingConfirmationAction.disabled = true;
        bookingConfirmationAction.textContent = "Оформлюємо...";

        try {

            const payload = {
                customer_name: pendingBooking.customer.name,
                customer_phone: pendingBooking.customer.phone,
                product_id: pendingBooking.ticket.productId,
                booking_date: pendingBooking.date,
                visitors: pendingBooking.visitors,
                ticket_id: pendingBooking.ticket.id,
                times: pendingBooking.times
            };

            const result = await createBooking(payload);

            alert(
                `Бронювання оформлено!\nНомер бронювання: ${result.booking_code}`
            );

            pendingBooking = null;

            closeBooking();

        } catch (error) {

            alert(`Не вдалося оформити бронювання: ${error.message}`);

        } finally {

            isSubmittingBooking = false;
            bookingConfirmationAction.disabled = false;
            bookingConfirmationAction.textContent = originalActionText;
        }
    }
);


// ========================================
// INIT: тягнемо квитки з бекенду (ціна, id, pricingMode),
// об'єднуємо зі статичними даними шаблону (картинка, слоти, опис)
// ========================================

const initBooking = async function () {

    try {

        const response = await fetchAllProducts();
        const allProducts = response.data || [];

        bookingTickets = bookingTicketTemplates
            .map((template) => {

                const matchingProduct = allProducts.find(
                    (product) => product.category === template.category
                );

                if (!matchingProduct) {
                    return null;
                }

                const priceUnit =
                    matchingProduct.pricing_mode === "hour" ? "год" : "ос.";

                return {
                    ...template,
                    productId: matchingProduct.id,
                    priceValue: Number(matchingProduct.price),
                    pricingMode: matchingProduct.pricing_mode,
                    priceText: `${matchingProduct.price} грн/${priceUnit}`
                };
            })
            .filter(Boolean);

        renderBookingTickets();

    } catch (error) {
        console.error("Не вдалося завантажити квитки для бронювання:", error.message);
    }
};


// ========================================
// INITIAL
// ========================================

initBooking();

renderBookingCalendar();

updateBookingCounter();