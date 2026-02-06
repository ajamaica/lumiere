/**
 * SRIA Adapters
 *
 * Storage adapters for persisting SRIA agent state to various backends.
 *
 * @module lib/sria/adapters
 */

const { SupabaseStorageAdapter, MIGRATION_SQL } = require('./supabase-storage')

module.exports = {
  SupabaseStorageAdapter,
  MIGRATION_SQL,
}
