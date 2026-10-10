import { createEngine, wasmHost } from '@pkhex-everywhere/engine'
import { readFileSync, writeFileSync } from 'node:fs'

const [save, level, edited] = process.argv.slice(2)
const dotnetUrl = new URL('../_framework/dotnet.js', import.meta.resolve('@pkhex-everywhere/engine')).href
const engine = createEngine({ host: wasmHost({ dotnetUrl }) })

await engine.game.load(new Uint8Array(readFileSync(save)))
const [first] = await engine.party.get()
if (level) {
  await engine.pokemon.setLevel(first.at, Number(level))
  writeFileSync(edited, (await engine.game.export()).bytes)
} else {
  console.log(first.level)
}
process.exit(0)
