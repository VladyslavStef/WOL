const CYRILLIC_MAP = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
    ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
    ю: "iu", я: "ia", ы: "y", э: "e", ъ: ""
};

const transliterate = (text) => {
    return text.toString().toLowerCase().split("")
        .map((char) => (CYRILLIC_MAP[char] !== undefined ? CYRILLIC_MAP[char] : char))
        .join("");
};

const slugify = (text) => {
    return transliterate(text)
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

module.exports = { slugify, transliterate };