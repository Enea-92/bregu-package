// Tiny JSON-file database — no native compilation, works on any OS out of the box.
// Good for a single small hotel's traffic. For heavier use, migrate to Postgres/Supabase
// later (the shape of each collection maps directly onto the tables in schema.sql).

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'bregu-data.json');

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { messages: [], quick_requests: [], room_service_orders: [], feedback: [], next_id: 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(data) {
  const id = data.next_id;
  data.next_id += 1;
  return id;
}

// Generic insert: collection name + row object (without id/created_at)
function insert(collection, row) {
  const data = loadData();
  const record = { id: nextId(data), created_at: new Date().toISOString(), ...row };
  data[collection].push(record);
  saveData(data);
  return record;
}

function findAll(collection, filterFn) {
  const data = loadData();
  const rows = data[collection];
  return filterFn ? rows.filter(filterFn) : rows;
}

function findById(collection, id) {
  const data = loadData();
  return data[collection].find(r => r.id === Number(id));
}

function updateById(collection, id, changes) {
  const data = loadData();
  const idx = data[collection].findIndex(r => r.id === Number(id));
  if (idx === -1) return null;
  data[collection][idx] = { ...data[collection][idx], ...changes };
  saveData(data);
  return data[collection][idx];
}

module.exports = { insert, findAll, findById, updateById };
