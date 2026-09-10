//  це варто перенести в Redis.
const attemptsByIp = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 хвилин
const MAX_ATTEMPTS = 10;

module.exports = function loginRateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();

    const entry = attemptsByIp.get(ip) || { count: 0, windowStart: now };

    if (now - entry.windowStart > WINDOW_MS) {
        entry.count = 0;
        entry.windowStart = now;
    }

    entry.count += 1;
    attemptsByIp.set(ip, entry);

    if (entry.count > MAX_ATTEMPTS) {
        return res.status(429).json({
            success: false,
            message: "Забагато спроб входу. Спробуйте пізніше."
        });
    }

    next();
};