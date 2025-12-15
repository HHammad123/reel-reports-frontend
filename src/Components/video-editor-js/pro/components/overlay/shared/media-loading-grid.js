import { jsx as _jsx } from "react/jsx-runtime";
/**
 * MediaLoadingGrid - Shared loading skeleton component
 *
 * Provides consistent loading state with skeleton placeholders across all media panels.
 * Uses the same masonry grid layout as the actual media grid.
 */
export const MediaLoadingGrid = () => {
    return (_jsx("div", { className: "columns-2 sm:columns-2 gap-3 space-y-3 [&_[data-radix-scroll-area-viewport]]:!scrollbar-none", children: Array.from({ length: 20 }).map((_, index) => (_jsx("div", { className: "relative aspect-video w-full bg-accent animate-pulse rounded-sm break-inside-avoid mb-3" }, `skeleton-${index}`))) }));
};
