import { createRoot } from 'react-dom/client'
import Mockup01App from './Mockup01App'

// Standalone entrypoint: render when loaded directly (e.g. pre-vite-transform dev), no-op when App.tsx already mounted it.
const root = document.getElementById('root')!
if (!root.childElementCount) createRoot(root).render(<Mockup01App />)
