import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent } from "../ui/card";
import { Trash2, RefreshCw, Download, FileVideo2, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { getAllAutosaves, clearAutosave } from "../../utils/general/indexdb-helper";
import { useEditorContext } from "../../contexts/editor-context";
/**
 * Save History Component
 *
 * Displays a simplified table of autosave records from IndexedDB
 */
export const SaveHistory = () => {
    const [saveRecords, setSaveRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Get context functions to restore state
    const { setOverlays, setAspectRatio, setPlaybackRate } = useEditorContext();
    const loadSaveHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const records = await getAllAutosaves();
            setSaveRecords(records);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load save history');
            console.error('Error loading save history:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const loadSave = async (record) => {
        try {
            const { editorState } = record;
            // Apply the loaded state to the editor
            if (editorState.overlays && setOverlays) {
                setOverlays(editorState.overlays);
            }
            if (editorState.aspectRatio && setAspectRatio) {
                setAspectRatio(editorState.aspectRatio);
            }
            if (editorState.playbackRate && setPlaybackRate) {
                setPlaybackRate(editorState.playbackRate);
            }
            console.log('Loaded save from:', new Date(record.timestamp));
        }
        catch (err) {
            console.error('Error loading save:', err);
            setError('Failed to load save');
        }
    };
    const deleteSave = async (projectId) => {
        try {
            await clearAutosave(projectId);
            await loadSaveHistory();
        }
        catch (err) {
            console.error('Error deleting save:', err);
            setError('Failed to delete save');
        }
    };
    const clearAllSaves = async () => {
        try {
            await Promise.all(saveRecords.map(record => clearAutosave(record.id)));
            await loadSaveHistory();
        }
        catch (err) {
            console.error('Error clearing all saves:', err);
            setError('Failed to clear all saves');
        }
    };
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        // For recent saves, use relative time
        if (diffInHours < 24) {
            return formatDistanceToNow(date, { addSuffix: true });
        }
        // For older saves, use formatted date
        return format(date, 'MMM d, h:mm a');
    };
    // Load save history on component mount
    useEffect(() => {
        loadSaveHistory();
    }, []);
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-extralight", children: "Save History" }), _jsxs("div", { className: "flex items-center gap-1", children: [saveRecords.length > 0 && (_jsx(Button, { onClick: clearAllSaves, variant: "ghost", size: "sm", disabled: loading, className: "h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive", title: "Clear all saves", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })), _jsx(Button, { onClick: loadSaveHistory, variant: "ghost", size: "sm", disabled: loading, className: "h-7 w-7 p-0", title: "Refresh", children: _jsx(RefreshCw, { className: `h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}` }) })] })] }), error && (_jsx(Card, { className: "border-destructive/20 bg-destructive/5", children: _jsx(CardContent, { className: "p-2.5", children: _jsx("div", { className: "text-xs text-destructive", children: error }) }) })), loading ? (_jsx("div", { className: "flex items-center justify-center py-6", children: _jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [_jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }), _jsx("span", { children: "Loading saves..." })] }) })) : saveRecords.length === 0 ? (_jsx(Card, { className: "border-dashed", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex flex-col items-center justify-center text-center space-y-1.5", children: [_jsx(FileVideo2, { className: "h-8 w-8 text-muted-foreground/40" }), _jsx("div", { className: "text-xs text-muted-foreground", children: "No save history found" }), _jsx("div", { className: "text-[11px] text-muted-foreground/60", children: "Your autosaved projects will appear here" })] }) }) })) : (_jsx(ScrollArea, { className: "h-52", children: _jsx("div", { className: "rounded-md border", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/50", children: [_jsx("th", { className: "text-left px-3 py-2 text-muted-foreground font-extralight", children: "Aspect" }), _jsx("th", { className: "text-left px-3 py-2 text-muted-foreground font-extralight", children: "Time" }), _jsx("th", { className: "text-right px-3 py-2 text-muted-foreground font-extralight w-20", children: "Actions" })] }) }), _jsx("tbody", { children: saveRecords.map((record) => (_jsxs("tr", { className: "border-b last:border-0 hover:bg-muted/30 transition-colors", children: [_jsx("td", { className: "px-3 py-2.5", children: record.editorState.aspectRatio || 'Unknown' }), _jsx("td", { className: "px-3 py-2.5 text-muted-foreground", children: formatTimestamp(record.timestamp) }), _jsx("td", { className: "px-3 py-2.5", children: _jsxs("div", { className: "flex items-center gap-1 justify-end", children: [_jsx(Button, { onClick: () => loadSave(record), variant: "ghost", size: "sm", className: "h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary font-extralight", title: "Load this save", children: _jsx(Download, { className: "h-3 w-3" }) }), _jsx(Button, { onClick: () => deleteSave(record.id), variant: "ghost", size: "sm", className: "h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive font-extralight", title: "Delete this save", children: _jsx(Trash2, { className: "h-3 w-3" }) })] }) })] }, `${record.id}-${record.timestamp}`))) })] }) }) }))] }));
};
