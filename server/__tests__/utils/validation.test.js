/**
 * Unit Tests for Validation Utilities
 * Tests all validation functions for correctness and edge cases
 */

const {
    isValidEmail,
    isValidPassword,
    isValidLength,
    isValidId,
    isValidUserType,
    isValidPartnerCategory,
    sanitizeString
} = require('../../utils/validation.cjs');


describe('[Test] Validation Utilities', () => {
    describe('isValidEmail', () => {
        test('should accept valid email formats', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('test+tag@example.com')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(isValidEmail('not-an-email')).toBe(false);
            expect(isValidEmail('missing@domain')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail('')).toBe(false);
            expect(isValidEmail(null)).toBe(false);
            expect(isValidEmail(undefined)).toBe(false);
        });

        test('should handle edge cases', () => {
            expect(isValidEmail('a@b.c')).toBe(true);
        });
    });

    describe('isValidPassword', () => {
        test('should accept strong passwords', () => {
            expect(isValidPassword('StrongP@ss123')).toBe(true);
            expect(isValidPassword('MyP@ssw0rd!')).toBe(true);
            expect(isValidPassword('Test123!@#')).toBe(true);
        });

        test('should reject weak passwords', () => {
            expect(isValidPassword('short')).toBe(false);
            expect(isValidPassword('alllowercase123!')).toBe(false);
            expect(isValidPassword('ALLUPPERCASE123!')).toBe(false);
            expect(isValidPassword('NoNumbers!')).toBe(false);
            expect(isValidPassword('NoSpecial123')).toBe(false);
        });

        test('should handle edge cases', () => {
            expect(isValidPassword('')).toBe(false);
            expect(isValidPassword(null)).toBe(false);
            expect(isValidPassword(undefined)).toBe(false);
            expect(isValidPassword('A1!aaaaa')).toBe(true);
        });
    });

    describe('isValidLength', () => {
        test('should accept strings within range', () => {
            expect(isValidLength('test', 2, 10)).toBe(true);
            expect(isValidLength('ab', 2, 10)).toBe(true);
            expect(isValidLength('abcdefghij', 2, 10)).toBe(true);
        });

        test('should reject strings outside range', () => {
            expect(isValidLength('a', 2, 10)).toBe(false);
            expect(isValidLength('abcdefghijk', 2, 10)).toBe(false);
            expect(isValidLength('', 2, 10)).toBe(false);
        });

        test('should handle edge cases', () => {
            expect(isValidLength(null, 2, 10)).toBe(false);
            expect(isValidLength(undefined, 2, 10)).toBe(false);
            expect(isValidLength('test', 0, 5)).toBe(true);
        });
    });

    describe('isValidId', () => {
        test('should accept positive integers', () => {
            expect(isValidId(1)).toBe(true);
            expect(isValidId(100)).toBe(true);
            expect(isValidId('5')).toBe(true);
            expect(isValidId('123')).toBe(true);
        });

        test('should reject invalid integers', () => {
            expect(isValidId(0)).toBe(false);
            expect(isValidId(-1)).toBe(false);
            expect(isValidId(1.5)).toBe(false);
            expect(isValidId('abc')).toBe(false);
            expect(isValidId('')).toBe(false);
            expect(isValidId(null)).toBe(false);
            expect(isValidId(undefined)).toBe(false);
        });

        test('should handle edge cases', () => {
            // Leading zeros should be rejected (not valid IDs)
            expect(isValidId('01')).toBe(false);
            expect(isValidId('001')).toBe(false);
        });
    });

    describe('isValidUserType', () => {
        test('should accept valid user types', () => {
            expect(isValidUserType('INTERNAL')).toBe(true);
            expect(isValidUserType('PARTNER')).toBe(true);
        });

        test('should reject invalid user types', () => {
            expect(isValidUserType('ADMIN')).toBe(false);
            expect(isValidUserType('')).toBe(false);
            expect(isValidUserType(null)).toBe(false);
        });
    });

    describe('isValidPartnerCategory', () => {
        test('should accept valid partner categories', () => {
            expect(isValidPartnerCategory('Bronze')).toBe(true);
            expect(isValidPartnerCategory('Silver')).toBe(true);
            expect(isValidPartnerCategory('Gold')).toBe(true);
        });

        test('should reject invalid partner categories', () => {
            expect(isValidPartnerCategory('Platinum')).toBe(false);
        });

        test('should accept null/undefined (optional field)', () => {
            expect(isValidPartnerCategory(null)).toBe(true);
            expect(isValidPartnerCategory(undefined)).toBe(true);
        });
    });

    describe('sanitizeString', () => {
        test('should trim whitespace', () => {
            expect(sanitizeString('  test  ')).toBe('test');
            expect(sanitizeString('\n\ttest\n\t')).toBe('test');
        });

        test('should remove control characters', () => {
            const withControl = 'test\x00\x01\x1F';
            const sanitized = sanitizeString(withControl);
            expect(sanitized).toBe('test');
        });

        test('should preserve safe characters', () => {
            expect(sanitizeString('Test User 123')).toBe('Test User 123');
            expect(sanitizeString('user@example.com')).toBe('user@example.com');
        });

        test('should handle edge cases', () => {
            expect(sanitizeString('')).toBe('');
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
        });
    });
});
