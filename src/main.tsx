import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerAFrameComponents } from './components/aframe-components.ts';

// Register custom A-Frame components immediately before mounting DOM
registerAFrameComponents();

createRoot(document.getElementById('root')!).render(<App />);
