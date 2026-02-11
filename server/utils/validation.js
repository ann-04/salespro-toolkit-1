/**
 * Input Validation Utilities
 * Following security best practices for input validation
 */

/**
 * Validate email format
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function isValidPassword(password) {
    if (!password || typeof password !== 'string') {
        return false;
    }

    if (password.length < 8) {
        return false;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
}

/**
 * Validate string length
 */
export function isValidLength(str, min = 1, max = 255) {
    if (!str || typeof str !== 'string') {
        return false;
    }
    return str.length >= min && str.length <= max;
}

/**
 * Validate user type
 */
export function isValidUserType(userType) {
    const validTypes = ['INTERNAL', 'PARTNER'];
    return validTypes.includes(userType?.toUpperCase());
}

/**
 * Validate partner category
 */
export function isValidPartnerCategory(category) {
    if (!category) return true; // Optional field
    const validCategories = ['BRONZE', 'SILVER', 'GOLD'];
    return validCategories.includes(category?.toUpperCase());
}

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags, JavaScript event handlers, and dangerous protocols
 */
export function sanitizeString(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

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
}

/**
 * Validate integer ID
 */
export function isValidId(id) {
    const numId = parseInt(id);
    return Number.isInteger(numId) && numId > 0;
}

/**
 * Validate array of IDs
 */
export function isValidIdArray(ids) {
    if (!Array.isArray(ids)) {
        return false;
    }
    return ids.every(id => isValidId(id));
}

/**
 * Get password strength message
 */
export function getPasswordStrengthMessage(password) {
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
