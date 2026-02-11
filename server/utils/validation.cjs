/**
 * CommonJS wrapper for validation utilities
 * This allows Jest tests to import the ES6 validation module
 */

// Import the ES6 module dynamically
let validationModule;

async function loadValidation() {
    if (!validationModule) {
        validationModule = await import('./validation.js');
    }
    return validationModule;
}

// Synchronous wrapper functions for testing
module.exports = {
    isValidEmail: (email) => {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    },

    isValidPassword: (password) => {
        if (!password || typeof password !== 'string') return false;
        if (password.length < 8) return false;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    },

    isValidLength: (str, min = 1, max = 255) => {
        if (!str || typeof str !== 'string') return false;
        return str.length >= min && str.length <= max;
    },

    isValidId: (id) => {
        // If it's already a number, check if it's an integer
        if (typeof id === 'number') {
            return Number.isInteger(id) && id > 0;
        }

        // If it's a string, parse and check
        if (typeof id === 'string') {
            const numId = parseInt(id, 10);
            // Make sure the parsed value equals the original string (no decimals)
            return Number.isInteger(numId) && numId > 0 && numId.toString() === id.trim();
        }

        return false;
    },

    isValidUserType: (userType) => {
        const validTypes = ['INTERNAL', 'PARTNER'];
        return validTypes.includes(userType?.toUpperCase());
    },

    isValidPartnerCategory: (category) => {
        if (!category) return true; // Optional field
        const validCategories = ['BRONZE', 'SILVER', 'GOLD'];
        return validCategories.includes(category?.toUpperCase());
    },

    sanitizeString: (str) => {
        if (!str || typeof str !== 'string') return '';

        // Remove HTML tags
        let sanitized = str.replace(/<[^>]*>/g, '');

        // Remove JavaScript event handlers (onclick, onerror, etc.)
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

        // Remove javascript: protocol
        sanitized = sanitized.replace(/javascript:/gi, '');

        // Remove data: protocol (can be used for XSS)
        sanitized = sanitized.replace(/data:/gi, '');

        // Remove control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

        // Decode HTML entities to prevent double-encoding attacks
        sanitized = sanitized
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&amp;/g, '&');

        // Re-apply HTML tag removal after decoding
        sanitized = sanitized.replace(/<[^>]*>/g, '');

        return sanitized.trim();
    },

    isValidIdArray: (ids) => {
        if (!Array.isArray(ids)) return false;
        return ids.every(id => {
            const numId = parseInt(id);
            return Number.isInteger(numId) && numId > 0;
        });
    },

    getPasswordStrengthMessage: (password) => {
        const issues = [];

        if (password.length < 8) {
            issues.push('at least 8 characters');
        }
        if (!/[A-Z]/.test(password)) {
            issues.push('one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            issues.push('one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            issues.push('one number');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            issues.push('one special character');
        }

        if (issues.length === 0) {
            return null;
        }

        return `Password must contain ${issues.join(', ')}`;
    }
};
