# Frontend Documentation

This directory contains comprehensive documentation for all frontend components, features, API integrations, and functions in the Reel Reports frontend application.

## Documentation Structure

### Components
- [Sidebar](./Sidebar.md) - Main navigation component with session management

### Coming Soon
- Topbar Component
- Chat Component
- Build Reel Wizard
- Image List Component
- Videos List Component
- Video Editor Components
- Authentication Components
- Profile Components
- Admin Components

## Documentation Format

Each component documentation includes:

1. **Overview** - Component purpose and location
2. **Dependencies** - Required libraries and imports
3. **Component Structure** - Layout and organization
4. **State Management** - Local state, Redux, and Context
5. **API Integrations** - All API endpoints with request/response details
6. **Features** - Component capabilities
7. **Functions** - Detailed function documentation
8. **UI Components** - Styling and CSS classes
9. **Event Handlers** - User interaction handlers
10. **Navigation Logic** - Routing and navigation
11. **Error Handling** - Error management strategies
12. **Integration Points** - Redux, Context, Router, localStorage
13. **Best Practices** - Performance, security, UX considerations
14. **Troubleshooting** - Common issues and solutions

## API Base URLs

### Core App Service
```
https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net
```

### Reel Videos Test Service
```
https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/
```

### Auth Service
```
https://auth-js-g3hnh7gbc4c5fje4.uaenorth-01.azurewebsites.net
```

## Quick Reference

### Common Patterns

**API Call Pattern:**
```javascript
const response = await fetch('ENDPOINT', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
const text = await response.text();
let data;
try {
  data = JSON.parse(text);
} catch (_) {
  data = text;
}
```

**Token Retrieval:**
```javascript
const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
```

**User Status Check:**
```javascript
let userStatus = (user?.status || user?.validation_status || '').toString().toLowerCase();
const normalizedStatus = userStatus === 'non_validated' ? 'not_validated' : userStatus;
```

**Role Detection:**
```javascript
const rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase();
const isAdmin = rawRole === 'admin';
```

## Contributing

When adding new documentation:

1. Follow the established format
2. Include all API endpoints with full details
3. Document all state variables and their purposes
4. Include error handling strategies
5. Add troubleshooting section
6. Update this README with links to new documentation

## Last Updated

- **Sidebar Documentation:** Created - Initial comprehensive documentation

