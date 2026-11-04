/* ============================================================
   AUDITORIA — helper para registrar ações do admin
   ============================================================ */

const prisma = require('../lib/prisma');

/**
 * Registra uma ação administrativa no banco.
 * Todos os campos são opcionais exceto adminId, action e description.
 */
async function logAdminAction(req, {
  action,
  entity,
  entityId = null,
  description,
  before = null,
  after = null,
  metadata = null,
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user?.id || 'unknown',
        adminEmail: req.user?.email || 'unknown',
        action,
        entity: entity || 'system',
        entityId,
        description,
        before: before || undefined,
        after: after || undefined,
        ip: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
        metadata: metadata || undefined,
      },
    });
  } catch (err) {
    // Nunca deixamos uma falha de log quebrar a operação principal
    console.error('[audit] falha ao registrar:', err.message);
  }
}

module.exports = { logAdminAction };
