import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppDataProvider } from './context/AppDataContext.jsx';
import { CallProvider } from './context/CallContext.jsx';
import './index.css';

const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <CallProvider>
          <AppDataProvider>
            <App />
          </AppDataProvider>
        </CallProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
