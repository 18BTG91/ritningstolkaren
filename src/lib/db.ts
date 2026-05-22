const DB_NAME = "ritningstolkaren";
const DB_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("drawings")) {
        const store = db.createObjectStore("drawings", { keyPath: "id" });
        store.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "drawingId" });
      }
      if (!db.objectStoreNames.contains("feedback")) {
        const fb = db.createObjectStore("feedback", { keyPath: "id" });
        fb.createIndex("projectId", "projectId", { unique: false });
        fb.createIndex("drawingType", "drawingType", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function txAll<T>(
  storeName: string,
  fn: (store: IDBObjectStore) => IDBRequest<T[]>
): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

// Projects
export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export async function getProjects(): Promise<ProjectRecord[]> {
  return txAll("projects", (s) => s.getAll());
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  return tx("projects", "readonly", (s) => s.get(id));
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  await tx("projects", "readwrite", (s) => s.put(project));
}

export async function deleteProject(id: string): Promise<void> {
  const drawings = await getDrawingsByProject(id);
  for (const d of drawings) {
    await deleteDrawing(d.id);
  }
  await tx("projects", "readwrite", (s) => s.delete(id));
}

// Drawings
export interface DrawingRecord {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  analysis: unknown | null;
}

export async function getDrawingsByProject(projectId: string): Promise<DrawingRecord[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("drawings", "readonly");
        const store = transaction.objectStore("drawings");
        const index = store.index("projectId");
        const req = index.getAll(projectId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getDrawing(id: string): Promise<DrawingRecord | undefined> {
  return tx("drawings", "readonly", (s) => s.get(id));
}

export async function saveDrawing(drawing: DrawingRecord): Promise<void> {
  await tx("drawings", "readwrite", (s) => s.put(drawing));
}

export async function deleteDrawing(id: string): Promise<void> {
  await tx("files", "readwrite", (s) => s.delete(id));
  await tx("drawings", "readwrite", (s) => s.delete(id));
}

// Files (PDF blobs)
export async function saveFile(drawingId: string, data: ArrayBuffer): Promise<void> {
  await tx("files", "readwrite", (s) => s.put({ drawingId, data }));
}

export async function getFile(drawingId: string): Promise<ArrayBuffer | null> {
  const rec = await tx<{ drawingId: string; data: ArrayBuffer } | undefined>(
    "files",
    "readonly",
    (s) => s.get(drawingId)
  );
  return rec?.data ?? null;
}

// Feedback
import type { AnalysisFeedback } from "@/lib/types";

export async function saveFeedback(feedback: AnalysisFeedback): Promise<void> {
  await tx("feedback", "readwrite", (s) => s.put(feedback));
}

export async function getFeedbackByProject(projectId: string): Promise<AnalysisFeedback[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("feedback", "readonly");
        const store = transaction.objectStore("feedback");
        const index = store.index("projectId");
        const req = index.getAll(projectId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getAllFeedback(): Promise<AnalysisFeedback[]> {
  return txAll("feedback", (s) => s.getAll());
}

export async function deleteFeedback(id: string): Promise<void> {
  await tx("feedback", "readwrite", (s) => s.delete(id));
}
