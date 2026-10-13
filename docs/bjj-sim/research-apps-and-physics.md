# Research: grappling apps, physics-character games, and "weighty" bodies in the browser

_Compiled 2026-10-12. Where a claim comes from my own engineering knowledge and not a fetched source, it is marked **[eng]**. Rapier API facts were checked against the shipped `@dimforge/rapier3d-compat` 0.19.3 and 0.21.0 `.d.ts` files._

## 1. Grappling learning apps: the market gap

| App | Format | Notes / complaints |
|---|---|---|
| BJJ Fanatics | Filmed instructionals (streaming + download) | App Store rating 4.9 (about 4.5k ratings) against a Trustpilot score of 3/5. Complaints: missing purchases, crashes, login failures, downloads stalling at 99%. Older reviews say digital products were stream-only. |
| Grapplearts (BJJ Roadmap, Core Concepts, BJJ Master) | Video, principle-oriented | Strong on concepts and how positions connect. Users ask for offline use and structure. |
| Roy Dean No Gi Essentials, iGrapple, iBudokan, The Jiu Jitsu Class | Multi-angle video (iBudokan: 80+ techniques; iGrapple: 1,000+) | Reviewers like the production quality. They ask for written drill plans. |
| iBJJ | Video plus a key-frame "flip book" | The closest thing to step-through playback. |
| Jiujitsu Flow, GrappleCosmos | Technique maps and graphs that link to video/images | Navigation by position graph, but no 3D. |
| OPEN GUARD (Steam, early access June 2026), GrappleApp | Management sim / turn-based BJJ | Tick-based abstraction (41 positions, 34 submissions). No bodies are simulated. |

**Gap:** searches found **no shipping 3D or interactive grappling viewer**. Everything is filmed video, which has these limits:
- The camera angle is fixed.
- Nobody can see weight distribution or pressure.
- You can't scrub through the move joint by joint or swap which side you're on.
- You can't try "what if I post here?"

A simulated body that shows centre of mass, base and contact forces is unoccupied territory. Toribash's grappling mods (aikido and similar) are the nearest thing, and martial artists already recommend it.

## 2. Physics-character games and their control models

- **Toribash** (the most relevant model).
  - Each joint (about 20 per body) has 4 states:
    - *relax*: limp, moves with the body;
    - *hold*: resists motion, acts like a stiff PD motor at the current angle;
    - *extend* and *contract*: drive the joint toward one end of its range. The shoulders, chest and lumbar use joint-specific variants such as raise/lower or rotate left/right.
  - Each hand can grip or release.
  - Play is turn-based. You set the joint states, press Space, and the simulation runs N frames (10 by default) inside a fixed match length.
  - Damaged joints are locked into relax.
  - **Lesson:** discrete per-joint *intent* plus a paused simulation makes precise body manipulation possible even with a mouse. It maps directly onto "set target angle + stiffness" PD motors. The weakness is a steep learning curve and many clicks per turn.
- **Human: Fall Flat.**
  - One input per hand: left and right mouse button (or the triggers) grab with that hand. Arm height follows the camera's pitch.
  - Climbing works by holding both hands and pulling the mouse down.
  - The developers kept two separate hand inputs so players choose which hand grabs. They also wrote up a touch-control redesign for mobile.
  - **Lesson:** keep the number of inputs small and map them to *end-effectors*, not joints.
- **Gang Beasts.** Raise-arm and grab buttons on a wobbly active ragdoll. Grabs act like temporary joints between bodies, which is close to how BJJ grips would work. **[eng]**
- **Exanima.**
  - Combat is fully physics-based, and motion is described as "synthesised" from about 200 simulated muscles.
  - The mouse sets both facing and swing direction.
  - Players find the controls awkward and the outcomes partly random.
- **euphoria (NaturalMotion; GTA IV, Red Dead Redemption).** "Dynamic Motion Synthesis": AI behaviours such as balance, bracing and grabbing drive a motorised ragdoll in real time, so no clips are authored.
- **Just Cause 2.** Uses impulses or joint motors to pull the ragdoll toward an animation pose. It blends back to keyframed animation once the pose is close to a get-up pose.
- **Footsies, Stick Fight, Wrestling Empire.** Searches found no technical sources. Wrestling Empire is canned animation, not a ragdoll sim. **[eng]**

**Control recommendation:**
- Use a hybrid of three modes:
  - **(a) Toribash-style pause-and-pose.** Tap a joint, then choose relax / hold / flex / extend, or drag a limb end with IK to set targets.
  - **(b) Real-time end-effector controls** in the style of Human: Fall Flat: grab with the left or right hand, and drag hips or hands.
  - **(c) "Technique" macros** that load a whole target pose sequence.
- On touch screens, act on bodies directly (tap a body part to select it, drag to set its target). Avoid virtual sticks.

## 3. Making bodies feel heavy

### Active ragdoll (PD tracking)
For each joint, apply a torque:

`τ = kp·(θ_target − θ) − kd·ω`

This works like a spring toward the target pose, so collisions and outside forces still act on the body. Hold = high `kp` with target equal to the current angle. Relax = `kp`≈0 with a small `kd`.

- **Scale gains by the inertia the joint moves [eng].** A good starting point is `kp ≈ m_child·L²·ω_n²` with `ω_n` ≈ 10–30 rad/s, and `kd ≈ 2·sqrt(kp·I)` for critical damping.
- **Cap the maximum torque** per joint, scaled from body mass. The cap is what makes a 90 kg opponent actually hard to move.
- **Root support [eng].** A pure PD ragdoll cannot stand, because no joint can push on the root. Either:
  - add a weak "hand of god" torque on the pelvis/torso that is active only while the support condition holds, or
  - accept that grappling happens on the ground, where this matters less.

### Segment masses (% of total body mass)

| Segment | Winter (2009, from Dempster) | de Leva 1996, male | de Leva 1996, female |
|---|---|---|---|
| Head + neck | 8.1 | 6.94 | 6.68 |
| Trunk (total) | 49.7 | 43.46 | 42.57 |
| Upper arm (each) | 2.8 | 2.71 | 2.55 |
| Forearm (each) | 1.6 | 1.62 | 1.38 |
| Hand (each) | 0.6 | 0.61 | 0.56 |
| Thigh (each) | 10.0 | 14.16 | 14.78 |
| Shank (each) | 4.65 | 4.33 | 4.81 |
| Foot (each) | 1.45 | 1.37 | 1.29 |

- de Leva's thigh/shank/foot figures match the published Zatsiorsky–de Leva tables (thigh 0.1416 M / 0.1478 F, shank 0.0433 / 0.0481, foot 0.0137 / 0.0129). Both columns sum to about 100%.
- de Leva's male trunk splits into upper (UPT) 15.96%, middle (MPT) 16.33% and lower/pelvis (LPT) 11.17% **[eng: from the de Leva table, check against the paper]**. Use three trunk bodies (chest, abdomen, pelvis) so the spine can bend for bridging and shrimping.
- **Segment centre-of-mass positions [eng, Winter]:** about 43–44% of segment length from the proximal joint for the thigh, about 43% for the upper arm, about 43% for the forearm. Set these explicitly with `setMassProperties`. Don't rely on density, because capsule shapes put the centre of mass at the geometric middle.

### Centre of mass and support polygon [eng]
- Whole-body COM = Σ mᵢ·xᵢ / M.
- Support polygon = 2D convex hull of the ground contact points from the contact manifolds, including knees, hands and back.
- Base or stability margin = distance from the projected COM to the edge of that hull.
- These give honest BJJ feedback: base, posture, and "you're being swept because your COM is outside your base". Also show each body's weight on the opponent: the sum of contact normal impulses ÷ dt ÷ g.

### Friction and contact [eng]
- Use friction ≈ 0.8–1.0 for skin or gi on mat, combined with Max, and lower values for body-on-body.
- Grips are temporary spherical joints between a hand and the gripped segment, given a breakable force threshold.
- Turn off collision between connected segments: joint `setContactsEnabled(false)`, or use collision groups.

## 4. Browser engines

| | Rapier (`@dimforge/rapier3d-compat`, current 0.21.0) | cannon-es | ammo.js (Bullet) | MuJoCo WASM (`@mujoco/mujoco`, official) |
|---|---|---|---|---|
| Runtime | Rust→WASM; SIMD build available | Pure JS | Emscripten WASM | WASM; single-threaded build, or multithreaded build needing COOP/COEP |
| Joint motors | Revolute/prismatic: `configureMotorPosition(target, k, d)`, `configureMotor`, `configureMotorModel`. **Spherical: per-axis motors only since 0.21** (`configureMotorPosition(JointAxis.AngX…, …)`, `setMotorMaxForce`). Not present in 0.19.3. | Hinge: velocity motor only. No cone-twist motor, so PD must be done by hand. | 6DoF spring-2 and cone-twist motors | Position actuators and PD natively. Generalised coordinates suit articulated humanoids best. |
| Joint limits | `setLimits` on unit (revolute/prismatic) joints. No cone limit on spherical in the JS API | Cone-twist limits | Full | Full |
| Articulations | Impulse joints, plus `createMultibodyJoint` (reduced-coordinate, no drift) | No | btMultiBody | Native |
| Notes | Good docs and npm presence, deterministic build, active development | Easy, but slow and drifty with 30+ joints | Large binary, clunky API | Best fidelity. API marked WIP, tooling is robotics-oriented, mobile performance unproven. |

- No credible head-to-head mobile benchmark exists. Comparison sites call Rapier "significantly faster" than cannon-es but publish no numbers.
- Havok's web build needs WASM SIMD, which means iOS ≥ 16.4. That is a reminder to use `-compat` or non-SIMD fallbacks.
- One three.js report: enabling COOP/COEP threading cut MuJoCo WASM work from ~2.7 s to ~0.4 s per forward pass, but that was for neural-net inference, not physics.

**Recommendation:** use **Rapier ≥ 0.21 (compat build) in a Web Worker**.
- Pin the version, because spherical-joint motors are new.
- Hips and shoulders: spherical joints with per-axis motors. Enforce cone and twist limits yourself by clamping motor targets and adding a stiff restoring torque when a limit is exceeded.
- Knees, elbows and ankles: revolute joints with `setLimits`.
- Alternative for shoulders: model swing as two revolute joints with a light intermediate body, but this hurts mass ratios (see §5).
- Keep MuJoCo WASM as plan B if joint quality becomes the blocker.

## 5. Practical gotchas

1. **Mass ratios.** Keep connected bodies within about 1:10, and ideally under 1:4. A hand (0.6%) attached to a trunk (43%) is about 1:70 overall, but each *joint* only sees forearm:hand at about 1:2.7, which is fine. The problems are tiny helper bodies, and a light limb pinned under a heavy torso. The Unity community reports instability at ratios as mild as 1:1.5 under PhysX. Bump hand and foot masses up slightly if they jitter. **[eng]**
2. **Two stacked ragdolls**, such as mount or side control, are the worst case: long contact chains plus jointed chains.
   - Use fixed `timestep` 1/60, stepping 2–4 times per frame (120–240 Hz effective). Prefer this to raising iterations.
   - Set `numSolverIterations` to 4–8. Raise `numInternalPgsIterations` cheaply.
   - Use a contact skin (`setContactSkin`) of a few mm to stop rest jitter.
   - Use a fixed-step accumulator and never a variable dt (Rapier docs: the timestep should not vary much).
3. **Use capsules and boxes only** for colliders. Mesh colliders between two bodies are slow and jittery.
4. **Joint limits:**
   - Avoid very small angle ranges and limits that start out violated. Unity's guide warns against small angular limits.
   - Start the ragdoll in a pose inside every limit.
   - Use a hard stop of about ±5° past the anatomical range, and soft-limit with the PD motor.
5. **PD gains vs timestep.** An explicit stiff spring explodes when `kp·dt²/I` gets large. Rapier's motors are implicit, so they are safer than your own `applyTorqueImpulse`, but they still need `setMotorMaxForce` caps.
6. **Sleeping.** Disable sleep on characters, because a frozen pin feels wrong.
7. **CCD.** Usually unnecessary at grappling speeds. Leave `maxCcdSubsteps` at 1.
8. **Self-collision.** Filter adjacent segments, but keep forearm-vs-thigh and similar non-adjacent contacts (needed for frames and knee shields).
9. **Determinism.** Use `@dimforge/rapier3d-deterministic` if you want replays or sharing of technique recordings across devices.
10. **Mobile budget [eng].** 2 × about 15 bodies, about 28 joints and about 100 contacts at 120–240 Hz is well within Rapier on mid-range phones in a worker. Profile on a low-end Android device early.

## Sources
- Toribash joints: https://toribash.fandom.com/wiki/Shoulder ; https://www.giantbomb.com/games/3030-19933/ ; https://en.wikipedia.org/wiki/Toribash ; https://martialtalk.com/threads/free-game-i-recommend-for-everyone-here.122494
- Human: Fall Flat controls: https://www.pcgamer.com/au/15-ways-to-solve-human-fall-flats-ridiculous-physics-puzzles ; https://gamedeveloper.com/design/designing-touch-controls-for-human-fall-flat
- Exanima: https://cdn.akamai.steamstatic.com/steam/apps/362490/manuals/Exanima_Quickstart_Guide.pdf ; https://steamcommunity.com/app/362490/discussions/0/620712364036942129
- euphoria: https://en.wikipedia.org/wiki/NaturalMotion ; https://gta4.net/news/3828/euphoria-engines-possibilities-for-gta-iv
- PD and active ragdoll: https://www.cs.ucdavis.edu/~neff/papers/MIG10_DynamicPoseControl.pdf ; https://2018.cedec.cesa.or.jp:443/2010/archive/files/C10_I0052/C10_I0052.pdf (Just Cause 2) ; https://github.com/sergioabreu-g/active-ragdolls ; https://boruiliao.medium.com/what-is-physics-based-character-animation-in-games-using-unreal-engine-approach-as-an-example-571560376e4c
- BJJ apps: https://justuseapp.com/en/app/1530956257/bjj-fanatics/reviews ; https://au.trustpilot.com/review/bjjfanatics.com?page=4 ; https://apps.appfollow.io/ios/bjj-fanatics/1530956257?country=us ; https://www.grapplearts.com/core-concepts-bjj/ ; https://apps.apple.com/us/app/id934758158 ; https://mwm.ai/de/apps/no-gi-essentials/379378287 ; https://apps.apple.com/us/app/id6471621283 ; https://steambase.io/games/open-guard/info
- Segment masses: https://pmc.ncbi.nlm.nih.gov/articles/PMC9602786/table/healthcare-10-02054-t005 ; https://exrx.net/Kinesiology/Segments.html ; de Leva P. (1996) J Biomech 29(9):1223–30 ; Winter D. (2009) *Biomechanics and Motor Control of Human Movement*, 4th ed., Table 4.1
- Engines: `@dimforge/rapier3d-compat` 0.19.3 and 0.21.0 type definitions (npm) ; https://sbcode.net/threejs/physics-rapier-impulsejoint-motors/ ; https://rapier.rs/docs/user_guides/rust/joints ; https://cdn.jsdelivr.net/npm/@mujoco/mujoco@3.9.0/README.md ; https://github.com/krishpop/mujoco_wasm ; https://discourse.threejs.org/t/a-real-robot-policy-neural-net-physics-running-100-in-the-browser-so-101-arm-three-js-r3f/92415 ; https://learnwithhasan.com/js-libraries/compare/rapier-vs-cannon-js/ ; https://www.abratabia.com/game-physics/best-web-physics-engine.php
- Stability: https://docs.unity3d.com/ru/Manual/RagdollStability.html ; https://discussions.unity.com/t/fixed-sort-of-ragdoll-stability/560514
