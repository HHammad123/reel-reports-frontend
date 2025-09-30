# Frontend-Only OAuth Integration Setup Guide

## Overview
This guide explains how to set up OAuth authentication for Google and Microsoft in your React application using a frontend-only approach. The OAuth flow is handled entirely on the frontend side, with callbacks routed to your React application instead of your backend.

## Architecture Changes Made

### 1. New OAuth Callback Component
- **File**: `src/Components/OAuthCallback.js`
- **Purpose**: Handles OAuth callbacks for both Google and Microsoft
- **Features**: 
  - Extracts authorization code from URL parameters
  - Determines provider from URL path
  - Makes API call to backend callback endpoint
  - Updates Redux store with authentication data
  - Redirects to home page on success

### 2. Updated Routing
- **New Routes**: 
  - `/v1/auth/callback/google` - Google OAuth callback
  - `/v1/auth/callback/microsoft` - Microsoft OAuth callback
- **Component**: Both routes use the same `OAuthCallback` component

### 3. Enhanced Redux Integration
- **Updated**: `handleOAuthCallback` thunk in `userSlice.js`
- **New Parameters**: Now accepts `provider` parameter
- **Better Error Handling**: More detailed error messages and logging

### 4. Cleaned Up LoginForm
- **Removed**: OAuth callback handling useEffect
- **Updated**: Redirect URIs to point to frontend callback routes
- **Maintained**: Existing OAuth initiation logic

## OAuth Flow

### Step-by-Step Process

1. **User clicks OAuth button** (Google/Microsoft)
2. **Frontend calls** `/v1/auth/init` with provider and redirect_uri
3. **Backend returns** OAuth authorization URL
4. **User redirects** to OAuth provider (Google/Microsoft)
5. **User authorizes** the application
6. **OAuth provider redirects** to frontend callback route
7. **Frontend extracts** authorization code from URL
8. **Frontend calls** backend callback endpoint with code
9. **Backend exchanges** code for tokens and user data
10. **Frontend stores** authentication data and redirects to home

### URL Structure

```
# Google OAuth
https://your-domain.com/v1/auth/callback/google?code=AUTHORIZATION_CODE&state=STATE

# Microsoft OAuth  
https://your-domain.com/v1/auth/callback/microsoft?code=AUTHORIZATION_CODE&state=STATE
```

## Configuration Steps

### 1. Update OAuth App Configurations

#### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Edit your OAuth 2.0 Client ID
4. **Update Authorized redirect URIs**:
   - **Development**: `http://localhost:3000/v1/auth/callback/google`
   - **Production**: `https://your-domain.com/v1/auth/callback/google`

#### Microsoft Azure Portal
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Select your app registration
4. Go to **Authentication**
5. **Update Redirect URIs**:
   - **Development**: `http://localhost:3000/v1/auth/callback/microsoft`
   - **Production**: `https://your-domain.com/v1/auth/callback/microsoft`

### 2. Backend Configuration

Ensure your backend `/v1/auth/init` endpoint accepts the new `redirect_uri` parameter:

```json
{
  "provider": "google",
  "redirect_uri": "http://localhost:3000/v1/auth/callback/google"
}
```

### 3. Environment-Specific URLs

#### Development
- **Google**: `http://localhost:3000/v1/auth/callback/google`
- **Microsoft**: `http://localhost:3000/v1/auth/callback/microsoft`

#### Production
- **Google**: `https://your-domain.com/v1/auth/callback/google`
- **Microsoft**: `https://your-domain.com/v1/auth/callback/microsoft`

## Testing the OAuth Flow

### 1. Development Testing
1. Start your React development server: `npm start`
2. Navigate to `/login`
3. Click Google or Microsoft login button
4. Complete OAuth authorization
5. Verify redirect to frontend callback route
6. Check console logs for OAuth processing
7. Verify successful redirect to home page

### 2. Console Logs to Monitor
- OAuth initiation
- Provider detection
- Authorization code extraction
- Backend API calls
- Authentication success/failure
- Redux state updates

### 3. Common Issues and Solutions

#### Issue: "No authorization code received"
- **Cause**: OAuth provider not redirecting to correct callback URL
- **Solution**: Verify redirect URIs in OAuth app configurations

#### Issue: "OAuth authentication failed"
- **Cause**: Backend callback endpoint error
- **Solution**: Check backend logs and API endpoint configuration

#### Issue: CORS errors
- **Cause**: Backend not allowing frontend domain
- **Solution**: Update backend CORS configuration

## Security Considerations

### 1. State Parameter
- The `state` parameter helps prevent CSRF attacks
- Ensure your backend validates the state parameter

### 2. Redirect URI Validation
- OAuth providers validate redirect URIs
- Only use HTTPS in production
- Keep redirect URIs secret and secure

### 3. Token Storage
- Access tokens are stored in localStorage
- Consider implementing token refresh logic
- Implement proper logout to clear tokens

## Production Deployment

### 1. Update OAuth App Configurations
- Change redirect URIs to production domain
- Remove development URLs
- Ensure HTTPS is used

### 2. Environment Variables
- Consider using environment variables for OAuth endpoints
- Separate development and production configurations

### 3. SSL/TLS
- Ensure your production domain uses HTTPS
- OAuth providers require secure connections

## Troubleshooting

### 1. Check Network Tab
- Monitor API calls to `/v1/auth/init`
- Verify redirect to OAuth provider
- Check callback API calls

### 2. OAuth Redirect Issue (Current Problem)
**Problem**: OAuth provider redirects to backend URL instead of frontend URL

**Symptoms**:
- User sees JSON response instead of being redirected to home page
- URL shows: `your-backend-domain.com/v1/auth/callback/google` instead of `your-frontend-domain.com/v1/auth/callback/google`

**Root Cause**: Backend is not using the `redirect_uri` parameter sent from frontend

**Solutions**:
1. **Check backend logs** to see if `redirect_uri` is being received
2. **Verify backend implementation** uses the provided `redirect_uri` parameter
3. **Ensure backend doesn't hardcode** the callback URL
4. **Test with explicit redirect_uri** in backend OAuth initialization

**Backend Code Check**:
```javascript
// Backend should use the redirect_uri from request body
const { provider, redirect_uri } = req.body;

// NOT hardcoded like this:
// const redirect_uri = 'https://your-backend-domain.com/v1/auth/callback/google';
```

### 2. Verify OAuth App Settings
- Redirect URIs match exactly
- Client ID and secret are correct
- App is properly configured and enabled

### 3. Backend Logs
- Check backend logs for OAuth callback errors
- Verify API endpoint availability
- Check CORS configuration

## Support

If you encounter issues:
1. Check browser console for error messages
2. Verify OAuth app configurations
3. Test with a simple OAuth flow
4. Check backend API endpoint status
5. Review network requests in browser dev tools

## Files Modified

- `src/Components/OAuthCallback.js` - New OAuth callback component
- `src/App.js` - Updated routing for OAuth callbacks
- `src/redux/slices/userSlice.js` - Enhanced OAuth callback handling
- `src/Components/Login/LoginForm.js` - Updated redirect URIs
- `src/pages/GoogleCallback.js` - Removed (replaced by OAuthCallback)

## Next Steps

1. Update OAuth app configurations in Google Cloud and Azure
2. Test the OAuth flow in development
3. Deploy to production with updated redirect URIs
4. Monitor OAuth authentication success rates
5. Implement additional security measures as needed
