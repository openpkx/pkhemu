import { createEngine, wasmHost } from '@pkhex-everywhere/engine'
import { readFileSync } from 'node:fs'

const [save] = process.argv.slice(2)
const dotnetUrl = new URL('../_framework/dotnet.js', import.meta.resolve('@pkhex-everywhere/engine')).href
const engine = createEngine({ host: wasmHost({ dotnetUrl }) })

await engine.game.load(new Uint8Array(readFileSync(save)))
console.log((await engine.box.list()).length)
process.exit(0)
