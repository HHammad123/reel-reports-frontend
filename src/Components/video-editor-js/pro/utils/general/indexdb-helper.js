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
 * DISABLED: Autosave functionality has been removed
 * @param projectId Unique identifier for the project
 * @param editorState Current state of the editor
 * @returns Promise that resolves immediately without saving
 */
export const saveEditorState = async (projectId, editorState) => {
    console.log("[IndexedDB] Autosave disabled - saveEditorState called but not saving");
    return Promise.resolve();
};
/**
 * Load editor state from autosave store
 * DISABLED: Autosave functionality has been removed
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves with null (no saved state)
 */
export const loadEditorState = async (projectId) => {
    console.log("[IndexedDB] Autosave disabled - loadEditorState returning null");
    return Promise.resolve(null);
};
/**
 * Clear autosave data for a project
 * DISABLED: Autosave functionality has been removed
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves immediately without clearing
 */
export const clearAutosave = async (projectId) => {
    console.log("[IndexedDB] Autosave disabled - clearAutosave called but not clearing");
    return Promise.resolve();
};
/**
 * Check if there's an autosave for a project
 * DISABLED: Autosave functionality has been removed
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves with null (no autosave found)
 */
export const hasAutosave = async (projectId) => {
    console.log("[IndexedDB] Autosave disabled - hasAutosave returning null");
    return Promise.resolve(null);
};
/**
 * Get all autosave records
 * DISABLED: Autosave functionality has been removed
 * @returns Promise that resolves with an empty array
 */
export const getAllAutosaves = async () => {
    console.log("[IndexedDB] Autosave disabled - getAllAutosaves returning empty array");
    return Promise.resolve([]);
};
