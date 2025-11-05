const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/freelance.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if(err){
        console.error('❌ Error al conectar con la base de datos:', err);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
    }
});

db.serialize(() => {
    // Tabla de usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            userType TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            updatedAt TEXT,
            lastLogin TEXT
        )
    `, (err) => {
        if(err){
            console.error('❌ Error al crear tabla users:', err);
        } else {
            console.log('✅ Tabla users lista');
        }
    });
    
    // Tabla de contratos
    db.run(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            status TEXT DEFAULT 'pendiente',
            freelancerId INTEGER NOT NULL,
            companyId INTEGER NOT NULL,
            createdBy INTEGER NOT NULL,
            startDate TEXT NOT NULL,
            endDate TEXT NOT NULL,
            signedByFreelancer INTEGER DEFAULT 0,
            signedByCompany INTEGER DEFAULT 0,
            createdAt TEXT NOT NULL,
            updatedAt TEXT,
            FOREIGN KEY (freelancerId) REFERENCES users(id),
            FOREIGN KEY (companyId) REFERENCES users(id),
            FOREIGN KEY (createdBy) REFERENCES users(id)
        )
    `, (err) => {
        if(err){
            console.error('❌ Error al crear tabla contracts:', err);
        } else {
            console.log('✅ Tabla contracts lista');
        }
    });
});

module.exports = db;