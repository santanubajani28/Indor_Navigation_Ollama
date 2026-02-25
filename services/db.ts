
import initSqlJs, { type Database } from 'sql.js';
import type { CampusData, Dataset, Facility, Level, Unit, Detail, User, Role, Site } from '../types';

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
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
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
    stmt.free();
    return results;
}

const createTables = () => {
    if (!db) return;
    db.exec(`
        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            isActive BOOLEAN NOT NULL,
            originLat REAL,
            originLon REAL
        );
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );
         CREATE TABLE IF NOT EXISTS sites (
            id TEXT,
            datasetId INTEGER,
            name TEXT,
            polygon TEXT,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE IF NOT EXISTS facilities (
            id TEXT,
            datasetId INTEGER,
            siteId TEXT,
            name TEXT,
            polygon TEXT,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE IF NOT EXISTS levels (
            id TEXT,
            datasetId INTEGER,
            name TEXT,
            facilityId TEXT,
            polygon TEXT,
            zIndex INTEGER,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE IF NOT EXISTS units (
            id TEXT,
            datasetId INTEGER,
            name TEXT,
            type TEXT,
            levelId TEXT,
            polygon TEXT,
            verticalConnectorId TEXT,
            accessible BOOLEAN,
            PRIMARY KEY (id, datasetId)
        );
        CREATE TABLE IF NOT EXISTS details (
            id TEXT,
            datasetId INTEGER,
            type TEXT,
            levelId TEXT,
            line TEXT,
            useType TEXT,
            height REAL,
            PRIMARY KEY (id, datasetId)
        );
    `);
};

const seedDatabase = () => {
    if (!db) return;
    // Seed users
    const userCount = db.exec("SELECT COUNT(*) FROM users")[0].values[0][0];
    if (userCount === 0) {
        db.exec(`
            INSERT INTO users (username, password, role) VALUES ('santanu', '111', 'admin');
            INSERT INTO users (username, password, role) VALUES ('san', '111', 'viewer');
        `);
    }
}


// --- Public API ---

export const dbService = {
    async init(): Promise<void> {
        if (isInitialized) return;

        const SQL = await initSqlJs({
            locateFile: file => `https://esm.sh/sql.js@1.10.3/dist/${file}`
        });
        const savedDb = await loadDbFromIdb();

        if (savedDb) {
            console.log("Loading database from persistence...");
            db = new SQL.Database(savedDb);
            // Migration logic for existing databases
            try {
                const tableInfoRes = db.exec("PRAGMA table_info(datasets)");
                if (tableInfoRes.length > 0) {
                    const columns = tableInfoRes[0].values.map(row => row[1] as string);
                    if (!columns.includes('originLat')) {
                        db.exec("ALTER TABLE datasets ADD COLUMN originLat REAL;");
                    }
                    if (!columns.includes('originLon')) {
                        db.exec("ALTER TABLE datasets ADD COLUMN originLon REAL;");
                    }
                }
            } catch (e) { console.error("Error during DB migration", e); }
        } else {
            console.log("Creating new database...");
            db = new SQL.Database();
        }

        createTables();
        seedDatabase();
        await this.save();
        isInitialized = true;
    },

    async save(): Promise<void> {
        if (!db) return;
        const data = db.export();
        await saveDbToIdb(data);
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

    async getCampusDataForId(datasetId: number): Promise<CampusData> {
        if (!db) throw new Error("DB not initialized");
        const sites = objectify(db.prepare(`SELECT * FROM sites WHERE datasetId = ${datasetId}`)).map(s => ({ ...s, polygon: JSON.parse(s.polygon as string) })) as Site[];
        const facilities = objectify(db.prepare(`SELECT * FROM facilities WHERE datasetId = ${datasetId}`)).map(f => ({ ...f, polygon: JSON.parse(f.polygon as string) })) as Facility[];
        const levels = objectify(db.prepare(`SELECT * FROM levels WHERE datasetId = ${datasetId}`)).map(l => ({ ...l, polygon: JSON.parse(l.polygon as string) })) as Level[];
        const units = objectify(db.prepare(`SELECT * FROM units WHERE datasetId = ${datasetId}`)).map(u => ({ ...u, polygon: JSON.parse(u.polygon as string), accessible: u.accessible !== 0 })) as Unit[];
        const details = objectify(db.prepare(`SELECT * FROM details WHERE datasetId = ${datasetId}`)).map(d => ({ ...d, line: JSON.parse(d.line as string) })) as Detail[];
        return { sites, facilities, levels, units, details };
    },

    async getActiveCampusData(): Promise<CampusData> {
        if (!db) throw new Error("DB not initialized");
        const activeDataset = objectify(db.prepare("SELECT id FROM datasets WHERE isActive = 1"))[0];
        if (!activeDataset) return { sites: [], facilities: [], levels: [], units: [], details: [] };
        return this.getCampusDataForId(activeDataset.id as number);
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

    async addDataset(
        name: string,
        data: CampusData,
        isActive: boolean = false,
        onProgress?: (progress: number) => void,
        mapOrigin?: { lat: number; lon: number }
    ): Promise<void> {
        if (!db) throw new Error("DB not initialized");
        onProgress?.(0);

        if (isActive) {
            db.exec("UPDATE datasets SET isActive = 0");
        }

        const totalItems = (data.sites?.length || 0) +
            (data.facilities?.length || 0) +
            (data.levels?.length || 0) +
            (data.units?.length || 0) +
            (data.details?.length || 0);
        let itemsProcessed = 0;

        const stmt = db.prepare("INSERT INTO datasets (name, createdAt, isActive, originLat, originLon) VALUES (?, ?, ?, ?, ?)");
        stmt.run([name, new Date().toISOString(), isActive ? 1 : 0, mapOrigin?.lat ?? null, mapOrigin?.lon ?? null]);
        stmt.free();

        const datasetId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

        db.exec("BEGIN TRANSACTION;");
        try {
            const insertSite = db.prepare("INSERT INTO sites (id, datasetId, name, polygon) VALUES (?, ?, ?, ?)");
            data.sites?.forEach(s => insertSite.run([s.id, datasetId, s.name, JSON.stringify(s.polygon)]));
            insertSite.free();
            itemsProcessed += (data.sites?.length || 0);
            if (totalItems > 0) onProgress?.((itemsProcessed / totalItems) * 100);

            const insertFacility = db.prepare("INSERT INTO facilities (id, datasetId, siteId, name, polygon) VALUES (?, ?, ?, ?, ?)");
            data.facilities.forEach(f => insertFacility.run([f.id, datasetId, f.siteId, f.name, JSON.stringify(f.polygon)]));
            insertFacility.free();
            itemsProcessed += data.facilities.length;
            if (totalItems > 0) onProgress?.((itemsProcessed / totalItems) * 100);

            const insertLevel = db.prepare("INSERT INTO levels (id, datasetId, name, facilityId, polygon, zIndex) VALUES (?, ?, ?, ?, ?, ?)");
            data.levels.forEach(l => insertLevel.run([l.id, datasetId, l.name, l.facilityId, JSON.stringify(l.polygon), l.zIndex]));
            insertLevel.free();
            itemsProcessed += data.levels.length;
            if (totalItems > 0) onProgress?.((itemsProcessed / totalItems) * 100);

            const insertUnit = db.prepare("INSERT INTO units (id, datasetId, name, type, levelId, polygon, verticalConnectorId, accessible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            data.units.forEach(u => insertUnit.run([u.id, datasetId, u.name, u.type, u.levelId, JSON.stringify(u.polygon), u.verticalConnectorId || null, u.accessible ? 1 : 0]));
            insertUnit.free();
            itemsProcessed += data.units.length;
            if (totalItems > 0) onProgress?.((itemsProcessed / totalItems) * 100);

            const insertDetail = db.prepare("INSERT INTO details (id, datasetId, type, levelId, line, useType, height) VALUES (?, ?, ?, ?, ?, ?, ?)");
            data.details?.forEach(d => insertDetail.run([d.id, datasetId, d.type, d.levelId, JSON.stringify(d.line), d.useType, d.height]));
            insertDetail.free();
            itemsProcessed += (data.details?.length || 0);
            if (totalItems > 0) onProgress?.((itemsProcessed / totalItems) * 100);

            db.exec("COMMIT;");
        } catch (e) {
            console.error("Error during dataset insertion transaction, rolling back.", e);
            db.exec("ROLLBACK;");
            throw e; // Propagate error to be caught by the UI
        }

        onProgress?.(100);
        await this.save();
    },

    async deleteDataset(id: number): Promise<void> {
        if (!db) throw new Error("DB not initialized");

        const allDatasets = await this.getDatasets();
        if (allDatasets.length <= 1) {
            throw new Error("Cannot delete the last dataset.");
        }

        const datasetToDelete = allDatasets.find(d => d.id === id);

        db.exec("BEGIN TRANSACTION;");
        try {
            if (datasetToDelete?.isActive) {
                const nextActiveDataset = allDatasets.find(d => d.id !== id);
                if (nextActiveDataset) {
                    db.exec(`UPDATE datasets SET isActive = 1 WHERE id = ${nextActiveDataset.id}`);
                }
            }

            const tables = ['sites', 'facilities', 'levels', 'units', 'details'];
            for (const table of tables) {
                db.exec(`DELETE FROM ${table} WHERE datasetId = ${id}`);
            }
            db.exec(`DELETE FROM datasets WHERE id = ${id}`);

            db.exec("COMMIT;");
        } catch (e) {
            console.error("Error during dataset deletion transaction, rolling back.", e);
            db.exec("ROLLBACK;");
            throw e;
        }

        await this.save();
    },
}
