// One production build with a persistent cache and one virtual module.
//
//   node build.mjs <seed> <write> <hook> <cache>
//
//   seed   content given to the VirtualModulesPlugin constructor, or "-" for none
//   write  content passed to writeModule(), or "-" for no write
//   hook   where writeModule() is called: thisCompilation, compilation, make,
//          beforeCompile, compile, beforeRun, run, or afterCreate (between
//          rspack() and compiler.run())
//   cache  "on" (persistent filesystem cache in ./cache) or "off"
import fs from 'node:fs'
import path from 'node:path'
import { rspack } from '@rspack/core'

const [seed, write, hook, cache] = process.argv.slice(2)

const virtualFile = path.resolve('virtual.js')
const moduleSource = (value) => `export default ${JSON.stringify(value)}`

const virtualModules = new rspack.experiments.VirtualModulesPlugin(
  seed === '-' ? {} : { [virtualFile]: moduleSource(seed) },
)

function writeVirtualModule() {
  if (write !== '-') {
    virtualModules.writeModule(virtualFile, moduleSource(write))
  }
}

// Calls writeModule() from the chosen compiler hook.
const writeFromHook = {
  apply(compiler) {
    if (hook in compiler.hooks) {
      compiler.hooks[hook].tap('WriteVirtualModule', writeVirtualModule)
    }
  },
}

// Prints the source the compilation used for the virtual module.
const observeModule = {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ObserveModule', (compilation) => {
      compilation.hooks.finishModules.tap('ObserveModule', (modules) => {
        for (const module of modules) {
          if (module.resource === virtualFile) {
            console.log('module source:', module.originalSource().source())
          }
        }
      })
    })
  },
}

const compiler = rspack({
  mode: 'production',
  context: process.cwd(),
  entry: './entry.js',
  output: { path: path.resolve('dist'), filename: 'main.js' },
  cache:
    cache === 'on'
      ? {
          type: 'persistent',
          storage: { type: 'filesystem', directory: path.resolve('cache') },
        }
      : false,
  plugins: [virtualModules, writeFromHook, observeModule],
})

if (hook === 'afterCreate') {
  writeVirtualModule()
}

await new Promise((resolve, reject) => {
  compiler.run((error, stats) => {
    if (error || stats.hasErrors()) {
      reject(error ?? new Error(stats.toString()))
    } else {
      resolve()
    }
  })
})
await new Promise((resolve) => compiler.close(resolve))

const bundle = fs.readFileSync('dist/main.js', 'utf8')
const bundled = bundle.match(/"(FIRST|SECOND|THIRD)"/g) ?? []
console.log('bundle contains:', bundled.join(', '))
