"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../ui/button';
export const ProjectLoadConfirmModal = ({ isVisible, onConfirm, onCancel }) => {
    if (!isVisible) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", children: _jsxs("div", { className: "bg-background border shadow-lg rounded-lg max-w-lg w-full p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", role: "dialog", "aria-modal": "true", "aria-labelledby": "project-load-confirm-title", children: [_jsx("h2", { id: "project-load-confirm-title", className: "text-lg font-normal text-foreground mb-2", children: "Load Project?" }), _jsx("div", { className: "text-sm font-extralight text-muted-foreground mb-4", children: _jsxs("p", { children: ["You have ", _jsx("span", { className: "font-extralight text-foreground", children: "existing saved work" }), ". Loading this project will replace your current changes. This action cannot be undone."] }) }), _jsxs("div", { className: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", children: [_jsx(Button, { onClick: onCancel, variant: "outline", className: "mt-2 sm:mt-0", children: "Keep My Work" }), _jsx(Button, { onClick: onConfirm, variant: "default", children: "Load Project" })] })] }) }));
};
