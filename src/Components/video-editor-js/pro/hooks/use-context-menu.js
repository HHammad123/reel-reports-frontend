import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
/**
 * A custom hook for managing a context menu.
 * @returns An object containing functions to show and hide the context menu, and a component to render it.
 */
export const useContextMenu = () => {
    // State to store the current context menu position and items
    const [contextMenu, setContextMenu] = useState(null);
    /**
     * Shows the context menu at the specified position with the given items.
     * @param e - The mouse event that triggered the context menu.
     * @param items - An array of MenuItem objects to display in the context menu.
     */
    const showContextMenu = useCallback((e, items) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items,
        });
    }, []);
    /**
     * Hides the context menu.
     */
    const hideContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);
    /**
     * A component that renders the context menu.
     * @returns A JSX element representing the context menu, or null if the menu is not visible.
     */
    const ContextMenuComponent = useCallback(() => {
        if (!contextMenu)
            return null;
        return (_jsx("div", { className: "absolute bg-context border border-context rounded-md shadow-lg z-50", style: { top: contextMenu.y, left: contextMenu.x }, children: contextMenu.items.map((item, index) => (_jsxs("button", { className: "w-full text-left px-4 py-2 hover:bg-context-hover flex items-center text-primary transition-colors duration-150", onClick: () => {
                    item.action();
                    hideContextMenu();
                }, children: [_jsx("span", { className: "mr-3", children: item.icon }), _jsx("span", { children: item.label })] }, index))) }));
    }, [contextMenu, hideContextMenu]);
    // Return the functions and component for external use
    return { showContextMenu, hideContextMenu, ContextMenuComponent };
};
