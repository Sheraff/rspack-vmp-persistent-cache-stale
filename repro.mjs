// Runs each scenario as two builds in separate processes that share one
// persistent cache directory (deleted before each scenario).
//
//   build 1: the virtual module says "FIRST"
//   build 2: the virtual module should say "SECOND"
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

// Build 1 of most scenarios: seeded with FIRST, no writeModule().
const seededFirst = { seed: 'FIRST', write: '-', hook: '-', cache: 'on' }

const scenarios = [
  {
    label: 'bug: seed FIRST, writeModule(SECOND) in thisCompilation',
    first: seededFirst,
    second: {
      seed: 'FIRST',
      write: 'SECOND',
      hook: 'thisCompilation',
      cache: 'on',
    },
  },
  {
    label: 'bug: seed FIRST, writeModule(SECOND) in compilation',
    first: seededFirst,
    second: {
      seed: 'FIRST',
      write: 'SECOND',
      hook: 'compilation',
      cache: 'on',
    },
  },
  {
    label: 'bug: seed FIRST, writeModule(SECOND) in make',
    first: seededFirst,
    second: { seed: 'FIRST', write: 'SECOND', hook: 'make', cache: 'on' },
  },
  {
    label: 'control: same as the first, cache: false',
    first: { ...seededFirst, cache: 'off' },
    second: {
      seed: 'FIRST',
      write: 'SECOND',
      hook: 'thisCompilation',
      cache: 'off',
    },
  },
  {
    label: 'control: seed SECOND, no writeModule()',
    first: seededFirst,
    second: { seed: 'SECOND', write: '-', hook: '-', cache: 'on' },
  },
  {
    label: 'control: no seed, writeModule() in thisCompilation (both builds)',
    first: { seed: '-', write: 'FIRST', hook: 'thisCompilation', cache: 'on' },
    second: {
      seed: '-',
      write: 'SECOND',
      hook: 'thisCompilation',
      cache: 'on',
    },
  },
  {
    label: 'control: seed FIRST, writeModule(SECOND) in beforeCompile',
    first: seededFirst,
    second: {
      seed: 'FIRST',
      write: 'SECOND',
      hook: 'beforeCompile',
      cache: 'on',
    },
  },
  {
    label:
      'control: seed FIRST, writeModule(SECOND) between rspack() and run()',
    first: seededFirst,
    second: {
      seed: 'FIRST',
      write: 'SECOND',
      hook: 'afterCreate',
      cache: 'on',
    },
  },
]

function build({ seed, write, hook, cache }) {
  const args = ['build.mjs', seed, write, hook, cache]
  try {
    const output = execFileSync('node', args, {
      encoding: 'utf8',
      stdio: 'pipe',
    })
    return output.trim().replaceAll('\n', ', ')
  } catch (error) {
    const message = error.stderr.match(/^Error: .*$/m)?.[0] ?? 'build failed'
    return `throws ${message}`
  }
}

for (const scenario of scenarios) {
  fs.rmSync('cache', { recursive: true, force: true })
  fs.rmSync('dist', { recursive: true, force: true })
  build(scenario.first)
  console.log(scenario.label)
  console.log(`  build 2: ${build(scenario.second)}`)
}
