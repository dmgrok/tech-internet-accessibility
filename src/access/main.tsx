import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "./access.css";
import AccessApp from "./AccessApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccessApp />
  </StrictMode>,
);
