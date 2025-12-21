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
