# Rspack: persistent cache keeps a virtual module's old content after `writeModule()` in `thisCompilation`

Reproduction for https://github.com/web-infra-dev/rspack/issues/16785. Only `@rspack/core`.

Two builds in separate processes share one `cache: { type: 'persistent' }` directory. Both seed
`rspack.experiments.VirtualModulesPlugin` with `export default "FIRST"`. The second build then calls
`writeModule()` with `export default "SECOND"` in `thisCompilation` (the hook the plugin docs use for `writeModule`).

```sh
npm install
npm run repro
```

```
bug: seed FIRST, writeModule(SECOND) in thisCompilation
  build 2: module source: export default "FIRST", bundle contains: "FIRST"
bug: seed FIRST, writeModule(SECOND) in compilation
  build 2: module source: export default "FIRST", bundle contains: "FIRST"
bug: seed FIRST, writeModule(SECOND) in make
  build 2: module source: export default "FIRST", bundle contains: "FIRST"
control: same as the first, cache: false
  build 2: module source: export default "SECOND", bundle contains: "SECOND"
control: seed SECOND, no writeModule()
  build 2: module source: export default "SECOND", bundle contains: "SECOND"
control: no seed, writeModule() in thisCompilation (both builds)
  build 2: module source: export default "SECOND", bundle contains: "SECOND"
control: seed FIRST, writeModule(SECOND) in beforeCompile
  build 2: throws Error: Virtual file store has not been initialized
control: seed FIRST, writeModule(SECOND) between rspack() and run()
  build 2: throws Error: Virtual file store has not been initialized
```

- `module source` is `originalSource()` of the virtual module at `finishModules`; `bundle contains` is what `dist/main.js` has.
- Expected: every non-throwing build 2 has `SECOND`.

One build by hand: `node build.mjs <seed> <write> <hook> <cache>` (see the comment at the top of `build.mjs`).
