import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './button';
import { Moon, Sun, Palette } from 'lucide-react';
import { useExtendedThemeSwitcher } from '../../hooks/use-extended-theme-switcher';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from './dropdown-menu';
export const ThemeDropdown = ({ availableThemes = [], selectedTheme, onThemeChange, showDefaultThemes = true, className, size = 'sm', }) => {
    const { currentTheme, setTheme, availableThemes: allThemes, getThemeInfo } = useExtendedThemeSwitcher({
        customThemes: availableThemes,
        showDefaultThemes,
        defaultTheme: selectedTheme || 'dark'
    });
    // Use controlled theme if provided, otherwise use internal state
    const displayTheme = selectedTheme || currentTheme;
    const currentThemeInfo = getThemeInfo(displayTheme);
    const handleThemeChange = (themeId) => {
        // Update internal state
        setTheme(themeId);
        // Call external callback if provided
        if (onThemeChange) {
            onThemeChange(themeId);
        }
    };
    // Get color swatch for theme
    const getThemeDisplay = (theme) => {
        if (theme.color) {
            return (_jsx("div", { className: "w-2.5 h-2.5 rounded-full border shrink-0 border border-foreground", style: { backgroundColor: theme.color } }));
        }
        // Fallback to icons if no color specified
        if (theme.icon)
            return theme.icon;
        // Default icons for built-in themes
        if (theme.id === 'light')
            return _jsx(Sun, { className: "w-2.5 h-2.5" });
        if (theme.id === 'dark')
            return _jsx(Moon, { className: "w-2.5 h-2.5" });
        // Default icon for custom themes
        return _jsx(Palette, { className: "w-2.5 h-2.5" });
    };
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: size, className: `sm:flex border h-7 p-3 text-xs items-center gap-1 text-foreground ${className || ''}`, title: `Current theme: ${(currentThemeInfo === null || currentThemeInfo === void 0 ? void 0 : currentThemeInfo.name) || displayTheme}`, children: [_jsx("span", { className: "mr-1", children: currentThemeInfo ? getThemeDisplay(currentThemeInfo) : _jsx(Palette, { className: "w-2.5 h-2.5" }) }), (currentThemeInfo === null || currentThemeInfo === void 0 ? void 0 : currentThemeInfo.name) || displayTheme] }) }), _jsx(DropdownMenuContent, { align: "end", className: "min-w-[100px]", children: allThemes.map((themeOption) => (_jsxs(DropdownMenuItem, { onClick: () => handleThemeChange(themeOption.id), className: `text-xs py-1.5 flex items-center gap-2 cursor-pointer ${displayTheme === themeOption.id
                        ? "bg-accent text-accent-foreground font-extralight"
                        : "font-extralight"}`, children: [getThemeDisplay(themeOption), _jsx("span", { children: themeOption.name })] }, themeOption.id))) })] }));
};
