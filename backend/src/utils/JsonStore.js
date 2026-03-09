const fs = require('fs');
const path = require('path');

const BASE_DIR = process.env.JSON_DATA_DIR
  ? path.resolve(process.env.JSON_DATA_DIR)
  : path.join(__dirname, '../../data');
const DATA_DIR = BASE_DIR;

class JsonStore {
  constructor(filename, defaultData = []) {
    this.filepath = path.join(DATA_DIR, filename);
    this.defaultData = defaultData;
    this.data = this.load();
  }

  // Crear respaldo con marca de tiempo
  backup(prefix = null) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const base = prefix ? `${prefix}.backup.${ts}.json` : path.basename(this.filepath).replace('.json', `.backup.${ts}.json`);
      const dest = path.join(DATA_DIR, base);
      fs.writeFileSync(dest, JSON.stringify(this.data, null, 2), 'utf-8');
      return dest;
    } catch (e) {
      console.error('Error creating backup for', this.filepath, e);
      return null;
    }
  }

  load() {
    try {
      if (!fs.existsSync(this.filepath)) {
        this.save(this.defaultData);
        return this.defaultData;
      }
      const fileContent = fs.readFileSync(this.filepath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error loading ${this.filepath}:`, error);
      return this.defaultData;
    }
  }

  save(data) {
    try {
      // Ensure directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(this.filepath, JSON.stringify(data, null, 2), 'utf-8');
      this.data = data;
    } catch (error) {
      console.error(`Error saving ${this.filepath}:`, error);
    }
  }

  getAll() {
    return this.data;
  }

  setAll(data) {
    this.save(data);
  }
}

module.exports = JsonStore;
