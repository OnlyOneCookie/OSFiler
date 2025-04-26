/**
 * Application routing configuration
 */

import React, { useState } from 'react';
import { Route, Routes, Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Material UI imports
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Container,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  Tooltip,
  Paper
} from '@mui/material';

// Material UI icons
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// Page components
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Investigation from './pages/Investigation';
import NotFound from './pages/NotFound';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';

// Layout with header, nav & footer
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    handleClose();
    window.location.href = '/login';
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="fixed" sx={{ zIndex: 1100 }}>
          <Toolbar>
            <Typography 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'white',
                letterSpacing: '1px'
              }}
            >
              OSFiler
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                component={RouterLink} 
                to="/" 
                color="inherit"
                sx={{ mr: 2 }}
              >
                Dashboard
              </Button>
              
              <Tooltip title="Account settings">
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleClick}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'primary.dark',
                      fontSize: '0.875rem',
                      mr: 1
                    }}
                  >
                    {user?.username?.substring(0, 1).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" color="inherit" sx={{ mr: 0.5 }}>
                    {user?.username}
                  </Typography>
                  <ArrowDropDownIcon />
                </Box>
              </Tooltip>
            </Box>
            
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 3,
                sx: {
                  minWidth: 180,
                  mt: 1,
                  '& .MuiMenuItem-root': {
                    px: 2,
                    py: 1,
                  },
                },
              }}
            >
              <Box sx={{ py: 1, px: 2 }}>
                <Typography variant="subtitle2">{user?.username}</Typography>
                {user?.email && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {user.email}
                  </Typography>
                )}
              </Box>
              
              <Divider />
              
              <MenuItem component={RouterLink} to="/profile">
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              
              {user?.is_admin && (
                <MenuItem component={RouterLink} to="/settings">
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Site Settings
                </MenuItem>
              )}
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        
        <Toolbar /> {/* Spacer for fixed AppBar */}
        
        <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
          {children}
        </Container>
        
        <Paper component="footer" square elevation={3} sx={{ py: 2, mt: 'auto' }}>
          <Container>
            <Typography variant="body2" color="text.secondary" align="center">
              &copy; {new Date().getFullYear()} OSFiler - OSINT Profiling Tool
            </Typography>
          </Container>
        </Paper>
      </Box>
    </>
  );
};

// Route guard for authenticated routes
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Application routes
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/investigations/:id" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <Investigation />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <UserProfile />
            </MainLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <Settings />
            </MainLayout>
          </ProtectedRoute>
        } 
      />

      {/* 404 route */}
      <Route path="*" element={
        <MainLayout>
          <NotFound />
        </MainLayout>
      } />
    </Routes>
  );
};