import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { MediaSearchForm } from "./media-search-form";
import { MediaGrid } from "./media-grid";
import { UnifiedTabs } from "./unified-tabs";
/**
 * MediaOverlayPanel - Generic media overlay panel component
 *
 * Provides consistent layout and behavior for all media overlay panels.
 * Handles search/edit mode switching, source tabs, and scrollable content area.
 */
export const MediaOverlayPanel = ({ searchQuery, onSearchQueryChange, onSearch, items, isLoading, isDurationLoading = false, loadingItemKey = null, hasAdaptors, sourceResults, onItemClick, getThumbnailUrl, getItemKey, mediaType, searchPlaceholder, showSourceBadge = false, isEditMode, editComponent, isReplaceMode = false, onCancelReplace, enableTimelineDrag = false, }) => {
    const [activeTab, setActiveTab] = useState("all");
    // Filter items based on active tab
    const filteredItems = activeTab === "all"
        ? items
        : items.filter(item => item._source === activeTab);
    // Check if we've performed a search (have results or sourceResults)
    const hasSearched = sourceResults.length > 0;
    return (_jsx("div", { className: "flex flex-col p-2 h-full overflow-hidden", children: !isEditMode ? (_jsxs(_Fragment, { children: [isReplaceMode && onCancelReplace && (_jsxs("div", { className: "shrink-0 flex items-center justify-between px-3 py-2 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-md", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 bg-blue-500 rounded-full animate-pulse" }), _jsx("span", { className: "text-sm font-extralight", children: "Select an asset to replace" })] }), _jsx("button", { onClick: onCancelReplace, className: "text-sm px-3 py-1 hover:bg-background/50 rounded transition-colors", children: "Cancel" })] })), _jsx("div", { className: "shrink-0 mb-4", children: _jsx(MediaSearchForm, { searchQuery: searchQuery, onSearchQueryChange: onSearchQueryChange, onSubmit: onSearch, isLoading: isLoading, isDisabled: !hasAdaptors, placeholder: searchPlaceholder }) }), sourceResults.length > 0 && (_jsx("div", { className: "shrink-0 mb-4", children: _jsx(UnifiedTabs, { sourceResults: sourceResults, activeTab: activeTab, onTabChange: setActiveTab }) })), _jsx("div", { className: "flex-1 overflow-y-auto scrollbar-hide", children: _jsx(MediaGrid, { items: filteredItems, isLoading: isLoading, isDurationLoading: isDurationLoading, loadingItemKey: loadingItemKey, hasAdaptors: hasAdaptors, hasSearched: hasSearched, activeTab: activeTab, sourceResults: sourceResults, mediaType: mediaType, onItemClick: onItemClick, getThumbnailUrl: getThumbnailUrl, getItemKey: getItemKey, showSourceBadge: showSourceBadge, enableTimelineDrag: enableTimelineDrag }) })] })) : (_jsx("div", { className: "flex-1 overflow-y-auto scrollbar-hide", children: editComponent })) }));
};
