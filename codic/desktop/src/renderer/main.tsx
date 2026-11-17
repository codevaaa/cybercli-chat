import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
if (new URLSearchParams(window.location.search).get('companion') === '1') {
  document.documentElement.classList.add('codic-companion-window')
  void import('./PetWindow').then(({ default: PetWindow }) => {
    root.render(<React.StrictMode><PetWindow /></React.StrictMode>)
  })
} else {
  void import('./App').then(({ default: App }) => {
    root.render(<React.StrictMode><App /></React.StrictMode>)
  })
}
