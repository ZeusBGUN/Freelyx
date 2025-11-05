const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if(err){
        console.error('❌ Error al conectar a la base de datos:', err);
    } else {
        console.log('✅ Conectado a la base de datos SQLite en:', dbPath);
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        userType TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if(err){
            console.error('❌ Error al crear tabla users:', err);
        } else {
            console.log('✅ Tabla users lista');
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        freelancerId INTEGER NOT NULL,
        companyId INTEGER NOT NULL,
        createdBy INTEGER NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        status TEXT DEFAULT 'pendiente',
        signedByFreelancer INTEGER DEFAULT 0,
        signedByCompany INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (freelancerId) REFERENCES users(id),
        FOREIGN KEY (companyId) REFERENCES users(id),
        FOREIGN KEY (createdBy) REFERENCES users(id)
    )`, (err) => {
        if(err){
            console.error('❌ Error al crear tabla contracts:', err);
        } else {
            console.log('✅ Tabla contracts lista');
        }
    });
});

module.exports = db;