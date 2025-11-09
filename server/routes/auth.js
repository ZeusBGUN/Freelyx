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
    const { email, password } = req.body;

    console.log('📥 Intento de login:', email);

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email y contraseña son obligatorios'
        });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('❌ Error en DB:', err);
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }

        if (!user) {
            console.log('⚠️ Usuario no encontrado');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('❌ Error al comparar contraseñas:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error en el servidor'
                });
            }

            if (!isMatch) {
                console.log('⚠️ Contraseña incorrecta');
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    userType: user.userType
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('✅ Login exitoso:', user.email);

            res.status(200).json({
                success: true,
                message: 'Login exitoso',
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    lastName: user.lastName,
                    email: user.email,
                    userType: user.userType
                }
            });
        });
    });
});

module.exports = router;