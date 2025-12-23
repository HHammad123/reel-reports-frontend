/**
 * HTTP-based video renderer implementation
 */
export class HttpRenderer {
    constructor(endpoint, renderType) {
        this.endpoint = endpoint;
        this.renderTypeInfo = renderType;
    }
    async renderVideo(params) {
        // Get session_id and user_id from localStorage
        const sessionId = typeof window !== 'undefined' ? localStorage.getItem('session_id') : '';
        const userId = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
        
        if (!sessionId || !userId) {
            throw new Error('Missing session_id or user_id. Please sign in again.');
        }
        
        // Prepare request body for /v1/videos/render-video API
        const requestBody = {
            session_id: sessionId,
            user_id: userId,
            input_props: JSON.stringify(params.inputProps || params)
        };
        
        // Extract overlays from inputProps to check for charts
        const inputPropsData = params.inputProps || params;
        const overlays = inputPropsData?.overlays || [];
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
        
        // Console.log the request body with chart analysis
        console.log('🎬 RENDER API REQUEST BODY:', {
            requestBody: requestBody,
            input_props_parsed: inputPropsData,
            input_props_stringified: requestBody.input_props,
            endpoint: '/v1/videos/render-video',
            overlaysAnalysis: {
                totalOverlays: overlays.length,
                chartOverlaysCount: chartOverlays.length,
                chartOverlays: chartOverlays.map(c => ({
                    id: c.id,
                    type: c.type,
                    typeValue: c.type, // Explicit type value
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
                    // Check if src/content are valid URLs
                    srcIsValid: c.src && (c.src.startsWith('http') || c.src.startsWith('blob:') || c.src.startsWith('/')),
                    contentIsValid: c.content && (c.content.startsWith('http') || c.content.startsWith('blob:') || c.content.startsWith('/')),
                    // Full overlay object for debugging
                    fullOverlay: JSON.parse(JSON.stringify(c)) // Deep clone to avoid circular references
                })),
                allOverlayTypes: overlays.map(o => ({ 
                    id: o.id, 
                    type: o.type, 
                    row: o.row,
                    from: o.from,
                    durationInFrames: o.durationInFrames,
                    src: o.src?.substring(0, 100) // First 100 chars of src
                }))
            }
        });
        
        // CRITICAL: Log the EXACT string that will be sent to the API
        console.log('📤 EXACT REQUEST BODY TO BE SENT:', {
            session_id: requestBody.session_id,
            user_id: requestBody.user_id,
            input_props_length: requestBody.input_props.length,
            input_props_preview: requestBody.input_props.substring(0, 500) + '...',
            // Parse and show overlays from the stringified version
            parsed_overlays_count: (() => {
                try {
                    const parsed = JSON.parse(requestBody.input_props);
                    return parsed?.overlays?.length || 0;
                } catch (e) {
                    return 'PARSE_ERROR';
                }
            })()
        });
        
        // CRITICAL: Verify chart overlays are in the stringified input_props
        try {
            const parsedInputProps = JSON.parse(requestBody.input_props);
            const parsedOverlays = parsedInputProps?.overlays || [];
            const parsedChartOverlays = parsedOverlays.filter(o => 
                o.type === 'video' || // OverlayType.VIDEO is "video" (lowercase)
                o.type === 'VIDEO' || // Also check uppercase for safety
                o.id?.includes('chart') || 
                o.src?.includes('chart') ||
                o.content?.includes('chart') ||
                o.has_background === false ||
                o.needsChromaKey === true ||
                o.removeBackground === true
            );
            
            console.log('🔍 VERIFICATION: Chart overlays in stringified input_props:', {
                totalOverlaysInStringified: parsedOverlays.length,
                chartOverlaysInStringified: parsedChartOverlays.length,
                chartOverlayIds: parsedChartOverlays.map(c => c.id),
                missingCharts: chartOverlays.length > parsedChartOverlays.length ? 
                    chartOverlays.filter(c => !parsedChartOverlays.find(p => p.id === c.id)).map(c => c.id) : 
                    [],
                // Compare each chart overlay
                chartComparison: chartOverlays.map(original => {
                    const found = parsedChartOverlays.find(p => p.id === original.id);
                    return {
                        id: original.id,
                        inOriginal: true,
                        inStringified: !!found,
                        propertiesMatch: found ? {
                            type: original.type === found.type,
                            src: original.src === found.src,
                            has_background: original.has_background === found.has_background,
                            needsChromaKey: original.needsChromaKey === found.needsChromaKey,
                            from: original.from === found.from,
                            durationInFrames: original.durationInFrames === found.durationInFrames
                        } : null,
                        originalProps: {
                            type: original.type,
                            src: original.src?.substring(0, 50),
                            has_background: original.has_background,
                            needsChromaKey: original.needsChromaKey
                        },
                        stringifiedProps: found ? {
                            type: found.type,
                            src: found.src?.substring(0, 50),
                            has_background: found.has_background,
                            needsChromaKey: found.needsChromaKey
                        } : null
                    };
                })
            });
            
            if (chartOverlays.length > 0 && parsedChartOverlays.length === 0) {
                console.error('❌ CRITICAL: Chart overlays are MISSING from stringified input_props!', {
                    originalChartCount: chartOverlays.length,
                    stringifiedChartCount: parsedChartOverlays.length,
                    originalChartIds: chartOverlays.map(c => c.id),
                    allOverlayIds: parsedOverlays.map(o => o.id)
                });
            }
            
            // Log the FULL stringified input_props for manual inspection
            console.log('📋 FULL STRINGIFIED INPUT_PROPS (for manual inspection):', requestBody.input_props);
            
        } catch (parseError) {
            console.error('❌ Error parsing input_props for verification:', parseError);
        }
        
        // Use the new API endpoint
        const apiBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net';
        const response = await fetch(`${apiBase}/v1/videos/render-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                session_id: requestBody.session_id,
                user_id: requestBody.user_id,
                input_props: requestBody.input_props
            }).toString()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Render request failed: ${response.statusText} - ${errorText}`);
        }
        
        const responseData = await response.json();
        
        // Extract job_id from response
        const jobId = responseData?.job_id || responseData?.jobId || responseData?.id;
        
        if (!jobId) {
            throw new Error('No job_id received from render API');
        }
        
        // Return in format expected by useRendering hook
        return {
            renderId: jobId,
            job_id: jobId,
            // Store job_id for navigation
            _jobId: jobId
        };
    }
    async getProgress(params) {
        const response = await fetch(`${this.endpoint}/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error(`Progress request failed: ${response.statusText}`);
        }
        const responseData = await response.json();
        // Handle different response structures
        // Lambda renderer wraps response in { type: "success", data: ... }
        // SSR renderer returns response directly
        if (responseData.type === "success" && responseData.data) {
            return responseData.data;
        }
        // Direct response (SSR)
        return responseData;
    }
    async getRenderJobStatus(jobId) {
        const apiBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net';
        const response = await fetch(`${apiBase}/v1/videos/render-job-status/${encodeURIComponent(jobId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Render job status check failed: ${response.statusText} - ${errorText}`);
        }
        
        const responseData = await response.json();
        return responseData;
    }
    
    get renderType() {
        return this.renderTypeInfo;
    }
}
