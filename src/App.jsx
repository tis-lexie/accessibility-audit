import { useState } from 'react'
import './App.css'

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  async function handleClick() {
    if (!input.trim()) return; // catches empty strings

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/scanner?url=${encodeURIComponent(input.trim())}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "The scan could not be started.");
      }

      setResult(data);
      console.log(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="root">
     <div className="main-container">
      <div className="top-bar">
        <div className="catch-phrase">
          <h1>Audit That Website.</h1>
        </div>
        <div className="url-container">
          <h2>Paste Your URL Here</h2>
          <p>Copy and paste any website into the text-box below to see if it is accessible.</p>
          <input
            id="url"
            type="url"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter Website URL here, ex: https://www.google.com"
          />
          <button onClick={handleClick} id="button1" type="button" disabled={loading}>
            {loading ? "Scanning..." : "Submit URL"}
          </button>
        </div>

      </div>
     </div>
    </div>
  )
}

export default App
