import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './slices/userSlice';
import guidelinesReducer from './slices/guidelinesSlice';
import videoJobReducer from './slices/videoJobSlice';

// Configure persistence for user slice
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'], // Only persist user state
};

const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    guidelines: guidelinesReducer, // in-memory only
    videoJob: videoJobReducer, // in-memory only
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
