import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App.tsx'
import './index.css'
// import { Init } from './components/Init.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      {/* <Init /> */}
      <App />
    </Suspense>
  </React.StrictMode>,
)

