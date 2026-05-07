const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/program_settings.json');

class ProgramSettingsDatabase {
  constructor() {
    this.ensureFile();
  }

  ensureFile() {
    if (!fs.existsSync(DATA_FILE)) {
      const initialData = [
        {
          id: 'vital',
          name: 'Vital',
          zoom_email: 'D28dvital@gmail.com',
          zoom_password: 'TATIANA123tatiana.456.',
          color: '#ec4899', // Pinkish
          active: true
        },
        {
          id: 'pancitas',
          name: 'Pancitas',
          zoom_email: 'Pancitasfitbyd28d@gmail.com',
          zoom_password: 'ALEJO123alejo.456',
          color: '#8b5cf6', // Violet
          active: true
        },
        {
          id: 'virtual_d28d',
          name: 'Virtual D28D',
          zoom_accounts: [
            { email: 'D28dzoom1@gmail.com', password: 'ALEJO123alejo.456' },
            { email: 'd28dzoom2@gmail.com', password: 'ALEJO12alejo.34' }
          ],
          color: '#10b981', // Lime/Green
          active: true
        }
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
  }

  getAll() {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  getById(id) {
    return this.getAll().find(p => p.id === id);
  }

  update(id, updates) {
    const programs = this.getAll();
    const index = programs.findIndex(p => p.id === id);
    if (index !== -1) {
      programs[index] = { ...programs[index], ...updates };
      fs.writeFileSync(DATA_FILE, JSON.stringify(programs, null, 2));
      return programs[index];
    }
    return null;
  }
}

module.exports = new ProgramSettingsDatabase();
