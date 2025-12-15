import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { TemplateCard } from "./template-card";
import { MediaLoadingGrid } from "../shared/media-loading-grid";
import { MediaEmptyState } from "../shared/media-empty-state";
/**
 * TemplateGrid - Specialized grid component for template overlays
 *
 * Provides consistent layout and state handling for template cards.
 * Handles loading states, error states, and empty states specific to templates.
 */
export const TemplateGrid = ({ templates, isLoading, hasAdaptors, hasSearched, activeTab, sourceResults, onTemplateClick, error, }) => {
    var _a;
    // Get active tab display name for empty state
    const activeTabDisplayName = (_a = sourceResults.find(s => s.adaptorName === activeTab)) === null || _a === void 0 ? void 0 : _a.adaptorDisplayName;
    // Show error state
    if (error) {
        return (_jsx("div", { className: "bg-destructive border border-destructive rounded-lg p-3", children: _jsxs("div", { className: "text-destructive text-sm font-extralight", children: ["Error loading templates: ", error] }) }));
    }
    // Show loading state
    if (isLoading) {
        return _jsx(MediaLoadingGrid, {});
    }
    // Show templates if we have them
    if (templates.length > 0) {
        return (_jsx("div", { className: "space-y-2", children: templates.map((template) => (_jsx(TemplateCard, { template: template, onClick: onTemplateClick }, `${template._source}-${template.id}`))) }));
    }
    // Determine empty state type
    if (!hasAdaptors) {
        return _jsx(MediaEmptyState, { type: "no-adaptors", mediaType: "templates" });
    }
    if (hasSearched && sourceResults.length > 0) {
        return (_jsx(MediaEmptyState, { type: "no-results", mediaType: "templates", activeTabName: activeTab !== "all" ? activeTabDisplayName : undefined }));
    }
    return _jsx(MediaEmptyState, { type: "initial", mediaType: "templates" });
};
