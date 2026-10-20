import { createEngine, wasmHost } from '@pkhex-everywhere/engine'
import { readFileSync, writeFileSync } from 'node:fs'

const [save, nickname, edited] = process.argv.slice(2)
const dotnetUrl = new URL('../_framework/dotnet.js', import.meta.resolve('@pkhex-everywhere/engine')).href
const engine = createEngine({ host: wasmHost({ dotnetUrl }) })

await engine.game.load(new Uint8Array(readFileSync(save)))
const [first] = await engine.party.get()
await engine.pokemon.edit(first.at)
await engine.pokemon.update({ source: 'draft', slot: 0 }, { nickname })
await engine.pokemon.commit()
writeFileSync(edited, (await engine.game.export()).bytes)
process.exit(0)
