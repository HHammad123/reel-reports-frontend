import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from "react";
import { OverlayType } from "../types";
import { useSidebar } from "../components/ui/sidebar";
// Create the context with undefined as initial value
const EditorSidebarContext = createContext(undefined);
// Custom hook to consume the editor sidebar context
export const useEditorSidebar = () => {
    const context = useContext(EditorSidebarContext);
    if (!context) {
        throw new Error("useEditorSidebar must be used within a SidebarProvider");
    }
    return context;
};
// Provider component that wraps parts of the app that need access to sidebar state
export const SidebarProvider = ({ children, }) => {
    const [activePanel, setActivePanel] = useState(OverlayType.VIDEO);
    const uiSidebar = useSidebar();
    const setIsOpen = (open) => {
        uiSidebar.setOpen(open);
    };
    const value = {
        activePanel,
        setActivePanel,
        setIsOpen,
    };
    return (_jsx(EditorSidebarContext.Provider, { value: value, children: children }));
};
