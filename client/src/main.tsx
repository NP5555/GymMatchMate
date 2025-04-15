import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "GymMatch - Find Your Perfect Gym";

createRoot(document.getElementById("root")!).render(<App />);
