// Generuje favicon i ikony aplikacji (PWA, iPhone) z scripts/icon-source.png do public/.
// Uruchom: node scripts/make-icons.mjs
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = fileURLToPath(new URL('./icon-source.png', import.meta.url))
const pub = fileURLToPath(new URL('../public/', import.meta.url))
await mkdir(pub + 'icons', { recursive: true })

const { width } = await sharp(src).metadata()
/** wycina kwadrat ze środka: share = jaka część boku zostaje (1 = całość) */
const crop = (share) => {
  const size = Math.round(width * share)
  const offset = Math.round((width - size) / 2)
  return { left: offset, top: offset, width: size, height: size }
}

const outputs = [
  // ikony na ekran początkowy — lekko przycięte, żeby znak był większy (iOS sam zaokrągla rogi)
  { file: 'icons/apple-touch-icon.png', size: 180, share: 0.75 },
  { file: 'icons/icon-192.png', size: 192, share: 0.75 },
  { file: 'icons/icon-512.png', size: 512, share: 0.75 },
  // maskable: całość, system przycina do własnego kształtu (bezpieczna strefa 80%)
  { file: 'icons/maskable-512.png', size: 512, share: 1 },
  // favicon w karcie przeglądarki — mocniej przycięty, żeby G było czytelne w 32 px
  { file: 'favicon.png', size: 64, share: 0.6 },
]

for (const o of outputs) {
  await sharp(src).extract(crop(o.share)).resize(o.size, o.size).png().toFile(pub + o.file)
  console.log('✓', o.file)
}
