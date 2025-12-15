import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
/**
 * Context for providing theme configuration
 */
const ThemeContext = createContext(null);
/**
 * Provider component that makes theme configuration available to child components
 *
 * @example
 * ```tsx
 * <ThemeProvider config={{
 *   availableThemes: [{id: 'purple', name: 'Purple', color: '#8b5cf6'}],
 *   hideThemeToggle: false,
 *   defaultTheme: 'dark'
 * }}>
 *   <EditorHeader />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider = ({ children, config, }) => {
    return (_jsx(ThemeContext.Provider, { value: config, children: children }));
};
/**
 * Hook to access the current theme configuration
 *
 * @returns The current theme configuration or null if used outside of ThemeProvider
 */
export const useThemeConfig = () => {
    return useContext(ThemeContext);
};
