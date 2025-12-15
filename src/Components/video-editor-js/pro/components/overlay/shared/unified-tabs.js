import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { PaintBucket, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger, } from "../../ui/tabs";
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
    // Handle source tabs mode
    if (isSourceProps(props)) {
        const { sourceResults, activeTab, onTabChange, className = "", showAllTab = true } = props;
        // Calculate total count for "All" tab
        const totalCount = sourceResults.reduce((sum, source) => sum + source.itemCount, 0);
        if (sourceResults.length === 0) {
            return null;
        }
        return (_jsx("div", { className: className, children: _jsx(Tabs, { value: activeTab, onValueChange: onTabChange, children: _jsxs(TabsList, { children: [showAllTab && (_jsxs(TabsTrigger, { value: "all", className: "text-xs font-extralight border-b-2 border-transparent rounded-none", children: ["All (", totalCount, ")"] })), sourceResults.map((source) => (_jsxs(TabsTrigger, { value: source.adaptorName, className: "text-xs font-extralight border-b-2 border-transparent rounded-none", children: [_jsx("span", { children: source.adaptorDisplayName }), _jsxs("span", { className: "text-[10px] opacity-70", children: ["(", source.itemCount, ")"] }), source.error && _jsx("span", { className: "text-[10px]", children: "\u26A0\uFE0F" })] }, source.adaptorName)))] }) }) }));
    }
    // Convert simple props to flexible format for overlay tabs
    const tabsData = isSimpleProps(props)
        ? [
            {
                value: "settings",
                label: "Settings",
                icon: _jsx(Settings, { className: "w-3 h-3" }),
                content: props.settingsContent,
            },
            {
                value: "style",
                label: "Style",
                icon: _jsx(PaintBucket, { className: "w-3 h-3" }),
                content: props.styleContent,
            }
        ]
        : props.tabs;
    const defaultValue = props.defaultValue || ((_a = tabsData[0]) === null || _a === void 0 ? void 0 : _a.value) || "settings";
    const className = props.className || "";
    const isControlled = 'activeTab' in props && 'onTabChange' in props;
    const getTabTriggerClassName = (tab) => {
        const baseClasses = "text-xs font-extralight border-b-2 border-transparent rounded-none";
        if (tab.disabled) {
            return `${baseClasses} cursor-not-allowed opacity-50`;
        }
        return baseClasses;
    };
    const tabsProps = isControlled
        ? {
            value: props.activeTab,
            onValueChange: props.onTabChange
        }
        : { defaultValue };
    // Check if tabs should be at bottom (for stickers panel)
    const tabsAtBottom = props.tabsAtBottom !== undefined ? props.tabsAtBottom : false;
    
    if (tabsAtBottom && tabsData.some(tab => tab.content)) {
      // Layout with tabs at bottom: content first, then tabs
      return (_jsxs(Tabs, { ...tabsProps, className: `w-full flex flex-col h-full ${className}`, children: [_jsx("div", { className: "flex-1 w-full overflow-y-auto overflow-x-hidden", children: tabsData.map((tab) => (_jsx(TabsContent, { value: tab.value, className: "h-full focus-visible:outline-none", children: tab.content }, tab.value))) }), _jsx(TabsList, { className: "flex-shrink-0 border-t border-[#E5E2FF] pt-2 pb-2 px-2 bg-white", children: tabsData.map((tab) => (_jsx(TabsTrigger, { value: tab.value, disabled: tab.disabled, className: `${getTabTriggerClassName(tab)} data-[state=active]:border-b-2 data-[state=active]:border-[#13008B] data-[state=active]:text-[#13008B] text-[#13008B] px-4 py-2`, children: _jsxs("span", { className: "flex items-center gap-2 text-xs", children: [tab.icon, tab.label, tab.count !== undefined && (_jsxs("span", { className: "text-[10px] opacity-70", children: ["(", tab.count, ")"] })), tab.badge && (_jsx("span", { className: "text-[9px] ml-2 text-sidebar-accent-foreground font-extralight bg-sidebar-accent/60 rounded-sm", children: tab.badge })), tab.error && _jsx("span", { className: "text-[10px]", children: "\u26A0\uFE0F" })] }) }, tab.value))) })] }));
    }
    
    // Default layout: tabs at top
    return (_jsxs(Tabs, { ...tabsProps, className: `w-full ${className}`, children: [_jsx(TabsList, { children: tabsData.map((tab) => (_jsx(TabsTrigger, { value: tab.value, disabled: tab.disabled, className: getTabTriggerClassName(tab), children: _jsxs("span", { className: "flex items-center gap-2 text-xs", children: [tab.icon, tab.label, tab.count !== undefined && (_jsxs("span", { className: "text-[10px] opacity-70", children: ["(", tab.count, ")"] })), tab.badge && (_jsx("span", { className: "text-[9px] ml-2 text-sidebar-accent-foreground font-extralight bg-sidebar-accent/60 rounded-sm", children: tab.badge })), tab.error && _jsx("span", { className: "text-[10px]", children: "\u26A0\uFE0F" })] }) }, tab.value))) }), tabsData.some(tab => tab.content) && tabsData.map((tab) => (_jsx(TabsContent, { value: tab.value, className: "space-y-4 mt-2 h-auto focus-visible:outline-none", children: tab.content }, tab.value)))] }));
};
