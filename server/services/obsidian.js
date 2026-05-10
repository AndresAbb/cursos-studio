// Escribe archivos .md al filesystem local en una ruta configurable (Obsidian vault)
const fs = require('fs').promises;
const path = require('path');

function isAbsoluteSafe(p) {
  // Permitir rutas absolutas razonables. Bloquear rutas vacías.
  if (!p || typeof p !== 'string') return false;
  return path.isAbsolute(p);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function safeFilename(name) {
  return String(name || 'apuntes')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')      // chars inválidos en filesystem
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'apuntes';
}

// Escribe la nota al vault de Obsidian.
// vaultPath: ruta absoluta al vault (ej. C:\Users\me\Obsidian\MyVault o /home/me/Obsidian)
// subPath: subcarpeta opcional dentro del vault (ej. "Cursos/UX")
// filename: nombre sin extensión
// content: markdown
async function writeNote({ vaultPath, subPath = '', filename, content }) {
  if (!isAbsoluteSafe(vaultPath)) throw new Error('Ruta de vault no es absoluta o está vacía');
  // Validar que el vault existe
  try {
    const stat = await fs.stat(vaultPath);
    if (!stat.isDirectory()) throw new Error('El vault path no es un directorio');
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('Ruta de vault no existe: ' + vaultPath);
    throw err;
  }

  // Sanitizar subPath: sin .., sin rutas absolutas dentro
  const cleanSub = (subPath || '')
    .split(/[\\/]/)
    .filter(p => p && p !== '..' && p !== '.')
    .map(safeFilename)
    .join(path.sep);

  const targetDir = cleanSub ? path.join(vaultPath, cleanSub) : vaultPath;
  await ensureDir(targetDir);

  const fname = safeFilename(filename) + '.md';
  const fullPath = path.join(targetDir, fname);
  await fs.writeFile(fullPath, content, 'utf8');

  return {
    path: fullPath,
    relative: cleanSub ? path.join(cleanSub, fname) : fname,
  };
}

module.exports = { writeNote, isAbsoluteSafe };
