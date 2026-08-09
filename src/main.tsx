import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/questionBankUpdate.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
