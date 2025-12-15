import { useState, useEffect, useRef, useCallback } from "react";
/**
 * Custom hook for managing video player functionality
 * @param fps - Frames per second for the video
 * @param externalPlayerRef - Optional external playerRef to use instead of creating internal one
 * @returns An object containing video player controls and state
 */
export const useVideoPlayer = (fps = 30, externalPlayerRef) => {
    // State management
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const internalPlayerRef = useRef(null);
    // Use external playerRef if provided, otherwise use internal one
    const playerRef = externalPlayerRef || internalPlayerRef;
    // Sync isPlaying state with actual player state
    useEffect(() => {
        var _a, _b, _c;
        if (playerRef.current) {
            const player = playerRef.current;
            const handlePlay = () => setIsPlaying(true);
            const handlePause = () => setIsPlaying(false);
            const handleEnded = () => setIsPlaying(false);
            // Add event listeners to sync state
            try {
                (_a = player.addEventListener) === null || _a === void 0 ? void 0 : _a.call(player, 'play', handlePlay);
                (_b = player.addEventListener) === null || _b === void 0 ? void 0 : _b.call(player, 'pause', handlePause);
                (_c = player.addEventListener) === null || _c === void 0 ? void 0 : _c.call(player, 'ended', handleEnded);
                return () => {
                    var _a, _b, _c;
                    (_a = player.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(player, 'play', handlePlay);
                    (_b = player.removeEventListener) === null || _b === void 0 ? void 0 : _b.call(player, 'pause', handlePause);
                    (_c = player.removeEventListener) === null || _c === void 0 ? void 0 : _c.call(player, 'ended', handleEnded);
                };
            }
            catch (e) {
                // Fallback if event listeners aren't available
                console.warn('Player event listeners not available:', e);
                return undefined;
            }
        }
        return undefined;
    }, [playerRef]);
    // Frame update effect
    useEffect(() => {
        let animationFrameId;
        let lastUpdateTime = 0;
        const frameInterval = 1000 / fps;
        const updateCurrentFrame = () => {
            const now = performance.now();
            if (now - lastUpdateTime >= frameInterval) {
                if (playerRef.current) {
                    const frame = Math.round(playerRef.current.getCurrentFrame());
                    setCurrentFrame(frame);
                }
                lastUpdateTime = now;
            }
            animationFrameId = requestAnimationFrame(updateCurrentFrame);
        };
        // Start the animation frame loop
        animationFrameId = requestAnimationFrame(updateCurrentFrame);
        // Clean up
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlaying, fps, playerRef]);
    /**
     * Starts playing the video
     */
    const play = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.play();
            setIsPlaying(true);
        }
    }, [playerRef]);
    /**
     * Pauses the video
     */
    const pause = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.pause();
            setIsPlaying(false);
        }
    }, [playerRef]);
    /**
     * Toggles between play and pause states
     */
    const togglePlayPause = useCallback(() => {
        if (playerRef.current) {
            if (!isPlaying) {
                playerRef.current.play();
                setIsPlaying(true);
            }
            else {
                playerRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [playerRef, isPlaying]);
    /**
     * Converts frame count to formatted time string
     * @param frames - Number of frames to convert
     * @returns Formatted time string in MM:SS format
     */
    const formatTime = useCallback((frames) => {
        const totalSeconds = frames / fps;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const frames2Digits = Math.floor(frames % fps)
            .toString()
            .padStart(2, "0");
        return `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}.${frames2Digits}`;
    }, [fps]);
    /**
     * Seeks to a specific frame in the video
     * @param frame - Target frame number
     */
    const seekTo = useCallback((frame) => {
        if (playerRef.current) {
            setCurrentFrame(frame);
            playerRef.current.seekTo(frame);
        }
    }, [playerRef]);
    return {
        isPlaying,
        currentFrame,
        playerRef,
        togglePlayPause,
        formatTime,
        play,
        pause,
        seekTo,
    };
};
