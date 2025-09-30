# Redux Setup for User Authentication

This document explains the Redux setup for user authentication in the Reel Reports application.

## 🏗️ **Architecture Overview**

The Redux setup includes:
- **User Slice**: Manages user authentication state
- **Store**: Centralized state management
- **Protected Routes**: Route protection based on authentication
- **Custom Hooks**: Easy access to authentication state and actions

## 📁 **File Structure**

```
src/
├── redux/
│   ├── store.js              # Redux store configuration
│   └── slices/
│       └── userSlice.js      # User authentication slice
├── components/
│   └── ProtectedRoute.js     # Route protection component
├── hooks/
│   └── useAuth.js            # Custom authentication hook
└── Components/
    ├── Login/
    │   ├── LoginForm.js      # Updated to use Redux
    │   └── SignupForm.js     # Updated to use Redux
    ├── Topbar.js             # Updated to use Redux
    ├── Profile/
    │   └── ProfileContent.js # Updated to use Redux
    └── Sidebar.js            # Updated to use Redux
```

## 🔧 **Setup**

### 1. **Store Configuration** (`src/redux/store.js`)
```javascript
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
  // ... middleware configuration
});
```

### 2. **Provider Setup** (`src/index.js`)
```javascript
import { Provider } from 'react-redux';
import store from './redux/store';

root.render(
  <Provider store={store}>
    <HashRouter>
      <App />
    </HashRouter>
  </Provider>
);
```

## 🎯 **User Slice Features**

### **State Structure**
```javascript
{
  user: null,           // User object
  token: null,          // JWT token
  isAuthenticated: false, // Authentication status
  loading: false,       // Loading state
  error: null           // Error messages
}
```

### **Available Actions**
- `loginUser(credentials)` - Email/password login
- `signupUser(userData)` - User registration
- `handleOAuthCallback(code, state)` - OAuth authentication
- `logoutUser()` - User logout
- `checkAuthStatus()` - Verify authentication
- `clearError()` - Clear error messages

### **Selectors**
- `selectUser` - Get user data
- `selectToken` - Get authentication token
- `selectIsAuthenticated` - Check if user is authenticated
- `selectUserLoading` - Get loading state
- `selectUserError` - Get error messages

## 🚀 **Usage Examples**

### **Using Redux Hooks Directly**
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, selectUser, selectIsAuthenticated } from '../redux/slices/userSlice';

const MyComponent = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const handleLogin = async () => {
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      // Login successful
    }
  };

  return (
    <div>
      {isAuthenticated ? `Welcome, ${user.name}!` : 'Please log in'}
    </div>
  );
};
```

### **Using Custom Hook**
```javascript
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = () => {
    login({ email: 'user@example.com', password: 'password' });
  };

  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
};
```

## 🛡️ **Protected Routes**

### **Route Protection**
```javascript
import ProtectedRoute from '../components/ProtectedRoute';

<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### **Authentication Check**
- Automatically redirects unauthenticated users to `/login`
- Shows loading spinner during authentication checks
- Preserves intended destination for post-login redirect

## 🔐 **Authentication Flow**

### **Login Flow**
1. User submits credentials
2. `loginUser` action dispatched
3. API call to authentication endpoint
4. On success: User data and token stored in Redux
5. User redirected to intended destination

### **OAuth Flow**
1. User clicks OAuth button
2. Redirected to OAuth provider
3. Provider redirects back with code/state
4. `handleOAuthCallback` action dispatched
5. Token exchanged and user authenticated

### **Logout Flow**
1. User clicks logout
2. `logoutUser` action dispatched
3. Redux state cleared
4. User redirected to login page

## 🔄 **State Persistence**

The Redux store maintains authentication state during the session. For persistent authentication across browser sessions, consider implementing:

- **Redux Persist** for localStorage persistence
- **Token refresh** mechanisms
- **Session validation** on app startup

## 🚨 **Error Handling**

### **API Errors**
- Network errors are caught and displayed
- Server error messages are shown to users
- Validation errors are field-specific

### **Authentication Errors**
- Invalid credentials show appropriate messages
- OAuth failures are handled gracefully
- Loading states prevent multiple submissions

## 📱 **Component Updates**

### **Updated Components**
- ✅ `LoginForm` - Uses Redux for login
- ✅ `SignupForm` - Uses Redux for signup
- ✅ `Topbar` - Shows user status from Redux
- ✅ `ProfileContent` - Displays user data from Redux
- ✅ `Sidebar` - Logout functionality via Redux
- ✅ `Home` - Uses Redux for authentication checks

### **Benefits**
- **Centralized State**: All user data in one place
- **Real-time Updates**: UI updates automatically with state changes
- **Type Safety**: Consistent data structure across components
- **Performance**: Efficient re-renders with Redux optimization

## 🧪 **Testing**

### **Redux DevTools**
Enable Redux DevTools in your browser to:
- Monitor state changes
- Debug actions and reducers
- Time-travel through state history

### **Testing Utilities**
```javascript
import { renderWithProviders } from '../test-utils';
import { screen } from '@testing-library/react';

test('shows user name when authenticated', () => {
  renderWithProviders(<UserProfile />, {
    preloadedState: {
      user: { user: { name: 'John Doe' }, isAuthenticated: true }
    }
  });
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

## 🔧 **Troubleshooting**

### **Common Issues**
1. **Store not connected**: Ensure `Provider` wraps your app
2. **Actions not dispatching**: Check action creators and async thunks
3. **State not updating**: Verify reducer logic and action types
4. **Protected routes not working**: Check authentication state and selectors

### **Debug Steps**
1. Check Redux DevTools for state changes
2. Verify action dispatching in console
3. Confirm selector values in components
4. Check for middleware conflicts

## 📚 **Additional Resources**

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Redux Hooks](https://react-redux.js.org/api/hooks)
- [Redux Best Practices](https://redux.js.org/style-guide/)
- [Async Actions with Redux Toolkit](https://redux-toolkit.js.org/api/createAsyncThunk)

---

This Redux setup provides a robust, scalable foundation for user authentication in your React application. The centralized state management ensures consistency across components while the custom hooks make it easy to access authentication data throughout your app.

