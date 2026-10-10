import { useState } from "react";
import "./App.css";
import ScreenshotViewer from "./screenshotViewer";

function App() {
  const [images, setImages] = useState([]);

  function handleSubmit() {
    // later: call your backend, then
    setImages([
      { id: 1, url: "/desktop.jpg", label: "Desktop", alt: "Desktop screenshot" },
      { id: 2, url: "/mobile.jpg", label: "Mobile", alt: "Mobile screenshot" },
    ]);
  }

  return (
    <div className="app">
      <div className="main-container">
        <div className="top-bar">
          <div className="catch-phrase">
            <h1>Audit That Website.</h1>
          </div>
          <div className="url-container">
            <h2>Paste Your URL Here</h2>
            <p>
              Copy and paste any website into the text-box below to see if it is
              accessible.
            </p>
            <label htmlFor="url"></label>
            <input
              id="url"
              type="url"
              placeholder="Enter Website URL here, ex: https://www.google.com"
            />
            <button id="button1" type="button" onClick={handleSubmit}>
              Submit URL
            </button>
          </div>
        </div>

        <div className="output-section">
          <h1>Your Output Here.</h1>
          <ScreenshotViewer images={images} />
          <div className="problems-text">
            <h2>List of Problems</h2>
            <label htmlFor="problem-output"></label>
            <textarea readOnly id="problem-output" defaultValue="Text here" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;