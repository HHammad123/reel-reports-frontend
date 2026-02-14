import { useCallback, useMemo, useState } from "react";
import { useRenderer } from "../contexts/renderer-context";
import { OverlayType } from "../types";
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
            
            // Log overlays to check if charts are included
            const overlays = inputProps?.overlays || [];
            const chartOverlays = overlays.filter(o => 
                o.type === 'video' || // OverlayType.VIDEO is "video" (lowercase)
                o.type === 'VIDEO' || // Also check uppercase for safety
                o.id?.includes('chart') || 
                o.src?.includes('chart') ||
                o.content?.includes('chart') ||
                o.has_background === false ||
                o.needsChromaKey === true ||
                o.removeBackground === true
            );
            
            console.log('📊 CHART OVERLAYS CHECK (BEFORE RENDER):', {
                totalOverlays: overlays.length,
                chartOverlaysCount: chartOverlays.length,
                chartOverlays: chartOverlays.map(c => {
                    // Create a serializable copy for logging
                    try {
                        return JSON.parse(JSON.stringify({
                            id: c.id,
                            type: c.type,
                            src: c.src,
                            content: c.content,
                            row: c.row,
                            from: c.from,
                            durationInFrames: c.durationInFrames,
                            has_background: c.has_background,
                            needsChromaKey: c.needsChromaKey,
                            removeBackground: c.removeBackground,
                            width: c.width,
                            height: c.height,
                            left: c.left,
                            top: c.top,
                            styles: c.styles,
                            videoStartTime: c.videoStartTime,
                            mediaSrcDuration: c.mediaSrcDuration
                        }));
                    } catch (e) {
                        return { id: c.id, error: 'Failed to serialize' };
                    }
                }),
                allOverlayTypes: overlays.map(o => ({ 
                    id: o.id, 
                    type: o.type, 
                    row: o.row,
                    from: o.from,
                    durationInFrames: o.durationInFrames,
                    src: o.src?.substring(0, 50)
                }))
            });
            
            // CRITICAL: Verify chart overlays have required properties
            chartOverlays.forEach((chart, index) => {
                const missingProps = [];
                if (!chart.id) missingProps.push('id');
                if (!chart.src && !chart.content) missingProps.push('src/content');
                // OverlayType.VIDEO is "video" (lowercase), not "VIDEO" (uppercase)
                const isVideoType = chart.type === 'video' || chart.type === 'VIDEO' || chart.type === OverlayType?.VIDEO;
                if (!isVideoType) {
                    missingProps.push(`type (current: "${chart.type}", should be "video")`);
                }
                if (chart.from === undefined && chart.from !== 0) missingProps.push('from');
                if (!chart.durationInFrames) missingProps.push('durationInFrames');
                
                if (missingProps.length > 0) {
                    console.error(`❌ Chart overlay ${index} (${chart.id || 'NO ID'}) is missing properties:`, missingProps, chart);
                } else {
                    console.log(`✅ Chart overlay ${index} (${chart.id}) has all required properties`, {
                        id: chart.id,
                        type: chart.type,
                        hasSrc: !!chart.src,
                        hasContent: !!chart.content,
                        from: chart.from,
                        durationInFrames: chart.durationInFrames,
                        has_background: chart.has_background,
                        needsChromaKey: chart.needsChromaKey
                    });
                }
            });
            
            // Test JSON serialization of inputProps to see if anything is lost
            try {
                const testStringified = JSON.stringify(inputProps);
                const testParsed = JSON.parse(testStringified);
                const testOverlays = testParsed?.overlays || [];
                const testChartOverlays = testOverlays.filter(o => 
                    o.type === 'video' || // OverlayType.VIDEO is "video" (lowercase)
                    o.type === 'VIDEO' || // Also check uppercase for safety
                    o.id?.includes('chart') || 
                    o.src?.includes('chart') ||
                    o.content?.includes('chart') ||
                    o.has_background === false ||
                    o.needsChromaKey === true ||
                    o.removeBackground === true
                );
                
                console.log('🧪 JSON SERIALIZATION TEST:', {
                    originalChartCount: chartOverlays.length,
                    afterStringifyChartCount: testChartOverlays.length,
                    chartsLost: chartOverlays.length - testChartOverlays.length,
                    originalChartIds: chartOverlays.map(c => c.id),
                    stringifiedChartIds: testChartOverlays.map(c => c.id),
                    missingChartIds: chartOverlays
                        .filter(c => !testChartOverlays.find(t => t.id === c.id))
                        .map(c => c.id)
                });
                
                if (chartOverlays.length > testChartOverlays.length) {
                    console.error('❌ CRITICAL: Chart overlays are being LOST during JSON.stringify!', {
                        lost: chartOverlays.length - testChartOverlays.length,
                        lostIds: chartOverlays
                            .filter(c => !testChartOverlays.find(t => t.id === c.id))
                            .map(c => c.id)
                    });
                }
            } catch (serializeError) {
                console.error('❌ Error testing JSON serialization:', serializeError);
            }
            
            const response = await renderer.renderVideo({ id, inputProps });
            const jobId = response.job_id || response.renderId || response._jobId;
            
            if (!jobId) {
                throw new Error('No job_id received from render API');
            }
            
            console.log('✅ Render API called successfully. Job ID:', jobId);
            
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
                        const videoUrl = result?.url || result?.video_url || result?.result_url || result?.resultUrl || null;
                        console.log('✅ Render job completed successfully', {
                            jobId: jobId,
                            videoUrl: videoUrl,
                            result: result
                        });
                        
                        setState({
                            status: "done",
                            url: videoUrl,
                            renderId: jobId,
                        });
                        
                        // Call completion callback
                        if (onRenderComplete) {
                            onRenderComplete();
                        }
                        
                        // Navigate to MyMedia page after successful render
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
