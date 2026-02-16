import { sql } from './db-postgres-compat.js';

export async function logAudit(pool, userId, action, entity, entityId, details) {
    try {
        console.log(`[AUDIT] User: ${userId}, Action: ${action}, Entity: ${entity}, ID: ${entityId}`);
        await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Action', sql.NVarChar, action)
            .input('Entity', sql.NVarChar, entity)
            .input('EntityId', sql.NVarChar, entityId ? String(entityId) : null)
            .input('Details', sql.NVarChar, details ? JSON.stringify(details) : null)
            .query(`
                INSERT INTO AuditLogs (UserId, Action, Entity, EntityId, Details)
                VALUES (@UserId, @Action, @Entity, @EntityId, @Details)
            `);
    } catch (err) {
        if (err.number === 547) { // Foreign Key violation
            console.warn(`[AUDIT] User ${userId} not found. Logging as Anonymous.`);
            try {
                const newDetails = details ? { ...details, originalUserId: userId, note: 'User record missing' } : { originalUserId: userId, note: 'User record missing' };
                await pool.request()
                    .input('UserId', sql.Int, null)
                    .input('Action', sql.NVarChar, action)
                    .input('Entity', sql.NVarChar, entity)
                    .input('EntityId', sql.NVarChar, entityId ? String(entityId) : null)
                    .input('Details', sql.NVarChar, JSON.stringify(newDetails))
                    .query(`
                        INSERT INTO AuditLogs (UserId, Action, Entity, EntityId, Details)
                        VALUES (@UserId, @Action, @Entity, @EntityId, @Details)
                    `);
                return;
            } catch (retryErr) {
                console.error('Audit Log Retry Error:', retryErr);
            }
        }
        console.error('Audit Log Error:', err);
    }
}
