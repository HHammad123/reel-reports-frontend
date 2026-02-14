import { useCallback, useMemo, useState } from "react";
import { useRenderer } from "../contexts/renderer-context";
// Utility function to create a delay
const wait = async (milliSeconds) => {
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, milliSeconds);
    });
};
/**
 * Custom hook to manage video rendering process using pluggable renderer
 *
 * @param id - Unique identifier for the composition
 * @param inputProps - Composition properties for rendering
 * @returns Object containing render controls and state
 *
 * @example
 * ```tsx
 * const { renderMedia, state, undo } = useRendering("my-composition", {
 *   overlays: [],
 *   durationInFrames: 900,
 *   width: 1920,
 *   height: 1080,
 *   fps: 30,
 *   src: "video.mp4"
 * });
 *
 * // Start rendering
 * await renderMedia();
 *
 * // Check state
 * if (state.status === "done") {
 *   console.log("Video ready:", state.url);
 * }
 * ```
 */
export const useRendering = (id, inputProps) => {
    const rendererConfig = useRenderer();
    // Maintain current state of the rendering process
    const [state, setState] = useState({
        status: "init",
    });
    // Main function to handle the rendering process
    const renderMedia = useCallback(async () => {
        // Prevent multiple concurrent renders
        if (state.status === "invoking" || state.status === "rendering") {
            console.log(`Render already in progress, ignoring new render request. Current status: ${state.status}`);
            return;
        }
        console.log(`Starting renderMedia process`);
        setState({
            status: "invoking",
        });
        try {
            const { renderer, onRenderStart, onRenderProgress, onRenderComplete } = rendererConfig;
            
            // Show modal if callback provided
            if (onRenderStart) {
                onRenderStart();
            }
            
            console.log("Calling renderVideo with inputProps", inputProps);
            const response = await renderer.renderVideo({ id, inputProps });
            const jobId = response.job_id || response.renderId || response._jobId;
            
            if (!jobId) {
                throw new Error('No job_id received from render API');
            }
            
            setState({
                status: "rendering",
                progress: 0,
                renderId: jobId,
            });
            
            // Poll job status until complete
            const pollInterval = 3000; // 3 seconds
            const maxDuration = 10 * 60 * 1000; // 10 minutes
            const startTime = Date.now();
            let pending = true;
            
            while (pending) {
                // Check timeout
                if (Date.now() - startTime > maxDuration) {
                    throw new Error('Render job polling timeout');
                }
                
                try {
                    // Use getRenderJobStatus if available, otherwise fallback to getProgress
                    let result;
                    if (renderer.getRenderJobStatus) {
                        result = await renderer.getRenderJobStatus(jobId);
                    } else {
                        result = await renderer.getProgress({ id: jobId });
                    }
                    
                    const status = result?.status || result?.job_status || 'queued';
                    const rawProgress = result?.progress;
                    let progressValue = 0;
                    if (typeof rawProgress === "number") {
                        progressValue = rawProgress;
                    } else if (rawProgress && typeof rawProgress === "object") {
                        const nested = rawProgress.percent ?? rawProgress.progress ?? rawProgress.value;
                        const parsed = typeof nested === "number" ? nested : Number(nested);
                        progressValue = Number.isNaN(parsed) ? 0 : parsed;
                    } else {
                        const parsed = Number(result?.progress_percent);
                        progressValue = Number.isNaN(parsed) ? 0 : parsed;
                    }
                    const phase = result?.phase || result?.message || '';
                    
                    // Update progress callback
                    if (onRenderProgress) {
                        onRenderProgress({ percent: progressValue, phase });
                    }
                    
                    // Update state
                    setState({
                        status: "rendering",
                        progress: progressValue / 100,
                        renderId: jobId,
                    });
                    
                    // Check if job is complete
                    if (status === 'succeeded' || status === 'completed' || status === 'success') {
                        console.log('Render job completed successfully');
                        setState({
                            status: "done",
                            url: result?.url || result?.video_url || null,
                            renderId: jobId,
                        });
                        
                        // Call completion callback
                        if (onRenderComplete) {
                            onRenderComplete();
                        }
                        
                        // Navigate to MyMedia page
                        if (typeof window !== 'undefined' && window.location) {
                            setTimeout(() => {
                                try {
                                    window.location.href = '/media';
                                } catch (e) {
                                    console.error('Failed to navigate to /media:', e);
                                }
                            }, 1000);
                        }
                        
                        pending = false;
                        break;
                    }
                    
                    // Check if job failed
                    if (status === 'failed' || status === 'error') {
                        throw new Error(result?.error || result?.message || 'Render job failed');
                    }
                    
                    // Wait before next poll
                    await wait(pollInterval);
                } catch (pollError) {
                    console.error('Error polling render job status:', pollError);
                    // If it's a timeout or terminal error, stop polling
                    if (pollError.message.includes('timeout') || pollError.message.includes('failed')) {
                        throw pollError;
                    }
                    // Otherwise, wait and retry
                    await wait(pollInterval);
                }
            }
        }
        catch (err) {
            console.error("Unexpected error during rendering:", err);
            setState({
                status: "error",
                error: err,
                renderId: null,
            });
        }
    }, [id, inputProps, rendererConfig, state.status]);
    // Reset the rendering state back to initial
    const undo = useCallback(() => {
        setState({ status: "init" });
    }, []);
    // Return memoized values to prevent unnecessary re-renders
    return useMemo(() => ({
        renderMedia, // Function to start rendering
        state, // Current state of the render
        undo, // Function to reset the state
    }), [renderMedia, state, undo]);
};
