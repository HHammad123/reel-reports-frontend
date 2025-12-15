import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "../../ui/button";
import { Slider } from "../../ui/slider";
import { Toggle } from "../../ui/toggle";
/**
 * SoundDetails Component
 *
 * A component that provides an interface for playing and controlling sound overlays.
 * Features include:
 * - Play/pause functionality
 * - Volume control with mute/unmute option
 * - Visual feedback for playback state
 *
 * @component
 * @param {SoundDetailsProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export const SoundDetails = ({ localOverlay, setLocalOverlay, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState((_a = localOverlay.mediaSrcDuration) !== null && _a !== void 0 ? _a : 10);
    const audioRef = useRef(null);
    // Memoized event handler to prevent unnecessary re-renders
    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current && audioRef.current.duration) {
            setDuration(audioRef.current.duration);
        }
    }, []);
    useEffect(() => {
        audioRef.current = new Audio(localOverlay.src);
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, [localOverlay.src, localOverlay.mediaSrcDuration, handleLoadedMetadata]);
    /**
     * Toggles the play/pause state of the audio
     * Handles audio playback and updates the UI state
     */
    const togglePlay = () => {
        if (!audioRef.current)
            return;
        if (isPlaying) {
            audioRef.current.pause();
        }
        else {
            audioRef.current
                .play()
                .catch((error) => console.error("Error playing audio:", error));
        }
        setIsPlaying(!isPlaying);
    };
    /**
     * Updates the styles of the sound overlay
     * @param {Partial<SoundOverlay["styles"]>} updates - Partial style updates to apply
     */
    const handleStyleChange = (updates) => {
        const updatedOverlay = {
            ...localOverlay,
            styles: {
                ...localOverlay.styles,
                ...updates,
            },
        };
        setLocalOverlay(updatedOverlay);
    };
    /**
     * Handles fade in changes with cross-validation against fade out
     * Ensures fadeIn + fadeOut <= duration by adjusting fadeOut if necessary
     * @param {number[]} value - New fade in value from slider
     */
    const handleFadeInChange = (value) => {
        var _a, _b;
        const newFadeIn = Math.max(0, Math.min(value[0], duration));
        const currentFadeOut = (_b = (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.fadeOut) !== null && _b !== void 0 ? _b : 0;
        if (newFadeIn + currentFadeOut > duration) {
            const adjustedFadeOut = Math.max(0, duration - newFadeIn);
            handleStyleChange({ fadeIn: newFadeIn, fadeOut: adjustedFadeOut });
        }
        else {
            handleStyleChange({ fadeIn: newFadeIn });
        }
    };
    /**
     * Handles fade out changes with cross-validation against fade in
     * Ensures fadeIn + fadeOut <= duration by adjusting fadeIn if necessary
     * @param {number[]} value - New fade out value from slider
     */
    const handleFadeOutChange = (value) => {
        var _a, _b;
        const newFadeOut = Math.max(0, Math.min(value[0], duration));
        const currentFadeIn = (_b = (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.fadeIn) !== null && _b !== void 0 ? _b : 0;
        if (currentFadeIn + newFadeOut > duration) {
            const adjustedFadeIn = Math.max(0, duration - newFadeOut);
            handleStyleChange({ fadeIn: adjustedFadeIn, fadeOut: newFadeOut });
        }
        else {
            handleStyleChange({ fadeOut: newFadeOut });
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3 p-4 bg-card rounded-md border", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: togglePlay, className: "h-8 w-8 rounded-full bg-transparent hover:bg-accent text-foreground text-foreground  ", children: isPlaying ? (_jsx(Pause, { className: "h-4 w-4 text-foreground" })) : (_jsx(Play, { className: "h-4 w-4 text-foreground" })) }), _jsx("div", { className: "min-w-0 flex-1", children: _jsx("p", { className: "text-sm font-extralight text-foreground truncate", children: localOverlay.content }) })] }), _jsx("div", { className: "space-y-4 mt-4", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-4 rounded-md bg-card p-4 border", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-extralight text-foreground", children: "Volume" }), _jsx(Toggle, { pressed: ((_c = (_b = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _b === void 0 ? void 0 : _b.volume) !== null && _c !== void 0 ? _c : 1) === 0, onPressedChange: (pressed) => handleStyleChange({
                                                volume: pressed ? 0 : 1,
                                            }), size: "sm", className: "text-xs", children: ((_e = (_d = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _d === void 0 ? void 0 : _d.volume) !== null && _e !== void 0 ? _e : 1) === 0 ? "Unmute" : "Mute" })] }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Slider, { value: [(_g = (_f = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _f === void 0 ? void 0 : _f.volume) !== null && _g !== void 0 ? _g : 1], onValueChange: (value) => handleStyleChange({ volume: value[0] }), min: 0, max: 1, step: 0.1, className: "flex-1" }), _jsxs("span", { className: "text-xs text-muted-foreground min-w-[40px] text-right", children: [Math.round(((_j = (_h = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _h === void 0 ? void 0 : _h.volume) !== null && _j !== void 0 ? _j : 1) * 100), "%"] })] })] }), _jsxs("div", { className: "space-y-4 rounded-md bg-card p-4 border", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-extralight text-foreground", children: "Fade In" }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [((_l = (_k = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _k === void 0 ? void 0 : _k.fadeIn) !== null && _l !== void 0 ? _l : 0).toFixed(1), "s / ", duration.toFixed(1), "s"] })] }), _jsx("div", { className: "flex items-center gap-3 pt-1", children: _jsx(Slider, { value: [Math.max(0, Math.min((_o = (_m = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _m === void 0 ? void 0 : _m.fadeIn) !== null && _o !== void 0 ? _o : 0, duration))], onValueChange: handleFadeInChange, min: 0, max: duration, step: 0.1, className: "flex-1" }) })] }), _jsxs("div", { className: "space-y-4 rounded-md bg-card p-4 border", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-extralight text-foreground", children: "Fade Out" }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [((_q = (_p = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _p === void 0 ? void 0 : _p.fadeOut) !== null && _q !== void 0 ? _q : 0).toFixed(1), "s / ", duration.toFixed(1), "s"] })] }), _jsx("div", { className: "flex items-center gap-3 pt-1", children: _jsx(Slider, { value: [Math.max(0, Math.min((_s = (_r = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _r === void 0 ? void 0 : _r.fadeOut) !== null && _s !== void 0 ? _s : 0, duration))], onValueChange: handleFadeOutChange, min: 0, max: duration, step: 0.1, className: "flex-1" }) })] })] }) })] }));
};
