import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './redux/store';

// Suppress Chrome extension message passing errors (harmless, caused by browser extensions)
const suppressExtensionErrors = () => {
  // Suppress unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || String(event.reason || '');
    if (
      errorMessage.includes('message channel closed') ||
      errorMessage.includes('listener indicated an asynchronous response') ||
      errorMessage.includes('runtime.lastError')
    ) {
      event.preventDefault(); // Suppress the error
      return;
    }
  });

  // Suppress console errors from extensions (optional - only in production)
  if (process.env.NODE_ENV === 'production') {
    const originalError = console.error;
    console.error = (...args) => {
      const errorStr = args.join(' ');
      if (
        errorStr.includes('message channel closed') ||
        errorStr.includes('listener indicated an asynchronous response') ||
        errorStr.includes('runtime.lastError')
      ) {
        return; // Suppress extension errors in production
      }
      originalError.apply(console, args);
    };
  }
};

// Initialize error suppression
suppressExtensionErrors();

const root = ReactDOM.createRoot(document.getElementById('root'));
// Compute a robust basename for BrowserRouter (root deployment)
const computeBaseName = () => {
  const envBase = process.env.PUBLIC_URL;
  if (envBase && typeof envBase === 'string' && envBase.trim()) return envBase;
  return '/';
};
const BASENAME = computeBaseName();
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter basename={BASENAME}>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
