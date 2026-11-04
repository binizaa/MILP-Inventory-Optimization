const { app, BrowserWindow, ipcMain } = require('electron');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const net    = require('net');
const { spawn } = require('child_process');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.jsx':  'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
};

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// ── DB ──────────────────────────────────────────────────────────────────────

const DB_PATH = path.join(__dirname, 'casaMonarca.db');
let db = null;

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// SELECT → array of plain objects
function queryAll(sql, params) {
  if (params) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  const result = db.exec(sql);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function queryOne(sql, params) {
  return queryAll(sql, params)[0] ?? null;
}

function lastId() {
  return db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
}

function ensureSchema() {
  const safe = sql => { try { db.run(sql); } catch (_) {} };

  // Fresh/empty DB (casaMonarca.db is gitignored) → create base tables from schema.sql
  const hasTables = queryOne(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='ingredients'`
  );
  if (!hasTables) {
    db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  }

  // Add columns the app needs that aren't in the original schema
  safe(`ALTER TABLE ingredients ADD COLUMN slug TEXT`);
  safe(`ALTER TABLE ingredients ADD COLUMN par  REAL DEFAULT 0`);
  safe(`ALTER TABLE recipes     ADD COLUMN slug     TEXT`);
  safe(`ALTER TABLE recipes     ADD COLUMN category TEXT DEFAULT 'Plato fuerte'`);
  safe(`ALTER TABLE recipes     ADD COLUMN note     TEXT DEFAULT ''`);
  safe(`ALTER TABLE people      ADD COLUMN arrival   DATETIME`);
  safe(`ALTER TABLE people      ADD COLUMN departure DATETIME`);
  safe(`CREATE TABLE IF NOT EXISTS milp_result (
    id           INTEGER PRIMARY KEY,
    data         TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function initDB() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({
    locateFile: () => path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm'),
  });

  const buf = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  db = buf ? new SQL.Database(buf) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  ensureSchema();
  registerIPC();
}

// ── IPC handlers ────────────────────────────────────────────────────────────

function registerIPC() {

  // Load all app data
  ipcMain.handle('db:load', () => {
    const inventory = queryAll(`
      SELECT i.slug AS id, i.name,
             COALESCE(inv.portion, 0)       AS qty,
             i.base_unit                    AS unit,
             COALESCE(inv.location,'bodega') AS location,
             COALESCE(i.par, 0)             AS par
      FROM   ingredients i
      LEFT JOIN inventory_item inv ON inv.ingredient_id = i.id
      ORDER  BY i.id
    `);

    const recRows = queryAll(`SELECT id, slug, name, category, note FROM recipes ORDER BY id`);
    const recipes = recRows.map(r => ({
      id:          r.slug || String(r.id),
      name:        r.name,
      category:    r.category || 'Plato fuerte',
      note:        r.note    || '',
      ingredients: queryAll(
        `SELECT ing.slug AS id, ri.base_portions AS qtyPerPerson, ing.base_unit AS unit
         FROM   recipe_ingredient ri
         JOIN   ingredients ing ON ing.id = ri.ingredient_id
         WHERE  ri.recipe_id = ?`,
        [r.id]
      ),
    }));

    const people = queryAll(`SELECT id, name, age, portion_type, arrival, departure FROM people ORDER BY name`);

    return { inventory, recipes, people };
  });

  // Replace all inventory + recipes in a single transaction
  ipcMain.handle('db:save', (e, inventory, recipes) => {
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN');
    try {
      db.run('DELETE FROM suggested_purchase');
      db.run('DELETE FROM recipe_ingredient');
      db.run('DELETE FROM inventory_item');
      db.run('DELETE FROM recipes');
      db.run('DELETE FROM ingredients');

      for (const item of inventory) {
        db.run(
          `INSERT INTO ingredients (slug, name, base_unit, amount_per_portion, par)
           VALUES (?, ?, ?, 0, ?)`,
          [item.id, item.name, item.unit, item.par || 0]
        );
        const ingId = lastId();
        db.run(
          `INSERT INTO inventory_item (ingredient_id, portion, location) VALUES (?, ?, ?)`,
          [ingId, item.qty, item.location || 'bodega']
        );
      }

      for (const rec of recipes) {
        db.run(
          `INSERT INTO recipes (slug, name, category, note) VALUES (?, ?, ?, ?)`,
          [rec.id, rec.name, rec.category || 'Plato fuerte', rec.note || '']
        );
        const recId = lastId();
        for (const ing of rec.ingredients) {
          const ingRow = queryOne(`SELECT id FROM ingredients WHERE slug = ?`, [ing.id]);
          if (!ingRow) continue;
          db.run(
            `INSERT OR IGNORE INTO recipe_ingredient (recipe_id, ingredient_id, base_portions)
             VALUES (?, ?, ?)`,
            [recId, ingRow.id, ing.qtyPerPerson]
          );
        }
      }

      db.run('COMMIT');
      db.run('PRAGMA foreign_keys = ON');
      saveDB();
      return { ok: true };
    } catch (err) {
      db.run('ROLLBACK');
      db.run('PRAGMA foreign_keys = ON');
      console.error('db:save error', err.message);
      return { ok: false, error: err.message };
    }
  });

  // Add a new person — automatically checked in
  ipcMain.handle('db:add-person', (e, person) => {
    db.run(
      `INSERT INTO people (name, age, portion_type, arrival, departure) VALUES (?, ?, ?, CURRENT_TIMESTAMP, NULL)`,
      [person.name, person.age, person.portion_type]
    );
    const id = lastId();
    saveDB();
    return { id };
  });

  // Mark arrival
  ipcMain.handle('db:checkin', (e, id) => {
    db.run(
      `UPDATE people SET arrival = CURRENT_TIMESTAMP, departure = NULL WHERE id = ?`,
      [id]
    );
    saveDB();
  });

  // Mark departure
  ipcMain.handle('db:checkout', (e, id) => {
    db.run(`UPDATE people SET departure = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    saveDB();
  });

  // Delete person
  ipcMain.handle('db:delete-person', (e, id) => {
    db.run(`DELETE FROM people WHERE id = ?`, [id]);
    saveDB();
  });

  // Save MILP result
  ipcMain.handle('milp:save', (e, data) => {
    db.run(`INSERT OR REPLACE INTO milp_result (id, data, generated_at) VALUES (1, ?, CURRENT_TIMESTAMP)`,
      [JSON.stringify(data)]);
    saveDB();
  });

  // Load last MILP result
  ipcMain.handle('milp:load', () => {
    const row = queryOne(`SELECT data FROM milp_result WHERE id = 1`);
    if (!row) return null;
    try { return JSON.parse(row.data); } catch { return null; }
  });

  // Run MILP optimizer
  ipcMain.handle('milp:run', (e, payload) => {
    return new Promise((resolve) => {
      const script = path.join(__dirname, 'milp_solver.py');
      const child  = spawn('python3', [script]);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => { stdout += d; });
      child.stderr.on('data', d => { stderr += d; });
      child.on('close', code => {
        try {
          resolve(JSON.parse(stdout));
        } catch (_) {
          resolve({ ok: false, error: stderr || `El proceso terminó con código ${code}` });
        }
      });
      child.on('error', err => {
        resolve({ ok: false, error: `No se pudo iniciar Python: ${err.message}` });
      });
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  });
}

// ── Window ───────────────────────────────────────────────────────────────────

let mainWindow = null;

async function createWindow() {
  const root = app.getAppPath();
  const port = await freePort();

  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/Cocina Casa Monarca.html';

    const filePath = path.normalize(path.join(root, urlPath));
    if (!filePath.startsWith(root + path.sep) && filePath !== root) {
      res.writeHead(403); res.end(); return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  server.listen(port, '127.0.0.1', () => {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 1024,
      minHeight: 640,
      title: 'Cocina Casa Monarca',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    mainWindow.loadURL(`http://127.0.0.1:${port}/`);
    mainWindow.on('closed', () => { server.close(); mainWindow = null; });
  });
}

app.whenReady().then(async () => {
  await initDB();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
