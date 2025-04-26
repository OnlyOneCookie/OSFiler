/**
 * Root application component
 * 
 * Configures auth context and routing for the application
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

// Theme
import theme from './styles/theme';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Routes
import { AppRoutes } from './routes';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;