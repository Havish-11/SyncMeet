import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { MediaProvider } from './context/MediaContext.jsx';
import './index.css';

// No <StrictMode> on purpose: its dev double-mount would open/close sockets and peer connections twice.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <MediaProvider>
        <App />
      </MediaProvider>
    </AuthProvider>
  </BrowserRouter>
);