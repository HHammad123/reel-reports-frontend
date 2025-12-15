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
 * DISABLED: IndexedDB saving is disabled - returns immediately without saving
 * @param projectId Unique identifier for the project
 * @param editorState Current state of the editor
 * @returns Promise that resolves when the save is complete
 */
export const saveEditorState = async (projectId, editorState) => {
    // IndexedDB saving is disabled - return immediately without saving
    console.log("[IndexedDB] Saving disabled - skipping saveEditorState for projectId:", projectId);
    return Promise.resolve();
};
/**
 * Load editor state from autosave store
 * DISABLED: IndexedDB loading is disabled - always returns null
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves with the editor state or null if not found
 */
export const loadEditorState = async (projectId) => {
    // IndexedDB loading is disabled - always return null
    console.log("[IndexedDB] Loading disabled - loadEditorState returning null for projectId:", projectId);
    return Promise.resolve(null);
};
/**
 * Clear autosave data for a project
 * DISABLED: IndexedDB clearing is disabled - returns immediately
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves when the delete is complete
 */
export const clearAutosave = async (projectId) => {
    // IndexedDB clearing is disabled - return immediately
    console.log("[IndexedDB] Clearing disabled - skipping clearAutosave for projectId:", projectId);
    return Promise.resolve();
};
/**
 * Check if there's an autosave for a project
 * DISABLED: IndexedDB checking is disabled - always returns null
 * @param projectId Unique identifier for the project
 * @returns Promise that resolves with the timestamp of the autosave or null if not found
 */
export const hasAutosave = async (projectId) => {
    // IndexedDB checking is disabled - always return null
    console.log("[IndexedDB] Checking disabled - hasAutosave returning null for projectId:", projectId);
    return Promise.resolve(null);
};
/**
 * Get all autosave records
 * DISABLED: IndexedDB loading is disabled - always returns empty array
 * @returns Promise that resolves with an array of all autosave records
 */
export const getAllAutosaves = async () => {
    // IndexedDB loading is disabled - always return empty array
    console.log("[IndexedDB] Loading disabled - getAllAutosaves returning empty array");
    return Promise.resolve([]);
};
