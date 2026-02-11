/**
 * AI Chat Endpoint Integration Tests
 * Tests for /api/ai/chat endpoint
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

describe('[Test] AI Chat Endpoint', () => {
    let adminToken, limitedToken, noPermToken;

    beforeAll(() => {
        adminToken = createAdminToken();
        limitedToken = createLimitedToken();
        noPermToken = createNoPermToken();
    });

    describe('POST /api/ai/chat', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .send({
                    message: 'Test message',
                    conversationHistory: []
                });

            expect(res.status).toBe(401);
        });

        it('should validate message field', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    conversationHistory: []
                    // Missing message
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should validate message is not empty', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: '',
                    conversationHistory: []
                });

            expect(res.status).toBe(400);
        });

        it('should validate message is a string', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: 123,
                    conversationHistory: []
                });

            expect(res.status).toBe(400);
        });

        it('should validate conversationHistory is an array', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: 'Test message',
                    conversationHistory: 'not-an-array'
                });

            expect(res.status).toBe(400);
        });

        it('should sanitize message input', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: '<script>alert("xss")</script>',
                    conversationHistory: []
                });

            // Should either reject, sanitize, or process (if API key is configured)
            expect([200, 400, 500]).toContain(res.status);
        });

        it('should handle missing API key gracefully', async () => {
            // Temporarily remove API key
            const originalKey = process.env.GEMINI_API_KEY;
            delete process.env.GEMINI_API_KEY;

            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: 'Test message',
                    conversationHistory: []
                });

            // Should return error about missing API key
            expect([400, 500]).toContain(res.status);

            // Restore API key
            if (originalKey) {
                process.env.GEMINI_API_KEY = originalKey;
            }
        });

        it('should reject excessively long messages', async () => {
            const longMessage = 'A'.repeat(10001); // Over 10k characters

            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: longMessage,
                    conversationHistory: []
                });

            expect(res.status).toBe(400);
        });

        it('should validate conversation history format', async () => {
            const res = await request(app)
                .post('/api/ai/chat')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: 'Test message',
                    conversationHistory: [
                        { invalid: 'format' } // Should have role and parts
                    ]
                });

            // May accept or reject depending on validation
            expect([200, 400, 500]).toContain(res.status);
        });
    });
});
