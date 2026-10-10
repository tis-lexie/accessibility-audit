import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

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
          <input id="url" type="url" placeholder="Enter Website URL here, ex: https://www.google.com"/>
        </div>

      </div>
     </div>
    </div>
  )
}

export default App
