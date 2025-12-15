/**
 * IndexedDB Utility
 *
 * This utility provides functions to:
 * - Initialize the database
 * - Add, retrieve, update, and delete media items
 * - Query media items by user ID
 */
import { isIndexedDBSupported } from './browser-check';
// Database configuration
const DB_NAME = 'VideoEditorDB';
const DB_VERSION = 3; // Increment version to handle blob storage and fix version conflicts
const MEDIA_STORE = 'userMedia';
/**
 * Initialize the IndexedDB database
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        if (!isIndexedDBSupported()) {
            reject(new Error('IndexedDB is not supported in this browser'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => {
            const error = event.target.error;
            console.error('Error opening IndexedDB:', event);
            // If it's a version error, provide more helpful information
            if (error && error.name === 'VersionError') {
                console.error('Database version conflict detected. The database may need to be cleared.');
                console.error('To fix this, you can call clearIndexedDB() from the browser console.');
                // Automatically attempt to clear and recreate the database
                const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                deleteRequest.onsuccess = () => {
                    console.log('Database cleared due to version conflict. Retrying...');
                    // Retry opening the database
                    const retryRequest = indexedDB.open(DB_NAME, DB_VERSION);
                    retryRequest.onsuccess = (retryEvent) => {
                        const db = retryEvent.target.result;
                        resolve(db);
                    };
                    retryRequest.onerror = () => {
                        reject(new Error('Could not open IndexedDB after clearing'));
                    };
                    retryRequest.onupgradeneeded = (retryEvent) => {
                        const db = retryEvent.target.result;
                        // Create object store for user media
                        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
                            const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
                            store.createIndex('userId', 'userId', { unique: false });
                            store.createIndex('type', 'type', { unique: false });
                            store.createIndex('createdAt', 'createdAt', { unique: false });
                        }
                    };
                };
                deleteRequest.onerror = () => {
                    reject(new Error('Could not clear IndexedDB to resolve version conflict'));
                };
            }
            else {
                reject(new Error('Could not open IndexedDB'));
            }
        };
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Create object store for user media
            if (!db.objectStoreNames.contains(MEDIA_STORE)) {
                const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
};
/**
 * Add a media item to the database
 * DISABLED: IndexedDB saving is disabled - returns immediately without saving
 */
export const addMediaItem = async (mediaItem) => {
    // IndexedDB saving is disabled - return immediately without saving
    console.log('[IndexedDB] Saving disabled - skipping addMediaItem for:', mediaItem?.id || 'unknown');
    return Promise.resolve(mediaItem?.id || null);
};
/**
 * Get a media item by ID
 * DISABLED: IndexedDB saving is disabled - always returns null
 */
export const getMediaItem = async (id) => {
    // IndexedDB saving is disabled - always return null
    console.log('[IndexedDB] Loading disabled - getMediaItem returning null for:', id);
    return Promise.resolve(null);
};
/**
 * Get all media items for a user
 * DISABLED: IndexedDB saving is disabled - always returns empty array
 */
export const getUserMediaItems = async (userId) => {
    // IndexedDB saving is disabled - always return empty array
    console.log('[IndexedDB] Loading disabled - getUserMediaItems returning empty array for userId:', userId);
    return Promise.resolve([]);
};
/**
 * Delete a media item by ID
 * DISABLED: IndexedDB saving is disabled - returns true without deleting
 */
export const deleteMediaItem = async (id) => {
    // IndexedDB saving is disabled - return true without deleting
    console.log('[IndexedDB] Deletion disabled - skipping deleteMediaItem for:', id);
    return Promise.resolve(true);
};
/**
 * Clear all media items for a user
 * DISABLED: IndexedDB saving is disabled - returns true without clearing
 */
export const clearUserMedia = async (userId) => {
    // IndexedDB saving is disabled - return true without clearing
    console.log('[IndexedDB] Clearing disabled - skipping clearUserMedia for userId:', userId);
    return Promise.resolve(true);
};
/**
 * Get a blob URL for a media item stored in IndexedDB
 * DISABLED: IndexedDB saving is disabled - always returns null
 */
export const getMediaBlobUrl = async (id) => {
    // IndexedDB saving is disabled - always return null
    console.log('[IndexedDB] Loading disabled - getMediaBlobUrl returning null for:', id);
    return Promise.resolve(null);
};
/**
 * Update a media item's blob URL (useful when URLs need to be refreshed)
 * DISABLED: IndexedDB saving is disabled - always returns null
 */
export const refreshMediaBlobUrl = async (id) => {
    // IndexedDB saving is disabled - always return null
    console.log('[IndexedDB] Refresh disabled - refreshMediaBlobUrl returning null for:', id);
    return Promise.resolve(null);
};
/**
 * Utility function to clear the IndexedDB database completely
 * This can be called from the browser console to fix version conflicts
 */
export const clearIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
            console.log('IndexedDB database cleared successfully');
            resolve();
        };
        deleteRequest.onerror = (event) => {
            console.error('Error clearing IndexedDB database:', event);
            reject(new Error('Failed to clear IndexedDB database'));
        };
        deleteRequest.onblocked = () => {
            console.warn('IndexedDB deletion blocked. Please close all tabs using this application and try again.');
            reject(new Error('IndexedDB deletion blocked'));
        };
    });
};
// Make clearIndexedDB available globally for debugging
if (typeof window !== 'undefined') {
    window.clearIndexedDB = clearIndexedDB;
}
