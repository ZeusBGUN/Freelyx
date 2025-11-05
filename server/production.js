module.exports = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_PATH: process.env.DATABASE_PATH || './database.sqlite',
    NODE_ENV: 'production',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};