import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
// Create the context with undefined as default value
const EditorContext = createContext(undefined);
// Provider component that wraps parts of the app that need access to the context
export const EditorProvider = ({ value, children }) => {
    return (_jsx(EditorContext.Provider, { value: value, children: children }));
};
// Custom hook that components can use to access the context
// Throws an error if used outside of EditorProvider
export const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error("useEditorContext must be used within an EditorProvider");
    }
    return context;
};
