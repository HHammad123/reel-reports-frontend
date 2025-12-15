/**
 * Lightweight debounce utility to replace lodash/debounce
 * Delays function execution until after wait milliseconds have elapsed since the last invocation
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns The debounced function
 */
export function debounce(func, wait) {
    let timeoutId = null;
    return (...args) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, wait);
    };
}
