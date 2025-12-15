"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
export const MobileWarningModal = ({ show }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        // Check if screen size is mobile (responsive check only)
        const checkIfMobileScreen = () => {
            return window.innerWidth <= 768;
        };
        // Check if user has already dismissed the modal
        const hasSeenWarning = localStorage.getItem('rve-mobile-warning-dismissed');
        if (show && checkIfMobileScreen() && !hasSeenWarning) {
            setIsMobile(true);
            setIsVisible(true);
        }
    }, [show]);
    const handleDismiss = () => {
        localStorage.setItem('rve-mobile-warning-dismissed', 'true');
        setIsVisible(false);
    };
    if (!isVisible || !isMobile) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", children: _jsxs("div", { className: "bg-background border shadow-lg rounded-lg max-w-md w-full p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", role: "dialog", "aria-modal": "true", "aria-labelledby": "mobile-warning-title", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "w-16 h-16 bg-muted rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-muted-foreground", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }) }) }) }), _jsx("h2", { id: "mobile-warning-title", className: "text-lg font-normal text-foreground text-center mb-2", children: "Hello there \uD83D\uDC4B" }), _jsxs("div", { className: "text-sm font-extralight text-muted-foreground text-center space-y-2 mb-6", children: [_jsxs("p", { children: ["React Video Editor works best as a ", _jsx("span", { className: "font-extralight text-foreground", children: "desktop experience" }), "."] }), _jsx("p", { children: "You can still use it on your mobile device, but we've reduced some features for a cleaner UI. Keep in mind that performance depends on your mobile browser's capabilities." })] }), _jsx(Button, { onClick: handleDismiss, variant: "default", className: "w-full", children: "Got it, let's continue!" }), _jsx("p", { className: "text-xs font-extralight text-muted-foreground text-center mt-4", children: "This message won't show again" })] }) }));
};
