import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from "lucide-react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
/**
 * MediaSearchForm - Shared search form component
 *
 * Provides consistent search input and button styling across all media panels.
 * Handles form submission and loading states.
 */
export const MediaSearchForm = ({ searchQuery, onSearchQueryChange, onSubmit, isLoading, isDisabled, placeholder, }) => {
    return (_jsxs("form", { onSubmit: onSubmit, className: "flex gap-2 shrink-0", children: [_jsx(Input, { placeholder: placeholder, value: searchQuery, className: "bg-input text-base font-extralight shadow-none text-foreground", style: { fontSize: '16px', touchAction: 'manipulation' }, disabled: isDisabled, onChange: (e) => onSearchQueryChange(e.target.value) }), _jsx(Button, { type: "submit", variant: "default", size: "default", disabled: isLoading || isDisabled, className: "mt-0.5", children: _jsx(Search, { className: "h-4 w-4" }) })] }));
};
