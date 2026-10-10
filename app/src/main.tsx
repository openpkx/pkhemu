import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { playSplash } from "./splash";
import { resolveTheme } from "./theme/theme";
import "./index.css";

playSplash();
document.documentElement.dataset.theme = resolveTheme("system", matchMedia("(prefers-color-scheme: dark)").matches);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
