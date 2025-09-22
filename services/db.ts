import initSqlJs, { type Database } from 'sql.js';
import type { CampusData, Dataset, Facility, Level, Unit, Detail, User, Role } from '../types';
import { campusData as defaultCampusData } from '../data/campusData';

// --- Database Singleton ---
let db: Database | null = null;
let isInitialized = false;

// --- Helper for IndexedDB persistence ---
const dbName = 'sql-campus-db';
const storeName = 'sqlite-db';

async function getIDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject("Error opening IndexedDB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName);
    };
  });
}

async function loadDbFromIdb(): Promise<Uint8Array | null> {
  const idb = await getIDB();
  return new Promise((resolve) => {
    const transaction = idb.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get('database');
    request.onsuccess = () => {
      resolve(request.result as Uint8Array | null);
    };
    request.onerror = () => resolve(null);
  });
}

async function saveDbToIdb(data: Uint8Array) {
  const idb = await getIDB();
  const transaction = idb.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  store.put(data, 'database');
}

// --- SQL Execution Helpers ---

const objectify = (stmt: any) => {
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  return results;
}

const createTables = () => {
    if (!db) return;
    db.exec(`
        CREATE TABLE datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            isActive BOOLEAN NOT NULL
        );
        CREATE TABLE users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );
        CREATE TABLE facilities (
            id TEXT,
            datasetId INTEGER,
            name TEXT,
            polygon TEXT,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE levels (
            id TEXT,
            datasetId INTEGER,
            name TEXT,
            facilityId TEXT,
            polygon TEXT,
            zIndex INTEGER,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE units (
            id TEXT,
            datasetId INTEGER,
            name TEXT,
            type TEXT,
            levelId TEXT,
            polygon TEXT,
            verticalConnectorId TEXT,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE details (
            id TEXT,
            datasetId INTEGER,
            type TEXT,
            levelId TEXT,
            line TEXT,
            PRIMARY KEY (id, datasetId)
        );
    `);
};

const seedDatabase = () => {
    if (!db) return;
    // Seed users
    db.exec(`
        INSERT INTO users (username, password, role) VALUES ('santanu', '111', 'admin');
        INSERT INTO users (username, password, role) VALUES ('san', '111', 'viewer');
    `);
    // Seed default data
    addDataset('Default Campus Layout', defaultCampusData, true);
}


// --- Public API ---

export const dbService = {
    async init(): Promise<void> {
        if (isInitialized) return;

        const SQL = await initSqlJs({
            // The esm.sh version of sql.js needs help finding its wasm file.
            // Point it to the correct file on the same CDN to avoid version mismatches and loading errors.
            locateFile: file => `https://esm.sh/sql.js@1.10.3/dist/${file}`
        });
        const savedDb = await loadDbFromIdb();

        if (savedDb) {
            console.log("Loading database from persistence...");
            db = new SQL.Database(savedDb);
        } else {
            console.log("Creating new database and seeding...");
            db = new SQL.Database();
            createTables();
            seedDatabase();
            await this.save();
        }
        isInitialized = true;
    },

    async save(): Promise<void> {
        if (!db) return;
        const data = db.export();
        await saveDbToIdb(data);
        console.log("Database saved.");
    },

    async getUser(username: string, password: string): Promise<User | null> {
        if (!db) throw new Error("DB not initialized");
        const stmt = db.prepare("SELECT username, role FROM users WHERE username = :user AND password = :pass");
        const result = stmt.getAsObject({ ':user': username, ':pass': password });
        stmt.free();
        if (result.username) {
            return { name: result.username as string, role: result.role as Role };
        }
        return null;
    },
    
    async getActiveCampusData(): Promise<CampusData> {
        if (!db) throw new Error("DB not initialized");
        
        const activeDataset = objectify(db.prepare("SELECT id FROM datasets WHERE isActive = 1"))[0];
        if (!activeDataset) return { facilities: [], levels: [], units: [], details: [] };
        
        const datasetId = activeDataset.id;

        const facilities = objectify(db.prepare(`SELECT * FROM facilities WHERE datasetId = ${datasetId}`)).map(f => ({ ...f, polygon: JSON.parse(f.polygon as string)})) as Facility[];
        const levels = objectify(db.prepare(`SELECT * FROM levels WHERE datasetId = ${datasetId}`)).map(l => ({...l, polygon: JSON.parse(l.polygon as string)})) as Level[];
        const units = objectify(db.prepare(`SELECT * FROM units WHERE datasetId = ${datasetId}`)).map(u => ({...u, polygon: JSON.parse(u.polygon as string)})) as Unit[];
        const details = objectify(db.prepare(`SELECT * FROM details WHERE datasetId = ${datasetId}`)).map(d => ({...d, line: JSON.parse(d.line as string)})) as Detail[];

        return { facilities, levels, units, details };
    },

    async getDatasets(): Promise<Dataset[]> {
        if (!db) throw new Error("DB not initialized");
        return objectify(db.prepare("SELECT * FROM datasets ORDER BY createdAt DESC")) as Dataset[];
    },

    async setActiveDataset(id: number): Promise<void> {
        if (!db) throw new Error("DB not initialized");
        db.exec("UPDATE datasets SET isActive = 0");
        db.exec(`UPDATE datasets SET isActive = 1 WHERE id = ${id}`);
        await this.save();
    },

    async addDataset(name: string, data: CampusData, isActive: boolean = false): Promise<void> {
        if (!db) throw new Error("DB not initialized");
        
        if (isActive) {
            db.exec("UPDATE datasets SET isActive = 0");
        }

        const stmt = db.prepare("INSERT INTO datasets (name, createdAt, isActive) VALUES (?, ?, ?)");
        // FIX: Type 'boolean' is not assignable to type 'SqlValue'. Convert boolean to integer.
        stmt.run([name, new Date().toISOString(), isActive ? 1 : 0]);
        stmt.free();

        const datasetId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];

        const insertFacility = db.prepare("INSERT INTO facilities (id, datasetId, name, polygon) VALUES (?, ?, ?, ?)");
        data.facilities.forEach(f => insertFacility.run([f.id, datasetId, f.name, JSON.stringify(f.polygon)]));
        insertFacility.free();
        
        const insertLevel = db.prepare("INSERT INTO levels (id, datasetId, name, facilityId, polygon, zIndex) VALUES (?, ?, ?, ?, ?, ?)");
        data.levels.forEach(l => insertLevel.run([l.id, datasetId, l.name, l.facilityId, JSON.stringify(l.polygon), l.zIndex]));
        insertLevel.free();

        const insertUnit = db.prepare("INSERT INTO units (id, datasetId, name, type, levelId, polygon, verticalConnectorId) VALUES (?, ?, ?, ?, ?, ?, ?)");
        data.units.forEach(u => insertUnit.run([u.id, datasetId, u.name, u.type, u.levelId, JSON.stringify(u.polygon), u.verticalConnectorId || null]));
        insertUnit.free();

        const insertDetail = db.prepare("INSERT INTO details (id, datasetId, type, levelId, line) VALUES (?, ?, ?, ?, ?)");
        data.details?.forEach(d => insertDetail.run([d.id, datasetId, d.type, d.levelId, JSON.stringify(d.line)]));
        insertDetail.free();

        await this.save();
    },

    async resetDatabase(): Promise<void> {
        if (!db) throw new Error("DB not initialized");
        const name = `Default Campus (Reset ${new Date().toLocaleTimeString()})`;
        await this.addDataset(name, defaultCampusData, false);
    }
}

function addDataset(name: string, data: CampusData, isActive: boolean = false) {
    if (!db) return;
    dbService.addDataset(name, data, isActive);
}