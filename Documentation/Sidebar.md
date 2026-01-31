# Sidebar Component Documentation

## Overview

The `Sidebar` component is the main navigation component for the Reel Reports frontend application. It provides navigation links, chat session management, user authentication status, and role-based access control. The sidebar is always partially visible and can be toggled open/closed.

**File Location:** `src/Components/Sidebar.js`

**Component Type:** Functional React Component

---

## Table of Contents

1. [Dependencies](#dependencies)
2. [Component Structure](#component-structure)
3. [State Management](#state-management)
4. [API Integrations](#api-integrations)
5. [Features](#features)
6. [Functions](#functions)
7. [UI Components](#ui-components)
8. [Event Handlers](#event-handlers)
9. [Navigation Logic](#navigation-logic)
10. [User Role Management](#user-role-management)
11. [Session Management](#session-management)

---

## Dependencies

### React & React Router
- `react` - Core React library
- `react-router-dom` - Routing (Link, useLocation, useNavigate)
- `react-redux` - State management (useDispatch, useSelector)

### Icons
- `react-icons/fa` - Font Awesome icons (FaImage, FaPlay, FaThLarge, FaUsers, FaUserPlus, FaBars, FaFileAlt)
- `react-icons/io` - Ionicons (IoMdLogOut)
- `lucide-react` - Lucide icons (MoreVertical)

### Context & Redux
- `SidebarContext` - Custom context for sidebar state management
- `userSlice` - Redux slice for user authentication state

### Assets
- `mainLogo.png` - Application logo

---

## Component Structure

### Main Sections

1. **Logo Section** - Application logo with link to home
2. **Main Navigation** - Primary navigation buttons
3. **Admin Navigation** - Admin-only navigation (conditional)
4. **Chat History** - List of user's chat sessions
5. **Logout Button** - User logout functionality

### Layout

```
<aside> (Sidebar Container)
  ├── Logo Section
  ├── Scrollable Content Area
  │   ├── Main Navigation
  │   ├── Admin Navigation (conditional)
  │   └── Chat History
  └── Logout Section (fixed at bottom)
```

---

## State Management

### Local State (useState)

| State Variable | Type | Purpose |
|---------------|------|---------|
| `localUser` | Object/null | Fallback user data from localStorage |
| `sessions` | Array | List of user's chat sessions |
| `isLoadingSessions` | Boolean | Loading state for sessions fetch |
| `sessionsError` | String | Error message for session loading |
| `openMenuId` | String/null | ID of session with open menu |
| `showRenameDialog` | Boolean | Controls rename dialog visibility |
| `renameSessionId` | String/null | ID of session being renamed |
| `renameNewTitle` | String | New title for session rename |
| `isRenaming` | Boolean | Loading state for rename operation |
| `showDeleteDialog` | Boolean | Controls delete dialog visibility |
| `deleteSessionId` | String/null | ID of session being deleted |
| `isDeleting` | Boolean | Loading state for delete operation |
| `showTrialOverModal` | Boolean | Controls trial expiration modal |

### Redux State (useSelector)

- `user` - Current user object from Redux store
- `isAuthenticated` - Authentication status from Redux store

### Context State (useSidebar)

- `sidebarOpen` - Boolean indicating if sidebar is open
- `setSidebarOpen` - Function to toggle sidebar state

### Refs (useRef)

- `menuRef` - Reference to dropdown menu element for click-outside detection

---

## API Integrations

### Base URLs

1. **Core App Service:**
   ```
   https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net
   ```

2. **Reel Videos Test Service:**
   ```
   https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/
   ```

### API Endpoints

#### 1. Fetch User Sessions

**Endpoint:** `POST /v1/sessions/v1/users/sessions`

**Purpose:** Retrieve all chat sessions for the current user

**Request Body:**
```json
{
  "user_id": "string" // Token or user ID from localStorage/Redux
}
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "string",
      "session_id": "string",
      "title": "string",
      // ... other session properties
    }
  ]
}
```

**Implementation:**
- Function: `fetchSessions()`
- Called on component mount and when session titles update
- Caches results in localStorage as `user_sessions`
- Falls back to cached data on error

**Error Handling:**
- Displays error message if fetch fails
- Attempts to load cached sessions from localStorage
- Sets `sessionsError` state for UI display

---

#### 2. Create New Chat Session

**Endpoint:** `POST /v1/sessions/new`

**Purpose:** Create a new chat session for generating reels

**Request Body:**
```json
{
  "user_id": "string" // Token or user ID
}
```

**Response:**
```json
{
  "session": {
    "session_id": "string",
    // ... other session properties
  }
  // OR
  "session_id": "string",
  // OR
  "id": "string"
}
```

**Implementation:**
- Function: `createSessionAndNavigate()`
- Validates user authentication status
- Checks user validation status (must be 'validated' or admin)
- Clears per-session localStorage cache before creating
- Navigates to `/chat/{sessionId}` after creation
- Sets `session_id` in localStorage

**Pre-creation Cleanup:**
Clears the following localStorage keys:
- `scene_ref_images`
- `last_generated_script`
- `updated_script_structure`
- `original_script_hash`
- `reordered_script_rows`
- `has_generated_script`
- `job_id`, `job_status`, `job_result`

**Validation Logic:**
- Blocks non-validated users (unless admin)
- Shows trial expiration modal if user status is not 'validated'
- Normalizes status values ('non_validated' → 'not_validated')

---

#### 3. Create Build Reel Session

**Endpoint:** `POST /v1/sessions/new` (Reel Videos Test Service)

**Purpose:** Create a new session for the Build Reel feature

**Request Body:**
```json
{
  "user_id": "string" // Token or user ID
}
```

**Response:**
```json
{
  "session": {
    "session_id": "string"
  }
  // OR
  "session_id": "string",
  // OR
  "id": "string"
}
```

**Implementation:**
- Function: `createSessionAndGoBuildReel()`
- Navigates to `/buildreel/{sessionId}` after creation
- Sets `session_id` in localStorage

---

#### 4. Rename Session

**Endpoint:** `POST /v1/sessions/rename`

**Purpose:** Rename an existing chat session

**Request Body:**
```json
{
  "session_id": "string",
  "user_id": "string",
  "new_title": "string" // Trimmed title
}
```

**Response:**
- Success: HTTP 200 with updated session data
- Error: HTTP error status with error message

**Implementation:**
- Function: `handleRenameSession()`
- Validates input (non-empty title)
- Refreshes sessions list after successful rename
- Closes dialog and resets state on completion

**Error Handling:**
- Shows alert on validation failure
- Shows alert on API error
- Resets loading state in finally block

---

#### 5. Delete Session

**Endpoint:** `POST /v1/sessions/delete`

**Purpose:** Delete a chat session

**Request Body:**
```json
{
  "session_id": "string",
  "user_id": "string"
}
```

**Response:**
- Success: HTTP 200
- Error: HTTP error status with error message

**Implementation:**
- Function: `handleDeleteSession()`
- If deleted session is current session, navigates to home and clears `session_id`
- Refreshes sessions list after deletion
- Closes dialog and resets state on completion

**Navigation Logic:**
- Checks if deleted session matches current `session_id` in localStorage
- If match: removes `session_id` and navigates to `/`
- Otherwise: stays on current page

---

#### 6. Get User Session Data

**Endpoint:** `POST /v1/sessions/user-session-data`

**Purpose:** Retrieve session data to determine navigation path

**Request Body:**
```json
{
  "user_id": "string",
  "session_id": "string"
}
```

**Response:**
```json
{
  "session_data": {
    "videoType": "string", // "custom" or other
    "scripts": [...],
    "images": [...],
    "videos": [...],
    // ... other session data
  },
  "session": {...},
  "user_data": {...}
}
```

**Implementation:**
- Called when clicking on a session in chat history
- Determines if session should navigate to `/buildreel` or `/chat`
- Checks `videoType` field:
  - If `videoType === 'custom'` → navigate to Build Reel
  - Otherwise → navigate to Chat
- Analyzes session content to determine Build Reel step and subview:
  - Has videos → Step 2, subview: 'videos'
  - Has images → Step 2, subview: 'images'
  - Has script → Step 2, subview: 'editor'
  - Default → Step 1, subview: 'editor'

**Step/Subview Logic:**
```javascript
if (hasVideos) {
  targetStep = 2;
  targetSubView = 'videos';
} else if (hasImages) {
  targetStep = 2;
  targetSubView = 'images';
} else if (hasScript) {
  targetStep = 2;
  targetSubView = 'editor';
} else {
  targetStep = 1;
  targetSubView = 'editor';
}
```

---

## Features

### 1. Responsive Sidebar

- **Width:** 288px (w-72) when open, 0px when closed
- **Animation:** Smooth transition with `duration-300 ease-in-out`
- **Background:** Gradient from blue (#0118D8) to purple (#9e00dc)
- **Scrollable:** Content area scrolls independently, logout button fixed at bottom

### 2. User Authentication

- **Dual Source:** Uses Redux store with localStorage fallback
- **Role Detection:** Supports multiple role field names:
  - `role`
  - `user_role`
  - `type`
  - `userType`
- **Status Validation:** Checks user validation status before allowing actions
- **Admin Detection:** Normalizes role to lowercase for comparison

### 3. Navigation

**Main Navigation Items:**
- **Generate Reel** - Creates new chat session for AI reel generation
- **Build Reel** - Creates new session for custom reel building
- **My Media** - Navigates to media library

**Admin Navigation (Conditional):**
- **All Users** - Admin user management
- **Create User** - Admin user creation
- **Logs** - Admin system logs

**Active State:**
- Highlights active route based on `pathname`
- Uses `splitLocation[1]` to match route segments
- Applies `activeClass` styling for active items

### 4. Chat History Management

**Features:**
- Displays all user sessions in scrollable list
- Shows session titles (defaults to "New Chat" if no title)
- Highlights active session
- Context menu for each session (rename/delete)
- Loading states and error messages
- Empty state message

**Session Display:**
- Truncates long titles
- Shows active state styling
- Hover effects on inactive sessions
- More options button (three dots) for context menu

### 5. Session Context Menu

**Options:**
- **Rename** - Opens rename dialog
- **Delete** - Opens delete confirmation dialog

**Behavior:**
- Click outside closes menu
- Only one menu open at a time
- Menu positioned absolutely below session item

### 6. Modals & Dialogs

**Rename Dialog:**
- Input field for new session name
- Enter key submits, Escape key cancels
- Loading spinner during rename operation
- Validation (non-empty title required)

**Delete Dialog:**
- Confirmation message
- Cancel and Delete buttons
- Loading spinner during delete operation
- Destructive styling (red)

**Trial Over Modal:**
- Shown when non-validated user tries to access features
- Warning icon and message
- Close button
- Blocks access until user is validated

### 7. Event Listeners

**Window Events:**
- `sidebar-toggle` - Toggles sidebar open/closed
- `sidebar-close` - Closes sidebar
- `session-title-updated` - Refreshes sessions list

**Document Events:**
- `mousedown` - Closes context menu when clicking outside

---

## Functions

### `fetchSessions()`

**Type:** `useCallback`

**Purpose:** Fetches all chat sessions for the current user

**Parameters:** None (uses closure for `user`)

**Returns:** Promise (void)

**Flow:**
1. Sets loading state to true
2. Gets token from localStorage or Redux user
3. Makes POST request to sessions endpoint
4. Parses response (handles both JSON and text)
5. Updates sessions state
6. Caches sessions in localStorage
7. Handles errors and falls back to cache

**Dependencies:** `[user]`

---

### `createSessionAndNavigate()`

**Type:** Async function

**Purpose:** Creates a new chat session and navigates to chat page

**Parameters:** None

**Returns:** Promise (void)

**Flow:**
1. Sets `is_creating_session` flag in localStorage
2. Validates user authentication
3. Checks user validation status
4. Blocks non-validated users (shows modal)
5. Clears per-session localStorage cache
6. Sets `force_typetab_hybrid` flag
7. Creates new session via API
8. Stores session_id in localStorage
9. Navigates to `/chat/{sessionId}`
10. Clears creation flag

**Error Handling:**
- Shows alert on failure
- Navigates to login if not authenticated
- Shows trial modal if not validated

---

### `createSessionAndGoBuildReel()`

**Type:** Async function

**Purpose:** Creates a new session for Build Reel feature

**Parameters:** None

**Returns:** Promise (void)

**Flow:**
1. Sets `is_creating_session` flag
2. Validates user authentication
3. Creates session via Build Reel API endpoint
4. Stores session_id
5. Navigates to `/buildreel/{sessionId}`
6. Clears creation flag

**Error Handling:**
- Shows alert on failure
- Navigates to login if not authenticated

---

### `handleRenameSession()`

**Type:** Async function

**Purpose:** Renames a chat session

**Parameters:** None (uses state: `renameSessionId`, `renameNewTitle`)

**Returns:** Promise (void)

**Flow:**
1. Validates input (non-empty title)
2. Sets renaming state to true
3. Gets user token
4. Makes POST request to rename endpoint
5. Refreshes sessions list
6. Closes dialog and resets state
7. Handles errors with alerts

**Validation:**
- Checks for `renameSessionId` and `renameNewTitle.trim()`
- Validates user token exists

---

### `handleDeleteSession()`

**Type:** Async function

**Purpose:** Deletes a chat session

**Parameters:** None (uses state: `deleteSessionId`)

**Returns:** Promise (void)

**Flow:**
1. Validates `deleteSessionId` exists
2. Sets deleting state to true
3. Gets user token
4. Makes POST request to delete endpoint
5. Checks if deleted session is current session
6. If current: clears session_id and navigates to home
7. Refreshes sessions list
8. Closes dialog and resets state
9. Handles errors with alerts

**Navigation Logic:**
- Compares `deleteSessionId` with `localStorage.getItem('session_id')`
- If match: removes session_id and navigates to `/`

---

### `handleLogout()`

**Type:** Async function

**Purpose:** Logs out the current user

**Parameters:** None

**Returns:** Promise (void)

**Flow:**
1. Dispatches Redux `logoutUser()` action
2. Clears localStorage items:
   - `session_id`
   - `chat_history`
   - `auth`
3. Navigates to `/login`
4. Handles errors (still navigates to login)

---

## UI Components

### CSS Classes

**Base Navigation Class:**
```css
w-full mb-3 rounded-xl p-4 flex items-center gap-3 text-left text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50
```

**Active State:**
```css
bg-white/25 shadow-lg shadow-black/10
```

**Inactive State:**
```css
hover:bg-white/20
```

### Styling Details

**Sidebar Container:**
- Gradient background: `linear-gradient(to bottom, #0118D8 0%, #7100e0 50%, #9e00dc 100%)`
- Width: `w-72` (288px) when open, `w-0` when closed
- Height: Full height (`h-full`)
- Transition: `duration-300 ease-in-out`

**Session Items:**
- Background: `bg-white/10` (inactive), `bg-white/25` (active)
- Hover: `hover:bg-white/20`
- Border radius: `rounded-lg`
- Padding: `px-3 py-2`
- Text: Truncated with ellipsis

**Modals:**
- Backdrop: `bg-black bg-opacity-50 backdrop-blur-sm`
- Container: `bg-white rounded-lg shadow-2xl`
- Max width: `max-w-md`
- Z-index: `z-50` (dialogs), `z-[9999]` (trial modal)

---

## Event Handlers

### Session Click Handler

**Trigger:** Click on session item in chat history

**Actions:**
1. Validates user authentication and status
2. Checks if user is validated or admin
3. Shows trial modal if not validated
4. Stores session_id in localStorage
5. Fetches session data to determine videoType
6. Navigates based on videoType:
   - `custom` → `/buildreel/{id}` with step/subview
   - Other → `/chat/{id}`

**Navigation Logic for Custom Sessions:**
- Analyzes session content (videos, images, scripts)
- Determines appropriate step and subview
- Sets localStorage flags:
  - `buildreel_current_step`
  - `buildreel_subview`

---

### Context Menu Handlers

**Rename Button:**
- Sets `renameSessionId` and `renameNewTitle` from current session
- Opens rename dialog
- Closes context menu

**Delete Button:**
- Sets `deleteSessionId` from current session
- Opens delete confirmation dialog
- Closes context menu

---

### Dialog Handlers

**Rename Dialog:**
- **Enter Key:** Submits rename (if not loading)
- **Escape Key:** Closes dialog and resets state
- **Cancel Button:** Closes dialog and resets state
- **Rename Button:** Calls `handleRenameSession()`

**Delete Dialog:**
- **Cancel Button:** Closes dialog and resets state
- **Delete Button:** Calls `handleDeleteSession()`

**Trial Over Modal:**
- **Close Button:** Closes modal
- **Close Button (in content):** Closes modal

---

## Navigation Logic

### Route Matching

**Active Route Detection:**
```javascript
const { pathname } = location;
const splitLocation = pathname.split("/");
// splitLocation[1] contains the first route segment
```

**Examples:**
- `/chat/123` → `splitLocation[1] === 'chat'`
- `/buildreel/456` → `splitLocation[1] === 'buildreel'`
- `/media` → `splitLocation[1] === 'media'`
- `/admin/users` → `splitLocation[1] === 'admin'`

### Session Navigation

**Active Session Detection:**
```javascript
const urlSessionId = pathname.split('/').length > 2 ? pathname.split('/')[2] : null;
const localStorageSessionId = localStorage.getItem('session_id');
const isActive = id && (id === urlSessionId || id === localStorageSessionId);
```

**Navigation Paths:**
1. **Generate Reel:** `/chat/{sessionId}`
2. **Build Reel:** `/buildreel/{sessionId}`
3. **My Media:** `/media`
4. **Admin Routes:**
   - `/admin/users` - All users
   - `/admin/users/create` - Create user
   - `/admin/logs` - System logs

---

## User Role Management

### Role Detection

**Supported Role Fields:**
- `role`
- `user_role`
- `type`
- `userType`

**Normalization:**
```javascript
const rawRole = (effectiveUser?.role || effectiveUser?.user_role || effectiveUser?.type || effectiveUser?.userType || '').toString().toLowerCase();
const isAdmin = rawRole === 'admin';
```

**Fallback Strategy:**
1. First checks Redux `user` object
2. Falls back to `localUser` from localStorage
3. Updates `localUser` when Redux user changes

### Status Validation

**Status Fields:**
- `status`
- `validation_status`

**Normalization:**
```javascript
let userStatus = (user?.status || user?.validation_status || '').toString().toLowerCase();
const normalizedStatus = userStatus === 'non_validated' ? 'not_validated' : userStatus;
```

**Access Control:**
- Only allows access if:
  - `normalizedStatus === 'validated'` OR
  - User is admin
- Shows trial expiration modal otherwise

---

## Session Management

### Session Data Structure

**Session Object:**
```javascript
{
  id: "string",           // Session ID
  session_id: "string",   // Alternative session ID field
  title: "string",       // Session title (defaults to "New Chat")
  // ... other properties
}
```

### Session State Management

**Loading States:**
- `isLoadingSessions` - During fetch
- `isRenaming` - During rename
- `isDeleting` - During delete

**Error States:**
- `sessionsError` - Error message for fetch failures

### Session Caching

**localStorage Keys:**
- `user_sessions` - Cached sessions array (JSON stringified)
- `session_id` - Current active session ID

**Cache Strategy:**
- Updates cache on successful fetch
- Falls back to cache on fetch error
- Clears cache on logout

### Session Lifecycle

1. **Creation:**
   - User clicks "Generate Reel" or "Build Reel"
   - API creates new session
   - Session ID stored in localStorage
   - User navigated to appropriate page

2. **Navigation:**
   - User clicks session in history
   - Session data fetched to determine type
   - Navigation based on videoType and content

3. **Rename:**
   - User opens context menu → Rename
   - Dialog opens with current title
   - API updates session title
   - Sessions list refreshed

4. **Delete:**
   - User opens context menu → Delete
   - Confirmation dialog shown
   - API deletes session
   - If current session: navigate to home
   - Sessions list refreshed

---

## useEffect Hooks

### 1. User State Sync

```javascript
useEffect(() => {
  if (user) {
    setLocalUser(user);
  } else if (isAuthenticated) {
    // Fallback to localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setLocalUser(JSON.parse(storedUser));
    }
  }
}, [user, isAuthenticated]);
```

**Purpose:** Keeps localUser in sync with Redux user state

---

### 2. Sessions Fetch on Mount

```javascript
React.useEffect(() => {
  fetchSessions();
}, [fetchSessions]);
```

**Purpose:** Loads sessions when component mounts

---

### 3. Window Event Listeners

```javascript
React.useEffect(() => {
  if (typeof window === 'undefined') return;
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  window.addEventListener('sidebar-toggle', toggleSidebar);
  window.addEventListener('sidebar-close', closeSidebar);
  return () => {
    window.removeEventListener('sidebar-toggle', toggleSidebar);
    window.removeEventListener('sidebar-close', closeSidebar);
  };
}, []);
```

**Purpose:** Listens for global sidebar toggle/close events

---

### 4. Session Title Update Listener

```javascript
React.useEffect(() => {
  if (typeof window === 'undefined') return;
  const onTitleUpdated = () => fetchSessions();
  window.addEventListener('session-title-updated', onTitleUpdated);
  return () => window.removeEventListener('session-title-updated', onTitleUpdated);
}, [fetchSessions]);
```

**Purpose:** Refreshes sessions when title is updated elsewhere

---

### 5. Click Outside Menu Handler

```javascript
useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setOpenMenuId(null);
    }
  };
  if (openMenuId) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [openMenuId]);
```

**Purpose:** Closes context menu when clicking outside

---

## Error Handling

### API Error Handling

**Fetch Sessions:**
- Catches errors and sets `sessionsError`
- Falls back to cached sessions from localStorage
- Logs error to console

**Create Session:**
- Shows alert on failure
- Navigates to login if not authenticated
- Shows trial modal if not validated

**Rename Session:**
- Validates input before API call
- Shows alert on validation failure
- Shows alert on API error
- Resets state in finally block

**Delete Session:**
- Validates session ID exists
- Shows alert on API error
- Handles navigation even if API fails
- Resets state in finally block

### User Feedback

**Loading States:**
- Spinner in rename/delete buttons
- "Loading..." text in sessions list
- Disabled buttons during operations

**Error Messages:**
- `sessionsError` displayed in sessions list
- Alert dialogs for operation failures
- Validation messages in rename dialog

**Empty States:**
- "No sessions yet" when sessions array is empty
- Empty state only shown when not loading and no error

---

## Integration Points

### Redux Integration

**Actions Used:**
- `logoutUser()` - Logs out user and clears state

**Selectors Used:**
- `selectUser` - Gets current user object
- `selectIsAuthenticated` - Gets authentication status

### Context Integration

**SidebarContext:**
- `sidebarOpen` - Current sidebar state
- `setSidebarOpen` - Toggle sidebar state
- `toggleSidebar` - Toggle function
- `openSidebar` - Open function
- `closeSidebar` - Close function

### Router Integration

**Hooks Used:**
- `useLocation()` - Gets current route
- `useNavigate()` - Programmatic navigation
- `Link` - Declarative navigation (logo)

### localStorage Integration

**Keys Used:**
- `user` - User object (fallback)
- `token` - Authentication token
- `session_id` - Current active session
- `user_sessions` - Cached sessions list
- `is_creating_session` - Creation flag
- `force_typetab_hybrid` - Typetab hint
- `buildreel_current_step` - Build Reel step
- `buildreel_subview` - Build Reel subview

**Cache Keys Cleared on Session Creation:**
- `scene_ref_images`
- `last_generated_script`
- `updated_script_structure`
- `original_script_hash`
- `reordered_script_rows`
- `has_generated_script`
- `job_id`, `job_status`, `job_result`

---

## Best Practices

### Performance

1. **useCallback:** `fetchSessions` wrapped in useCallback to prevent unnecessary re-renders
2. **Conditional Rendering:** Admin section only renders when `isAdmin` is true
3. **Memoization:** Session list items use stable keys

### Security

1. **Token Validation:** Always checks for token before API calls
2. **Role-Based Access:** Admin features only visible to admins
3. **Status Validation:** Blocks non-validated users from creating sessions

### User Experience

1. **Loading States:** Shows feedback during async operations
2. **Error Messages:** Clear error messages for failures
3. **Empty States:** Helpful messages when no data
4. **Keyboard Support:** Enter/Escape keys in dialogs
5. **Click Outside:** Closes menus when clicking outside

### Code Quality

1. **Error Handling:** Try-catch blocks for all async operations
2. **State Management:** Proper cleanup in useEffect hooks
3. **Type Safety:** Handles multiple possible field names
4. **Fallback Strategies:** localStorage fallback for user data

---

## Future Enhancements

### Potential Improvements

1. **Session Search:** Add search/filter functionality for sessions
2. **Session Sorting:** Sort by date, title, etc.
3. **Bulk Operations:** Select multiple sessions for bulk delete
4. **Session Export:** Export session data
5. **Keyboard Shortcuts:** Keyboard navigation for sessions
6. **Session Icons:** Visual indicators for session types
7. **Recent Sessions:** Highlight recently accessed sessions
8. **Session Archiving:** Archive instead of delete

---

## Troubleshooting

### Common Issues

**Sessions Not Loading:**
- Check network tab for API errors
- Verify token exists in localStorage
- Check console for error messages
- Verify API endpoint is accessible

**Sidebar Not Toggling:**
- Check SidebarContext is provided in App
- Verify `sidebarOpen` state updates
- Check CSS classes are applied correctly

**Navigation Not Working:**
- Verify route paths match router configuration
- Check session_id is set in localStorage
- Verify user authentication status

**Rename/Delete Failing:**
- Check API endpoint is accessible
- Verify session_id is valid
- Check user token is valid
- Review console for error details

---

## Related Components

- **SidebarContext** (`src/Contexts/SidebarContext.js`) - Sidebar state management
- **Topbar** (`src/Components/Topbar.js`) - Top navigation bar
- **Chat** (`src/Components/Chat.js`) - Chat interface
- **BuildReelWizard** (`src/Components/BuildReel/BuildReelWizard.js`) - Build Reel interface
- **userSlice** (`src/redux/slices/userSlice.js`) - User authentication state

---

## Version History

- **Initial Version:** Complete sidebar with navigation and session management
- **Current Features:**
  - Session rename/delete
  - Trial expiration modal
  - Build Reel session creation
  - Smart session navigation based on videoType
  - Admin role-based navigation

---

## Notes

- Sidebar is always partially visible (doesn't fully collapse)
- Session titles default to "New Chat" if not set
- Multiple role/status field names supported for backward compatibility
- localStorage used extensively for caching and state persistence
- API responses may vary in structure (handles multiple formats)

