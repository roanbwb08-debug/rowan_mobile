/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore'
import fs from 'fs'
import path from 'path'

let config: any;
let databaseId = '(default)';

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.firestoreDatabaseId) {
      databaseId = config.firestoreDatabaseId;
    }
  }
} catch (e) {
  console.error('[FIREBASE-SERVICE] Error reading config:', e);
}

const isPlaceholderConfig = !config || config.projectId === 'your-firebase-project-id' || !config.projectId;

// --- Local File / In-Memory Store Implementation for Placeholder / Sandbox Mode ---
const LOCAL_DB_PATH = path.join(process.cwd(), 'backend', 'src', 'data', 'local_db.json');

function loadLocalData(): Record<string, any[]> {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('[FIREBASE-LOCAL] Could not parse local_db.json, initializing fresh local store:', e);
  }
  return {};
}

function saveLocalData(data: Record<string, any[]>) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[FIREBASE-LOCAL] Could not persist local_db.json:', e);
  }
}

const localStore: Record<string, any[]> = loadLocalData();

class LocalDocRef {
  path: string;
  id: string;
  collectionName: string;

  constructor(collectionName: string, id?: string) {
    this.collectionName = collectionName;
    this.id = id || Math.random().toString(36).substring(2, 13);
    this.path = `${collectionName}/${this.id}`;
  }

  async get() {
    const list = localStore[this.collectionName] || [];
    const item = list.find((d: any) => d.id === this.id);
    return {
      exists: !!item,
      id: this.id,
      data: () => item ? { ...item } : undefined,
      ref: this
    };
  }

  async set(data: any) {
    if (!localStore[this.collectionName]) {
      localStore[this.collectionName] = [];
    }
    const list = localStore[this.collectionName];
    const index = list.findIndex((d: any) => d.id === this.id);
    const docData = { ...data, id: this.id };
    if (index >= 0) {
      list[index] = docData;
    } else {
      list.push(docData);
    }
    saveLocalData(localStore);
  }

  async update(data: any) {
    if (!localStore[this.collectionName]) {
      localStore[this.collectionName] = [];
    }
    const list = localStore[this.collectionName];
    const index = list.findIndex((d: any) => d.id === this.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...data, id: this.id };
    } else {
      list.push({ ...data, id: this.id });
    }
    saveLocalData(localStore);
  }

  async delete() {
    if (localStore[this.collectionName]) {
      localStore[this.collectionName] = localStore[this.collectionName].filter((d: any) => d.id !== this.id);
      saveLocalData(localStore);
    }
  }

  collection(subCollectionName: string) {
    return new LocalCollection(`${this.collectionName}/${this.id}/${subCollectionName}`);
  }
}

class LocalQuery {
  collectionName: string;
  filters: Array<{ field: string; op: string; value: any }> = [];
  sorts: Array<{ field: string; dir: 'asc' | 'desc' }> = [];
  limitNum?: number;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  where(field: string, op: string, value: any) {
    const q = new LocalQuery(this.collectionName);
    q.filters = [...this.filters, { field, op, value }];
    q.sorts = [...this.sorts];
    q.limitNum = this.limitNum;
    return q;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    const q = new LocalQuery(this.collectionName);
    q.filters = [...this.filters];
    q.sorts = [...this.sorts, { field, dir }];
    q.limitNum = this.limitNum;
    return q;
  }

  limit(num: number) {
    const q = new LocalQuery(this.collectionName);
    q.filters = [...this.filters];
    q.sorts = [...this.sorts];
    q.limitNum = num;
    return q;
  }

  async get() {
    let list = localStore[this.collectionName] || [];

    for (const f of this.filters) {
      list = list.filter((item: any) => {
        const val = item[f.field];
        if (f.op === '==' || f.op === '===') return val === f.value;
        if (f.op === '!=') return val !== f.value;
        if (f.op === '>') return val > f.value;
        if (f.op === '>=') return val >= f.value;
        if (f.op === '<') return val < f.value;
        if (f.op === '<=') return val <= f.value;
        if (f.op === 'in' && Array.isArray(f.value)) return f.value.includes(val);
        if (f.op === 'array-contains' && Array.isArray(val)) return val.includes(f.value);
        return true;
      });
    }

    for (const s of this.sorts) {
      list = [...list].sort((a: any, b: any) => {
        const valA = a[s.field] ?? '';
        const valB = b[s.field] ?? '';
        if (valA < valB) return s.dir === 'asc' ? -1 : 1;
        if (valA > valB) return s.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (this.limitNum !== undefined) {
      list = list.slice(0, this.limitNum);
    }

    const docs = list.map((d: any) => ({
      id: d.id,
      data: () => ({ ...d }),
      ref: new LocalDocRef(this.collectionName, d.id)
    }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs
    };
  }
}

class LocalCollection extends LocalQuery {
  constructor(collectionName: string) {
    super(collectionName);
  }

  doc(id?: string) {
    return new LocalDocRef(this.collectionName, id);
  }
}

class LocalBatch {
  operations: Array<() => Promise<void>> = [];

  set(docRef: LocalDocRef, data: any) {
    this.operations.push(() => docRef.set(data));
  }

  update(docRef: LocalDocRef, data: any) {
    this.operations.push(() => docRef.update(data));
  }

  async commit() {
    for (const op of this.operations) {
      await op();
    }
  }
}

// --- Live Firestore SDK Proxy Wrappers ---
class DocRefWrapper {
  rawRef: any;
  constructor(rawRef: any) {
    this.rawRef = rawRef;
  }

  get id() {
    return this.rawRef.id;
  }

  async get() {
    const snap = await getDoc(this.rawRef);
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data(),
      ref: this
    };
  }

  async set(data: any) {
    await setDoc(this.rawRef, data);
  }

  async update(data: any) {
    await updateDoc(this.rawRef, data);
  }

  async delete() {
    await deleteDoc(this.rawRef);
  }

  collection(pathName: string) {
    return new CollectionWrapper(collection(this.rawRef, pathName));
  }
}

class QueryWrapper {
  rawQuery: any;
  constraints: any[];
  constructor(rawQuery: any, constraints: any[] = []) {
    this.rawQuery = rawQuery;
    this.constraints = constraints;
  }

  where(field: string, operator: any, value: any) {
    return new QueryWrapper(this.rawQuery, [...this.constraints, where(field, operator, value)]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new QueryWrapper(this.rawQuery, [...this.constraints, orderBy(field, direction)]);
  }

  limit(num: number) {
    return new QueryWrapper(this.rawQuery, [...this.constraints, limit(num)]);
  }

  async get() {
    const q = query(this.rawQuery, ...this.constraints);
    const snap = await getDocs(q);
    return {
      empty: snap.empty,
      size: snap.size,
      docs: snap.docs.map(d => ({
        id: d.id,
        data: () => d.data(),
        ref: new DocRefWrapper(d.ref)
      }))
    };
  }
}

class CollectionWrapper extends QueryWrapper {
  rawCollection: any;
  constructor(rawCollection: any) {
    super(rawCollection);
    this.rawCollection = rawCollection;
  }

  doc(id?: string) {
    const r = id ? doc(this.rawCollection, id) : doc(this.rawCollection);
    return new DocRefWrapper(r);
  }
}

class BatchWrapper {
  rawBatch: any;
  constructor(dbInstance: any) {
    this.rawBatch = writeBatch(dbInstance);
  }

  set(docRef: any, data: any) {
    this.rawBatch.set(docRef.rawRef, data);
  }

  update(docRef: any, data: any) {
    this.rawBatch.update(docRef.rawRef, data);
  }

  async commit() {
    await this.rawBatch.commit();
  }
}

// Initialize Live SDK ONLY if a real configured non-placeholder Firebase project ID exists
let rawDb: any = null;
if (!isPlaceholderConfig) {
  try {
    const app = initializeApp(config);
    rawDb = getFirestore(app, databaseId);
    console.log(`[FIREBASE-SERVICE] Initialized Cloud Firestore SDK for project "${config.projectId}"`);
  } catch (e) {
    console.warn('[FIREBASE-SERVICE] Error initializing Firestore SDK, using Local DB mode:', e);
  }
} else {
  console.log(`[FIREBASE-SERVICE] Placeholder config ("your-firebase-project-id") detected. Operating in isolated Local DB mode.`);
}

export const db = {
  collection(pathName: string) {
    if (rawDb && !isPlaceholderConfig) {
      return new CollectionWrapper(collection(rawDb, pathName));
    }
    return new LocalCollection(pathName);
  },
  batch() {
    if (rawDb && !isPlaceholderConfig) {
      return new BatchWrapper(rawDb);
    }
    return new LocalBatch();
  }
};

export { databaseId };
