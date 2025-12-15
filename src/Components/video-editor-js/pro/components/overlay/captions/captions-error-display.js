import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, FileX, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Alert, AlertDescription } from "../../ui/alert";
const getErrorIcon = (type) => {
    switch (type) {
        case 'validation':
            return _jsx(FileX, { className: "w-4 h-4" });
        case 'format':
            return _jsx(AlertTriangle, { className: "w-4 h-4" });
        case 'timing':
            return _jsx(Clock, { className: "w-4 h-4" });
        case 'encoding':
            return _jsx(Info, { className: "w-4 h-4" });
        default:
            return _jsx(AlertTriangle, { className: "w-4 h-4" });
    }
};
const getErrorTitle = (type) => {
    switch (type) {
        case 'validation':
            return 'Validation Error';
        case 'format':
            return 'Format Error';
        case 'timing':
            return 'Timing Error';
        case 'encoding':
            return 'Encoding Error';
        default:
            return 'Error';
    }
};
export const CaptionsErrorDisplay = ({ errors, fileName, onRetry, }) => {
    if (!errors || errors.length === 0) {
        return null;
    }
    const errorsByType = errors.reduce((acc, error) => {
        if (!acc[error.type]) {
            acc[error.type] = [];
        }
        acc[error.type].push(error);
        return acc;
    }, {});
    const hasValidationErrors = errors.some(e => e.type === 'validation');
    const hasFormatErrors = errors.some(e => e.type === 'format');
    return (_jsxs(Card, { className: "border-destructive/50 bg-destructive/5", children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsxs(CardTitle, { className: "flex items-center gap-2 text-destructive", children: [_jsx(AlertTriangle, { className: "w-5 h-5" }), "SRT File Parsing Failed"] }), fileName && (_jsxs("p", { className: "text-sm text-muted-foreground", children: ["File: ", _jsx("span", { className: "font-mono", children: fileName })] }))] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx(Alert, { children: _jsxs(AlertDescription, { children: ["Found ", errors.length, " error", errors.length !== 1 ? 's' : '', " in the SRT file.", hasValidationErrors || hasFormatErrors
                                    ? ' Please fix these issues and try again.'
                                    : ' Some subtitles may have been skipped.'] }) }), _jsx("div", { className: "space-y-3", children: Object.entries(errorsByType).map(([type, typeErrors]) => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [getErrorIcon(type), _jsx("h4", { className: "font-extralight text-sm", children: getErrorTitle(type) }), _jsx("span", { className: "inline-flex items-center px-2 py-1 text-xs font-extralight bg-destructive/10 text-destructive rounded-full", children: typeErrors.length })] }), _jsx("div", { className: "space-y-1 ml-6", children: typeErrors.map((error, index) => (_jsxs("div", { className: "text-sm", children: [_jsxs("div", { className: "flex items-start gap-2", children: [error.line && (_jsxs("span", { className: "inline-flex items-center px-2 py-1 text-xs font-mono bg-muted/50 text-muted-foreground border rounded", children: ["Line ", error.line] })), _jsx("span", { className: "text-muted-foreground", children: error.message })] }), error.details && (_jsx("div", { className: "mt-1 ml-2 text-xs text-muted-foreground/80 font-mono bg-muted/50 p-2 rounded", children: error.details }))] }, index))) })] }, type))) }), _jsxs("div", { className: "mt-4 p-3 bg-muted/50 rounded-lg", children: [_jsx("h4", { className: "font-extralight text-sm mb-2", children: "Common Solutions:" }), _jsxs("ul", { className: "text-xs text-muted-foreground space-y-1", children: [_jsx("li", { children: "\u2022 Ensure your SRT file follows the standard format" }), _jsx("li", { children: "\u2022 Check that timestamps use the format HH:MM:SS,mmm \u2192 HH:MM:SS,mmm" }), _jsx("li", { children: "\u2022 Verify that subtitle numbers are sequential" }), _jsx("li", { children: "\u2022 Make sure each subtitle block is separated by a blank line" }), _jsx("li", { children: "\u2022 Ensure start times are before end times" })] })] }), _jsxs("div", { className: "mt-4 p-3 bg-muted/50 rounded-lg", children: [_jsx("h4", { className: "font-extralight text-sm mb-2", children: "Expected SRT Format:" }), _jsx("pre", { className: "text-xs font-mono text-muted-foreground whitespace-pre-wrap", children: `1
00:00:01,000 --> 00:00:03,500
This is the first subtitle

2
00:00:04,000 --> 00:00:06,000
This is the second subtitle` })] }), onRetry && (_jsx("div", { className: "flex justify-end pt-2", children: _jsx("button", { onClick: onRetry, className: "text-sm text-primary hover:text-primary/80 underline", children: "Try Another File" }) }))] })] }));
};
