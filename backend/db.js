const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "database.db"),
  err => {
    if (err) console.error(err.message);
    else console.log("SQLite database connected");
  }
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      providerEmail TEXT,
      title TEXT,
      description TEXT,
      price REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serviceId INTEGER,
      customerEmail TEXT,
      slot TEXT,
      status TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS working_hours (
      providerEmail TEXT PRIMARY KEY,
      hours TEXT
    )
  `);
});

module.exports = db;

