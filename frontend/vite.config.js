import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			// Always resolve the real vitallens package to our local shim.
			// The real package registers a WebRTC relay named 'relay' at module
			// load time and throws "relay already exists" when loaded more than
			// once (e.g. React Strict Mode). The shim avoids this entirely.
			'vitallens': path.resolve(__dirname, 'src/libs/vitallens-shim.js'),
		},
	},
	server: {
		port: 5173,
		proxy: {
			// Proxy /video-app/* to the video-chat-app dev server at localhost:3000
			// This keeps the iframe same-origin from the browser's perspective during development.
			'/video-app': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false,
				ws: true,
				rewrite: (path) => path.replace(/^\/video-app/, ''),
			},
			// Proxy socket.io websocket endpoint to the video app server
			'/socket.io': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false,
				ws: true,
			},
		},
	},
});

