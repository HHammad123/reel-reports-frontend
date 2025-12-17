import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { PaintBucket, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger, } from "../../ui/tabs";

// ============================================================================
// OPTIMIZATION: Stable icon references - created once, reused on every render
// ============================================================================
// These icons are created outside the component to prevent new object creation
// on every render, which would cause child components to re-render unnecessarily
const SETTINGS_ICON = _jsx(Settings, { className: "w-3 h-3" });
const PAINT_BUCKET_ICON = _jsx(PaintBucket, { className: "w-3 h-3" });

// Type guards
function isSimpleProps(props) {
    return 'settingsContent' in props && 'styleContent' in props;
}
function isSourceProps(props) {
    return 'sourceResults' in props;
}
/**
 * Unified tab component that handles all tab use cases in the application
 * Provides consistent styling across all overlay types and source filtering
 *
 * Can be used in three ways:
 * 1. Simple mode: Just pass settingsContent and styleContent for standard Settings/Style tabs
 * 2. Flexible mode: Pass a tabs array for custom tab configurations with content
 * 3. Source mode: Pass sourceResults for source filtering tabs (no content, just triggers)
 *
 * @component
 * @example
 * ```tsx
 * // Simple mode
 * <UnifiedTabs
 *   settingsContent={<MySettingsPanel />}
 *   styleContent={<MyStylePanel />}
 * />
 *
 * // Flexible mode
 * <UnifiedTabs
 *   tabs={[
 *     { value: "captions", label: "Captions", icon: <AlignLeft />, content: <CaptionPanel /> },
 *     { value: "style", label: "Style", icon: <PaintBucket />, content: <StylePanel /> }
 *   ]}
 * />
 *
 * // Source mode
 * <UnifiedTabs
 *   sourceResults={sourceResults}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 */
export const UnifiedTabs = (props) => {
    var _a;
    
    // ============================================================================
    // DEBUG: Track prop changes to identify infinite loop causes
    // ============================================================================
    // This helps identify which props are changing and causing re-renders
    // Remove this block once infinite loop is confirmed fixed
    const propsRef = useRef();
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;
    
    if (propsRef.current) {
        const changed = Object.keys(props).filter(key => {
            const oldVal = propsRef.current[key];
            const newVal = props[key];
            
            // For functions and React elements, check reference equality only
            if (typeof oldVal === 'function' || typeof newVal === 'function') {
                return oldVal !== newVal;
            }
            
            // Check if it's a React element (has $$typeof property)
            if (oldVal && typeof oldVal === 'object' && '$$typeof' in oldVal) {
                return oldVal !== newVal; // Reference equality for React elements
            }
            
            // For primitive values, direct comparison
            if (oldVal === null || newVal === null) {
                return oldVal !== newVal;
            }
            
            // For objects/arrays, use reference equality (safe, avoids circular refs)
            // React props should be stable references if memoized correctly
            if (typeof oldVal === 'object' && typeof newVal === 'object') {
                return oldVal !== newVal; // Reference equality only
            }
            
            return oldVal !== newVal;
        });
        
        if (changed.length > 0 && renderCountRef.current <= 10) {
            // Only log first 10 renders to avoid spam
            // console.log('[UnifiedTabs] Props changed:', changed, {
            //     renderCount: renderCountRef.current,
            //     timestamp: Date.now()
            // });
        } else if (renderCountRef.current > 10) {
            // console.warn('[UnifiedTabs] Render count exceeded 10. Possible infinite loop detected!', {
            //     renderCount: renderCountRef.current,
            //     lastChangedProps: changed
            // });
        }
    }
    propsRef.current = props;
    
    // ============================================================================
    // CRITICAL: All hooks must be called before any conditional returns
    // ============================================================================
    // This ensures hooks are called in the same order on every render
    
    // ============================================================================
    // OPTIMIZATION: Memoize tabsData to prevent unnecessary re-renders
    // ============================================================================
    // Only recreate tabsData array if the actual content props change
    // Check props mode first to determine dependencies
    const isSimpleMode = isSimpleProps(props);
    const tabsData = useMemo(() => {
        if (isSimpleMode) {
            return [
                {
                    value: "settings",
                    label: "Settings",
                    icon: SETTINGS_ICON, // ✅ Stable reference - created outside component
                    content: props.settingsContent,
                },
                {
                    value: "style",
                    label: "Style",
                    icon: PAINT_BUCKET_ICON, // ✅ Stable reference - created outside component
                    content: props.styleContent,
                }
            ];
        }
        return props.tabs || [];
    }, [
        // Only recreate if these specific props change
        isSimpleMode,
        isSimpleMode ? props.settingsContent : null,
        isSimpleMode ? props.styleContent : null,
        !isSimpleMode ? props.tabs : null,
    ]);
    
    // Memoize defaultValue calculation
    const defaultValue = useMemo(() => {
        return props.defaultValue || ((_a = tabsData[0]) === null || _a === void 0 ? void 0 : _a.value) || "settings";
    }, [props.defaultValue, tabsData]);
    
    const className = props.className || "";
    const isControlled = 'activeTab' in props && 'onTabChange' in props;
    
    // Memoize getTabTriggerClassName function (stable reference)
    const getTabTriggerClassName = useMemo(() => {
        return (tab) => {
            const baseClasses = "text-xs font-extralight border-b-2 border-transparent rounded-none";
            if (tab.disabled) {
                return `${baseClasses} cursor-not-allowed opacity-50`;
            }
            return baseClasses;
        };
    }, []);
    
    // ============================================================================
    // OPTIMIZATION: Memoize tabsProps to prevent unnecessary re-renders
    // ============================================================================
    const tabsProps = useMemo(() => {
        if (isControlled) {
            return {
                value: props.activeTab,
                onValueChange: props.onTabChange
            };
        }
        return { defaultValue };
    }, [isControlled, props.activeTab, props.onTabChange, defaultValue]);
    
    // ============================================================================
    // Now safe to have conditional returns after all hooks are called
    // ============================================================================
    
    // Handle source tabs mode
    if (isSourceProps(props)) {
        const { sourceResults, activeTab, onTabChange, className = "", showAllTab = true } = props;
        // Calculate total count for "All" tab
        const totalCount = sourceResults.reduce((sum, source) => sum + source.itemCount, 0);
        if (sourceResults.length === 0) {
            return null;
        }
        return (_jsx("div", { className: className, children: _jsx(Tabs, { value: activeTab, onValueChange: onTabChange, children: _jsxs(TabsList, { className: "bg-white border-b border-gray-200", children: [showAllTab && (_jsxs(TabsTrigger, { value: "all", className: "text-xs font-extralight border-b-2 border-transparent rounded-none text-gray-700 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600", children: ["All (", totalCount, ")"] })), sourceResults.map((source) => (_jsxs(TabsTrigger, { value: source.adaptorName, className: "text-xs font-extralight border-b-2 border-transparent rounded-none text-gray-700 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600", children: [_jsx("span", { children: source.adaptorDisplayName }), _jsxs("span", { className: "text-[10px] opacity-70", children: ["(", source.itemCount, ")"] }), source.error && _jsx("span", { className: "text-[10px]", children: "\u26A0\uFE0F" })] }, source.adaptorName)))] }) }) }));
    }
    // Check if tabs should be at bottom (for stickers panel)
    const tabsAtBottom = props.tabsAtBottom !== undefined ? props.tabsAtBottom : false;
    
    if (tabsAtBottom && tabsData.some(tab => tab.content)) {
      // Layout with tabs at bottom: content first, then tabs
      return (_jsxs(Tabs, { ...tabsProps, className: `w-full flex flex-col h-full ${className}`, children: [_jsx("div", { className: "flex-1 w-full overflow-y-auto overflow-x-hidden", children: tabsData.map((tab) => (_jsx(TabsContent, { value: tab.value, className: "h-full focus-visible:outline-none", children: tab.content }, tab.value))) }), _jsx(TabsList, { className: "flex-shrink-0 border-t border-[#E5E2FF] pt-2 pb-2 px-2 bg-white", children: tabsData.map((tab) => (_jsx(TabsTrigger, { value: tab.value, disabled: tab.disabled, className: `${getTabTriggerClassName(tab)} data-[state=active]:border-b-2 data-[state=active]:border-[#13008B] data-[state=active]:text-[#13008B] text-[#13008B] px-4 py-2`, children: _jsxs("span", { className: "flex items-center gap-2 text-xs", children: [tab.icon, tab.label, tab.count !== undefined && (_jsxs("span", { className: "text-[10px] opacity-70", children: ["(", tab.count, ")"] })), tab.badge && (_jsx("span", { className: "text-[9px] ml-2 text-sidebar-accent-foreground font-extralight bg-sidebar-accent/60 rounded-sm", children: tab.badge })), tab.error && _jsx("span", { className: "text-[10px]", children: "\u26A0\uFE0F" })] }) }, tab.value))) })] }));
    }
    
    // Default layout: tabs at top
    return (_jsxs(Tabs, { ...tabsProps, className: `w-full ${className}`, children: [_jsx(TabsList, { children: tabsData.map((tab) => (_jsx(TabsTrigger, { value: tab.value, disabled: tab.disabled, className: getTabTriggerClassName(tab), children: _jsxs("span", { className: "flex items-center gap-2 text-xs", children: [tab.icon, tab.label, tab.count !== undefined && (_jsxs("span", { className: "text-[10px] opacity-70", children: ["(", tab.count, ")"] })), tab.badge && (_jsx("span", { className: "text-[9px] ml-2 text-sidebar-accent-foreground font-extralight bg-sidebar-accent/60 rounded-sm", children: tab.badge })), tab.error && _jsx("span", { className: "text-[10px]", children: "\u26A0\uFE0F" })] }) }, tab.value))) }), tabsData.some(tab => tab.content) && tabsData.map((tab) => (_jsx(TabsContent, { value: tab.value, className: "space-y-4 mt-2 h-auto focus-visible:outline-none", children: tab.content }, tab.value)))] }));
};
