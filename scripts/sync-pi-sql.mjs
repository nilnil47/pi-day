/**
 * Injects src/data/piDigits.ts into supabase/schema.sql (public.submit_digit constant).
 * Run after editing PI_DIGITS.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const tsPath = path.join(root, 'src/data/piDigits.ts')
const schemaPath = path.join(root, 'supabase/schema.sql')

const ts = fs.readFileSync(tsPath, 'utf8')
const m = /PI_DIGITS = "([0-9]+)"/.exec(ts)
if (!m) {
  console.error('Could not parse PI_DIGITS from', tsPath)
  process.exit(1)
}
const digits = m[1]

let sql = fs.readFileSync(schemaPath, 'utf8')
const re = /(pi_str constant text := )\$pi\$.*?\$pi\$;/s
if (!re.test(sql)) {
  console.error('Expected pi_str constant text := $pi$…$pi$; in', schemaPath)
  process.exit(1)
}
sql = sql.replace(re, `$1$pi$${digits}$pi$;`)
fs.writeFileSync(schemaPath, sql)
console.log('Updated submit_digit π constant:', digits.length, 'digits →', schemaPath)
