import React from 'react'
import ReactDOM from 'react-dom/client'
import DrawingBoard from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DrawingBoard />
  </React.StrictMode>,
)
