/**
 * Re-sincroniza secuencias SERIAL tras seeds/migraciones manuales.
 * Evita HTTP 500 en INSERT por duplicate key (users_pkey).
 */
async function syncPostgresSequences(prisma) {
  const tables = [
    'users',
    'trainers',
    'gyms',
    'user_accounts',
    'module_licenses',
    'payment_requests',
    'subscription_plans',
    'cycles',
    'programs',
    'communication_templates',
    'communication_logs',
    'd28d_challenges',
    'd28d_challenge_entries',
    'faq_categories',
    'faq_items',
    'platform_audit_events',
  ];
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 1)
        )`,
      );
    } catch {
      /* tabla inexistente o sin serial — ignorar */
    }
  }
}

module.exports = { syncPostgresSequences };
