'use client';
import { useState, useCallback } from 'react';
let toastCount = 0;
export function useToast() {
    const [state, setState] = useState({ toasts: [] });
    const toast = useCallback((props) => {
        var _a;
        const id = (++toastCount).toString();
        const newToast = {
            id,
            ...props,
        };
        setState((prevState) => ({
            toasts: [...prevState.toasts, newToast],
        }));
        // Auto-dismiss toast after duration
        const duration = (_a = props.duration) !== null && _a !== void 0 ? _a : 5000;
        if (duration > 0) {
            setTimeout(() => {
                setState((prevState) => ({
                    toasts: prevState.toasts.filter((t) => t.id !== id),
                }));
            }, duration);
        }
        return {
            id,
            dismiss: () => {
                setState((prevState) => ({
                    toasts: prevState.toasts.filter((t) => t.id !== id),
                }));
            },
            update: (updatedProps) => {
                setState((prevState) => ({
                    toasts: prevState.toasts.map((t) => t.id === id ? { ...t, ...updatedProps } : t),
                }));
            },
        };
    }, []);
    const dismiss = useCallback((toastId) => {
        setState((prevState) => ({
            toasts: toastId
                ? prevState.toasts.filter((t) => t.id !== toastId)
                : [],
        }));
    }, []);
    return {
        toast,
        dismiss,
        toasts: state.toasts,
    };
}
// Export a singleton toast function for convenience
let globalToast = null;
export function toast(props) {
    if (!globalToast) {
        console.warn('Toast called before useToast hook was initialized');
        return {
            id: '',
            dismiss: () => { },
            update: () => { },
        };
    }
    return globalToast.toast(props);
}
// Set the global toast instance
export function setGlobalToast(toastInstance) {
    globalToast = toastInstance;
}
