require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contractRoutes = require('./routes/contracts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contracts', contractRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/Freelancer.html'));
});

app.listen(PORT, () => {
    console.log('Servidor corriendo en http://localhost:' + PORT);
});