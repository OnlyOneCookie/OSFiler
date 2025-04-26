import React, { createContext, useContext, ReactNode } from 'react';
import { SnackbarProvider, useSnackbar, VariantType } from 'notistack';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationContextType {
  notify: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
});

export const useNotification = () => useContext(NotificationContext);

const NotificationProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const notify = (message: string, type: NotificationType) => {
    enqueueSnackbar(message, { 
      variant: type as VariantType,
      anchorOrigin: { vertical: 'bottom', horizontal: 'left' }
    });
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SnackbarProvider 
      maxSnack={5} 
      preventDuplicate
      autoHideDuration={6000}
      dense
    >
      <NotificationProviderInner>
        {children}
      </NotificationProviderInner>
    </SnackbarProvider>
  );
}; 