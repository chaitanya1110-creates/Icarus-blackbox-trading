(window as unknown as { __ICARUS_LOADED__: boolean }).__ICARUS_LOADED__ = true;

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
