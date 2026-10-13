# UX Research: Touch Posing of 3D Avatars and Teaching Physical Skills

Scope: a portrait-phone BJJ app where the user poses or moves two physics avatars (for example "drive the top player's knee higher in mount" or "get the underhook"). Researched October 2026. Where a source could not be verified (several posing apps publish no gesture docs), this is noted.

---

## 1. Touch interaction for 3D posing: what existing tools do

| Tool | Select | Manipulate | Camera | Notes |
|---|---|---|---|---|
| **Magic Poser** | Tap visible control-point shapes on the body | Tap and drag the control point; store copy says a "physics engine adjusts the model" | Drag on empty space orbits | No public gesture manual. The visible dots on joints are the main discoverability device [1][2]. |
| **FullBody Poser (iPad)** | Drag an effector on the body | Full-body IK: "every joint is resolved to fit the drag", instead of rotating one joint at a time | Not documented | Whole-body IK is the selling point [3]. |
| **Clip Studio 3D figures** | Tap a part with the Object tool | A local manipulator appears, and you drag to rotate. Double-tap opens a ring manipulator (knees and elbows show one ring only) | Separate camera tools | **Joint lock**: a locked joint becomes the pivot point. Joint-angle limits are on by default [4][5]. |
| **Procreate 3D** | Single tap flashes the mesh blue | (painting, not posing) | **1 finger rotates, 2 fingers move, pinch zooms, quick-pinch fits to screen** | When finger painting is on, the user must *hold a Modify button* to rotate. This is an explicit mode switch that resolves the gesture conflict [6]. |
| **Sketchfab** | n/a | n/a | 1-finger orbit, 2-finger pan, double-tap an object to zoom to it, double-tap the background to zoom out | Industry-standard viewer mapping [7]. |
| **Toribash** | Pick a joint | Each joint cycles through 4 discrete states: **relax / hold / contract / extend**. Turn-based | Free | Discrete intent states instead of continuous angles. The mobile UI is not documented online [8][9]. |
| **Desktop IK (Daz, Modo)** | Grab a hand or foot | IK chain follows. **Pin** a foot so it stays planted until the pose forces it to move | n/a | Pinning is the key companion to IK [10][11]. |

I could not find public documentation for Design Doll's or Easy Poser's touch schemes.

**What this means for gesture conflicts.** Every poser has to separate "move the camera" from "move the body". The patterns that work:
- **Hit-test arbitration**: a one-finger drag that *starts on a handle* manipulates the body, and one that starts anywhere else orbits (Magic Poser, Sketchfab). Two fingers always mean camera (pan or pinch) and never manipulate.
- **Explicit mode hold**: Procreate's "hold Modify to rotate" [6]. This is safer but slower.
- **Separate degrees of freedom.** A controlled study found that the DS3 technique, which separates translation from rotation, was faster than the integrated "Sticky Tools" approach for 3D touch manipulation [12]. For limbs, this means: drag moves the end effector (IK), and twisting is a separate, explicit control.

**Hit targets.** Apple HIG asks for at least 44x44 pt and Material for 48x48 dp [13]. NN/g, citing Parhi et al., recommends at least 1 cm x 1 cm [14]. Hoober measured touch accuracy at about 7 mm at screen center and about 12 mm at the corners, and recommends 11 to 12 mm for top and bottom targets [15][16]. A joint handle drawn as a 16 px dot must have a hit radius of 22 pt or more, and when two handles overlap (both players' hands in a clinch) the app has to disambiguate the touch.

**Selection and undo.** Procreate's "flash blue on tap" [6] and Clip Studio's "manipulator appears on tap" [4] both confirm the selection *before* the user drags. Undo is universal in creative tools. A physics sim also needs **"reset to the step's start pose"**, because physics drift makes a granular undo history confusing.

## 2. Intent-based controls vs raw joint control

Raw joint control (Clip Studio rings, Toribash per-joint states) is powerful but slow, and it assumes the user knows *what* the pose should be, which a BJJ learner does not. Lessons from the tools above:

- **Effector + IK + pins** is the minimum viable "raw" mode. Drag a knee or hand, let IK solve the chain, and auto-pin the parts that should stay planted (the bottom player's back on the mat, the top player's other knee) [3][10].
- **Intent verbs** work like Toribash's discrete states, but at the technique level instead of the joint level [8]. Contextual buttons such as "Underhook", "Frame", "Bridge" or "Knee up" each trigger a scripted IK target plus physics. Raw dragging then becomes the *refinement* tool, not the main input.
- **Snap targets**: when a dragged effector comes within a radius of a meaningful target (armpit for an underhook, hip line for a knee slide), it magnetically snaps, glows, and fires a light haptic tick. Joint-angle limits, which Clip Studio has on by default [5], prevent anatomically absurd poses.
- **Ghost target overlays** are well supported in motor-learning research. A semi-transparent "ghost legs" figure overlaid on the patient's avatar was used for fine adjustment in gait rehab [17]. A VR motor-learning review found that showing both the learner's own movement and a skilled model during execution may work best for novices [18]. AR "Ghostman" instruction matched face-to-face teaching in a small study [19].
- **Caveat (guidance hypothesis).** Constant concurrent feedback improves performance during practice but can *hurt retention*, because learners come to depend on it. Fading feedback (100% down to 0%) or giving it about 33% of the time produced better transfer [20]. **Fade the ghost** across repetitions, and finish each lesson with a "no-ghost" attempt.

## 3. Teaching and onboarding patterns

- **Bite-sized and do-first.** Duolingo starts with a real exercise before signup. Moving signup later produced roughly a 20% increase in daily active users (an executive's report, not a published study) [21]. Lessons last a few minutes, and right answers get immediate sound, animation and copy, while mistakes lead to a gentle later review [22].
- **Coach marks**: one at a time, shown when the user reaches the relevant feature, short, and focused on a single primary action (NN/g) [23]. Up-front tutorial decks are poor at teaching interactions that are spatial or done on the device itself [24].
- **Gestures are invisible.** Unless users already know a gesture exists, they will not try it. Always provide a visible, tappable alternative [25][26].
- **Teach without text.** Monument Valley gives only two instructions at the start. Each new mechanic arrives as one or two isolated elements at the start of a level, and the game relies on visual feedback (stars brighten, shapes complete) instead of prompts [27][28]. Toca Boca uses no text at all and designs "toys, not games", which leaves room for free exploration [29][30]. For BJJ: introduce **one new verb per lesson** in an isolated setup, and give a sandbox "free roll" mode with no right answer.
- **Progressive disclosure**: show the primary feature first and reveal secondary features over time [31].
- **Haptics** must have a clear cause-and-effect link to an action. Use the system patterns according to their documented meanings and don't overuse them, because overuse dilutes their significance [32][33].

## 4. Concrete recommendations (portrait phone)

**Layout (top to bottom)**
1. **Top strip (about 48 pt, low-reach zone):** lesson progress dots, an X to exit, and a small camera-reset button. Only infrequent actions go here, since only about a third of the screen is easy to reach and the top corners are hardest [34][35].
2. **3D viewport (about 55 to 60% of the height):** both avatars. Handles appear *only* on the joints relevant to the current step (2 to 4 at most), each with a 44 pt or larger hit area. Show a default 3/4 camera and let the app auto-frame the action.
3. **Bottom sheet (thumb zone, about 30% of the height when collapsed):**
   - The current step instruction in one line (for example "Lift top player's right knee to hip height").
   - A step checklist (3 to 5 items, with a check animation as each completes).
   - **2 or 3 contextual intent buttons** (for example "Underhook", "Frame"), each 48 pt or taller, labeled with an icon *and* text.
   - Secondary row: Undo, Reset step, Ghost toggle, Replay demo.
   - Expanding the sheet reveals technique notes and the raw-joint "advanced" toggle (progressive disclosure).

**Feedback.** Show a ghost limb at the target. Color the manipulated limb from neutral to amber to green as it nears the target, and pair the color with a shape or icon change and a short label, since color alone fails color-blind users. Play a light haptic on snap and a success haptic on step completion. Animate the checklist tick and advance automatically after about 600 ms. On failure, play a short replay and show a hint arrow, not an error dialog.

**Control budget.** At most about 7 interactive elements visible at once: 2 to 4 joint handles plus 2 to 3 intent buttons, with utilities in a secondary row. Everything else lives in the expanded sheet.

**Gestures.** Use 1 finger on a handle to move the body, 1 finger on empty space to orbit, pinch to zoom, double-tap to frame the action, and long-press a handle to pin or unpin it. Two-finger touches never manipulate the avatar. While a handle is being dragged, ignore second touches so an accidental orbit can't happen mid-drag.

**Accessibility.** Every gesture needs a button equivalent: intent buttons, plus an "Auto-perform step" fallback [26]. Support Dynamic Type in the sheet. Respect Reduce Motion by replacing camera fly-throughs with cuts. Make haptics optional. Give VoiceOver labels to each handle ("Top player, right knee, drag up"). Note that WCAG 2.2 AA requires targets of at least 24x24 px with spacing, and AAA requires 44x44 px [13].

---

## Sources
1. Know Your Meme, Magic Poser: https://knowyourmeme.com/memes/sites/magic-poser
2. Magic Poser App Store listing (via AppFollow): https://apps.appfollow.io/ios/magic-poser-art-pose-tool/1141755970?country=tr
3. FullBody Poser, App Store: https://apps.apple.com/lb/app/fullbody-poser/id6470903777
4. Clip Studio manual, Posing 3D drawing figures: https://help.clip-studio.com/en-us/manual_en/660_3d/Posing_3D_drawing_figures.htm
5. Clip Studio Tips, Adjusting poses: https://tips.clip-studio.com/en-us/articles/786
6. Procreate Handbook, 3D interface gestures: https://help.procreate.com/procreate/handbook/3d-painting/interface-gestures
7. Sketchfab Help, viewer navigation: https://help.sketchfab.com/en/articles/16152696
8. Giant Bomb, Toribash: https://giantbomb.com/wiki/Games/Toribash
9. Nintendo Life, Toribash review: https://www.nintendolife.com/reviews/2010/07/toribash
10. Daz forum, IK and pinning: https://www.daz3d.com/forums/discussion/comment/164420/
11. Foundry Modo, Pose tool: https://learn.foundry.com/modo/Content/help/pages/animation/tools/pose_tool.html
12. Martinet et al., Integrality and Separability of Multi-touch 3D Manipulation (DS3): https://hal.archives-ouvertes.fr/hal-00670530
13. Touch target summary (Apple 44pt, Material 48dp, WCAG 2.5.5 and 2.5.8): https://frontendchecklist.io/rules/accessibility/touch-targets
14. NN/g, Touch Target Size: https://www.nngroup.com/articles/touch-target-size/
15. Hoober, Design for Fingers, Touch, and People, Part 3 (UXmatters): https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php
16. Smashing, Accessible Target Sizes Cheatsheet: https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/
17. Robot-aided gait with "ghost legs" overlay (J NeuroEng Rehab): https://jneuroengrehab.biomedcentral.com/articles/10.1186/1743-0003-9-31/figures/3
18. Frontiers in Robotics and AI, VR motor learning review: https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2019.00043/pdf
19. Ghostman AR telerehab: https://pmc.ncbi.nlm.nih.gov/articles/PMC4009317
20. Guidance hypothesis and fading feedback: https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2016.00251/pdf ; https://hal-sfo.ccsd.cnrs.fr/ISAE-ENSMA/hal-04565437v1
21. Taplytics, Duolingo delayed signup: https://taplytics.com/blog/duolingo-ab-test-onboarding
22. Appcues GoodUX, Duolingo onboarding: https://goodux.appcues.com/blog/duolingo-user-onboarding
23. NN/g, Mobile Instructional Overlays: https://www.nngroup.com/articles/mobile-instructional-overlay/
24. TU Dresden, Onboarding tutorials for device-based interactions: https://fis.tu-dresden.de/portal/en/publications/introducing-mobile-devicebased-interactions-to-users(b96ccff5-5de1-4524-854d-540b0005e7af).html
25. UX Planet, Communicating hidden gestures: https://uxplanet.org/how-to-communicate-hidden-gestures-in-mobile-app-e55397f4006b
26. Universal Design Ireland, simple mobile gestures: https://universaldesign.ie/communications-digital/web-and-mobile-accessibility/web-accessibility-techniques/design-accessible-digital-content-introduction-and-index/design-accessible-navigation/use-simple-mobile-gestures-for-interaction
27. Mechanics of Magic, Monument Valley: https://mechanicsofmagic.com/?p=9943
28. UX Collective, Monument Valley 2 practices: https://uxdesign.cc/beyond-beauty-best-usability-practices-from-monument-valley-2-fca37ef7c498
29. GamesBeat, Toca Boca: https://gamesbeat.com/how-toca-boca-got-100m-mobile-downloads-by-putting-kids-first/
30. Kill Screen, Give them a toy not a game: https://www.killscreen.com/secret-smart-kids-entertainment-give-them-toy-not-game/
31. UX Planet, Progressive disclosure for mobile: https://uxplanet.org/design-patterns-progressive-disclosure-for-mobile-apps-f41001a293ba
32. Apple HIG, Playing haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
33. Apple, Playing haptic feedback (Pencil): https://developer.apple.com/tutorials/data/documentation/applepencil/playing-haptic-feedback-in-your-app.md
34. Hoober, How Do Users Really Hold Mobile Devices (A List Apart figures): https://alistapart.com/1-2-phone-grips-jpg/
35. Smashing, The Thumb Zone: https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users
