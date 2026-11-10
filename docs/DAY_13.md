# Day 13 — First-person corridor demo, camera look, and collision bounds

Open **3D demo** to enter the fictional corridor. The new walk controller uses a camera-height of 1.65 arbitrary units, with bounded movement preventing passage through the demo side/end walls. This is an exploratory prototype — **not** a digital twin, map-matched route, accessible navigation system or realistic tenant placement.

## Controls
- W/A/S/D or arrow keys: forward/back and strafe
- Q/E: rotate left/right
- Drag over the 3D canvas: look left/right and up/down
- On-screen arrow and rotation buttons: usable by mouse, touch, or keyboard
- Reset: return to initial viewing position

## Test
1. Select 3D demo. Walk forward (W) and then sideways (A/D).
2. Hold W toward the end wall; you should stop at it instead of clipping through.
3. Strafe into a side wall; you should stop at its boundary.
4. Drag to look and use Q/E to rotate; then Reset.
5. On narrow/mobile screens, try the on-screen controls.
6. Switch back to PATH layer and Street view; both 2D alternatives must still work.

No animation or assets are copied from the real Toronto PATH. The scene is entirely code-generated and has no real-world scale.
