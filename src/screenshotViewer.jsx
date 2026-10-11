import { useState } from "react";

function ScreenshotViewer({ images = [] }) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="image-area">
        <p>Your scan screenshots will appear here.</p>
      </div>
    );
  }

  const current = images[selected];

  return (
    <div>
      <div className="image-tabs" role="group" aria-label="Screenshot view">
        {images.map((img, i) => (
          <button 
            key={img.id} 
            className = {`image-tab${i === selected ? " selected" : ""}`}
            aria-pressed={i === selected} 
            onClick={() => setSelected(i)}
          >
            {img.label}
          </button>
        ))}
      </div>
      <div className="image-area">
        <img src={current.url} alt={current.alt} />
      </div>
    </div>
  );
}

export default ScreenshotViewer;