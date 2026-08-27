// Run this from your project root (where bcryptjs is already installed):
//   node scripts/hashPassword.js "your-real-password"
//
// Copy the printed hash into db.sql's admin INSERT statement,
// or run the INSERT manually in psql with the printed hash.

const bcrypt = require("bcryptjs");

const plainPassword = process.argv[2];

if (!plainPassword) {
    console.error("Використання: node scripts/hashPassword.js \"ваш_пароль\"");
    process.exit(1);
}

bcrypt.hash(plainPassword, 10).then((hash) => {
    console.log("\nЗгенерований bcrypt-хеш (встав його у password_hash):\n");
    console.log(hash);
    console.log("\nПриклад SQL:\n");
    console.log(
        `INSERT INTO admin (name, password_hash) VALUES ('wonder_of_lavender', '${hash}');\n`
    );
});
