import React from "react";
import ReactDOM from "react-dom/client";
import JobMatchApp from "./JobMatchApp.jsx"; // <-- Updated import

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <JobMatchApp />
  </React.StrictMode>,
);
