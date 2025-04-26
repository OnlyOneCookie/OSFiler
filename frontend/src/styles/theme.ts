/**
 * Theme
 */

import { createTheme, alpha } from '@mui/material/styles';

const colors = {
  // Primary
  primary: {
    main: '#4c6ef5',
    light: '#748ffc',
    dark: '#364fc7',
    contrastText: '#ffffff',
  },
  // Secondary
  secondary: {
    main: '#748ffc',
    light: '#91a7ff',
    dark: '#5c7cfa',
    contrastText: '#ffffff',
  },
  // Error
  error: {
    main: '#fa5252',
    light: '#ff6b6b',
    dark: '#e03131',
    contrastText: '#ffffff',
  },
  // Warning
  warning: {
    main: '#fd7e14',
    light: '#ff922b',
    dark: '#e8590c',
    contrastText: '#ffffff',
  },
  // Info
  info: {
    main: '#15aabf',
    light: '#22b8cf',
    dark: '#1098ad',
    contrastText: '#ffffff',
  },
  // Success
  success: {
    main: '#40c057',
    light: '#51cf66',
    dark: '#2f9e44',
    contrastText: '#ffffff',
  },
  // Text
  text: {
    primary: '#333333',
    secondary: '#495057',
    disabled: '#868e96',
  },
  // Background
  background: {
    default: '#f5f7fa',
    paper: '#ffffff',
  },
  // Divider
  divider: '#e9ecef',
};

// Breakpoints
const breakpoints = {
  values: {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    success: colors.success,
    text: colors.text,
    background: colors.background,
    divider: colors.divider,
  },
  breakpoints: breakpoints,
  typography: {
    fontFamily: `
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif
    `,
    fontSize: 16,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      marginBottom: '16px',
      color: colors.text.primary,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      marginBottom: '16px',
      color: colors.text.primary,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      marginBottom: '16px',
      color: colors.text.primary,
    },
    h4: {
      fontSize: '1.3rem',
      fontWeight: 600,
      lineHeight: 1.3,
      marginBottom: '16px',
      color: colors.text.primary,
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 600,
      lineHeight: 1.3,
      marginBottom: '16px',
      color: colors.text.primary,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.3,
      marginBottom: '16px',
      color: colors.text.primary,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            backgroundColor: colors.primary.dark,
          },
        },
        outlined: {
          borderColor: colors.primary.main,
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.04),
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.04),
          },
        },
        containedSecondary: {
          backgroundColor: colors.secondary.main,
          '&:hover': {
            backgroundColor: colors.secondary.dark,
          },
        },
        containedError: {
          backgroundColor: colors.error.main,
          '&:hover': {
            backgroundColor: colors.error.dark,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: colors.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary.main,
              boxShadow: `0 0 0 2px ${alpha(colors.primary.main, 0.2)}`,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          borderRadius: '8px',
          border: `1px solid ${colors.divider}`,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          '&:last-child': {
            paddingBottom: '16px',
          },
        },
      },
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: colors.primary.main,
          color: colors.primary.contrastText,
        },
        colorSecondary: {
          backgroundColor: colors.secondary.main,
          color: colors.secondary.contrastText,
        },
        colorInfo: {
          backgroundColor: colors.info.main,
          color: colors.info.contrastText,
        },
        colorSuccess: {
          backgroundColor: colors.success.main,
          color: colors.success.contrastText,
        },
        colorWarning: {
          backgroundColor: colors.warning.main,
          color: colors.warning.contrastText,
        },
        colorError: {
          backgroundColor: colors.error.main,
          color: colors.error.contrastText,
        },
        outlined: {
          borderColor: colors.divider,
        },
        outlinedPrimary: {
          borderColor: colors.primary.main,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
        elevation1: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.divider}`,
        },
        head: {
          fontWeight: 600,
          backgroundColor: alpha(colors.primary.main, 0.04),
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(colors.primary.main, 0.04),
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
        standardSuccess: {
          backgroundColor: alpha(colors.success.main, 0.1),
          color: colors.success.dark,
        },
        standardError: {
          backgroundColor: alpha(colors.error.main, 0.1),
          color: colors.error.dark,
        },
        standardWarning: {
          backgroundColor: alpha(colors.warning.main, 0.1),
          color: colors.warning.dark,
        },
        standardInfo: {
          backgroundColor: alpha(colors.info.main, 0.1),
          color: colors.info.dark,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.primary.main,
          textDecoration: 'none',
          '&:hover': {
            color: colors.primary.dark,
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.divider,
        },
      },
    },
  },
});

export default theme; 