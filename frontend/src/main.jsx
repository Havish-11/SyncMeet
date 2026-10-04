import { AuthProvider } from "./auth/AuthContext.jsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {MediaProvider} from './context/MediaContext.jsx';
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <MediaProvider>
        <App />
      </MediaProvider>
    </AuthProvider>
  </BrowserRouter>,
);
