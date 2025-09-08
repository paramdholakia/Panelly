let IS_PROD = true; // Set to true in production environment
const server = IS_PROD ? 'https://panelly-4mo5.onrender.com' : 'http://localhost:3000';

// Environment endpoint resolution.
// Usage: import { API_BASE, SOCKET_BASE } from '../environment';
// Legacy default export maintained for backward compatibility.

const SERVERS = Object.freeze({
	dev: 'http://localhost:3000',
	prod: 'https://panelly-4mo5.onrender.com'
});

// Detect production heuristically (either NODE_ENV=production or host matches prod domain)
const inferredProd = (typeof window !== 'undefined' && window.location && window.location.hostname.includes('onrender.com')) ||
	(typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');

// Optional explicit override via global (window.__FORCE_ENV__ = 'prod' | 'dev')
const forced = typeof window !== 'undefined' && window.__FORCE_ENV__;
const mode = forced === 'prod' ? 'prod' : forced === 'dev' ? 'dev' : (inferredProd ? 'prod' : 'dev');

export const API_BASE = mode === 'prod' ? SERVERS.prod : SERVERS.dev;
// For now socket server = API server; adjust if you split infrastructure.
export const SOCKET_BASE = API_BASE;

// Default export for existing code (named imports preferred going forward)
export default API_BASE;