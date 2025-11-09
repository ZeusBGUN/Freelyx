const express = require('express');
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
    
    const tokenParts = token.split(' ');
    const tokenValue = tokenParts.length === 2 && tokenParts[0] === 'Bearer' ? tokenParts[1] : token;
    
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

router.post('/', verifyToken, (req, res) => {
    if(req.userType !== 'empresa'){
        return res.status(403).json({
            success: false,
            message: 'Solo las empresas pueden crear contratos'
        });
    }
    
    const { title, description, amount, freelancerId, startDate, endDate } = req.body;
    
    if(!title || !description || !amount || !freelancerId || !startDate || !endDate){
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios'
        });
    }
    
    db.get('SELECT id, userType FROM users WHERE id = ?', [freelancerId], (err, freelancer) => {
        if(err){
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
        
        if(!freelancer){
            return res.status(404).json({
                success: false,
                message: 'Freelancer no encontrado'
            });
        }
        
        if(freelancer.userType !== 'freelancer'){
            return res.status(400).json({
                success: false,
                message: 'El usuario seleccionado no es un freelancer'
            });
        }
        
        const createdAt = new Date().toISOString();
        
        db.run(
            `INSERT INTO contracts (title, description, amount, freelancerId, companyId, createdBy, startDate, endDate, signedByCompany, createdAt, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pendiente')`,
            [title, description, amount, freelancerId, req.userId, req.userId, startDate, endDate, createdAt],
            function(err){
                if(err){
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear contrato: ' + err.message
                    });
                }
                
                res.status(201).json({
                    success: true,
                    message: 'Contrato creado exitosamente',
                    contractId: this.lastID
                });
            }
        );
    });
});

router.get('/', verifyToken, (req, res) => {
    let query;
    let params;
    
    if(req.userType === 'freelancer'){
        query = `SELECT c.*, 
                 u.name as companyName, u.lastName as companyLastName, u.email as companyEmail
                 FROM contracts c
                 JOIN users u ON c.companyId = u.id
                 WHERE c.freelancerId = ?
                 ORDER BY c.createdAt DESC`;
        params = [req.userId];
    } else {
        query = `SELECT c.*, 
                 u.name as freelancerName, u.lastName as freelancerLastName, u.email as freelancerEmail
                 FROM contracts c
                 JOIN users u ON c.freelancerId = u.id
                 WHERE c.companyId = ?
                 ORDER BY c.createdAt DESC`;
        params = [req.userId];
    }
    
    db.all(query, params, (err, contracts) => {
        if(err){
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
        
        res.status(200).json({
            success: true,
            contracts: contracts
        });
    });
});

router.get('/stats', verifyToken, (req, res) => {
    console.log('📊 Petición para obtener estadísticas');
    console.log('👤 Usuario ID:', req.userId, 'Tipo:', req.userType);
    
    if(req.userType === 'freelancer'){
        const userId = req.userId;
        const stats = {};
        
        db.get('SELECT COUNT(*) as total FROM contracts WHERE freelancerId = ?', [userId], (err, result) => {
            if(err) {
                console.error('❌ Error al contar contratos:', err);
                return res.status(500).json({ success: false, message: 'Error en el servidor' });
            }
            stats.totalContracts = result.total;
            
            db.get('SELECT COUNT(*) as count FROM contracts WHERE freelancerId = ? AND status = "activo"', [userId], (err, result) => {
                if(err) {
                    console.error('❌ Error al contar activos:', err);
                    return res.status(500).json({ success: false, message: 'Error en el servidor' });
                }
                stats.activeContracts = result.count;
                
                db.get('SELECT COUNT(*) as count FROM contracts WHERE freelancerId = ? AND status = "completado"', [userId], (err, result) => {
                    if(err) {
                        console.error('❌ Error al contar completados:', err);
                        return res.status(500).json({ success: false, message: 'Error en el servidor' });
                    }
                    stats.completedContracts = result.count;

                    db.get('SELECT SUM(amount) as total FROM contracts WHERE freelancerId = ? AND status = "completado"', [userId], (err, result) => {
                        if(err) {
                            console.error('❌ Error al calcular ingresos:', err);
                            return res.status(500).json({ success: false, message: 'Error en el servidor' });
                        }
                        stats.totalIncome = result.total || 0;

                        db.all(`SELECT c.*, 
                               u.name as companyName, u.lastName as companyLastName 
                               FROM contracts c
                               JOIN users u ON c.companyId = u.id
                               WHERE c.freelancerId = ?
                               ORDER BY c.createdAt DESC
                               LIMIT 5`, [userId], (err, contracts) => {
                            if(err) {
                                console.error('❌ Error al obtener recientes:', err);
                                return res.status(500).json({ success: false, message: 'Error en el servidor' });
                            }
                            stats.recentContracts = contracts;
                            
                            console.log('✅ Estadísticas freelancer calculadas:', stats);
                            
                            res.status(200).json({
                                success: true,
                                stats: stats
                            });
                        });
                    });
                });
            });
        });
        
    } else {
        const userId = req.userId;
        const stats = {};
        
        db.get('SELECT COUNT(*) as total FROM contracts WHERE companyId = ?', [userId], (err, result) => {
            if(err) {
                console.error('❌ Error al contar contratos:', err);
                return res.status(500).json({ success: false, message: 'Error en el servidor' });
            }
            stats.totalContracts = result.total;
            
            db.get('SELECT COUNT(*) as count FROM contracts WHERE companyId = ? AND status = "activo"', [userId], (err, result) => {
                if(err) {
                    console.error('❌ Error al contar activos:', err);
                    return res.status(500).json({ success: false, message: 'Error en el servidor' });
                }
                stats.activeContracts = result.count;
                
                db.get('SELECT COUNT(*) as count FROM contracts WHERE companyId = ? AND status = "completado"', [userId], (err, result) => {
                    if(err) {
                        console.error('❌ Error al contar completados:', err);
                        return res.status(500).json({ success: false, message: 'Error en el servidor' });
                    }
                    stats.completedContracts = result.count;
                    
                    db.get('SELECT SUM(amount) as total FROM contracts WHERE companyId = ?', [userId], (err, result) => {
                        if(err) {
                            console.error('❌ Error al calcular gastos:', err);
                            return res.status(500).json({ success: false, message: 'Error en el servidor' });
                        }
                        stats.totalExpenses = result.total || 0;
                        
                        db.all(`SELECT c.*, 
                               u.name as freelancerName, u.lastName as freelancerLastName 
                               FROM contracts c
                               JOIN users u ON c.freelancerId = u.id
                               WHERE c.companyId = ?
                               ORDER BY c.createdAt DESC
                               LIMIT 5`, [userId], (err, contracts) => {
                            if(err) {
                                console.error('❌ Error al obtener recientes:', err);
                                return res.status(500).json({ success: false, message: 'Error en el servidor' });
                            }
                            stats.recentContracts = contracts;
                            
                            console.log('✅ Estadísticas empresa calculadas:', stats);
                            
                            res.status(200).json({
                                success: true,
                                stats: stats
                            });
                        });
                    });
                });
            });
        });
    }
});

router.put('/:id/sign', verifyToken, (req, res) => {
    const contractId = req.params.id;

    console.log('✍️ Petición para firmar contrato ID:', contractId);
    console.log('👤 Usuario ID:', req.userId, 'Tipo:', req.userType);

    db.get('SELECT * FROM contracts WHERE id = ? AND (freelancerId = ? OR companyId = ?)',
        [contractId, req.userId, req.userId],
        (err, contract) => {
            if (err) {
                console.error('❌ Error en DB:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error en el servidor'
                });
            }

            if (!contract) {
                console.log('❌ Contrato no encontrado');
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            console.log('📋 Contrato encontrado:', contract);

            let updateField;
            let newStatus = contract.status;

            if (req.userId === contract.freelancerId) {
                if (contract.signedByFreelancer) {
                    console.log('⚠️ Freelancer ya firmó');
                    return res.status(400).json({
                        success: false,
                        message: 'Ya has firmado este contrato'
                    });
                }
                updateField = 'signedByFreelancer';
                console.log('✍️ Freelancer firmando...');

                if (contract.signedByCompany) {
                    newStatus = 'activo';
                    console.log('✅ Ambos firmaron, contrato activo');
                }
            } else {
                if (contract.signedByCompany) {
                    console.log('⚠️ Empresa ya firmó');
                    return res.status(400).json({
                        success: false,
                        message: 'Ya has firmado este contrato'
                    });
                }
                updateField = 'signedByCompany';
                console.log('✍️ Empresa firmando...');

                if (contract.signedByFreelancer) {
                    newStatus = 'activo';
                    console.log('✅ Ambos firmaron, contrato activo');
                }
            }

            console.log('🔄 Actualizando:', updateField, '| Nuevo estado:', newStatus);

            db.run(
                `UPDATE contracts SET ${updateField} = 1, status = ? WHERE id = ?`,
                [newStatus, contractId],
                function (err) {
                    if (err) {
                        console.error('❌ Error al actualizar:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error al firmar contrato: ' + err.message
                        });
                    }

                    console.log('✅ Contrato firmado exitosamente');
                    console.log('📊 Cambios realizados:', this.changes);

                    res.status(200).json({
                        success: true,
                        message: 'Contrato firmado exitosamente',
                        status: newStatus
                    });
                }
            );
        }
    );
});

router.put('/:id/status', verifyToken, (req, res) => {
    const contractId = req.params.id;
    const { status } = req.body;

    console.log('🔄 Petición para cambiar estado del contrato ID:', contractId);
    console.log('📊 Nuevo estado:', status);

    const validStatuses = ['pendiente', 'activo', 'completado', 'cancelado'];

    if (!validStatuses.includes(status)) {
        console.log('❌ Estado inválido:', status);
        return res.status(400).json({
            success: false,
            message: 'Estado inválido'
        });
    }

    db.get('SELECT * FROM contracts WHERE id = ? AND (freelancerId = ? OR companyId = ?)',
        [contractId, req.userId, req.userId],
        (err, contract) => {
            if (err) {
                console.error('❌ Error en DB:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error en el servidor'
                });
            }

            if (!contract) {
                console.log('❌ Contrato no encontrado');
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            console.log('🔄 Cambiando estado de:', contract.status, '→', status);

            db.run(
                'UPDATE contracts SET status = ? WHERE id = ?',
                [status, contractId],
                function (err) {
                    if (err) {
                        console.error('❌ Error al actualizar:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Error al actualizar estado: ' + err.message
                        });
                    }

                    console.log('✅ Estado actualizado exitosamente');

                    res.status(200).json({
                        success: true,
                        message: 'Estado actualizado exitosamente'
                    });
                }
            );
        }
    );
});

router.delete('/:id', verifyToken, (req, res) => {
    const contractId = parseInt(req.params.id); 
    
    if (req.userType !== 'empresa') {
        return res.status(403).json({
            success: false,
            message: 'Solo las empresas pueden eliminar contratos'
        });
    }

    db.get('SELECT companyId, status FROM contracts WHERE id = ?', [contractId], (err, contract) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error en el servidor al buscar contrato' });
        }
        
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
        }

        if (contract.companyId !== req.userId) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este contrato' });
        }
        
        if (contract.status !== 'pendiente') {
            return res.status(400).json({ success: false, message: 'Solo se pueden eliminar contratos en estado pendiente' });
        }
        
        db.run('DELETE FROM contracts WHERE id = ?', [contractId], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al eliminar el contrato de la base de datos' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Contrato no encontrado o ya eliminado' }); 
            }

            res.status(200).json({
                success: true,
                message: 'Contrato eliminado exitosamente'
            });
        });
    });
});

router.get('/:id', verifyToken, (req, res) => {
    const contractId = req.params.id;
    
    console.log('📥 Petición para obtener contrato ID:', contractId);
    console.log('👤 Usuario ID:', req.userId, 'Tipo:', req.userType);
    
    const query = `SELECT c.*, 
                   f.name as freelancerName, f.lastName as freelancerLastName, f.email as freelancerEmail,
                   comp.name as companyName, comp.lastName as companyLastName, comp.email as companyEmail
                   FROM contracts c
                   JOIN users f ON c.freelancerId = f.id
                   JOIN users comp ON c.companyId = comp.id
                   WHERE c.id = ? AND (c.freelancerId = ? OR c.companyId = ?)`;
    
    db.get(query, [contractId, req.userId, req.userId], (err, contract) => {
        if(err){
            console.error('❌ Error en DB:', err);
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
        
        if(!contract){
            console.log('❌ Contrato no encontrado o sin permisos');
            return res.status(404).json({
                success: false,
                message: 'Contrato no encontrado'
            });
        }
        
        console.log('✅ Contrato encontrado:', contract);
        
        res.status(200).json({
            success: true,
            contract: contract
        });
    });
});

module.exports = router;
