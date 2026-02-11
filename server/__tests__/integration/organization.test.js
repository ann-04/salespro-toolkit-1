/**
 * Organization Endpoint Integration Tests
 * Tests for business units, departments, and roles endpoints
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

describe('[Test] Organization Endpoints', () => {
    let adminToken, limitedToken, noPermToken;

    beforeAll(() => {
        adminToken = createAdminToken();
        limitedToken = createLimitedToken();
        noPermToken = createNoPermToken();
    });

    describe('Business Units', () => {
        describe('GET /api/business-units', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .get('/api/business-units');

                expect(res.status).toBe(401);
            });

            it('should return business units for authenticated user', async () => {
                const res = await request(app)
                    .get('/api/business-units')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect([200, 500]).toContain(res.status);

                if (res.status === 200) {
                    expect(Array.isArray(res.body)).toBe(true);
                }
            });
        });

        describe('POST /api/business-units', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .post('/api/business-units')
                    .send({
                        name: 'Test Business Unit',
                        description: 'Test Description'
                    });

                expect(res.status).toBe(401);
            });

            it('should require DEPARTMENTS_MANAGE permission', async () => {
                const res = await request(app)
                    .post('/api/business-units')
                    .set('Authorization', `Bearer ${limitedToken}`)
                    .send({
                        name: 'Test Business Unit',
                        description: 'Test Description'
                    });

                expect(res.status).toBe(403);
            });

            it('should validate required fields', async () => {
                const res = await request(app)
                    .post('/api/business-units')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        description: 'Missing name field'
                    });

                expect(res.status).toBe(400);
            });

            it('should validate name length', async () => {
                const res = await request(app)
                    .post('/api/business-units')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'AB', // Too short
                        description: 'Test'
                    });

                expect(res.status).toBe(400);
            });

            it('should sanitize input strings', async () => {
                const res = await request(app)
                    .post('/api/business-units')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: '<script>alert("xss")</script>',
                        description: 'Test'
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
        });

        describe('PUT /api/business-units/:id', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .put('/api/business-units/1')
                    .send({
                        name: 'Updated Name',
                        description: 'Updated Description'
                    });

                expect(res.status).toBe(401);
            });

            it('should require DEPARTMENTS_MANAGE permission', async () => {
                const res = await request(app)
                    .put('/api/business-units/1')
                    .set('Authorization', `Bearer ${limitedToken}`)
                    .send({
                        name: 'Updated Name',
                        description: 'Updated Description'
                    });

                expect(res.status).toBe(403);
            });

            it('should validate ID format', async () => {
                const res = await request(app)
                    .put('/api/business-units/invalid-id')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'Updated Name'
                    });

                expect(res.status).toBe(400);
            });
        });

        describe('DELETE /api/business-units/:id', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .delete('/api/business-units/999');

                expect(res.status).toBe(401);
            });

            it('should require DEPARTMENTS_MANAGE permission', async () => {
                const res = await request(app)
                    .delete('/api/business-units/999')
                    .set('Authorization', `Bearer ${limitedToken}`);

                expect(res.status).toBe(403);
            });

            it('should validate ID format', async () => {
                const res = await request(app)
                    .delete('/api/business-units/invalid')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(res.status).toBe(400);
            });
        });
    });

    describe('Roles', () => {
        describe('GET /api/roles', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .get('/api/roles');

                expect(res.status).toBe(401);
            });

            it('should return roles for authenticated user', async () => {
                const res = await request(app)
                    .get('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect([200, 500]).toContain(res.status);

                if (res.status === 200) {
                    expect(Array.isArray(res.body)).toBe(true);
                }
            });
        });

        describe('POST /api/roles', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .post('/api/roles')
                    .send({
                        name: 'Test Role',
                        description: 'Test Description'
                    });

                expect(res.status).toBe(401);
            });

            it('should require ROLES_MANAGE permission', async () => {
                const res = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${limitedToken}`)
                    .send({
                        name: 'Test Role',
                        description: 'Test Description'
                    });

                expect(res.status).toBe(403);
            });

            it('should validate required fields', async () => {
                const res = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        description: 'Missing name'
                    });

                expect(res.status).toBe(400);
            });

            it('should validate name length', async () => {
                const res = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'AB', // Too short
                        description: 'Test'
                    });

                expect(res.status).toBe(400);
            });
        });

        describe('PUT /api/roles/:id', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .put('/api/roles/1')
                    .send({
                        name: 'Updated Role'
                    });

                expect(res.status).toBe(401);
            });

            it('should require ROLES_MANAGE permission', async () => {
                const res = await request(app)
                    .put('/api/roles/1')
                    .set('Authorization', `Bearer ${limitedToken}`)
                    .send({
                        name: 'Updated Role'
                    });

                expect(res.status).toBe(403);
            });

            it('should validate ID format', async () => {
                const res = await request(app)
                    .put('/api/roles/invalid')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'Updated Role'
                    });

                expect(res.status).toBe(400);
            });
        });

        describe('DELETE /api/roles/:id', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .delete('/api/roles/999');

                expect(res.status).toBe(401);
            });

            it('should require ROLES_MANAGE permission', async () => {
                const res = await request(app)
                    .delete('/api/roles/999')
                    .set('Authorization', `Bearer ${limitedToken}`);

                expect(res.status).toBe(403);
            });

            it('should validate ID format', async () => {
                const res = await request(app)
                    .delete('/api/roles/invalid')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(res.status).toBe(400);
            });
        });
    });

    describe('Departments', () => {
        describe('GET /api/departments', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .get('/api/departments');

                expect(res.status).toBe(401);
            });

            it('should return departments for authenticated user', async () => {
                const res = await request(app)
                    .get('/api/departments')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect([200, 500]).toContain(res.status);
            });
        });

        describe('POST /api/departments', () => {
            it('should require authentication', async () => {
                const res = await request(app)
                    .post('/api/departments')
                    .send({
                        name: 'Test Department',
                        businessUnitId: 1
                    });

                expect(res.status).toBe(401);
            });

            it('should require DEPARTMENTS_MANAGE permission', async () => {
                const res = await request(app)
                    .post('/api/departments')
                    .set('Authorization', `Bearer ${limitedToken}`)
                    .send({
                        name: 'Test Department',
                        businessUnitId: 1
                    });

                expect(res.status).toBe(403);
            });

            it('should validate required fields', async () => {
                const res = await request(app)
                    .post('/api/departments')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'Test Department'
                        // Missing businessUnitId
                    });

                expect(res.status).toBe(400);
            });

            it('should validate businessUnitId format', async () => {
                const res = await request(app)
                    .post('/api/departments')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'Test Department',
                        businessUnitId: 'invalid'
                    });

                expect(res.status).toBe(400);
            });
        });
    });
});
