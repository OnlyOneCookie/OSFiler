/**
 * Login page
 * 
 * User authentication form with validation
 */

import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { 
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Link
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

// Login form validation schema
const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required')
});

/**
 * Login page component.
 * 
 * @returns The Login page component.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, error, clearError } = useAuth();
  const { notify } = useNotification();
  // eslint-disable-next-line
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Initial form values
  const initialValues = {
    username: '',
    password: ''
  };
  
  // If the user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  // If there's an auth error, show it in a flag
  useEffect(() => {
    if (error) {
      notify(error, 'error');
      clearError();
    }
  }, [error, notify, clearError]);

  // Handle form submission
  const handleSubmit = async (values: { username: string; password: string }) => {
    setIsSubmitting(true);
    
    try {
      await login(values);
      notify(`Login successful. Welcome ${values.username}!`, 'success');
      navigate('/');
    } catch (err) {
      // Error is handled by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4, 
            width: '100%',
            borderRadius: 2
          }}
        >
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'primary.main',
                color: 'white',
                width: 40,
                height: 40,
                borderRadius: '50%',
                mb: 1
              }}
            >
              <LoginIcon />
            </Box>
            <Typography component="h1" variant="h4" sx={{ mb: 1 }}>
              OSFiler
            </Typography>
            <Typography component="h2" variant="h5">
              Login
            </Typography>
          </Box>

          <Formik
            initialValues={initialValues}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched, handleChange, handleBlur }) => (
              <Form>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    id="username"
                    name="username"
                    label="Username"
                    placeholder="Enter your username"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.username && Boolean(errors.username)}
                    helperText={touched.username && errors.username}
                    margin="normal"
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    margin="normal"
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  sx={{ 
                    py: 1.5, 
                    mt: 2, 
                    mb: 3, 
                    fontSize: '1rem' 
                  }}
                >
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
              </Form>
            )}
          </Formik>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" underline="hover">
                Register
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;