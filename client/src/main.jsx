/** App entry: mounts React with the router, the auth session provider and the toast container around <App />. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: "0.875rem" } }} />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
