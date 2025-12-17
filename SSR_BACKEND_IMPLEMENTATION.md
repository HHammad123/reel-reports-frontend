# SSR Backend Endpoint Implementation Guide

## Endpoint Details

- URL: https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/api/render/ssr

- Method: POST

- Content-Type: application/json

## Request Body

```json
{
  "overlays": [...],
  "fps": 30,
  "width": 1280,
  "height": 720,
  "duration": 10,
  "session_id": "string",
  "user_id": "string"
}
```

## Expected Response

```json
{
  "success": true,
  "videoUrl": "https://...",
  "jobId": "ssr-123456789"
}
```

## Backend Implementation Required

This endpoint needs to be implemented on the Azure backend server.

The frontend is now ready to use it once the backend endpoint is deployed.

## Testing

Set USE_SSR_RENDERING = false to use Lambda rendering while backend is being developed.

Set USE_SSR_RENDERING = true once the SSR endpoint is ready.

