/**
 * IndexedDB Helper Utility
 *
 * Provides functions to interact with IndexedDB for autosaving editor state.
 */
const DB_NAME = "VideoEditorProDB";
const DB_VERSION = 2;
const PROJECTS_STORE = "projects";
const AUTOSAVE_STORE = "autosave";
/**
 * Clear the database completely (useful for development/debugging)
 * @returns Promise that resolves when the database is cleared
 */
export const clearDatabase = () => {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
            resolve();
        };
        deleteRequest.onerror = (event) => {
            console.error("[IndexedDB] Error clearing database:", event);
            reject("Error clearing database");
        };
        deleteRequest.onblocked = () => {
            console.warn("[IndexedDB] Database deletion blocked - close all tabs using this database");
            reject("Database deletion blocked");
        };
    });
};
/**
 * Initialize the IndexedDB database
 * @returns Promise that resolves when the database is ready
 */
export const initDatabase = () => {
    return new Promise((resolve, reject) => {
        // Check if IndexedDB is available
        if (!window.indexedDB) {
            console.error("[IndexedDB] IndexedDB not supported");
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => {
            const error = event.target.error;
            console.error("[IndexedDB] Error opening database:", error);
            // If it's a version error, provide more helpful information
            if (error && error.name === "VersionError") {
                console.error("[IndexedDB] Database version conflict. Consider clearing the database or updating the version number.");
            }
            reject(new Error(`Error opening IndexedDB: ${(error === null || error === void 0 ? void 0 : error.message) || "Unknown error"}`));
        };
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Create projects store
            if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
                const projectsStore = db.createObjectStore(PROJECTS_STORE, {
                    keyPath: "id",
                });
                projectsStore.createIndex("name", "name", { unique: false });
                projectsStore.createIndex("lastModified", "lastModified", {
                    unique: false,
                });
            }
            // Create autosave store
            if (!db.objectStoreNames.contains(AUTOSAVE_STORE)) {
                const autosaveStore = db.createObjectStore(AUTOSAVE_STORE, {
                    keyPath: "id",
                });
                autosaveStore.createIndex("timestamp", "timestamp", { unique: false });
            }
        };
    });
};
/**
 * Save editor state to autosave store
 * @param projectId Unique identifier for the project
 * @param editorState Current state of the editor
 * @returns Promise that resolves when the save is complete
 */
export const saveEditorState = async (projectId, editorState) => {
    try {
        const db = await initDatabase();
        const transaction = db.transaction([AUTOSAVE_STORE], "readwrite");
        const store = transaction.objectStore(AUTOSAVE_STORE);
        
        const autosaveRecord = {
            id: projectId,
            timestamp: new Date().toISOString(),
            editorState: editorState
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(autosaveRecord);
            request.onsuccess = () => {
                console.log("[IndexedDB] Saved editor state for projectId:", projectId);
                resolve();
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error saving editor state:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("[IndexedDB] Failed to save editor state:", error);
        throw error;
    }
};
/**
 * Load editor state from autosave store
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves with the editor state or null if not found
 */
export const loadEditorState = async (projectId) => {
    try {
        const db = await initDatabase();
        const transaction = db.transaction([AUTOSAVE_STORE], "readonly");
        const store = transaction.objectStore(AUTOSAVE_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.get(projectId);
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.editorState) {
                    console.log("[IndexedDB] Loaded editor state for projectId:", projectId);
                    resolve(result.editorState);
                } else {
                    console.log("[IndexedDB] No saved state found for projectId:", projectId);
                    resolve(null);
                }
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error loading editor state:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("[IndexedDB] Failed to load editor state:", error);
        return null;
    }
};
/**
 * Clear autosave data for a project
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves when the delete is complete
 */
export const clearAutosave = async (projectId) => {
    try {
        const db = await initDatabase();
        const transaction = db.transaction([AUTOSAVE_STORE], "readwrite");
        const store = transaction.objectStore(AUTOSAVE_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.delete(projectId);
            request.onsuccess = () => {
                console.log("[IndexedDB] Cleared autosave for projectId:", projectId);
                resolve();
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error clearing autosave:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("[IndexedDB] Failed to clear autosave:", error);
        throw error;
    }
};
/**
 * Check if there's an autosave for a project
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves with the timestamp of the autosave or null if not found
 */
export const hasAutosave = async (projectId) => {
    try {
        const db = await initDatabase();
        const transaction = db.transaction([AUTOSAVE_STORE], "readonly");
        const store = transaction.objectStore(AUTOSAVE_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.get(projectId);
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.timestamp) {
                    console.log("[IndexedDB] Found autosave for projectId:", projectId, "timestamp:", result.timestamp);
                    resolve(result.timestamp);
                } else {
                    console.log("[IndexedDB] No autosave found for projectId:", projectId);
                    resolve(null);
                }
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error checking autosave:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("[IndexedDB] Failed to check autosave:", error);
        return null;
    }
};
/**
 * Get all autosave records
 * @returns Promise that resolves with an array of all autosave records
 */
export const getAllAutosaves = async () => {
    try {
        const db = await initDatabase();
        const transaction = db.transaction([AUTOSAVE_STORE], "readonly");
        const store = transaction.objectStore(AUTOSAVE_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const records = request.result || [];
                // Sort by timestamp descending (most recent first)
                records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                console.log("[IndexedDB] Loaded", records.length, "autosave records");
                resolve(records);
            };
            request.onerror = (event) => {
                console.error("[IndexedDB] Error loading all autosaves:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error("[IndexedDB] Failed to load all autosaves:", error);
        return [];
    }
};
