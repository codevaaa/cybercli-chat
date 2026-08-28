import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Use HashRouter when running under file:// (packaged Electron app),
// BrowserRouter for web/dev. This prevents blank screen in the desktop build.
const isFileProtocol = window.location.protocol === 'file:'
const Router = isFileProtocol ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
)
