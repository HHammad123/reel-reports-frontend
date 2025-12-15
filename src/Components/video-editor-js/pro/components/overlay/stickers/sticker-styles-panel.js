import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
/**
 * StickerStylesPanel Component
 *
 * @component
 * @description
 * Provides Styles controls for sticker overlays including
 * animation Styles and 3D layout effects.
 */
export const StickerStylesPanel = ({}) => {
    return (_jsx("div", { className: "space-y-2", children: _jsxs(Alert, { variant: "default", children: [_jsx(AlertTitle, { children: "Sticker Stykes" }), _jsx(AlertDescription, { children: "Soon you will be able to customize your sticker styles here." })] }) }));
};
