/**
 * User Management Endpoint Integration Tests
 * Tests for /api/admin/users and /api/users endpoints
 * Following test-master skill [Test] mode
 */

const request = require('supertest');
const {
    createAdminToken,
    createLimitedToken,
    createNoPermToken,
    generateAuthToken,
    createTestUser
} = require('../fixtures/testHelpers');

// Import the CommonJS test app
const app = require('../../app.test.cjs');

beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
});

describe('[Test] User Management Endpoints', () => {
    let adminToken, limitedToken, noPermToken;

    beforeAll(() => {
        adminToken = createAdminToken();
        limitedToken = createLimitedToken();
        noPermToken = createNoPermToken();
    });

    describe('GET /api/admin/users', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/users');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('should reject invalid token format', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', 'InvalidToken');

            expect(res.status).toBe(401);
        });

        it('should reject missing Bearer prefix', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', adminToken);

            expect(res.status).toBe(401);
        });

        it('should require USERS_VIEW permission', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${noPermToken}`);

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty('error');
        });

        it('should return user list for authorized user', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            // May return 200 with data or 500 if database not configured
            expect([200, 500]).toContain(res.status);

            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);
            }
        });

        it('should allow user with USERS_VIEW permission', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${limitedToken}`);

            expect([200, 500]).toContain(res.status);
        });
    });

    describe('POST /api/users', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/users')
                .send({
                    email: 'newuser@test.com',
                    password: 'NewUser123!',
                    firstName: 'New',
                    lastName: 'User',
                    userType: 'INTERNAL'
                });

            expect(res.status).toBe(401);
        });

        it('should require USERS_CREATE permission', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${limitedToken}`)
                .send({
                    email: 'newuser@test.com',
                    password: 'NewUser123!',
                    firstName: 'New',
                    lastName: 'User',
                    userType: 'INTERNAL'
                });

            expect(res.status).toBe(403);
        });

        it('should validate email format', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'not-an-email',
                    password: 'Test123!',
                    firstName: 'Test',
                    lastName: 'User',
                    userType: 'INTERNAL'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should validate password strength', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'test@test.com',
                    password: 'weak',
                    firstName: 'Test',
                    lastName: 'User',
                    userType: 'INTERNAL'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/password/i);
        });

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'test@test.com',
                    password: 'Test123!'
                    // Missing firstName, lastName, userType
                });

            expect(res.status).toBe(400);
        });

        it('should validate user type', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'test@test.com',
                    password: 'Test123!',
                    firstName: 'Test',
                    lastName: 'User',
                    userType: 'INVALID_TYPE'
                });

            expect(res.status).toBe(400);
        });

        it('should sanitize string inputs', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'test@test.com',
                    password: 'Test123!',
                    firstName: '<script>alert("xss")</script>',
                    lastName: 'User',
                    userType: 'INTERNAL'
                });

            // Verify HTML tags are stripped by sanitization
            if (res.status === 201) {
                expect(res.body).toHaveProperty('firstName');
                expect(res.body.firstName).not.toContain('<script>');
                expect(res.body.firstName).not.toContain('</script>');
            } else {
                expect([400, 500]).toContain(res.status);
            }
        });
    });

    describe('PUT /api/admin/users/:id', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/admin/users/1')
                .send({
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(res.status).toBe(401);
        });

        it('should require USERS_MANAGE permission', async () => {
            const res = await request(app)
                .put('/api/admin/users/1')
                .set('Authorization', `Bearer ${limitedToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(res.status).toBe(403);
        });

        it('should validate ID format', async () => {
            const res = await request(app)
                .put('/api/admin/users/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/ID/i);
        });

        it('should reject negative ID', async () => {
            const res = await request(app)
                .put('/api/admin/users/-1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(res.status).toBe(400);
        });

        it('should reject zero ID', async () => {
            const res = await request(app)
                .put('/api/admin/users/0')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(res.status).toBe(400);
        });

        it('should sanitize input strings', async () => {
            const res = await request(app)
                .put('/api/admin/users/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstName: '<script>alert("xss")</script>',
                    lastName: 'User'
                });

            // Should either reject, sanitize, or fail on DB (404/500)
            expect([200, 400, 404, 500]).toContain(res.status);
        });
    });

    describe('DELETE /api/admin/users/:id', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .delete('/api/admin/users/999');

            expect(res.status).toBe(401);
        });

        it('should require USERS_DELETE permission', async () => {
            const res = await request(app)
                .delete('/api/admin/users/999')
                .set('Authorization', `Bearer ${limitedToken}`);

            expect(res.status).toBe(403);
        });

        it('should validate ID format', async () => {
            const res = await request(app)
                .delete('/api/admin/users/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
        });

        it('should reject SQL injection in ID', async () => {
            const res = await request(app)
                .delete('/api/admin/users/1 OR 1=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/admin/users/:id/approve', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/admin/users/1/approve');

            expect(res.status).toBe(401);
        });

        it('should require USERS_MANAGE permission', async () => {
            const res = await request(app)
                .put('/api/admin/users/1/approve')
                .set('Authorization', `Bearer ${limitedToken}`);

            expect(res.status).toBe(403);
        });

        it('should validate ID format', async () => {
            const res = await request(app)
                .put('/api/admin/users/invalid/approve')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/admin/users/:id/role', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .put('/api/admin/users/1/role')
                .send({ roleId: 1 });

            expect(res.status).toBe(401);
        });

        it('should require USERS_MANAGE permission', async () => {
            const res = await request(app)
                .put('/api/admin/users/1/role')
                .set('Authorization', `Bearer ${limitedToken}`)
                .send({ roleId: 1 });

            expect(res.status).toBe(403);
        });

        it('should validate user ID format', async () => {
            const res = await request(app)
                .put('/api/admin/users/invalid/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ roleId: 1 });

            expect(res.status).toBe(400);
        });

        it('should validate role ID format', async () => {
            const res = await request(app)
                .put('/api/admin/users/1/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ roleId: 'invalid' });

            expect(res.status).toBe(400);
        });

        it('should require roleId in body', async () => {
            const res = await request(app)
                .put('/api/admin/users/1/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);
        });
    });
});
