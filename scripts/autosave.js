import { execSync } from 'node:child_process'
import { setInterval as every } from 'node:timers'

function sh(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim()
}

function hasGit() {
  try {
    sh('git rev-parse --is-inside-work-tree')
    return true
  } catch {
    return false
  }
}

function autosave() {
  try {
    const status = sh('git status --porcelain')
    if (status) {
      sh('git add -A')
      const now = new Date()
      const stamp = now.toISOString().replace(/[:.]/g, '-')
      const msg = `autosave: ${stamp}`
      sh(`git commit -m "${msg}"`)
      console.log(`[autosave] Commit creado: ${msg}`)
    } else {
      console.log('[autosave] Sin cambios, nada que guardar')
    }
  } catch (e) {
    console.error('[autosave] Error:', e?.message || e)
  }
}

if (!hasGit()) {
  console.error('[autosave] Este directorio no es un repositorio git.')
  process.exit(1)
}

console.log('[autosave] Iniciado. Guardará automáticamente cada 5 minutos.')
// ejecución inmediata y luego cada 5 minutos
autosave()
every(5 * 60 * 1000, autosave)
