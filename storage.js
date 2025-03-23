const fs = require('fs');
const path = require('path');

// Determine storage location - use volume path if available
const STORAGE_DIR = process.env.VOLUME_PATH || __dirname;
const DB_PATH = path.join(STORAGE_DIR, 'users_db.json');

// Ensure the storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create storage directory: ${err.message}`);
  }
}

// Load user database
const loadUsers = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error(`Error loading user database: ${error.message}`);
    return {};
  }
};

// Save user database
const saveUsers = (users) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving user database: ${error.message}`);
    return false;
  }
};

module.exports = {
  loadUsers,
  saveUsers
};
