import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const PRECACHE_VERSION_TOKEN = '"__PRECACHE_VERSION__"'
const PRECACHE_URLS_TOKEN = '["__PRECACHE_URLS__"]'

export function injectPrecacheManifest(source: string, version: string, urls: string[]) {
  if (!source.includes(PRECACHE_VERSION_TOKEN) || !source.includes(PRECACHE_URLS_TOKEN)) {
    throw new Error('Service worker precache placeholders are missing.')
  }

  return source
    .replace(PRECACHE_VERSION_TOKEN, JSON.stringify(version))
    .replace(PRECACHE_URLS_TOKEN, JSON.stringify(urls))
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function pwaPrecachePlugin(): Plugin {
  let outputDirectory = ''

  return {
    name: 'nocturne-pwa-precache',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    writeBundle() {
      const files = listFiles(outputDirectory)
      const relativeFiles = files
        .map((file) => relative(outputDirectory, file).split(sep).join('/'))
        .sort()
      const versionHash = createHash('sha256')

      for (const file of files.sort()) {
        versionHash.update(relative(outputDirectory, file))
        versionHash.update(readFileSync(file))
      }

      const version = versionHash.digest('hex').slice(0, 16)
      const precacheUrls = ['./', ...relativeFiles
        .filter((file) => file !== 'sw.js')
        .map((file) => `./${file}`)]
      const serviceWorkerPath = resolve(outputDirectory, 'sw.js')
      const serviceWorker = injectPrecacheManifest(
        readFileSync(serviceWorkerPath, 'utf8'),
        version,
        precacheUrls,
      )

      writeFileSync(serviceWorkerPath, serviceWorker)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/nocturne-control/',
  plugins: [react(), pwaPrecachePlugin()],
})
