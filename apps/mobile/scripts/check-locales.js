#!/usr/bin/env node
// Fails when a locale is missing a key from en.json, has an extra one, or uses
// different {{interpolation}} variables than the English string.
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, '..', 'features', 'i18n', 'locales')
const BASE = 'en'

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, full, out)
    else out[full] = String(value)
  }
  return out
}

function vars(str) {
  return [...str.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort().join(',')
}

const load = (lang) => flatten(JSON.parse(fs.readFileSync(path.join(DIR, `${lang}.json`), 'utf8')))
const base = load(BASE)
const langs = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((l) => l !== BASE)

let problems = 0
for (const lang of langs) {
  const other = load(lang)
  const missing = Object.keys(base).filter((k) => !(k in other))
  const extra = Object.keys(other).filter((k) => !(k in base))
  const varMismatch = Object.keys(base).filter((k) => k in other && vars(base[k]) !== vars(other[k]))
  const empty = Object.keys(other).filter((k) => other[k].trim() === '')

  for (const k of missing) console.log(`${lang}: missing ${k}`)
  for (const k of extra) console.log(`${lang}: extra ${k}`)
  for (const k of varMismatch) console.log(`${lang}: variables differ in ${k} (en: {${vars(base[k])}} / ${lang}: {${vars(other[k])}})`)
  for (const k of empty) console.log(`${lang}: empty ${k}`)
  problems += missing.length + extra.length + varMismatch.length + empty.length
}

if (problems > 0) {
  console.log(`\n${problems} problem(s) across ${langs.length} locales.`)
  process.exit(1)
}
console.log(`OK: ${Object.keys(base).length} keys in sync across ${langs.length + 1} locales.`)
