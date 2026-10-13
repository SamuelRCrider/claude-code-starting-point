# Mat Lab

Learn Brazilian jiu-jitsu by moving two physics-simulated athletes. Drag a knee
higher in mount, win an underhook, trap an arm and a foot and bridge, and feel
why positions work.

- **8 positions:** mount, closed guard, side control, half guard, knee on belly, back control, turtle, north-south
- **24 techniques:** escapes, sweeps, submissions, passes, transitions and control drills, each taught step by step
- **Live checks:** geometric tests such as "knees pinched", "hips heavy" or "elbows tight" that light up as you fix the position
- Runs in any modern mobile or desktop browser

```bash
npm install
npm run dev          # http://localhost:5173  (add --host to open it on your phone)
npm run build        # static site in dist/
npm run build:single # one self-contained dist-single/index.html (~5 MB)
npm test             # physics + content regression tests
```

## How to use it

| Gesture | Does |
|---|---|
| Drag a body part | Moves it, through that athlete's muscles plus your (capped) pull |
| Drag empty space | Orbits the camera |
| Pinch / scroll | Zooms |
| Double-tap | Reframes the action |

In a lesson, each step shows an amber ring (the part to move) and a green target.
Drag the part onto the target, or tap the step's button to have it done for you.
**Watch** plays the whole technique. **Free play** on a position lets you move anything
and watch the live checks react. Opponent reactions play automatically.

## How the physics works

- **Bodies:** each athlete is 15 rigid bodies in [Rapier](https://rapier.rs). Segment masses come from de Leva (1996) percentages of an 80 kg athlete.
- **Muscles:** joint motors with capped torque. Nobody is animated directly, so heavy things are heavy.
  - Hinges (elbows, knees, ankles) and the spine use Rapier's implicit motors.
  - Shoulders and hips can opt into a stable-PD controller for large reaches such as seatbelts and guard wraps.
- **Intent goals** (`src/game/goals.ts`):
  - Positions and techniques are written as intent, such as "left knee on the mat beside his armpit" or "hands on his far wrist".
  - Analytic two-bone IK turns intent into joint targets, measured against where the bodies actually are.
- **Solve, then move:** each step is solved first in a hidden pass. Both athletes snap to the intent, the upper one lowers onto the other, and contacts settle. The muscles then track a smooth path there.
  - Big whole-body moves (rolls, sweeps) glide to the solved pose and hand back to physics.
  - Small moves are tracked with physics on the whole way.
  - At rest, athletes hold the solved pose with their own muscles under gravity and contact.
- **Your drags** are always fully physical: a capped pulling force (about 420 N, one strong arm) plus that limb's muscles.

### Honest limits

- **Assisted balance:** a soft "coach's hand" on the hips (the root guide) keeps athletes from toppling like sacks. Real people balance actively; this stands in for that.
- **Ghost segments:** where capsule-shaped limbs would jam in tight entanglements (hooks, guard wraps, underhooks threading under a body), those segments pass through the partner. Weight-bearing contact stays solid: chest to chest, knees on the mat, hips on hips.
- **Shapes, not choreography:** technique shapes are tuned to read correctly, not motion-captured. They are a teaching aid, not a replacement for a coach.

## Layout

```
src/physics/   skeleton (masses, joints, landmarks), ragdoll (muscles), ik, sim (solve/track/glide)
src/game/      goals (intent DSL), controller (goal → joint targets), director (lessons), interaction (touch)
src/content/   poses, shapes (reusable whole-body positions), positions (+ checks), techniques/
src/render/    three.js scene and teaching overlay
src/ui/        app shell, styles
tests/         settle tests for every position, energy tests for every technique, check calibration
tools/         Playwright capture scripts (contact sheets, end-to-end phone flow)
```

Research behind the design is in `../docs/bjj-sim/`: the curriculum, physics and app landscape, and mobile UX.
