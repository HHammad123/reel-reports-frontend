import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search, AlertCircle } from "lucide-react";
/**
 * MediaEmptyState - Shared empty state component
 *
 * Provides consistent empty state messaging and styling across all media panels.
 * Handles different types of empty states with appropriate icons and messages.
 */
export const MediaEmptyState = ({ type, mediaType, activeTabName, }) => {
    if (type === 'no-adaptors') {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-muted-foreground text-center", children: [_jsx(AlertCircle, { className: "h-8 w-8 mb-2" }), _jsxs("p", { children: ["No ", mediaType, " available"] })] }));
    }
    if (type === 'no-results') {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-muted-foreground text-center", children: [_jsx(AlertCircle, { className: "h-8 w-8 mb-2" }), _jsxs("p", { children: ["No ", mediaType, " found", activeTabName ? ` in ${activeTabName}` : ""] }), _jsx("p", { className: "text-sm mt-1", children: "Try a different search term" })] }));
    }
    // Initial state
    return (_jsxs("div", { className: "flex flex-col font-extralight items-center justify-center py-8 text-muted-foreground text-center", children: [_jsx(Search, { className: "h-8 w-8 mb-2" }), _jsxs("p", { className: "text-sm text-center", children: ["Use the search to find ", mediaType] }), _jsx("p", { className: "text-xs text-center mt-1", children: "Enter a search term above" })] }));
};
