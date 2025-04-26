/**
 * Registration page
 * 
 * User account creation form with validation
 */

import React, { useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

// Material UI imports
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  Paper,
  Container,
  Divider
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// Form validation
const RegisterSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .required('Username is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  email: Yup.string()
    .email('Invalid email format')
    .optional(),
  fullName: Yup.string()
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
});

interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
}

const initialValues: RegisterFormValues = {
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  fullName: '',
};

/**
 * Register page component.
 * 
 * @returns The Register page component.
 */
const Register: React.FC = () => {
  const { register, isAuthenticated, error, clearError, isLoading } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Show error notification when auth error occurs
  useEffect(() => {
    if (error) {
      notify(error, 'error');
      clearError();
    }
  }, [error, notify, clearError]);

  const handleSubmit = async (values: RegisterFormValues) => {
    clearError();
    
    try {
      await register({
        username: values.username,
        password: values.password,
        email: values.email || undefined,
        full_name: values.fullName || undefined,
      });
      
      // Show success notification if registration was successful
      notify('Account created successfully! You can now log in.', 'success');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
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
              <PersonAddIcon />
            </Box>
            <Typography component="h1" variant="h4" sx={{ mb: 1 }}>
              OSFiler
            </Typography>
            <Typography component="h2" variant="h5">
              Create Account
            </Typography>
          </Box>

          <Formik
            initialValues={initialValues}
            validationSchema={RegisterSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched, handleChange, handleBlur }) => (
              <Form>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    id="username"
                    name="username"
                    label="Username*"
                    placeholder="Choose a username"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.username && Boolean(errors.username)}
                    helperText={touched.username && errors.username}
                    margin="normal"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Password*"
                    type="password"
                    placeholder="Create a password"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    margin="normal"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm Password*"
                    type="password"
                    placeholder="Confirm your password"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                    helperText={touched.confirmPassword && errors.confirmPassword}
                    margin="normal"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Optional Information
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    margin="normal"
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    id="fullName"
                    name="fullName"
                    label="Full Name"
                    placeholder="Enter your full name"
                    variant="outlined"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.fullName && Boolean(errors.fullName)}
                    helperText={touched.fullName && errors.fullName}
                    margin="normal"
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting || isLoading}
                  sx={{ 
                    py: 1.5, 
                    mt: 1,
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Form>
            )}
          </Formik>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                Login
              </Link>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              * Required fields
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;