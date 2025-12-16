import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertCircle, Music2 } from "lucide-react";
import { OverlayType } from "../../../types";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useEditorContext } from "../../../contexts/editor-context";
import { useEditorSidebar } from "../../../contexts/sidebar-context";
import { useMediaAdaptors } from "../../../contexts/media-adaptor-context";
import { SoundDetails } from "./sound-details";
import SoundCard from "./sound-card";
import { getSrcDuration } from "../../../hooks/use-src-duration";
import { Button } from "../../ui/button";
/**
 * SoundsOverlayPanel Component
 *
 * A panel component that manages sound overlays in the editor. It provides functionality for:
 * - Displaying a list of available sound tracks from all configured audio adaptors
 * - Playing/pausing sound previews
 * - Adding sounds to the timeline
 * - Managing selected sound overlays and their properties
 *
 * The component switches between two views:
 * 1. Sound library view: Shows available sounds that can be added
 * 2. Sound details view: Shows controls for the currently selected sound overlay
 *
 * @component
 */
const SoundsOverlayPanel = () => {
    const [playingTrack, setPlayingTrack] = useState(null);
    const [audioTracks, setAudioTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const audioRefs = useRef({});
    const { searchAudio, audioAdaptors } = useMediaAdaptors();
    const { overlays, selectedOverlayId, changeOverlay, currentFrame, setOverlays, setSelectedOverlayId, } = useEditorContext();
    const { setActivePanel, setIsOpen } = useEditorSidebar();
    const { addAtPlayhead } = useTimelinePositioning();
    const [localOverlay, setLocalOverlay] = useState(null);
    useEffect(() => {
        console.log('[SoundsOverlayPanel] selectedOverlayId changed:', selectedOverlayId);
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        console.log('[SoundsOverlayPanel] Selected overlay:', selectedOverlay);
        console.log('[SoundsOverlayPanel] Overlay type:', selectedOverlay?.type, 'Type of:', typeof selectedOverlay?.type);
        console.log('[SoundsOverlayPanel] OverlayType.SOUND:', OverlayType.SOUND);
        
        if (!selectedOverlay) {
            console.log('[SoundsOverlayPanel] No overlay found, clearing localOverlay');
            setLocalOverlay(null);
            return;
        }
        
        // Normalize overlay type for comparison (handle both enum and string formats)
        const overlayTypeString = String(selectedOverlay.type).toLowerCase();
        const isSoundType = overlayTypeString === 'sound' || 
                           selectedOverlay.type === OverlayType.SOUND ||
                           overlayTypeString === OverlayType.SOUND.toLowerCase();
        
        console.log('[SoundsOverlayPanel] Overlay type string:', overlayTypeString);
        console.log('[SoundsOverlayPanel] Is sound type?', isSoundType);
        
        // Check if overlay type is SOUND (handle both enum and string format)
        if (isSoundType) {
            console.log('[SoundsOverlayPanel] Setting localOverlay to selected overlay');
            setLocalOverlay(selectedOverlay);
            // Ensure the audio panel is active when a sound overlay is selected
            console.log('[SoundsOverlayPanel] Setting panel to SOUND and opening sidebar');
            setActivePanel(OverlayType.SOUND);
            setIsOpen(true);
        } else {
            console.log('[SoundsOverlayPanel] Overlay is not a sound type, clearing localOverlay');
            // If overlay is selected but not a sound type, clear local overlay
            setLocalOverlay(null);
        }
    }, [selectedOverlayId, overlays, setActivePanel, setIsOpen]);
    /**
     * Load audio tracks from adaptors on component mount
     */
    useEffect(() => {
        const loadAudioTracks = async () => {
            if (audioAdaptors.length === 0)
                return;
            setIsLoading(true);
            try {
                // Search with empty query to get all available audio tracks
                const results = await searchAudio({ query: '' });
                setAudioTracks(results.items);
            }
            catch (error) {
                console.error('Failed to load audio tracks:', error);
                setAudioTracks([]);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadAudioTracks();
    }, [searchAudio, audioAdaptors]);
    /**
     * Updates the local overlay state and propagates changes to the editor context
     * @param {SoundOverlay} updatedOverlay - The modified sound overlay
     */
    const handleUpdateOverlay = (updatedOverlay) => {
        setLocalOverlay(updatedOverlay);
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    /**
     * Initialize audio elements for each sound and handle cleanup
     */
    useEffect(() => {
        audioTracks.forEach((sound) => {
            if (sound.file) {
                audioRefs.current[sound.id] = new Audio(sound.file);
            }
        });
        const currentAudioRefs = audioRefs.current;
        return () => {
            Object.values(currentAudioRefs).forEach((audio) => {
                audio.pause();
                audio.currentTime = 0;
            });
        };
    }, [audioTracks]);
    /**
     * Toggles play/pause state for a sound track
     * Ensures only one track plays at a time
     *
     * @param soundId - Unique identifier of the sound to toggle
     */
    const togglePlay = (soundId) => {
        const audio = audioRefs.current[soundId];
        if (!audio) {
            console.error('Audio element not found for sound:', soundId);
            return;
        }
        if (playingTrack === soundId) {
            audio.pause();
            setPlayingTrack(null);
        }
        else {
            if (playingTrack && audioRefs.current[playingTrack]) {
                audioRefs.current[playingTrack].pause();
            }
            audio
                .play()
                .catch((error) => console.error("Error playing audio:", error));
            setPlayingTrack(soundId);
        }
    };
    /**
     * Adds a sound overlay to the timeline at the current playhead position
     * Calculates duration based on the sound length (30fps)
     * Uses the same audio from the panel directly, just like videos
     *
     * @param {AudioWithSource} sound - The audio track to add to the timeline
     */
    const handleAddToTimeline = async (sound) => {
        // Get the audio URL using the adaptor's getAudioUrl method (same pattern as videos)
        const adaptor = audioAdaptors.find((a) => a.name === sound._source);
        const audioUrl = (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getAudioUrl) ? adaptor.getAudioUrl(sound) : (sound.file || sound.src || '');
        
        // Check if the sound has a valid URL
        if (!audioUrl || audioUrl.trim() === '') {
            console.error('Cannot add sound to timeline: No URL provided for sound', sound.title);
            alert(`Cannot add "${sound.title}": No audio file URL provided`);
            return;
        }
        // Add at the current playhead position
        const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'bottom');
        // Get actual audio duration using media-parser
        let durationInFrames = sound.duration * 30; // fallback to existing calculation
        let mediaSrcDuration;
        try {
            const result = await getSrcDuration(audioUrl);
            durationInFrames = result.durationInFrames;
            mediaSrcDuration = result.durationInSeconds;
        }
        catch (error) {
            console.warn("Failed to get audio duration, using fallback:", error);
            // Use the duration from the sound object as fallback
            mediaSrcDuration = sound.duration;
        }
        // Create the sound overlay configuration using the exact same audio from the panel
        const newSoundOverlay = {
            type: OverlayType.SOUND,
            content: sound.title,
            src: audioUrl, // Use the audio URL from the adaptor (same as shown in panel)
            from,
            row,
            // Layout properties
            left: 0,
            top: 0,
            width: 1920,
            height: 100,
            rotation: 0,
            isDragging: false,
            durationInFrames,
            mediaSrcDuration,
            styles: {
                opacity: 1,
            },
        };
        // Update overlays with both the shifted overlays and the new overlay in a single operation
        // Use the same ID format as VideosList: audio-${sound.id} (e.g., "audio-video-0")
        // This ensures consistency when clicking audio items from timeline vs panel
        // If sound.id already starts with "audio-", use it as-is; otherwise prefix it
        let newId;
        if (sound.id) {
            const soundIdString = String(sound.id);
            // If ID already starts with "audio-", use it directly (for consistency)
            // Otherwise, prefix it with "audio-"
            newId = soundIdString.startsWith('audio-') ? soundIdString : `audio-${soundIdString}`;
        } else {
            // Fallback: use source and timestamp if no ID
            newId = `audio-${sound._source || 'audio'}-${Date.now()}`;
        }
        console.log('[handleAddToTimeline] Creating audio overlay with ID:', newId, 'from sound.id:', sound.id, 'sound object:', sound);
        const overlayWithId = { ...newSoundOverlay, id: newId };
        const finalOverlays = [...updatedOverlays, overlayWithId];
        console.log('[handleAddToTimeline] Final overlays count:', finalOverlays.length, 'New overlay ID:', newId);
        setOverlays(finalOverlays);
        setSelectedOverlayId(newId);
    };
    // Get all audio overlays from the timeline
    const audioOverlays = useMemo(() => {
        return overlays.filter(overlay => overlay.type === OverlayType.SOUND);
    }, [overlays]);
    
    // VERIFICATION: Check Scene 1 audio exists
    useEffect(() => {
        console.log('[SoundsOverlayPanel] Audio overlays in timeline:', {
            count: audioOverlays.length,
            overlays: audioOverlays.map(o => ({
                id: o.id,
                from: o.from,
                content: o.content,
                duration: o.mediaSrcDuration,
                src: o.src?.substring(0, 50)
            }))
        });
        
        // Check for Scene 1 audio specifically
        const scene1Audio = audioOverlays.find(o => (o.from || 0) === 0);
        
        if (!scene1Audio && audioOverlays.length > 0) {
            console.error('[SoundsOverlayPanel] ❌ NO SCENE 1 AUDIO FOUND (no overlay with from: 0)!', {
                firstOverlay: audioOverlays[0] ? {
                    id: audioOverlays[0].id,
                    from: audioOverlays[0].from,
                    expected: 0
                } : null
            });
        } else if (scene1Audio) {
            console.log('[SoundsOverlayPanel] ✅ Scene 1 audio verified in timeline:', {
                id: scene1Audio.id,
                from: scene1Audio.from,
                src: scene1Audio.src?.substring(0, 50),
                duration: scene1Audio.mediaSrcDuration
            });
        }
    }, [audioOverlays]);
    
    // Filter out "Default Audio" source and show all audio tracks without tabs
    const filteredAudioTracks = useMemo(() => {
        return audioTracks.filter(track => {
            // Filter out "Default Audio" adaptor - check both source name and display name
            const source = track._source || '';
            const sourceDisplayName = track._sourceDisplayName || '';
            const sourceLower = source.toLowerCase();
            const displayNameLower = sourceDisplayName.toLowerCase();
            
            // Exclude if it's the default audio adaptor (static-audio or Default Audio)
            return !sourceLower.includes('static-audio') && 
                   !sourceLower.includes('default') && 
                   !displayNameLower.includes('default audio');
        });
    }, [audioTracks]);
    
    // Handle clicking on an existing audio overlay to select it
    const handleSelectAudioOverlay = (overlayId) => {
        setSelectedOverlayId(overlayId);
        // Ensure the audio panel is active and sidebar is open
        setActivePanel(OverlayType.SOUND);
        setIsOpen(true);
    };
    
    return (_jsx("div", { className: "flex flex-col p-2 bg-background h-full overflow-hidden", children: !localOverlay ? (_jsxs(_Fragment, { children: [
        // Show existing audio overlays from timeline at the top
        audioOverlays.length > 0 && (_jsxs("div", { className: "shrink-0 mb-4 pb-4 border-b border-border", children: [
            _jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
                _jsx(Music2, { className: "h-4 w-4 text-muted-foreground" }),
                _jsx("h3", { className: "text-sm font-semibold", children: "Audio in Timeline" }),
                _jsx("span", { className: "text-xs text-muted-foreground", children: `(${audioOverlays.length})` })
            ]}),
            _jsx("div", { className: "space-y-2", children: audioOverlays.map((overlay) => (_jsx(Button, { 
                variant: selectedOverlayId === overlay.id ? "default" : "outline",
                className: "w-full justify-start text-left h-auto py-2 px-3",
                onClick: () => handleSelectAudioOverlay(overlay.id),
                children: _jsxs("div", { className: "flex flex-col gap-1 w-full", children: [
                    _jsx("div", { className: "text-sm font-medium truncate", children: overlay.content || "Audio" }),
                    _jsx("div", { className: "text-xs text-muted-foreground", children: `Duration: ${overlay.mediaSrcDuration ? `${overlay.mediaSrcDuration.toFixed(1)}s` : 'N/A'}` })
                ]})
            }, `audio-overlay-${overlay.id}`))) })
        ]})),
        // Show available audio tracks to add (without tabs)
        _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
            _jsxs("div", { className: "flex items-center gap-2 mb-3 shrink-0", children: [
                _jsx(Music2, { className: "h-4 w-4 text-muted-foreground" }),
                _jsx("h3", { className: "text-sm font-semibold", children: "Add Audio" })
            ]}),
            _jsx("div", { className: "flex-1 overflow-y-auto scrollbar-hide", children: isLoading ? (_jsx("div", { className: "space-y-3", children: Array.from({ length: 6 }).map((_, index) => (_jsxs("div", { className: "flex items-center gap-3 p-2.5 bg-accent/20 animate-pulse rounded-md", children: [_jsx("div", { className: "h-8 w-8 bg-accent rounded-full" }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsx("div", { className: "h-4 bg-accent rounded w-3/4" }), _jsx("div", { className: "h-3 bg-accent rounded w-1/2" })] })] }, `skeleton-${index}`))) })) : filteredAudioTracks.length > 0 ? (_jsx("div", { className: "space-y-2", children: filteredAudioTracks.map((sound) => (_jsx(SoundCard, { sound: sound, playingTrack: playingTrack, onTogglePlay: togglePlay, onAddToTimeline: handleAddToTimeline, showSourceBadge: false, enableTimelineDrag: !localOverlay }, `${sound._source}-${sound.id}`))) })) : audioAdaptors.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-muted-foreground text-center", children: [_jsx(AlertCircle, { className: "h-8 w-8 mb-2" }), _jsx("p", { children: "No audio available" })] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-muted-foreground text-center", children: [_jsx(AlertCircle, { className: "h-8 w-8 mb-2" }), _jsx("p", { children: "No audio tracks found" })] })) })
        ]})
    ]})) : (_jsx(SoundDetails, { localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay })) }));
};
export default SoundsOverlayPanel;
