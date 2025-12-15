import { useState, useEffect, useCallback, useMemo } from 'react';
const defaultThemes = [
    {
        id: 'light',
        name: 'Light',
        color: '#ffffff',
    },
    {
        id: 'dark',
        name: 'Dark',
        className: 'dark',
        color: '#1f2937',
    }
];
export const useExtendedThemeSwitcher = ({ customThemes = [], showDefaultThemes = true, defaultTheme = 'dark' } = {}) => {
    // Start with default theme to avoid hydration issues
    const [currentTheme, setCurrentTheme] = useState(defaultTheme);
    const [isLoaded, setIsLoaded] = useState(false);
    // Combine default and custom themes
    const availableThemes = useMemo(() => showDefaultThemes
        ? [...defaultThemes, ...customThemes]
        : customThemes, [showDefaultThemes, customThemes]);
    const applyTheme = useCallback((themeId) => {
        if (typeof document === 'undefined')
            return;
        const root = document.documentElement;
        // Remove all existing theme classes
        root.classList.remove('dark');
        customThemes.forEach(theme => {
            if (theme.className) {
                root.classList.remove(theme.className);
            }
        });
        // Set data attribute for the current theme
        root.setAttribute('data-theme', themeId);
        // Apply the appropriate class
        if (themeId === 'dark') {
            root.classList.add('dark');
        }
        else if (themeId === 'light') {
            // Light theme is default, no class needed
        }
        else {
            // Custom theme
            const customTheme = customThemes.find(t => t.id === themeId);
            if (customTheme === null || customTheme === void 0 ? void 0 : customTheme.className) {
                root.classList.add(customTheme.className);
            }
        }
    }, [customThemes]);
    const handleSetTheme = useCallback((newTheme) => {
        setCurrentTheme(newTheme);
        applyTheme(newTheme);
        localStorage.setItem('rve-extended-theme', newTheme);
    }, [applyTheme]);
    const getThemeInfo = (themeId) => {
        return availableThemes.find(theme => theme.id === themeId);
    };
    // Load saved theme after mount to avoid hydration issues
    useEffect(() => {
        const savedTheme = localStorage.getItem('rve-extended-theme');
        if (savedTheme && availableThemes.some(t => t.id === savedTheme)) {
            setCurrentTheme(savedTheme);
            applyTheme(savedTheme);
        }
        else {
            // Apply default theme
            applyTheme(currentTheme);
        }
        setIsLoaded(true);
    }, [applyTheme, availableThemes, currentTheme]);
    // Apply theme when it changes (after initial load)
    useEffect(() => {
        if (isLoaded) {
            applyTheme(currentTheme);
        }
    }, [currentTheme, customThemes, isLoaded, applyTheme]);
    return {
        currentTheme,
        setTheme: handleSetTheme,
        availableThemes,
        getThemeInfo,
    };
};
