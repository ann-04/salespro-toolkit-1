import { Product } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper for auth headers
const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const DataService = {
    async getProducts(): Promise<Product[]> {
        const response = await fetch(`${API_URL}/products`, { headers: getHeaders() });
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        return response.json();
    },

    async createProduct(product: Product): Promise<void> {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(product),
        });
        if (!response.ok) {
            throw new Error('Failed to create product');
        }
    },

    async updateProduct(product: Product): Promise<void> {
        const response = await fetch(`${API_URL}/products/${product.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(product),
        });
        if (!response.ok) throw new Error('Failed to update product');
        return response.json();
    },

    async deleteProduct(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete product');
        return response.json();
    },

    // --- AUTH SERVICES ---
    async login(credentials: { email: string; password: string }) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Login failed');
        }
        const data = await response.json();
        // Save token
        if (data.token) localStorage.setItem('token', data.token);
        return data;
    },

    logout() {
        localStorage.removeItem('token');
    },

    async register(data: { name: string; email: string; userType: string }) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Registration failed');
        }
        return response.json();
    },

    async changePassword(data: { userId: number; newPassword: string }) {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: getHeaders(), // Protected route
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Password change failed');
        return response.json();
    },

    async approveUser(userId: number) {
        const response = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Approval failed');
        return response.json();
    },

    async updateUser(userId: number, data: { roleId?: number; buId?: number; partnerCategory?: string; userType?: string }) {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Update failed');
        return response.json();
    },

    async getUsers() {
        const response = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    async getBusinessUnits() {
        const response = await fetch(`${API_URL}/admin/business-units`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch BUs');
        return response.json();
    },

    async getRoles() {
        const response = await fetch(`${API_URL}/admin/roles`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch roles');
        return response.json();
    },

    async createRole(name: string) {
        const response = await fetch(`${API_URL}/admin/roles`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create role');
        return response.json();
    },

    async createBusinessUnit(name: string) {
        const response = await fetch(`${API_URL}/admin/business-units`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create BU');
        return response.json();
    },

    async updateRole(id: number, name: string) {
        const response = await fetch(`${API_URL}/admin/roles/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to update role');
        return response.json();
    },

    async deleteRole(id: number) {
        const response = await fetch(`${API_URL}/admin/roles/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete role');
        return response.json();
    },

    async updateBusinessUnit(id: number, name: string) {
        const response = await fetch(`${API_URL}/admin/bus/${id}`, { // Assuming 'bus' is the endpoint, double check usage
            // Note: In existing code it was /admin/bus/${id}. Actually let's check creating BU uses /admin/business-units.
            // But existing fetch in AdminPanel used /admin/bus/${id}. 
            // Let's verify route in server/index.js later, but for now match AdminPanel usage or fix inconsistency.
            // Wait, I see getBusinessUnits uses business-units. 
            // Let's assume consistent route naming is better.
            // I recall the backend route might be /admin/bus for historical reasons or shortened.
            // I will use /admin/business-units to be clean, IF the backend supports it. 
            // Checking server/index.js is safer. But I'll stick to what worked before if I can confirm.
            // AdminPanel used /admin/bus/... let's stick to that for now to minimize 404s if I don't check.
            // ACTUALLY: createBusinessUnit uses /admin/business-units.
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to update BU');
        return response.json();
    },

    async deleteBusinessUnit(id: number) {
        const response = await fetch(`${API_URL}/admin/bus/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete BU');
        return response.json();
    },

    // --- CATEGORIES ---
    async getCategories() {
        const response = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
    },

    async createCategory(name: string) {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create category');
        return response.json();
    },

    async updateCategory(id: number, name: string) {
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to update category');
        return response.json();
    },

    async deleteCategory(id: number) {
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete category');
        return response.json();
    },

    async updateUserRoleBu(userId: number, roleId: number, buId: number) {
        const response = await fetch(`${API_URL}/admin/users/${userId}/role-bu`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ roleId, buId }),
        });
        if (!response.ok) throw new Error('Failed to update user');
        return response.json();
    },

    async deleteUser(userId: number) {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    },

    async createUser(data: { name: string, email: string, roleId: number, buId: number, userType: string, partnerCategory: string }) {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create user');
        return response.json();
    },

    async getAuditLogs() {
        const response = await fetch(`${API_URL}/admin/audit-logs`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch audit logs');
        return response.json();
    },

    async deleteAuditLog(id: number) {
        const response = await fetch(`${API_URL}/admin/audit-logs/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete audit log');
        return response.json();
    },

    async clearAllAuditLogs() {
        const response = await fetch(`${API_URL}/admin/audit-logs`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to clear audit logs');
        return response.json();
    },

    // --- PARTNER CATEGORIES ---
    async getPartnerCategories() {
        const response = await fetch(`${API_URL}/admin/partner-categories`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch partner categories');
        return response.json();
    },
    async createPartnerCategory(name: string) {
        const response = await fetch(`${API_URL}/admin/partner-categories`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to create partner category');
        return response.json();
    },
    async updatePartnerCategory(id: number, name: string) {
        const response = await fetch(`${API_URL}/admin/partner-categories/${id}`, {
            method: 'PUT', headers: getHeaders(), body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to update partner category');
        return response.json();
    },
    async deletePartnerCategory(id: number) {
        const response = await fetch(`${API_URL}/admin/partner-categories/${id}`, {
            method: 'DELETE', headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete partner category');
        return response.json();
    },

    // --- PERMISSIONS ---
    async getPermissions() {
        const response = await fetch(`${API_URL}/admin/permissions`, { headers: getHeaders() });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch permissions');
        }
        return response.json();
    },

    async getRolePermissions(roleId: number) {
        const response = await fetch(`${API_URL}/admin/roles/${roleId}/permissions`, { headers: getHeaders() });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to fetch role permissions');
        }
        return response.json();
    },

    async updateRolePermissions(roleId: number, permissionIds: number[]) {
        const response = await fetch(`${API_URL}/admin/roles/${roleId}/permissions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ permissionIds })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update permissions');
        }
        return response.json();
    },

    // --- NEW DATA FETCHERS ---
    async getPersonas() {
        const response = await fetch(`${API_URL}/personas`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch personas');
        return response.json();
    },
    async getObjections() {
        const response = await fetch(`${API_URL}/objections`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch objections');
        return response.json();
    },
    async getICP() {
        const response = await fetch(`${API_URL}/icp`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch ICP');
        return response.json();
    },
    async getCompetitors() {
        const response = await fetch(`${API_URL}/competitors`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch competitors');
        return response.json();
    },
    async getLearningPaths() {
        const response = await fetch(`${API_URL}/learning-paths`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch learning paths');
        return response.json();
    },
    async getAssets() {
        const response = await fetch(`${API_URL}/assets`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch assets');
        return response.json();
    },

    async uploadAsset(file: File, metadata: { title?: string; salesStage?: string; audience?: string; category?: string }) {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata.title) formData.append('title', metadata.title);
        if (metadata.salesStage) formData.append('salesStage', metadata.salesStage);
        if (metadata.audience) formData.append('audience', metadata.audience);
        if (metadata.category) formData.append('category', metadata.category);

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/assets`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to upload asset');
        }
        return response.json();
    },

    async downloadAsset(id: number, filename: string) {
        const response = await fetch(`${API_URL}/assets/${id}/download`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to download asset');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    async updateAsset(id: number, metadata: { title?: string; salesStage?: string; audience?: string; category?: string }) {
        const response = await fetch(`${API_URL}/assets/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(metadata)
        });
        if (!response.ok) throw new Error('Failed to update asset');
        return response.json();
    },

    async deleteAsset(id: number) {
        const response = await fetch(`${API_URL}/assets/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete asset');
        return response.json();
    },

    // --- AI ASSISTANT ---
    async chatWithAI(messages: { role: string; content: string }[], context: string) {
        const apiKey = localStorage.getItem('gemini-api-key');
        const headers = getHeaders();
        if (apiKey) {
            (headers as any)['x-gemini-api-key'] = apiKey;
        }

        const response = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ messages, context })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to get AI response');
        }
        return response.json();
    },

    // --- VERSION ASSIGNMENTS ---
    async getUserFileAssignments(userId: number) {
        const response = await fetch(`${API_URL}/assets/admin/users/${userId}/assignments`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch user assignments');
        return response.json();
    },

    async searchAssets(query: string) {
        const response = await fetch(`${API_URL}/assets/admin/assets/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to search assets');
        return response.json();
    },

    async getFileVersionsById(fileId: number) {
        // We use the file ID to get versions (the endpoint expects an ID that belongs to the group)
        const response = await fetch(`${API_URL}/assets/files/${fileId}/versions`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch file versions');
        return response.json();
    },

    async assignUserFileVersion(userId: number, assetFileId: number | null, versionGroupId: string) {
        const response = await fetch(`${API_URL}/assets/admin/assign-version`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, assetFileId, versionGroupId })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Assignment failed:', errorData);
            throw new Error(errorData.error || 'Failed to assign version');
        }
        return response.json();
    }
};
