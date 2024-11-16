import React from 'react'
import ReactDOM from 'react-dom/client'
import DrawingBoard from './App.tsx'
import './index.css'
import ContextProvider from './store/index.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ContextProvider>
      <DrawingBoard />
    </ContextProvider>
  </React.StrictMode>,
)
