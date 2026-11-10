# Day 11 — 3D foundation

Added a client-only 3D demonstration view using Three.js + React Three Fiber v9 (for React 19) and Drei. The **3D demo** tab shows an orbitable test scene. It is deliberately fictional and makes no claim to reproduce real Toronto PATH corridors. The original Street view and PATH layer remain available.

## First-time installation (run only after applying Day 11 patch)

```sh
cd frontend
npm install
npm run lint
npm run build
```

Commit `frontend/package-lock.json` together with the Day 11 patch so future installs reproduce compatible dependency versions. Do not commit `node_modules` or `.env.local`. Dependency downloads may require access to the npm registry.

## Manual test
Switch between Street view, PATH layer, and 3D demo. Try orbiting the camera with a mouse and zooming. If WebGL is disabled, the 3D view may not render; 2D alternatives must remain usable.
