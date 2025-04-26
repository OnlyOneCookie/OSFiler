/**
 * Main entry point for the OSFiler frontend.
 * 
 * This file initializes the React application and renders it to the DOM.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Get the root element
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render the App component to the DOM
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();