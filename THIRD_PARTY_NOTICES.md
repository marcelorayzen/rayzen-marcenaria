# Third-party notices

This project uses the npm dependencies listed below. No code from the open furniture repositories named in the product brief has been incorporated or audited yet.

Versions and declared SPDX license identifiers were inventoried from installed package metadata after `npm install` on 2026-11-07. The exact dependency graph is pinned in [package-lock.json](./package-lock.json). The inventory includes runtime, development, and platform-specific packages in the current lockfile installation; optional packages for other operating systems may have additional notices in a platform-specific install.

## Direct dependencies

| Package | Role | Version | Declared license |
|---|---|---:|---|
| `@fontsource/barlow-condensed` | Runtime font | 5.3.0 | OFL-1.1 |
| `@react-three/fiber` | Runtime | 9.8.2 | MIT |
| `react` | Runtime | 19.3.1 | MIT |
| `react-dom` | Runtime | 19.3.1 | MIT |
| `three` | Runtime | 0.175.0 | MIT |
| `@types/react` | Development | 19.3.0 | MIT |
| `@types/react-dom` | Development | 19.3.0 | MIT |
| `@types/three` | Development | 0.174.0 | MIT |
| `@vitejs/plugin-react` | Development | 4.7.0 | MIT |
| `typescript` | Development | 5.9.3 | Apache-2.0 |
| `vite` | Development | 6.4.5 | MIT |
| `vitest` | Development | 5.1.0 | MIT |

## Installed dependency inventory

This deduplicated list records the package name, resolved version, and declared license for direct and transitive dependencies.

### MIT

`@babel/code-frame@7.29.7`, `@babel/compat-data@7.29.7`, `@babel/core@7.29.13`, `@babel/generator@7.29.13`, `@babel/helper-compilation-targets@7.29.13`, `@babel/helper-globals@7.29.7`, `@babel/helper-module-imports@7.29.7`, `@babel/helper-module-transforms@7.29.13`, `@babel/helper-plugin-utils@7.29.7`, `@babel/helper-string-parser@7.29.13`, `@babel/helper-validator-identifier@7.29.7`, `@babel/helper-validator-option@7.29.7`, `@babel/helpers@7.29.13`, `@babel/parser@7.29.13`, `@babel/plugin-transform-react-jsx-self@7.29.7`, `@babel/plugin-transform-react-jsx-source@7.29.7`, `@babel/runtime@7.29.13`, `@babel/template@7.29.13`, `@babel/traverse@7.29.13`, `@babel/types@7.29.11`, `@esbuild/win32-x64@0.25.12`, `@jridgewell/gen-mapping@0.3.13`, `@jridgewell/remapping@2.3.5`, `@jridgewell/resolve-uri@3.1.2`, `@jridgewell/sourcemap-codec@1.6.0`, `@jridgewell/trace-mapping@0.3.31`, `@react-three/fiber@9.8.2`, `@rolldown/pluginutils@1.0.0-beta.27`, `@rollup/rollup-win32-x64-gnu@4.68.0`, `@rollup/rollup-win32-x64-msvc@4.68.0`, `@tweenjs/tween.js@23.1.3`, `@types/babel__core@7.20.5`, `@types/babel__generator@7.27.0`, `@types/babel__template@7.4.4`, `@types/babel__traverse@7.28.0`, `@types/chai@5.2.3`, `@types/deep-eql@4.0.2`, `@types/estree@1.0.10`, `@types/react-dom@19.3.0`, `@types/react-reconciler@0.28.9`, `@types/react@19.3.0`, `@types/stats.js@0.17.4`, `@types/three@0.174.0`, `@types/webxr@0.5.24`, `@vitejs/plugin-react@4.7.0`, `@vitest/mocker@5.1.0`, `@vitest/spy@5.1.0`, `assertion-error@2.0.1`, `base64-js@1.5.1`, `browserslist@4.29.5`, `buffer@6.0.3`, `chai@6.3.0`, `convert-source-map@2.0.0`, `csstype@3.2.3`, `debug@4.4.3`, `es-module-lexer@2.3.2`, `esbuild@0.25.12`, `escalade@3.2.0`, `estree-walker@3.0.3`, `fdir@6.5.0`, `fflate@0.8.3`, `gensync@1.0.0-beta.2`, `its-fine@2.1.1`, `js-tokens@4.0.0`, `jsesc@3.1.0`, `json5@2.2.3`, `magic-string@1.4.5`, `meshoptimizer@0.18.1`, `ms@2.1.3`, `nanoid@3.3.20`, `node-releases@2.0.63`, `obug@3.0.0`, `picomatch@4.0.7`, `postcss@8.5.32`, `react-dom@19.3.1`, `react-refresh@0.17.0`, `react-use-measure@2.1.7`, `react@19.3.1`, `rollup@4.68.0`, `scheduler@0.28.0`, `std-env@4.3.0`, `suspend-react@0.1.3`, `three@0.175.0`, `tinybench@6.2.3`, `tinyexec@1.3.1`, `tinyglobby@0.2.17`, `update-browserslist-db@1.3.4`, `use-sync-external-store@1.7.0`, `vite@6.4.5`, `vitest@5.1.0`, `why-is-node-running@3.2.1`, `zustand@5.1.0`.

### BSD-3-Clause

`@webgpu/types@0.1.74`, `ieee754@1.2.1`, `source-map-js@1.2.2`.

### Apache-2.0

`baseline-browser-mapping@2.11.35`, `expect-type@1.4.0`, `typescript@5.9.3`.

### CC-BY-4.0

`caniuse-lite@1.0.30001823`.

### ISC

`electron-to-chromium@1.5.478`, `lru-cache@5.1.1`, `picocolors@1.1.1`, `semver@6.3.2`, `yallist@3.1.1`.

### OFL-1.1

`@fontsource/barlow-condensed@5.3.0`.

## Distribution notes

- Preserve the license and notice files shipped with dependencies when distributing the application; consult each package's installed `LICENSE`/`NOTICE` files and the lockfile for the exact release.
- `caniuse-lite` declares CC-BY-4.0. Attribution requirements apply if its data is redistributed.
- This inventory records package metadata, not legal advice. Re-run the inventory and review package notices whenever dependencies or lockfile resolutions change.
