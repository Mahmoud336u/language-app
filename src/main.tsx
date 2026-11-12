import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Foundation } from './app/Foundation';
import './styles/tokens.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');
createRoot(root).render(<StrictMode><Foundation /></StrictMode>);
