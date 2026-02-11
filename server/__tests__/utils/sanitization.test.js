/**
 * Sanitization Function Unit Tests
 * Tests for the enhanced sanitizeString function
 */

const { sanitizeString } = require('../../utils/validation.cjs');

describe('[Test] sanitizeString Function', () => {
    describe('Basic HTML Tag Removal', () => {
        it('should remove script tags', () => {
            const input = '<script>alert("xss")</script>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<script>');
            expect(result).not.toContain('</script>');
            expect(result).toBe('alert("xss")');
        });

        it('should remove img tags', () => {
            const input = '<img src="x" onerror="alert(1)">';
            const result = sanitizeString(input);

            expect(result).not.toContain('<img');
            expect(result).not.toContain('onerror');
        });

        it('should remove anchor tags', () => {
            const input = '<a href="http://evil.com">Click me</a>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<a');
            expect(result).not.toContain('</a>');
            expect(result).toBe('Click me');
        });

        it('should remove multiple tags', () => {
            const input = '<div><span>Hello</span> <b>World</b></div>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).toBe('Hello World');
        });

        it('should remove nested tags', () => {
            const input = '<div><script><img src=x></script></div>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
        });
    });

    describe('JavaScript Event Handler Removal', () => {
        it('should remove onclick handler', () => {
            const input = 'onclick="alert(1)"';
            const result = sanitizeString(input);

            expect(result).not.toContain('onclick');
        });

        it('should remove onerror handler', () => {
            const input = 'onerror="alert(1)"';
            const result = sanitizeString(input);

            expect(result).not.toContain('onerror');
        });

        it('should remove onload handler', () => {
            const input = 'onload="malicious()"';
            const result = sanitizeString(input);

            expect(result).not.toContain('onload');
        });

        it('should remove multiple event handlers', () => {
            const input = 'onclick="a()" onmouseover="b()" onerror="c()"';
            const result = sanitizeString(input);

            expect(result).not.toContain('onclick');
            expect(result).not.toContain('onmouseover');
            expect(result).not.toContain('onerror');
        });
    });

    describe('Protocol Removal', () => {
        it('should remove javascript: protocol', () => {
            const input = 'javascript:alert(1)';
            const result = sanitizeString(input);

            expect(result).not.toContain('javascript:');
            expect(result).toBe('alert(1)');
        });

        it('should remove data: protocol', () => {
            const input = 'data:text/html,<script>alert(1)</script>';
            const result = sanitizeString(input);

            expect(result).not.toContain('data:');
            expect(result).not.toContain('<script>');
        });

        it('should handle mixed case protocols', () => {
            const input = 'JaVaScRiPt:alert(1)';
            const result = sanitizeString(input);

            expect(result.toLowerCase()).not.toContain('javascript:');
        });
    });

    describe('HTML Entity Decoding', () => {
        it('should decode and remove &lt;script&gt; tags', () => {
            const input = '&lt;script&gt;alert("xss")&lt;/script&gt;';
            const result = sanitizeString(input);

            expect(result).not.toContain('<script>');
            expect(result).not.toContain('&lt;');
            expect(result).toBe('alert("xss")');
        });

        it('should handle double-encoded entities', () => {
            const input = '&amp;lt;script&amp;gt;';
            const result = sanitizeString(input);

            // After first decode: &lt;script&gt;
            // After second decode and tag removal: empty or "script"
            expect(result).not.toContain('<script>');
        });

        it('should decode quotes', () => {
            const input = '&quot;Hello&quot;';
            const result = sanitizeString(input);

            expect(result).toBe('"Hello"');
        });

        it('should decode apostrophes', () => {
            const input = '&#x27;Hello&#x27;';
            const result = sanitizeString(input);

            expect(result).toBe("'Hello'");
        });
    });

    describe('Control Character Removal', () => {
        it('should remove null bytes', () => {
            const input = 'Hello\x00World';
            const result = sanitizeString(input);

            expect(result).toBe('HelloWorld');
        });

        it('should remove control characters', () => {
            const input = 'Hello\x01\x02\x03World';
            const result = sanitizeString(input);

            expect(result).toBe('HelloWorld');
        });

        it('should remove DEL character', () => {
            const input = 'Hello\x7FWorld';
            const result = sanitizeString(input);

            expect(result).toBe('HelloWorld');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string', () => {
            expect(sanitizeString('')).toBe('');
        });

        it('should handle null', () => {
            expect(sanitizeString(null)).toBe('');
        });

        it('should handle undefined', () => {
            expect(sanitizeString(undefined)).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizeString(123)).toBe('');
            expect(sanitizeString({})).toBe('');
            expect(sanitizeString([])).toBe('');
        });

        it('should trim whitespace', () => {
            const input = '  Hello World  ';
            const result = sanitizeString(input);

            expect(result).toBe('Hello World');
        });

        it('should preserve legitimate text', () => {
            const input = 'This is a normal string with numbers 123 and symbols !@#';
            const result = sanitizeString(input);

            expect(result).toBe(input);
        });

        it('should handle malformed tags', () => {
            const input = '<script>alert(1)<script>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
        });

        it('should handle tags without closing bracket', () => {
            const input = '<script alert(1)';
            const result = sanitizeString(input);

            // Regex won't match incomplete tags, so they remain
            // This is acceptable as they won't execute
            expect(result).toContain('alert(1)');
        });
    });

    describe('Real-World XSS Attempts', () => {
        it('should prevent basic XSS', () => {
            const input = '<script>alert(document.cookie)</script>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<script>');
            expect(result).toBe('alert(document.cookie)');
        });

        it('should prevent img onerror XSS', () => {
            const input = '<img src=x onerror=alert(1)>';
            const result = sanitizeString(input);

            expect(result).not.toContain('onerror');
            expect(result).not.toContain('<img');
        });

        it('should prevent iframe XSS', () => {
            const input = '<iframe src="javascript:alert(1)"></iframe>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<iframe');
            expect(result).not.toContain('javascript:');
        });

        it('should prevent SVG XSS', () => {
            const input = '<svg onload=alert(1)>';
            const result = sanitizeString(input);

            expect(result).not.toContain('<svg');
            expect(result).not.toContain('onload');
        });

        it('should prevent encoded XSS', () => {
            const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
            const result = sanitizeString(input);

            expect(result).not.toContain('<script>');
            expect(result).toBe('alert(1)');
        });
    });
});
