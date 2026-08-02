/**
 * Applies pending Prisma migrations during a Vercel production build.
 *
 * The catalog is priced in INR while the code formats every amount as ₹, so a
 * deploy that ships the code without the matching migration would render ₹ in
 * front of unconverted values. Running the migration as the last build step
 * keeps the two in lockstep: the migration only runs once the app has compiled,
 * and a migration failure fails the build so nothing goes live.
 *
 * Preview and development builds skip it — they share the production database,
 * and a branch's half-finished migration has no business landing there.
 */
import { spawnSync } from 'node:child_process'

const env = process.env.VERCEL_ENV

if (env && env !== 'production') {
  console.log(`[migrate-on-deploy] VERCEL_ENV=${env} — skipping migrations (production only).`)
  process.exit(0)
}

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error(
    '[migrate-on-deploy] No DIRECT_URL or DATABASE_URL in the build environment. ' +
      'Failing the build rather than deploying code whose prices do not match the database.',
  )
  process.exit(1)
}

console.log('[migrate-on-deploy] Running prisma migrate deploy...')
// `npx --no-install` resolves the CLI from the project's own node_modules, so
// this behaves the same whether npm put node_modules/.bin on PATH or not.
const result = spawnSync('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
})
process.exit(result.status ?? 1)
