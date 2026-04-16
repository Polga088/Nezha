/**
 * Obfuscation ciblée des bundles serveur des routes API après `next build`.
 * Obfusquer l’intégralité de `.next` casse en général le runtime Next.js ;
 * on ne traite que les fichiers `route.js` sous `.next/server/app/api`.
 */
import { readdir } from 'node:fs/promises'
import { readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const projectRoot = process.cwd()
const apiBuildRoot = join(projectRoot, '.next', 'server', 'app', 'api')

async function* walkJsFiles(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) {
      yield* walkJsFiles(p)
    } else if (ent.isFile() && ent.name === 'route.js') {
      yield p
    }
  }
}

const main = async () => {
  const { default: JavaScriptObfuscator } = await import(
    'javascript-obfuscator'
  )

  let count = 0
  for await (const filePath of walkJsFiles(apiBuildRoot)) {
    const src = await readFile(filePath, 'utf8')
    const obf = JavaScriptObfuscator.obfuscate(src, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      numbersToExpressions: false,
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: false,
      stringArray: true,
      stringArrayEncoding: [],
      stringArrayThreshold: 0.75,
      target: 'node',
    })
    await writeFile(filePath, obf.getObfuscatedCode(), 'utf8')
    count += 1
    console.log(
      '[obfuscate-next]',
      relative(projectRoot, filePath).replaceAll('\\', '/')
    )
  }

  if (count === 0) {
    console.warn(
      '[obfuscate-next] Aucun route.js trouvé sous .next/server/app/api — exécutez après `next build`.'
    )
  } else {
    console.log(`[obfuscate-next] ${count} fichier(s) obfusqué(s).`)
  }
}

await main()
