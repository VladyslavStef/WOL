// FIX (stock): реальний product.stock — єдине джерело істини для
// максимальної кількості товару в кошику, замість жорсткого MAX_QUANTITY.
const getMaxQuantity = function (product) {

    if (
        product == null ||
        product.stock === null ||
        product.stock === undefined
    ) {
        return 0;
    }

    return Math.max(0, Number(product.stock));
};

let basket =
    JSON.parse(localStorage.getItem("basket")) || [];

let pendingOrder = null;


// ========================================
// DOM
// ========================================

const basketView =
    document.querySelector(".basket-view");

const checkoutView =
    document.querySelector(".checkout-view");

const checkoutBack =
    document.querySelector(".checkout-back");


const basketCount =
    document.querySelector(".basket-count");

const basketButton =
    document.querySelector(".icon-button");

const basketModal =
    document.querySelector(".modal-basket");

const closeBasket =
    document.querySelector(".close");


const basketItems =
    document.querySelector(".basket-items");

const basketItemTemplate =
    document.getElementById("basket-item-template");

const confirmButton =
    document.querySelector(".button-container__button-modal");


// ========================================
// CHECKOUT
// ========================================

const checkoutTotalValue =
    document.querySelector(".checkout-total__value");

const checkoutItems =
    document.querySelector(".checkout-items");

const checkoutSummary =
    document.querySelector(".checkout-summary");


const paymentView =
    document.querySelector(".payment-view");

const paymentBack =
    document.querySelector(".payment-back");

const paymentForm =
    document.querySelector(".payment-form");

const paymentError =
    document.querySelector(".payment-error");


// ========================================
// ORDER CONFIRMATION
// ========================================

const orderConfirmationView =
    document.querySelector(".order-confirmation-view");

const orderConfirmationItems =
    document.querySelector(".order-confirmation__items");

const orderConfirmationName =
    document.querySelector(".order-confirmation__name");

const orderConfirmationPhone =
    document.querySelector(".order-confirmation__phone");

const orderConfirmationPayment =
    document.querySelector(".order-confirmation__payment");

const orderConfirmationTotal =
    document.querySelector(".order-confirmation__total-value");

const orderConfirmationAction =
    document.querySelector(".order-confirmation__action");

const orderConfirmationBack =
    document.querySelector(".order-confirmation__back");


// ========================================
// CUSTOMER FORM
// ========================================

const formCheckout =
    document.querySelector(".checkout-form");

const inputPhoneNumber =
    document.querySelector(
        'input[name="customerNumber"]'
    );

const inputName =
    document.querySelector(
        'input[name="customerName"]'
    );

const phoneError =
    document.querySelector(".phone-error");

const nameError =
    document.querySelector(".name-error");


// ========================================
// SAVE BASKET
// ========================================

const saveBasket = function () {

    localStorage.setItem(
        "basket",
        JSON.stringify(basket)
    );
};


// ========================================
// BASKET COUNT
// ========================================

const updateBasketCount = function () {

    let total = 0;

    basket.forEach((item) => {
        total += item.quantity;
    });

    basketCount.textContent = total;
};


// ========================================
// CONFIRM BUTTON
// ========================================

const updateConfirmButton = function () {

    confirmButton.disabled =
        basket.length === 0;
};


// ========================================
// REMOVE PRODUCT
// ========================================

const removeFromBasket = function (item) {

    basket = basket.filter(
        (basketItem) => {

            return basketItem !== item;
        }
    );

    saveBasket();

    updateBasketCount();

    renderItems();
};


// ========================================
// STOCK RECONCILIATION
// ========================================
// Товар міг лежати в кошику (localStorage переживає перезавантаження), а
// тим часом його реальний stock міг зменшитись/зникнути. Перед показом
// кошика звіряємо з актуальними даними — єдиним джерелом істини.
const reconcileBasketWithStock = async function () {

    if (basket.length === 0) {
        return false;
    }

    try {
        const response = await fetchAllProducts();
        const freshProducts = response.data || [];
        const freshById = new Map(freshProducts.map((product) => [product.id, product]));

        let changed = false;

        basket = basket.filter((item) => {

            const fresh = freshById.get(item.product.id);

            if (!fresh) {
                changed = true;
                return false;
            }

            item.product = fresh;

            const maxQuantity = getMaxQuantity(fresh);

            if (item.quantity > maxQuantity) {
                item.quantity = maxQuantity;
                changed = true;
            }

            return item.quantity > 0;
        });

        if (changed) {
            saveBasket();
            updateBasketCount();
        }

        return changed;

    } catch (error) {
        console.error("Не вдалося перевірити актуальний залишок кошика:", error.message);
        return false;
    }
};


// ========================================
// RENDER BASKET
// ========================================

const renderItems = function () {

    basketItems.innerHTML = "";

    updateConfirmButton();


    if (basket.length === 0) {

        basketItems.innerHTML = `
            <p class="basket-items__empty">
                Товарів поки немає...
            </p>
        `;

        return;
    }


    basket.forEach((item) => {

        const cloneBasketItem =
            basketItemTemplate.content.cloneNode(true);


        const itemName =
            cloneBasketItem.querySelector(
                ".basket-item__name"
            );

        const itemPrice =
            cloneBasketItem.querySelector(
                ".basket-item__price"
            );

        const itemImage =
            cloneBasketItem.querySelector(
                ".basket-item__image"
            );

        const itemQuantity =
            cloneBasketItem.querySelector(
                ".basket-item__count"
            );


        const basketMinus =
            cloneBasketItem.querySelector(
                ".basket-item--minus"
            );

        const basketPlus =
            cloneBasketItem.querySelector(
                ".basket-item--plus"
            );


        const removeButton =
            cloneBasketItem.querySelector(
                ".basket-item__remove"
            );


        const deleteConfirm =
            cloneBasketItem.querySelector(
                ".basket-item__delete-confirm"
            );

        const deleteYes =
            cloneBasketItem.querySelector(
                ".basket-item__delete-yes"
            );

        const deleteNo =
            cloneBasketItem.querySelector(
                ".basket-item__delete-no"
            );


        const updateItemPrice = function () {

            const price =
                Number(item.product.price) *
                item.quantity;

            itemPrice.textContent =
                price + " грн";
        };


        const updatePlusButton = function () {

            basketPlus.disabled =
                item.quantity >= getMaxQuantity(item.product);
        };


        itemName.textContent =
            item.product.title;

        itemImage.src =
            item.product.image;

        itemImage.alt =
            item.product.alt ||
            item.product.title;

        itemQuantity.textContent =
            item.quantity;


        updateItemPrice();

        updatePlusButton();


        basketPlus.addEventListener(
            "click",
            () => {

                if (
                    item.quantity <
                    getMaxQuantity(item.product)
                ) {

                    item.quantity++;

                    saveBasket();

                    updateBasketCount();

                    updateItemPrice();

                    updatePlusButton();

                    itemQuantity.textContent =
                        item.quantity;
                }


                deleteConfirm.classList.remove(
                    "is-visible"
                );
            }
        );


        basketMinus.addEventListener(
            "click",
            () => {

                if (item.quantity > 1) {

                    item.quantity--;

                    saveBasket();

                    updateBasketCount();

                    updateItemPrice();

                    updatePlusButton();

                    itemQuantity.textContent =
                        item.quantity;

                } else {

                    deleteConfirm.classList.add(
                        "is-visible"
                    );
                }
            }
        );


        removeButton.addEventListener(
            "click",
            () => {

                deleteConfirm.classList.add(
                    "is-visible"
                );
            }
        );


        deleteYes.addEventListener(
            "click",
            () => {

                removeFromBasket(item);
            }
        );


        deleteNo.addEventListener(
            "click",
            () => {

                deleteConfirm.classList.remove(
                    "is-visible"
                );
            }
        );


        basketItems.append(
            cloneBasketItem
        );
    });
};


// ========================================
// ADD PRODUCT
// ========================================

const addToBasket = function (product) {

    const maxQuantity = getMaxQuantity(product);

    if (maxQuantity <= 0) {
        return;
    }

    const existingItem =
        basket.find((item) => {

            if (product.id !== undefined && item.product.id !== undefined) {
                return item.product.id === product.id;
            }

            return item.product.title === product.title;
        });


    if (existingItem) {

        if (
            existingItem.quantity <
            getMaxQuantity(existingItem.product)
        ) {

            existingItem.quantity++;
        }

    } else {

        basket.push({
            product: product,
            quantity: 1
        });
    }


    saveBasket();

    updateBasketCount();

    updateConfirmButton();
};


// ========================================
// RENDER CHECKOUT
// ========================================

const renderCheckout = function () {

    checkoutItems.innerHTML = "";

    let total = 0;


    basket.forEach((item) => {

        const itemTotal =
            Number(item.product.price) *
            item.quantity;

        total += itemTotal;


        checkoutItems.innerHTML += `
            <div class="checkout-item">

                <span class="checkout-item__name">
                    ${item.product.title}
                </span>

                <span class="checkout-item__quantity">
                    × ${item.quantity}
                </span>

                <span class="checkout-item__price">
                    ${itemTotal} грн
                </span>

            </div>
        `;
    });


    checkoutTotalValue.textContent =
        total + " грн";
};


// ========================================
// RENDER ORDER CONFIRMATION
// ========================================

const renderOrderConfirmation =
    function (orderData) {

        orderConfirmationItems.innerHTML = "";


        orderData.items.forEach((item) => {

            orderConfirmationItems.innerHTML += `
                <div class="order-confirmation__item">

                    <span class="order-confirmation__item-name">
                        ${item.name}
                    </span>

                    <span class="order-confirmation__item-quantity">
                        × ${item.quantity}
                    </span>

                    <span class="order-confirmation__item-price">
                        ${item.total} грн
                    </span>

                </div>
            `;
        });


        orderConfirmationName.textContent =
            orderData.customer.name;

        orderConfirmationPhone.textContent =
            orderData.customer.phone;


        if (
            orderData.paymentMethod ===
            "online"
        ) {

            orderConfirmationPayment.textContent =
                "Онлайн карткою";

            orderConfirmationAction.textContent =
                "Перейти до оплати";

        } else {

            orderConfirmationPayment.textContent =
                "При отриманні";

            orderConfirmationAction.textContent =
                "Підтвердити замовлення";
        }


        orderConfirmationTotal.textContent =
            orderData.total + " грн";
    };


// ========================================
// OPEN CHECKOUT
// ========================================
// FIX (catalog_enabled): "Підтвердити" з кошика веде до checkout-форми —
// це вже початок оформлення нового замовлення, тож перед відкриттям
// checkout завжди робимо живу перевірку стану каталогу через
// guardCatalogAction. Якщо каталог щойно вимкнули — замість переходу в
// checkout користувач побачить "Лаванда спить".

confirmButton.addEventListener(
    "click",
    () => {

        guardCatalogAction(() => {

            renderCheckout();


            basketView.classList.add(
                "is-hidden"
            );


            checkoutView.classList.add(
                "is-active"
            );


            checkoutSummary.classList.remove(
                "is-hidden"
            );


            paymentView.classList.remove(
                "is-active"
            );


            orderConfirmationView.classList.remove(
                "is-active"
            );


            pendingOrder = null;


            nameError.textContent = "";

            phoneError.textContent = "";

            paymentError.textContent = "";
        });
    }
);


// ========================================
// BACK TO BASKET
// ========================================

checkoutBack.addEventListener(
    "click",
    () => {

        checkoutView.classList.remove(
            "is-active"
        );


        basketView.classList.remove(
            "is-hidden"
        );
    }
);


// ========================================
// CUSTOMER FORM VALIDATION
// ========================================

formCheckout.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const phoneNumber =
            inputPhoneNumber.value.trim();

        const customerName =
            inputName.value.trim();


        const phonePattern =
            /^(?:0\d{9}|\+380\d{9})$/;


        let isValid = true;


        if (
            !phonePattern.test(
                phoneNumber
            )
        ) {

            phoneError.textContent =
                "Введіть номер у форматі 0XXXXXXXXX або +380XXXXXXXXX";

            isValid = false;

        } else {

            phoneError.textContent = "";
        }


        if (
            customerName.length < 2
        ) {

            nameError.textContent =
                "Введіть правильне ім’я";

            isValid = false;

        } else {

            nameError.textContent = "";
        }


        if (!isValid) {
            return;
        }


        checkoutSummary.classList.add(
            "is-hidden"
        );


        paymentView.classList.add(
            "is-active"
        );
    }
);


// ========================================
// BACK FROM PAYMENT
// ========================================

paymentBack.addEventListener(
    "click",
    () => {

        paymentView.classList.remove(
            "is-active"
        );


        checkoutSummary.classList.remove(
            "is-hidden"
        );


        paymentError.textContent = "";
    }
);


// ========================================
// PAYMENT FORM
// ========================================

paymentForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const selectedPayment =
            document.querySelector(
                'input[name="paymentMethod"]:checked'
            );


        if (!selectedPayment) {

            paymentError.textContent =
                "Оберіть спосіб оплати";

            return;
        }


        paymentError.textContent = "";


        let total = 0;


        const orderItems =
            basket.map((item) => {

                const itemTotal =
                    Number(item.product.price) *
                    item.quantity;


                total += itemTotal;


                return {

                    name:
                        item.product.title,

                    price:
                        Number(item.product.price),

                    quantity:
                        item.quantity,

                    total:
                        itemTotal
                };
            });


        const orderData = {

            customer: {

                name:
                    inputName.value.trim(),

                phone:
                    inputPhoneNumber.value.trim()
            },


            paymentMethod:
                selectedPayment.value,


            items:
                orderItems,


            total:
                total
        };


        pendingOrder =
            orderData;


        renderOrderConfirmation(
            orderData
        );


        paymentView.classList.remove(
            "is-active"
        );


        orderConfirmationView.classList.add(
            "is-active"
        );
    }
);


// ========================================
// BACK FROM ORDER CONFIRMATION
// ========================================

orderConfirmationBack.addEventListener(
    "click",
    () => {

        orderConfirmationView.classList.remove(
            "is-active"
        );


        paymentView.classList.add(
            "is-active"
        );
    }
);


// ========================================
// FINAL ORDER ACTION
// ========================================
// FIX (catalog_enabled — критичний сценарій "race condition при checkout"):
// 1. Перед фактичною відправкою запиту ще РАЗ, наостанок, живо перевіряємо
//    стан каталогу. Якщо адмін вимкнув каталог саме поки користувач був
//    на екрані підтвердження — запит навіть не йде на сервер, одразу
//    показується "Лаванда спить".
// 2. Це НЕ замінює backend-перевірку — orderController тепер теж
//    перевіряє site_settings.catalog_enabled і повертає 409 з прапорцем
//    catalogClosed:true, якщо стан змінився буквально між кроком 1 і
//    записом у БД. apiRequest (api.js) переносить catalogClosed у
//    об'єкт помилки — тут його й перевіряємо.

let isSubmittingOrder = false;

orderConfirmationAction.addEventListener(
    "click",
    async () => {

        if (!pendingOrder) {
            return;
        }

        if (isSubmittingOrder) {
            return;
        }

        const catalogStillEnabled = await refreshCatalogStatus();

        if (!catalogStillEnabled) {
            applyCatalogBlockedState();
            return; // запит на сервер узагалі не відправляється
        }

        isSubmittingOrder = true;

        const originalActionText =
            orderConfirmationAction.textContent;

        orderConfirmationAction.disabled = true;
        orderConfirmationAction.textContent = "Оформлюємо...";

        try {

            const payload = {
                customer_name: pendingOrder.customer.name,
                customer_phone: pendingOrder.customer.phone,
                payment_method: pendingOrder.paymentMethod,
                items: basket.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity
                }))
            };

            const result = await createOrder(payload);

            alert(
                `Замовлення оформлено!\nНомер замовлення: ${result.order_code}\nСума: ${result.total_price} грн`
            );

            basket = [];
            saveBasket();
            updateBasketCount();

            pendingOrder = null;

            closeBasketModal();

        } catch (error) {

            if (error.catalogClosed) {
                // Бекенд відхилив замовлення саме через глобальне
                // вимкнення каталогу (спрацювало між кроком 1 і записом
                // у БД) — показуємо ту саму спільну модалку, а не
                // технічний alert. Order НЕ створено.
                applyCatalogBlockedState();
            } else {

                alert(`Не вдалося оформити замовлення: ${error.message}`);

                // Якщо причина — недостатній stock (гонка з іншим
                // покупцем), одразу звіряємо кошик з актуальним складом.
                await reconcileBasketWithStock();
                renderItems();
            }

        } finally {

            isSubmittingOrder = false;
            orderConfirmationAction.disabled = false;
            orderConfirmationAction.textContent = originalActionText;
        }
    }
);


// ========================================
// OPEN BASKET
// ========================================

const openBasket = async function () {

    checkoutView.classList.remove(
        "is-active"
    );


    basketView.classList.remove(
        "is-hidden"
    );


    checkoutSummary.classList.remove(
        "is-hidden"
    );


    paymentView.classList.remove(
        "is-active"
    );


    orderConfirmationView.classList.remove(
        "is-active"
    );


    pendingOrder = null;


    const stockChanged = await reconcileBasketWithStock();

    renderItems();


    basketModal.classList.add(
        "is-open"
    );


    document.body.classList.add(
        "modal-open"
    );

    if (stockChanged) {
        alert("Наявність деяких товарів у кошику змінилася — кількість оновлено відповідно до складу.");
    }
};


// ========================================
// CLOSE BASKET
// ========================================

const closeBasketModal = function () {

    basketModal.classList.remove(
        "is-open"
    );


    document.body.classList.remove(
        "modal-open"
    );
};


// ========================================
// EVENTS
// ========================================

basketButton.addEventListener(
    "click",
    () => {

        openBasket();
    }
);


closeBasket.addEventListener(
    "click",
    () => {

        closeBasketModal();
    }
);


// ========================================
// INITIAL STATE
// ========================================

updateBasketCount();

updateConfirmButton();
