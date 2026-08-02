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
 *
 * Connection note: Supabase's direct host (db.<ref>.supabase.co) resolves to
 * IPv6 only unless the project buys the IPv4 add-on, and Vercel's build
 * containers are IPv4-only — so DIRECT_URL alone fails there with P1001. When
 * that happens we retry through the session-mode pooler (the pooler host on
 * port 5432), which is IPv4-reachable and, unlike transaction mode on 6543,
 * supports the advisory locks migrations need.
 */
import { spawnSync } from 'node:child_process'

const env = process.env.VERCEL_ENV

if (env && env !== 'production') {
  console.log(`[migrate-on-deploy] VERCEL_ENV=${env} — skipping migrations (production only).`)
  process.exit(0)
}

/** host:port only — never log a connection string, it carries the password. */
function describe(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}:${parsed.port || '5432'}`
  } catch {
    return '<unparseable url>'
  }
}

/**
 * Rewrites a Supabase pooler URL from transaction mode (6543) to session mode
 * (5432) and drops the pgbouncer flags that only apply to transaction mode.
 * Returns null for anything that isn't a pooler URL.
 */
function toSessionPooler(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('pooler.supabase.com')) return null
    parsed.port = '5432'
    parsed.searchParams.delete('pgbouncer')
    parsed.searchParams.delete('connection_limit')
    return parsed.toString()
  } catch {
    return null
  }
}

const candidates = []
const add = (url, label) => {
  if (url && !candidates.some((c) => c.url === url)) candidates.push({ url, label })
}

// An explicit override always wins, then the configured direct connection,
// then the session pooler derived from the runtime URL as an IPv4 fallback.
add(process.env.MIGRATE_DATABASE_URL, 'MIGRATE_DATABASE_URL')
add(process.env.DIRECT_URL, 'DIRECT_URL')
add(toSessionPooler(process.env.DATABASE_URL), 'session pooler derived from DATABASE_URL')

if (!candidates.length) {
  console.error(
    '[migrate-on-deploy] No usable database URL in the build environment ' +
      '(looked for MIGRATE_DATABASE_URL, DIRECT_URL, DATABASE_URL). Failing the build ' +
      'rather than deploying code whose prices do not match the database.',
  )
  process.exit(1)
}

const UNREACHABLE = /P1001|Can't reach database server|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/

for (const [index, candidate] of candidates.entries()) {
  const last = index === candidates.length - 1
  console.log(`[migrate-on-deploy] prisma migrate deploy via ${candidate.label} (${describe(candidate.url)})`)

  // `npx --no-install` resolves the CLI from the project's own node_modules, so
  // this behaves the same under npm, pnpm, or a bare PATH.
  const result = spawnSync('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DIRECT_URL: candidate.url },
    encoding: 'utf8',
    shell: true,
  })

  const output = `${result.stdout || ''}${result.stderr || ''}`
  process.stdout.write(output)

  if (result.status === 0) process.exit(0)

  // Only a connection failure is worth retrying elsewhere. A migration that
  // reached the database and failed on its SQL must not be re-run against a
  // different route to the same data.
  if (last || !UNREACHABLE.test(output)) {
    console.error(`[migrate-on-deploy] Migration failed via ${candidate.label}. Failing the build.`)
    process.exit(result.status ?? 1)
  }

  console.warn(`[migrate-on-deploy] ${candidate.label} unreachable — trying the next connection route.`)
}
