/**
 * User Profile page component for OSFiler.
 * 
 * This component displays the current user's profile information and
 * provides functionality to update user settings.
 */

import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import apiService from '../services/api';

// Material UI imports
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
  Collapse,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';

// Material UI icons
import LockIcon from '@mui/icons-material/Lock';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';

// Validation schema for password change
const PasswordChangeSchema = Yup.object().shape({
  oldPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your new password'),
});

// Password change form values
interface PasswordChangeFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const initialPasswordValues: PasswordChangeFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/**
 * User Profile page component.
 * 
 * @returns The user profile page component.
 */
const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handlePasswordChange = async (values: PasswordChangeFormValues, { resetForm }: any) => {
    try {
      await apiService.changePassword(values.oldPassword, values.newPassword);
      notify('Password updated successfully', 'success');
      resetForm();
      setShowPasswordForm(false);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to update password', 'error');
      console.error('Error updating password:', err);
    }
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading user data...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        fontWeight="600" 
        sx={{ 
          mb: 3, 
          display: 'flex', 
          alignItems: 'center' 
        }}
      >
        <AccountCircleIcon sx={{ mr: 1, fontSize: 30 }} />
        My Profile
      </Typography>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardHeader 
            title="Account Information" 
            titleTypographyProps={{ variant: 'h5' }}
            avatar={<AccountCircleIcon color="primary" />}
            sx={{ pb: 1 }}
          />
          <Divider />
          <CardContent>
            <List disablePadding>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Username" 
                  secondary={user.username} 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Full Name" 
                  secondary={user.full_name || 'Not provided'} 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Email" 
                  secondary={user.email || 'Not provided'} 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarTodayIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Account Created" 
                  secondary={formatDate(user.created_at)} 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarTodayIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Last Login" 
                  secondary={formatDate(user.last_login)} 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Admin" 
                  secondary={user.is_admin ? 'Yes' : 'No'} 
                  primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
        
        <Card variant="outlined">
          <CardHeader 
            title="Security" 
            titleTypographyProps={{ variant: 'h5' }}
            avatar={<SecurityIcon color="primary" />}
            sx={{ pb: 1 }}
          />
          <Divider />
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                color={showPasswordForm ? "secondary" : "primary"}
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                startIcon={<LockIcon />}
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </Button>
            </Box>
            
            <Collapse in={showPasswordForm}>
              <Paper 
                elevation={0} 
                variant="outlined" 
                sx={{ p: 3, mt: 2, borderRadius: 1 }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Change Password
                </Typography>
                
                <Formik
                  initialValues={initialPasswordValues}
                  validationSchema={PasswordChangeSchema}
                  onSubmit={handlePasswordChange}
                >
                  {({ isSubmitting, errors, touched, handleChange, handleBlur }) => (
                    <Form>
                      <TextField
                        fullWidth
                        margin="normal"
                        id="oldPassword"
                        name="oldPassword"
                        label="Current Password"
                        type="password"
                        variant="outlined"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.oldPassword && Boolean(errors.oldPassword)}
                        helperText={touched.oldPassword && errors.oldPassword}
                      />
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="newPassword"
                        name="newPassword"
                        label="New Password"
                        type="password"
                        variant="outlined"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.newPassword && Boolean(errors.newPassword)}
                        helperText={touched.newPassword && errors.newPassword}
                      />
                      
                      <TextField
                        fullWidth
                        margin="normal"
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        variant="outlined"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                        helperText={touched.confirmPassword && errors.confirmPassword}
                      />
                      
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          type="button"
                          onClick={() => setShowPasswordForm(false)}
                          sx={{ mr: 2 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Updating...' : 'Update Password'}
                        </Button>
                      </Box>
                    </Form>
                  )}
                </Formik>
              </Paper>
            </Collapse>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
};

export default UserProfile; 