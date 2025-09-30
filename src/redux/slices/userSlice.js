import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const AUTH_BASE = 'https://auth-js-g3hnh7gbc4c5fje4.uaenorth-01.azurewebsites.net';

// Helper function to save auth data to localStorage
const saveAuthToStorage = (user, token) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('isAuthenticated', 'true');
  } catch (error) {
    console.error('Error saving auth data to localStorage:', error);
  }
};

// Helper function to clear auth data from localStorage
const clearAuthFromStorage = () => {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
  } catch (error) {
    console.error('Error clearing auth data from localStorage:', error);
  }
};

// Helper function to get auth data from localStorage
const getAuthFromStorage = () => {
  try {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (user && token && isAuthenticated === 'true') {
      return {
        user: JSON.parse(user),
        token: token,
        isAuthenticated: true
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting auth data from localStorage:', error);
    return null;
  }
};

// Async thunk for login
export const loginUser = createAsyncThunk(
  'user/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${AUTH_BASE}/api/auth/login`, 
        { email, password }, 
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data.message === 'Login Successful') {
        const authData = {
          user: response.data.user,
          token: response.data.user.id
        };
        
        // Save to localStorage
        saveAuthToStorage(authData.user, authData.token);
        
        return authData;
      } else {
        return rejectWithValue(response.data.message || 'Login failed');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      } else if (error.response?.status === 401) {
        return rejectWithValue('Invalid credentials. Please check your email and password.');
      } else {
        return rejectWithValue('An error occurred during login. Please try again.');
      }
    }
  }
);

// Async thunk for signup
export const signupUser = createAsyncThunk(
  'user/signup',
  async ({ name, email, password, type }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${AUTH_BASE}/api/auth/signup`, 
        { 
          display_name: name, 
          email, 
          password, 
          type 
        }, 
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data.message === 'User Successfully Registered') {
        return response.data;
      } else {
        return rejectWithValue(response.data.message || 'Signup failed');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      } else if (error.response?.status === 400) {
        return rejectWithValue('Invalid data provided. Please check your information.');
      } else if (error.response?.status === 409) {
        return rejectWithValue('An account with this email already exists.');
      } else {
        return rejectWithValue('An error occurred during signup. Please try again.');
      }
    }
  }
);

// Async thunk for OAuth callback
export const handleOAuthCallback = createAsyncThunk(
  'user/oauthCallback',
  async ({ code, state, provider }, { rejectWithValue }) => {
    try {
      const OAUTH_BASE = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net';
      
      console.log(`Processing ${provider} OAuth callback with code:`, code);
      
      // Call the provider-specific GET endpoint with query params
      const response = await axios.get(`${OAUTH_BASE}/v1/auth/callback/${provider}`, {
        params: {
          code: code,
          state: state
        },
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('OAuth callback response:', response.data);
      
      if (response.data && response.data.access_token) {
        const authData = {
          user: {
            id: response.data.user_id,
            email: response.data.email,
            display_name: response.data.display_name
          },
          token: response.data.access_token
        };
        
        // Save to localStorage
        saveAuthToStorage(authData.user, authData.token);
        
        return authData;
      } else {
        return rejectWithValue('No token received from OAuth callback');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      if (error.response?.data?.detail) {
        return rejectWithValue(error.response.data.detail);
      } else if (error.response?.status) {
        return rejectWithValue(`OAuth authentication failed (${error.response.status})`);
      } else {
        return rejectWithValue('OAuth authentication failed. Please try again.');
      }
    }
  }
);

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user;
      if (token) {
        // Call logout endpoint if needed
        // await axios.post('/api/auth/logout', {}, {
        //   headers: { 'Authorization': `Bearer ${token}` }
        // });
      }
      
      // Clear from localStorage
      clearAuthFromStorage();
      
      return true;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

// Async thunk for checking auth status
export const checkAuthStatus = createAsyncThunk(
  'user/checkAuthStatus',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user;
      if (!token) {
        return rejectWithValue('No token found');
      }
      
      const response = await axios.get('http://localhost:8000/api/auth/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.authenticated) {
        return response.data.user;
      } else {
        return rejectWithValue('Token invalid');
      }
    } catch (error) {
      return rejectWithValue('Auth check failed');
    }
  }
);

// Get initial state from localStorage if available
const getInitialState = () => {
  const storedAuth = getAuthFromStorage();
  if (storedAuth) {
    return {
      user: storedAuth.user,
      token: storedAuth.token,
      isAuthenticated: true,
      loading: false,
      error: null
    };
  }
  
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null
  };
};

const userSlice = createSlice({
  name: 'user',
  initialState: getInitialState(),
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      
      // Save to localStorage
      saveAuthToStorage(action.payload.user, action.payload.token);
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      
      // Clear from localStorage
      clearAuthFromStorage();
    },
    restoreAuthState: (state) => {
      const storedAuth = getAuthFromStorage();
      if (storedAuth) {
        state.user = storedAuth.user;
        state.token = storedAuth.token;
        state.isAuthenticated = true;
        state.error = null;
      }
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // OAuth Callback
    builder
      .addCase(handleOAuthCallback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleOAuthCallback.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(handleOAuthCallback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Check Auth Status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  }
});

export const { clearError, setUser, clearUser, restoreAuthState } = userSlice.actions;

// Selectors
export const selectUser = (state) => state.user.user;
export const selectToken = (state) => state.user.token;
export const selectIsAuthenticated = (state) => state.user.isAuthenticated;
export const selectUserLoading = (state) => state.user.loading;
export const selectUserError = (state) => state.user.error;

export default userSlice.reducer;
