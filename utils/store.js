const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filename) {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return {};
  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeJSON(filename, data) {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readJSON, writeJSON };
