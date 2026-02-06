import { readFileSync } from 'fs'
import { defineConfig } from 'tsup'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  entry: ['src/index.ts', 'src/mcp.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  define: {
    'process.env.PKG_VERSION': JSON.stringify(pkg.version),
    'process.env.PKG_NAME': JSON.stringify(pkg.name),
  },
})
