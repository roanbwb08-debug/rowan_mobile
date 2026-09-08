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

if (!config) {
  throw new Error('Firebase configuration file firebase-applet-config.json not found');
}

const app = initializeApp(config);
const rawDb = getFirestore(app, databaseId);

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
  rawBatch = writeBatch(rawDb);

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

console.log(`[FIREBASE-SERVICE] Initialized client-side SDK proxy with databaseId: "${databaseId}"`);

export const db = {
  collection(pathName: string) {
    return new CollectionWrapper(collection(rawDb, pathName));
  },
  batch() {
    return new BatchWrapper();
  }
};

export { databaseId };
