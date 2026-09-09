document.addEventListener("DOMContentLoaded", () => {
    const burger = document.querySelector(".navbar__burger");
    const menu = document.querySelector(".navbar__list");

    if (!burger || !menu) return;

    burger.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");

        burger.classList.toggle("is-active", isOpen);

        burger.setAttribute(
            "aria-label",
            isOpen ? "Закрити меню" : "Відкрити меню"
        );

        burger.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    /*
     * Закриваємо меню після натискання
     * на будь-яке посилання в ньому.
     */
    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            menu.classList.remove("is-open");
            burger.classList.remove("is-active");

            burger.setAttribute("aria-label", "Відкрити меню");
            burger.setAttribute("aria-expanded", "false");
        });
    });
});