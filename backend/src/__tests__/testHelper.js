const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'auteide_dev_secret_2026';

/**
 * Genera un token JWT para usar en los tests de Supertest.
 */
function generateTestToken(user = { id: 1, role: 'admin', branchId: 1 }) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { generateTestToken };
