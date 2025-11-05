const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, lastName, email, password, userType } = req.body;

        if (!name || !lastName || !email || !password || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error en el servidor'
                });
            }

            if (user) {
                return res.status(500).json({
                    success: false,
                    message: 'El email ya esta registrado'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const createdAt = new Date().toISOString();

            db.run(
                `INSERT INTO users (name, lastName, email, password, userType, createdAt)
                VALUES (?,?,?,?,?,?)`,
                [name, lastName, email, hashedPassword, userType, createdAt],
                function (err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al crear usuario'
                        });
                    }

                    const token = jwt.sign(
                        {
                            userId: this.lastID,
                            email,
                            userType
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.status(201).json({
                        success: true,
                        message: 'Usuario creado exitosamente',
                        token,
                        user: {
                            id: this.lastID,
                            name,
                            lastName,
                            email,
                            userType
                        }
                    });
                }
            );
        });


    } catch (error) {
        console.error('Error en /register:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
});

router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son obligatorios'
            });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error en el servidor'
                });
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Email o contraseña incorrectos'
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Email o contraseña incorrectos'
                });
            }

            const lastLogin = new Date().toISOString();
            db.run('UPDATE users SET lastLogin = ? WHERE id = ?', [lastLogin, user.id]);

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    userType: user.userType
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                message: 'Login exitoso',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    lastName: user.lastName,
                    email: user.email,
                    userType: user.userType
                }
            });
        });

    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
});

module.exports = router;