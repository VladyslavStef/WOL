// ========================================
// ПРОСТИЙ IN-MEMORY RATE LIMITER
// ========================================
//
// Без нової npm-залежності (express-rate-limit) — для одного backend-
// інстансу in-memory Map достатньо. Якщо згодом з'явиться кілька
// інстансів за балансувальником, лічильник варто перенести в спільне
// сховище (Redis) — не зараз, не потрібно для поточного масштабу.
//

const createRateLimiter = function ({ windowMs, max, message }) {
    const hitsByKey = new Map();

    return function rateLimiter(req, res, next) {
        const key = req.ip;
        const now = Date.now();

        const entry = hitsByKey.get(key) || { count: 0, windowStart: now };

        if (now - entry.windowStart > windowMs) {
            entry.count = 0;
            entry.windowStart = now;
        }

        entry.count += 1;
        hitsByKey.set(key, entry);

        if (entry.count > max) {
            return res.status(429).json({
                success: false,
                message: message || "Забагато запитів. Спробуйте пізніше.",
            });
        }

        next();
    };
};

module.exports = { createRateLimiter };