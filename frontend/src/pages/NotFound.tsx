/**
 * 404 Error Page
 */

import React, { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

// Material UI imports
import {
  Box,
  Button,
  Typography,
  Container,
  Paper
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * NotFound page component.
 * 
 * @returns The NotFound page component.
 */
const NotFound: React.FC = () => {
  const { notify } = useNotification();
  
  useEffect(() => {
    notify(
      'The page you requested could not be found. You have been redirected to this error page.',
      'info'
    );
  }, [notify]);
  
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2
          }}
        >
          <ErrorOutlineIcon 
            color="error" 
            sx={{ fontSize: 80, mb: 2 }} 
          />
          <Typography 
            variant="h1" 
            component="h1" 
            color="error.main"
            sx={{ 
              fontWeight: 700,
              mb: 1
            }}
          >
            404
          </Typography>
          <Typography 
            variant="h4" 
            component="h2"
            sx={{ mb: 2 }}
          >
            Page Not Found
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            The page you are looking for does not exist or has been moved.
          </Typography>
          
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            color="primary"
            size="large"
          >
            Go to Dashboard
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;