import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useMediaAdaptors } from "../../../contexts/media-adaptor-context";
import { TemplateGrid } from "./template-grid";
import { UnifiedTabs } from "../shared/unified-tabs";
import { ApplyTemplateDialog } from "./apply-template-dialog";
export const TemplateOverlayPanel = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sourceResults, setSourceResults] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const { setOverlays, setAspectRatio } = useEditorContext();
    const { getTemplateOverlays, templateAdaptors } = useMediaAdaptors();
    // Load templates on component mount
    useEffect(() => {
        const loadTemplates = async () => {
            if (templateAdaptors.length === 0)
                return;
            setIsLoading(true);
            setError(null);
            try {
                const result = await getTemplateOverlays();
                setTemplates(result.items);
                setSourceResults(result.sourceResults || []);
            }
            catch (err) {
                console.error("Error loading templates:", err);
                setError(err instanceof Error ? err.message : "Failed to load templates");
            }
            finally {
                setIsLoading(false);
            }
        };
        loadTemplates();
    }, [getTemplateOverlays, templateAdaptors]);
    const handleApplyTemplate = (template) => {
        // Replace all existing overlays with the template overlays
        const newOverlays = template.overlays.map((overlayTemplate, index) => ({
            ...overlayTemplate,
            // Generate new IDs for each overlay to avoid conflicts
            id: Math.floor(Math.random() * 1000000) + index,
        }));
        // Update the editor's timeline with the new overlays
        setOverlays(newOverlays);
        setConfirmDialogOpen(false);
        if (template.aspectRatio) {
            setAspectRatio(template.aspectRatio);
        }
    };
    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setConfirmDialogOpen(true);
    };
    // Filter templates based on active tab
    const filteredTemplates = activeTab === "all"
        ? templates
        : templates.filter(template => template._source === activeTab);
    return (_jsxs("div", { className: "flex flex-col p-2 h-full overflow-hidden", children: [sourceResults.length > 0 && (_jsx("div", { className: "shrink-0 mb-4", children: _jsx(UnifiedTabs, { sourceResults: sourceResults, activeTab: activeTab, onTabChange: setActiveTab }) })), _jsx("div", { className: "flex-1 overflow-y-auto scrollbar-thin", children: _jsx(TemplateGrid, { templates: filteredTemplates, isLoading: isLoading, hasAdaptors: templateAdaptors.length > 0, hasSearched: sourceResults.length > 0, activeTab: activeTab, sourceResults: sourceResults, onTemplateClick: handleSelectTemplate, error: error || undefined }) }), _jsx(ApplyTemplateDialog, { open: confirmDialogOpen, onOpenChange: setConfirmDialogOpen, selectedTemplate: selectedTemplate, onApplyTemplate: handleApplyTemplate })] }));
};
