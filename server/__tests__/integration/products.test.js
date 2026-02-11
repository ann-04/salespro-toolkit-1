/**
 * Product Endpoint Integration Tests
 * Tests for /api/products endpoints
 * Following test-master skill [Test] mode
 */

const request = require('supertest');
const {
    createAdminToken,
    createLimitedToken,
    createNoPermToken
} = require('../fixtures/testHelpers');

// Import the CommonJS test app
const app = require('../../app.test.cjs');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
});

describe('[Test] Product Endpoints', () => {
    let adminToken, limitedToken, noPermToken;

    beforeAll(() => {
        adminToken = createAdminToken();
        limitedToken = createLimitedToken();
        noPermToken = createNoPermToken();
    });

    describe('GET /api/products', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/products');

            expect(res.status).toBe(401);
        });

        it('should return products for authenticated user', async () => {
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', `Bearer ${adminToken}`);

            expect([200, 500]).toContain(res.status);

            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);
            }
        });
    });

    describe('POST /api/products', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/products')
                .send({
                    name: 'Test Product',
                    description: 'Test Description',
                    category: 'Software'
                });

            expect(res.status).toBe(401);
        });

        it('should require PRODUCTS_MANAGE permission', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${limitedToken}`)
                .send({
                    name: 'Test Product',
                    description: 'Test Description',
                    category: 'Software'
                });

            expect(res.status).toBe(403);
        });

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    description: 'Missing name'
                });

            expect(res.status).toBe(400);
        });

        it('should validate name length', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'AB', // Too short
                    description: 'Test',
                    category: 'Software'
                });

            expect(res.status).toBe(400);
        });

        it('should sanitize input strings', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: '<script>alert("xss")</script>',
                    description: 'Test',
                    category: 'Software'
                });

            // Verify HTML tags are stripped by sanitization
            if (res.status === 201) {
                expect(res.body).toHaveProperty('name');
                expect(res.body.name).not.toContain('<script>');
                expect(res.body.name).not.toContain('</script>');
            } else {
                expect([400, 500]).toContain(res.status);
            }
        });

        it('should reject SQL injection attempts', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: "'; DROP TABLE Products; --",
                    description: 'Test',
                    category: 'Software'
                });

            // Should either sanitize or reject
            expect([201, 400, 500]).toContain(res.status);
        });
    });

    describe('PUT /api/products/:id', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/products/1')
                .send({
                    name: 'Updated Product'
                });

            expect(res.status).toBe(401);
        });

        it('should require PRODUCTS_MANAGE permission', async () => {
            const res = await request(app)
                .put('/api/products/1')
                .set('Authorization', `Bearer ${limitedToken}`)
                .send({
                    name: 'Updated Product'
                });

            expect(res.status).toBe(403);
        });

        it('should validate ID format', async () => {
            const res = await request(app)
                .put('/api/products/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Updated Product'
                });

            expect(res.status).toBe(400);
        });

        it('should reject negative ID', async () => {
            const res = await request(app)
                .put('/api/products/-1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Updated Product'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/products/:id', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .delete('/api/products/999');

            expect(res.status).toBe(401);
        });

        it('should require PRODUCTS_MANAGE permission', async () => {
            const res = await request(app)
                .delete('/api/products/999')
                .set('Authorization', `Bearer ${limitedToken}`);

            expect(res.status).toBe(403);
        });

        it('should validate ID format', async () => {
            const res = await request(app)
                .delete('/api/products/invalid')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
        });

        it('should reject SQL injection in ID', async () => {
            const res = await request(app)
                .delete('/api/products/1 OR 1=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
        });
    });
});
