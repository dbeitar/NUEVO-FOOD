const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

class JsonStore {
  constructor(filename, defaultData = []) {
    this.filepath = path.join(DATA_DIR, filename);
    this.defaultData = defaultData;
    this.data = this.load();
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
