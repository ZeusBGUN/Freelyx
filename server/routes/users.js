const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

function verifyToken(req, res, next){
    const token = req.headers['authorization'];
    
    if(!token){
        return res.status(401).json({
            success: false,
            message: 'Token no proporcionado'
        });
    }
    
    const tokenValue = token.split(' ')[1] || token;
    
    try {
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userType = decoded.userType;
        next();
    } catch(error){
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
}

router.get('/profile', verifyToken, (req, res) => {
    const userId = req.userId;

    db.get('SELECT id, name, lastName, email, userType, createdAt, lastLogin FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            user: user
        });
    });
});

router.put('/profile', verifyToken, (req, res) => {
    const userId = req.userId;
    const { name, lastName, email } = req.body;

    if (!name || !lastName || !email) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios'
        });
    }

    db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, existingUser) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está en uso'
            });
        }

        const updatedAt = new Date().toISOString();

        db.run(
            'UPDATE users SET name = ?, lastName = ?, email = ?, updatedAt = ? WHERE id = ?',
            [name, lastName, email, updatedAt, userId],
            function (err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error al actualizar perfil'
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'Perfil actualizado exitosamente',
                    user: {
                        name,
                        lastName,
                        email
                    }
                });
            }
        );
    });
});

router.put('/password', verifyToken, async (req, res) => {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
    }

    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedAt = new Date().toISOString();

        db.run(
            'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
            [hashedPassword, updatedAt, userId],
            function (err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error al cambiar contraseña'
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'Contraseña cambiada exitosamente'
                });
            }
        );
    });
});

router.get('/stats', verifyToken, (req, res) => {
    const userId = req.userId;
    const userType = req.userType;

    if (userType === 'freelancer') {

        db.get(
            'SELECT COUNT(*) as count FROM contracts WHERE freelancerId = ? AND status = ?',
            [userId, 'activo'],
            (err, activeContracts) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error en el servidor' });
                }

                db.get(
                    'SELECT COUNT(*) as count FROM contracts WHERE freelancerId = ? AND status = ?',
                    [userId, 'completado'],
                    (err, completedProjects) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Error en el servidor' });
                        }

                        const currentMonth = new Date().getMonth() + 1;
                        const currentYear = new Date().getFullYear();

                        db.get(
                            `SELECT SUM(amount) as total FROM contracts 
                             WHERE freelancerId = ? 
                             AND status = 'completado'
                             AND strftime('%m', updatedAt) = ?
                             AND strftime('%Y', updatedAt) = ?`,
                            [userId, currentMonth.toString().padStart(2, '0'), currentYear.toString()],
                            (err, monthlyIncome) => {
                                if (err) {
                                    return res.status(500).json({ success: false, message: 'Error en el servidor' });
                                }

                                db.get(
                                    'SELECT SUM(amount) as total FROM contracts WHERE freelancerId = ? AND status = ?',
                                    [userId, 'completado'],
                                    (err, totalIncome) => {
                                        if (err) {
                                            return res.status(500).json({ success: false, message: 'Error en el servidor' });
                                        }

                                        res.status(200).json({
                                            success: true,
                                            stats: {
                                                activeContracts: activeContracts.count || 0,
                                                completedProjects: completedProjects.count || 0,
                                                monthlyIncome: monthlyIncome.total || 0,
                                                totalIncome: totalIncome.total || 0,
                                                rating: 4.8
                                            }
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );

    } else {
        db.get(
            'SELECT COUNT(DISTINCT freelancerId) as count FROM contracts WHERE companyId = ? AND status = ?',
            [userId, 'activo'],
            (err, activeFreelancers) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error en el servidor' });
                }

                db.get(
                    'SELECT COUNT(*) as count FROM contracts WHERE companyId = ? AND status = ?',
                    [userId, 'activo'],
                    (err, activeProjects) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Error en el servidor' });
                        }

                        const currentMonth = new Date().getMonth() + 1;
                        const currentYear = new Date().getFullYear();

                        db.get(
                            `SELECT SUM(amount) as total FROM contracts 
                             WHERE companyId = ? 
                             AND strftime('%m', createdAt) = ?
                             AND strftime('%Y', createdAt) = ?`,
                            [userId, currentMonth.toString().padStart(2, '0'), currentYear.toString()],
                            (err, monthlyInvestment) => {
                                if (err) {
                                    return res.status(500).json({ success: false, message: 'Error en el servidor' });
                                }

                                db.get(
                                    'SELECT COUNT(*) as count FROM contracts WHERE companyId = ? AND status = ?',
                                    [userId, 'completado'],
                                    (err, completedProjects) => {
                                        if (err) {
                                            return res.status(500).json({ success: false, message: 'Error en el servidor' });
                                        }

                                        res.status(200).json({
                                            success: true,
                                            stats: {
                                                activeFreelancers: activeFreelancers.count || 0,
                                                activeProjects: activeProjects.count || 0,
                                                monthlyInvestment: monthlyInvestment.total || 0,
                                                completedProjects: completedProjects.count || 0
                                            }
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
});

router.get('/freelancers', verifyToken, (req, res) => {
    if(req.userType !== 'empresa'){
        return res.status(403).json({
            success: false,
            message: 'Solo las empresas pueden acceder a esta información'
        });
    }
    
    db.all(
        'SELECT id, name, lastName, email, createdAt FROM users WHERE userType = ?',
        ['freelancer'],
        (err, freelancers) => {
            if(err){
                return res.status(500).json({
                    success: false,
                    message: 'Error en el servidor'
                });
            }
            
            res.status(200).json({
                success: true,
                freelancers: freelancers
            });
        }
    );
});

module.exports = router;