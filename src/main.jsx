import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// The icon sprite sheet is bundled directly into the app's code (via
// Vite's `?raw` import) instead of being fetched from the network at
// startup with fetch('/icons.svg'). This removes a real risk once the app
// is wrapped for Android: fetching a local file like this can silently fail
// inside a native WebView (browsers commonly block network-style requests
// for local files for security reasons), which would have left every icon
// in the app missing with no error shown to the user. Bundling it instead
// means the icons are simply part of the app and can never fail to "load".
//
// IMPORTANT: this import assumes icons.svg has been moved into the same
// src/ folder as this file (next to App.jsx, DesignConfig.js, etc). If it
// currently lives in a separate "public" folder, move it here — files in
// "public" are meant to be requested over the network, not imported like
// this, so it needs to sit alongside the rest of the source code instead.
import iconsSvgContent from './icons.svg?raw';

// Inserts the icon sprite sheet into the page, hidden, exactly once, before
// the app renders. Every <SpriteIcon> in the app then references an icon
// from this sheet by ID (e.g. <use href="#icon-check" />).
function injectIconSprite() {
  const container = document.createElement('div');
  container.style.display = 'none';
  container.setAttribute('aria-hidden', 'true');
  container.innerHTML = iconsSvgContent;
  document.body.insertBefore(container, document.body.firstChild);
}
injectIconSprite();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
