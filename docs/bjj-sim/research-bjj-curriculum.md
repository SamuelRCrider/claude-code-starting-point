# BJJ Fundamentals Curriculum (for the BJJ physics sim)

This curriculum drives an interactive 3D app where a user moves two avatars, **Top** and **Bottom**. Each position below lists the concepts, checkpoints a program can verify, core techniques written as body-part steps, and common mistakes along with how the opponent punishes them.

The content is ordinary fundamentals-level BJJ, consistent with Gracie Combatives (Gracie University), common academy curricula, and the IBJJF rulebook. It is not a substitute for a coach. Threshold numbers (cm, degrees) are **starting heuristics for a sim**, not canonical values. Tune them against avatar proportions.

---

## 0. Conventions for geometric checkpoints

- **Frames:** World Y is up and the mat is Y=0. Each avatar has a body frame: *forward* = pelvis to head along the spine, *up* = chest normal (the direction the belly faces), *left/right* = the avatar's own sides.
- **Landmarks** (both avatars): head, neck, sternum, shoulders (L/R), armpits (L/R), elbows, wrists/hands, ribs (lower ribcage, L/R), hips/pelvis center, hip joints (L/R), knees, ankles/feet, heels.
- **"Supine"**: bottom chest normal within ~30° of world up. **"Side-on"**: chest normal 45–90° from up. **"Prone/turtle"**: chest normal pointing down and knees on the mat.
- **"Pinned/flat"**: both of bottom's shoulder blades within ~10 cm of the mat.
- **Underhook**: A's upper arm passes *under* B's armpit, meaning A's elbow/forearm sits between B's arm and B's torso, with A's hand on B's back or shoulder. **Overhook (whizzer)**: A's arm wraps *over* B's arm and around it.
- **Head control / crossface**: A's forearm or shoulder against the side of B's jaw, turning B's face away from A. Measured as B's head yaw away from A greater than ~30°.
- **Pressure (sim proxy)**: the fraction of Top's body weight carried by Bottom rather than by the mat. A "heavy" top has more than about 60% of mass supported by Bottom and few limbs touching the mat.

---

## 1. Position hierarchy and IBJJF points

Points go only to the athlete who reaches a position *and stabilizes it for 3 seconds* (IBJJF Rule Book, Art. 2.5 / scoring section).

| Action / position | IBJJF points | Notes |
|---|---|---|
| Takedown | 2 | Opponent brought to back/side and stabilized on top |
| Sweep | 2 | Must **start from guard** (incl. half guard) and end on top. A reversal from under side control or mount is not a sweep |
| Knee on belly | 2 | Knee/shin on opponent's belly, chest or ribs. Other leg extended with foot (not knee) on mat. Opponent on back or side |
| Guard pass | 3 | Get past the legs to side control / north-south and hold 3 s. Passing *half guard* also scores 3 |
| Mount | 4 | Sit on the torso facing the head, two knees (or one foot and one knee) on the mat, no more than one arm trapped under the legs. Includes technical mount |
| Back control (back mount) | 4 | Chest to back with **both heels inside opponent's thighs** (hooks). Feet not crossed (a body triangle scores only an advantage). No more than one arm trapped, and not above the shoulder line |

**Dominance ladder for teaching (best to worst for Top):** Back control > Mount > Knee on belly > Side control ≈ North-South > Turtle (top) > Half guard (top) > Closed guard (top).
Bottom's priority is the reverse: survive, then escape to guard or half guard, then sweep or submit.

Sources: IBJJF Rule Book (ibjjf.com/books-videos), summaries at gymdesk.com and BJJEE (see §11).

---

## 2. Recommended learning progression

This mirrors the "survival first" philosophy of Gracie Combatives, where the first class includes the trap-and-roll mount escape.

1. **Movement primitives:** bridge (upa), shrimp (hip escape), technical stand-up, sit-out/granby basics, framing.
2. **Mount (bottom):** posture/elbows, trap-and-roll, elbow-knee escape. Mount escapes come first because mount is the worst common position.
3. **Closed guard:** bottom posture-breaking, armbar, triangle, scissor/hip-bump sweep. Top posture.
4. **Side control (bottom):** frames, shrimp to guard, go to knees. Side control (top): crossface + underhook, hip pressure.
5. **Mount (top):** maintenance, high mount, Americana, cross-collar choke, armbar.
6. **Half guard:** bottom underhook/knee shield, old-school sweep. Top crossface/whizzer, passing.
7. **Knee on belly:** transitions from side control, far-side armbar, escapes.
8. **Back control:** seatbelt + hooks, rear-naked choke, escapes.
9. **Turtle:** top (seatbelt, take the back), bottom (sit-out, guard recovery).
10. **North-South:** transitions, kimura, north-south choke, escapes.
11. **Chains:** side control → knee on belly → mount → S-mount → armbar, and similar flows.

---

## 3. Mount

### Concepts
**Top**
- **Low mount:** knees pinched to bottom's hips/ribs, feet hooked under bottom's thighs (*grapevines*) or tucked by the hips. Hips heavy and low, chest forward. Good stability against bridging.
- **High mount:** knees slide up toward the armpits, beyond the elbows. This removes the elbow-knee escape and isolates arms. Less stable against a well-timed bridge if posture is upright.
- **S-mount:** one knee up beside bottom's head, the other leg's shin across bottom's ribs/stomach with the foot by bottom's hip, forming an "S". Used to finish the armbar on an elbow that has come off the ribs.
- **Technical mount:** used when bottom turns on their side. One knee by bottom's head, the other foot posted by bottom's hip, still facing the head.
- **Control tools:** crossface/head control, underhook of one arm, hands posted on the mat *close to* the head (not far out). Weight is distributed over the hips.

**Bottom**
- Elbows tight to the ribs, forearms framing on Top's hips/thighs, not pushing on Top's chest. Chin tucked.
- Feet flat near the buttocks, ready to bridge.
- Escapes: trap-and-roll (upa) and elbow-knee (shrimp) escape. Never give the arms straight (armbar) or turn the back flat (back take).

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| M1 | Top is mounted | Top pelvis above bottom's torso (between bottom's hip line and sternum). Top's knees on the mat on both sides of bottom's torso. Top faces bottom's head (forward vectors within 45°). Bottom supine |
| M2 | Knees pinched | Each Top knee within ~10 cm of bottom's torso surface |
| M3 | High mount | Top knees above bottom's elbows, i.e. projected along bottom's spine they sit closer to the armpits than the elbows (≤15 cm from the armpit line) |
| M4 | Low/grapevine | Top's feet/ankles hooked under bottom's thighs or shins (Top feet below bottom knee height, inside bottom's legs) |
| M5 | Heavy hips | Top pelvis height above bottom's torso ≤ ~15 cm. Top pelvis lower than Top shoulders (torso leaned forward 20–60° from vertical) |
| M6 | Base | If Top's hands are posted, each hand within ~40 cm of bottom's head. Hands farther out are a weakness (see mistakes) |
| M7 | Underhook / head control | Top arm under bottom's armpit (underhook), or Top forearm on the side of bottom's head with head yaw > 30° |
| M8 | Bottom defense | Bottom elbows within ~15 cm of own ribs. Forearms/hands touching Top's hips or thighs. Chin tucked (head pitched forward) |
| M9 | S-mount | One Top knee within ~20 cm of bottom's head. Other shin roughly across bottom's torso with that foot near bottom's opposite hip |

### Techniques
**Trap-and-roll (Upa) escape (Bottom)** (Gracie Combatives Class 1)
1. Bottom traps Top's right arm: both of Bottom's arms clamp Top's right arm above the elbow and pull it to Bottom's chest.
2. Bottom traps Top's right foot: Bottom's right foot steps over or outside Top's right foot/ankle.
3. Bottom plants the left foot near the buttocks and bridges the hips straight up high.
4. Bottom turns the bridge over the **right** (trapped-side) shoulder, rolling Top toward the side where Top has no arm or leg to post.
5. Bottom lands in Top's closed guard with posture up and hands on Top's hips/biceps.

**Elbow-knee (shrimp) escape (Bottom)** (Gracie Combatives Class 9)
1. Bottom frames both hands/forearms on Top's left hip/knee. Bottom bridges small to lift Top's weight.
2. Bottom turns onto the right side and shrimps the hips away (left), making space between the right elbow and right knee.
3. Bottom slides the right knee inside Top's left leg, connecting elbow and knee, and pulls the right knee through.
4. Bottom hooks Top's left leg with the right leg (half guard), then repeats on the other side to recover full guard.

**Americana (Top)**
1. Top pins bottom's left wrist to the mat with Top's left hand, bottom's elbow bent to ~90° and the hand above the elbow (toward the head).
2. Top threads the right hand under bottom's left upper arm and grabs Top's own left wrist (figure-four).
3. Top keeps chest pressure, slides bottom's hand toward bottom's hips while lifting bottom's elbow ("paintbrush").
4. The tap comes from shoulder rotation. Top's elbows stay close to bottom's body.

**Mount armbar (Top)**
1. Top climbs to high mount. Bottom pushes Top's chest with straight arms, or Top isolates one arm overhead.
2. Top traps bottom's right arm to Top's chest with both arms and shifts weight onto that arm's side (S-mount or posting hand).
3. Top swings the left leg over bottom's head and sits the hips close to bottom's shoulder.
4. Top squeezes the knees, keeps bottom's thumb pointing up, and raises the hips gently against bottom's elbow.

**Cross-collar choke (Top, gi)**
1. Top inserts the right hand deep into bottom's right collar, four fingers in and thumb out.
2. Top inserts the left hand into bottom's left collar, thumb in, palm under (or both thumbs-in).
3. Top lowers the head to the mat beside bottom's head, elbows flaring wide, so the wrists scissor into the carotids.

### Common mistakes and punishments
- **Top sits upright with hands posted far away:** bottom traps an arm and a foot on one side and upa-rolls Top, who has no post on that side.
- **Top knees open / sitting on the stomach:** the knees leave space for bottom to insert an elbow-knee and shrimp back to half guard.
- **Top high mount with weight too far forward and no hand base:** bottom bridges, and Top falls forward over bottom's head.
- **Bottom pushes Top's chest with straight arms:** Top falls into a mount armbar or arm-triangle.
- **Bottom turns face-down to escape:** Top inserts hooks and takes the back (4 points, and the rear-naked choke opens up).
- **Bottom bridges straight up without trapping:** Top bases out with the hand/foot on that side. The energy is wasted.

---

## 4. Side Control (side mount / 100 kilos)

### Concepts
**Top**
- Perpendicular to bottom, chest-to-chest. **Crossface** (near arm under bottom's head, shoulder driving into bottom's jaw) plus **far-side underhook** of bottom's far arm, *or* a near-side hip control.
- Hips low and heavy. Knees close to bottom's near hip and shoulder (block re-guarding). Toes on the mat, or a sprawled "kesa/modified" variation.
- Goal: flatten bottom, take away the near-side underhook, and transition to mount/knee on belly/north-south.

**Bottom**
- Near arm framed. Forearm into Top's neck/collarbone (top frame) and other forearm on Top's hip (bottom frame). Elbows tight. Turn onto the side facing Top, never flat.
- Keep the near elbow inside, between self and Top's knee. Never lose the inside position.
- Escapes: bridge then shrimp to replace guard (Gracie Combatives Class 21), underhook and go to the knees, or rolling escapes.

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| S1 | Side control | Top torso over bottom's torso. Angle between spines 60–120° (perpendicular). Top's legs entirely on one side of bottom's body (past both of bottom's knees). Bottom supine |
| S2 | Chest pressure | Top sternum within ~15 cm of bottom's chest. Top pelvis below Top shoulders or level with them |
| S3 | Crossface | Top's near arm under/behind bottom's neck with forearm or shoulder against bottom's jaw. Bottom head yaw away from Top > 30° |
| S4 | Far underhook | Top's far arm under bottom's far armpit |
| S5 | Knees blocking | Top's near knee within ~10 cm of bottom's near hip. Other knee near bottom's near shoulder/head |
| S6 | Bottom frames | Bottom near forearm between own chest and Top's neck/collar. Bottom far hand on Top's hip. Bottom elbows ≤15 cm from own ribs |
| S7 | Bottom on side | Bottom chest normal rotated ≥40° toward Top (not flat) |

### Techniques
**Shrimp to guard (Bottom)**
1. Bottom frames: near forearm against Top's neck, far hand on Top's near hip.
2. Bottom bridges into Top to make Top post and lift weight.
3. Bottom shrimps the hips away from Top, opening space between own hips and Top's knees.
4. Bottom slides the near knee and shin into the space (knee across Top's belly).
5. Bottom swings the other leg over Top's back and closes guard (or holds half guard).

**Underhook to knees (Bottom)**
1. Bottom bridges and shrimps away slightly.
2. Bottom swims the near arm under Top's far-side armpit (gets the underhook).
3. Bottom turns toward Top onto the near hip and comes to the knees, driving the head into Top's chest.
4. Bottom drives forward or goes to a single-leg / back take.

**Transition to mount (Top)**
1. Top keeps crossface and pins bottom's far arm or controls the near hip with the near hand.
2. Top slides the near knee across bottom's belly toward the far hip, keeping chest pressure.
3. Top's knee touches the mat on the far side. Top pulls the far foot over and settles into mount.

**Kimura from side control (Top)**
1. Bottom's far arm comes off the mat (e.g. pushing). Top grips bottom's far wrist with the far hand and pins it to the mat.
2. Top threads the near arm under bottom's upper arm and grabs Top's own wrist (figure-four).
3. Top steps over bottom's head (or keeps chest pressure). Top keeps bottom's elbow tight to Top's chest and rotates bottom's hand toward bottom's head/behind the back.

**Americana (same mechanics as mount)** from side control on bottom's far arm.

### Common mistakes and punishments
- **Top's hips high (on knees, chest off):** bottom shrimps and re-guards immediately.
- **Top lets go of the crossface:** bottom turns in, gets the underhook, and comes to the knees.
- **Top's near knee away from bottom's hip:** bottom's knee slides in (knee shield), recovering half guard.
- **Bottom lies flat with arms extended:** Top crossfaces, gets a far-side underhook, and walks to mount or isolates an arm for a kimura/americana.
- **Bottom turns away (back to Top):** Top takes the back or attacks the clock choke.
- **Bottom pushes with straight arms:** Top attacks the arm (kimura, straight armlock) or steps over to mount.

---

## 5. Closed Guard

### Concepts
**Bottom (guard player)**
- Ankles crossed behind Top's back. Break Top's posture by pulling with the knees and controlling the head/collar/sleeve.
- Angle: use hip movement (shrimping to the side) to set up armbars and triangles.
- Control at least one arm and the head or posture. Dangerous attacks: armbar, triangle, kimura, guillotine, cross-collar choke. Sweeps: scissor, hip-bump, flower.

**Top**
- **Posture:** spine upright, head up, hips forward, hands on bottom's hips/biceps or belt (Gracie: "posture first"). Elbows inside bottom's knees.
- Never put one hand in and one out without control. That is the classic triangle setup.
- Open the guard by standing or with a knee wedge, then pass.

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| G1 | Closed guard | Bottom supine. Bottom's legs wrap Top's waist with ankles crossed (bottom's ankles within ~10 cm of each other behind Top's lower back). Top kneeling between bottom's legs |
| G2 | Top posture | Top torso angle from vertical ≤ 25°. Top head above own hips. Top hands on bottom's hips/belt/biceps |
| G3 | Posture broken | Top torso angle from vertical > 45° forward, Top head within ~30 cm of bottom's chest |
| G4 | Elbows inside | Top elbows between bottom's knees (inside the thighs) |
| G5 | Arm-in/arm-out (danger) | One Top arm between bottom's legs and the other arm outside bottom's thigh |
| G6 | Bottom angle | Bottom's spine rotated ≥ 30° relative to Top's spine (bottom has hipped out) |

### Techniques
**Armbar from guard (Bottom)**
1. Bottom controls Top's right arm (cross grip on the sleeve/wrist) and keeps it on Bottom's chest.
2. Bottom places the left foot on Top's right hip and pivots the hips to the left, making a ~45° angle.
3. Bottom raises the right leg high across Top's back, then swings the left leg over Top's face.
4. Bottom squeezes the knees together, keeps Top's thumb up, and raises the hips into Top's elbow.

**Triangle choke (Bottom)**
1. Bottom pushes one of Top's arms (e.g. left) back to the mat or behind Bottom's hip, leaving Top's right arm inside.
2. Bottom shoots the right leg over Top's left shoulder, high across the back of Top's neck.
3. Bottom angles out to the left and locks the right ankle under the left knee (figure-four).
4. Bottom pulls Top's head down, pushes Top's trapped arm across, and squeezes the knees.

**Scissor sweep (Bottom)**
1. Bottom opens the guard and grips Top's right sleeve and left collar.
2. Bottom shrimps to the right side and places the right shin across Top's belly/chest (knee near Top's left hip).
3. Bottom puts the left leg on the mat behind Top's right knee.
4. Bottom pulls Top forward onto the right shin, then chops the left leg into Top's knee while kicking the right shin over, rolling Top to Top's right side into mount.

**Hip-bump sweep (Bottom)**
1. Top postures up tall. Bottom sits up and posts the right hand on the mat behind.
2. Bottom reaches the left arm over Top's right shoulder/arm.
3. Bottom uncrosses the feet, plants them, and bumps the hips up into Top's chest, rolling Top over the right shoulder into mount.
4. If Top posts the arm back, Bottom switches to the kimura on that arm.

**Kimura from guard (Bottom)**
1. Top posts the right hand on the mat. Bottom grips Top's right wrist with the left hand.
2. Bottom sits up, reaches the right arm over Top's right shoulder, and grabs own left wrist (figure-four).
3. Bottom falls back to the mat, angles the hips out, and rotates Top's hand behind Top's back.

**Basic stand-up guard break (Top)**
1. Top postures and controls bottom's sleeves/hips.
2. Top steps up one foot, then the other, keeping posture and hands on bottom's hips.
3. Top pops a knee/hip back to open bottom's ankles, then begins a pass (e.g. knee slice, toreando).

### Common mistakes and punishments
- **Top leans forward with posture broken:** bottom controls the head and sets up chokes, the armbar, or the kimura.
- **Top places one arm in and one out:** bottom triangles.
- **Top posts both hands on bottom's chest with straight arms:** bottom armbars.
- **Top posts a hand on the mat:** kimura or hip-bump sweep.
- **Bottom lies flat holding a closed guard with no angle:** Top stands, opens the guard, and passes.
- **Bottom crosses ankles but no grips:** Top postures and opens the guard at leisure.

---

## 6. Half Guard

### Concepts
**Bottom**
- Legs trap one of Top's legs (the shin/foot is entangled). Stay on the **side**, never flat.
- Win the **underhook** on the trapped-leg side, with the head lower than Top's head ("head under"). Or use the **knee shield** (top knee/shin across Top's belly) to hold distance.
- Goals: come up (dogfight), sweep (old school), back take, or recover full guard.

**Top**
- **Crossface** + **underhook** on the far side (the opposite of what bottom wants), or a **whizzer** (overhook) on bottom's underhook.
- Flatten bottom, then free the trapped leg (knee slice, hip switch, or toe-free) to pass into side control or mount.

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| H1 | Half guard | Bottom's legs entangle exactly one of Top's legs (that thigh/shin is between Bottom's legs). Top's other leg is outside. Top's torso over Bottom's torso |
| H2 | Bottom underhook | Bottom's arm on the trapped-leg side under Top's armpit (Bottom's hand on Top's back) |
| H3 | Bottom on side | Bottom chest normal rotated ≥ 40° toward Top. Bottom head lower than Top's head (closer to the mat) |
| H4 | Knee shield | Bottom's top knee between the chests. Shin across Top's belly/hip with the knee ≥ 15 cm off Bottom's chest |
| H5 | Top flattening | Top crossface on Bottom (S3 test) and Top underhook on Bottom's far side. Bottom chest normal within 30° of up |
| H6 | Top whizzer | Top's arm over Bottom's underhooking arm, hand clamping under Bottom's armpit/triceps |

### Techniques
**Old-school sweep (Bottom)**
1. Bottom (on the left side, trapping Top's right leg) gets the left underhook around Top's back and turns onto the right side, head tight to Top's chest.
2. Bottom slides out to Top's side, reaching under with the right hand to grab Top's right ankle/heel (trapped leg).
3. Bottom keeps the ankle pinned so Top cannot post it.
4. Bottom drives up and forward off the underhook and knee, tipping Top over the trapped leg's side. Bottom comes up on top.

**Underhook to knees / dogfight (Bottom)**
1. Bottom wins the underhook, turns onto the side, and pushes the far elbow off the mat.
2. Bottom comes up on the knees beside Top, head on Top's chest/shoulder.
3. Bottom keeps the trapped leg and drives forward, or circles behind for a back take.

**Recover full guard (Bottom)**
1. Bottom frames: forearm on Top's neck/collarbone, other hand on Top's hip.
2. Bottom shrimps the hips away, puts the knee shield in, and uses it to make space.
3. Bottom pulls the free leg out, wraps both legs around Top's waist, and crosses the ankles.

**Knee-slice pass from half guard (Top)**
1. Top crossfaces and gets the far underhook, flattening Bottom.
2. Top frees the trapped knee enough to point it across Bottom's thigh, then slides the knee across and down to the mat on the far side.
3. Top keeps the hips low and chest heavy, pulls the foot free, and settles into side control.

**Kimura from top half guard (Top)**
1. Bottom reaches for the underhook. Top grabs Bottom's wrist with the near hand.
2. Top threads the other arm over Bottom's shoulder, under the upper arm, and grabs own wrist.
3. Top uses chest pressure, rotates Bottom's hand behind the back. Alternatively Top uses the grip to pass by stepping over.

### Common mistakes and punishments
- **Bottom lies flat:** Top crossfaces, gets the underhook, and passes with a knee slice or to mount.
- **Bottom's head above Top's head:** Top drives the shoulder and crossface, taking the underhook away.
- **Top allows Bottom's underhook:** Bottom comes up on the knees, sweeps, or takes the back.
- **Top stays upright with no upper-body control:** Bottom recovers knee shield/full guard.
- **Bottom reaches with a straight underhook arm:** Top kimuras it.

---

## 7. Back Control

### Concepts
**Top (attacker)**
- **Seatbelt:** one arm over the shoulder (choking arm), the other under the armpit, hands clasped on Bottom's chest. The head is tucked tight beside Bottom's head on the side of the under-arm.
- **Hooks:** both heels inside Bottom's thighs (not crossing ankles, a foot lock risk). Chest glued to Bottom's back.
- Attacks: rear-naked choke, bow-and-arrow choke (gi), armbar. Fight hands first to clear the neck.

**Bottom (defender)**
- Protect the neck (two-on-one on the choking arm, chin tucked). Escape toward the **choking-arm side** (the over-shoulder arm side), not the under-arm side. Getting the shoulders to the mat on that side pins the choking arm and removes the attacker's angle.
- Clear the bottom hook, slide the hips out, and turn into Top (to half guard or top position).

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| B1 | Back control | Top chest within ~15 cm of Bottom's back (Top facing the same direction as Bottom, forward vectors within 45°). Bottom sitting or lying on Top |
| B2 | Hooks | Both Top heels between Bottom's thighs, inside Bottom's knees (heel position medial to each of Bottom's thighs) |
| B3 | Feet not crossed | Top's ankles not overlapping each other in front of Bottom (avoid foot lock, IBJJF scoring) |
| B4 | Seatbelt | One Top arm over Bottom's shoulder and the other under the opposite armpit. Top wrists within ~10 cm of each other on Bottom's chest |
| B5 | Head position | Top's head beside Bottom's head on the under-arm side, ≤ 15 cm away |
| B6 | RNC locked | Choking arm's elbow under Bottom's chin (center of the throat). Biceps and forearm on both sides of the neck. Hand of choking arm on the other arm's biceps. Other hand behind Bottom's head |
| B7 | Bottom defense | Bottom's two hands on Top's choking forearm/wrist. Chin tucked |

### Techniques
**Rear-naked choke (Top)**
1. From seatbelt (right arm over the shoulder), Top slides the right forearm across Bottom's neck so the right elbow is under Bottom's chin.
2. Top places the right hand on the left biceps.
3. Top places the left hand behind Bottom's head (palm down / blade).
4. Top squeezes the elbows together and expands the chest, with the head tight to Bottom's head.

**Bow-and-arrow choke (Top, gi)**
1. Top's choking hand grips Bottom's far collar deep.
2. Top's other hand releases and grabs Bottom's pants at the knee on the same side.
3. Top removes the hook on that side, swings the leg over Bottom's shoulder, and pulls collar and pants in opposite directions.

**Back escape (Bottom)** (Gracie Combatives back-mount escape)
1. Bottom grips Top's choking arm with both hands (two-on-one), chin tucked.
2. Bottom bridges and slides the shoulders down to the mat on the **choking-arm side** (head to the mat beside Top's head).
3. Bottom clears Top's bottom-side hook with the foot/hand, and slides the hips to the mat.
4. Bottom turns toward Top, bringing the chest into Top's chest, ending in Top's guard or on top.

**Back take from turtle / seatbelt to hooks (Top)**
1. Top secures the seatbelt from the side of a turtled Bottom.
2. Top inserts the near hook (heel inside Bottom's near thigh).
3. Top rolls to the side of the under-arm, pulling Bottom on top, and inserts the second hook.

### Common mistakes and punishments
- **Top crosses the ankles in front:** Bottom crosses own legs over and applies a foot lock / escapes. No points in IBJJF.
- **Top loses chest contact (hips back):** Bottom slides down and turns in.
- **Top's head on the wrong side or high:** Bottom falls to that side and escapes.
- **Bottom escapes to the under-arm side:** Top's choking arm stays free and follows up with the choke or a mount.
- **Bottom grabs the choking arm with only one hand, or pulls at the legs:** Top secures the RNC.

---

## 8. Knee on Belly

### Concepts
**Top**
- Knee/shin across Bottom's belly or ribs, foot of that leg hooked by Bottom's far hip. Other leg extended out to the side with the foot on the mat (base).
- Grips: far collar/sleeve and near belt/hip/pants (gi), or far underhook / near wrist (no-gi). Posture upright-ish, weight on the knee.
- A **mobile** pin. It punishes pushing with far-side armbar, and transitions to mount and back to side control.

**Bottom**
- Frame on Top's knee/thigh and hip. Turn into Top and shrimp away, or push the knee and replace guard.

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| K1 | Knee on belly | Top's knee contacts Bottom's torso between hip line and sternum. Top's other knee off the mat (≥ 10 cm). Other foot on the mat. Bottom supine or on side |
| K2 | Base leg | Top's base foot ≥ 40 cm from Bottom's body on the near side |
| K3 | Weight | Top pelvis above the knee (vertical drop ≤ 20 cm), indicating weight through the knee |
| K4 | Shin angle | Top shin roughly diagonal across Bottom's belly (angle to Bottom's spine 30–70°), foot near Bottom's far hip |
| K5 | Bottom push | Bottom far arm extended (elbow angle > 140°) pushing on Top: armbar trigger |

### Techniques
**Far-side armbar (Top)**
1. Bottom pushes Top's knee/chest with the far arm. Top grips that arm with both hands, trapping it to Top's chest.
2. Top steps the base leg around Bottom's head, spinning so Top's hips land beside Bottom's shoulder.
3. Top swings the other leg over Bottom's chest, sits down close to the shoulder, and extends the arm (thumb up).

**Transition to mount (Top)**
1. Top keeps the grips and slides the knee across Bottom's belly to the mat on the far side.
2. Top brings the base leg in and settles into low mount.

**Shrimp escape (Bottom)**
1. Bottom frames both hands on Top's knee and pushes it toward Top's hips.
2. Bottom turns onto the side, facing away from Top's knee, and shrimps the hips away from Top.
3. Bottom pushes the knee off and slides the near leg in between, recovering guard.

**Turn-in escape (Bottom)**
1. Bottom grabs Top's near ankle/pants or base leg.
2. Bottom bridges and turns toward Top (onto the knees), driving through for a single-leg or into Top's guard.

### Common mistakes and punishments
- **Top's base foot too close or knee on the mat:** no pressure. Bottom recovers guard.
- **Top too upright with no grips:** Bottom pushes the knee off and shrimps.
- **Bottom pushes with a straight arm:** far-side armbar.
- **Bottom turns away (back to Top):** Top takes the back.

---

## 9. North-South

### Concepts
**Top**
- Chest on Bottom's chest, facing the opposite direction (Top's head near Bottom's hips, Top's hips beyond Bottom's head). Knees on the mat or sprawled with hips low.
- Arms control Bottom's arms (both under the armpits / near the lats or one around the head). Attacks: kimura, north-south choke, transition to side control/back.

**Bottom**
- Frame on Top's hips/shoulders. Turn to a side, shrimp, and pummel the arms inside. Bridge and spin to come to the knees, or recover guard.

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| N1 | North-south | Spines anti-parallel (angle between forward vectors 150–180°). Top's sternum over Bottom's sternum (≤ 20 cm horizontal). Top's head toward Bottom's hips. Bottom supine |
| N2 | Pressure | Top's chest contacts Bottom's chest/face. Top pelvis lower than Top shoulders or level |
| N3 | Arm control | Top's arms inside Bottom's arms (under Bottom's armpits), or Top's arm around Bottom's head |
| N4 | NS choke | Top's armpit centered above Bottom's throat. Top's arm encircles Bottom's neck. Bottom's far arm trapped by Top's arm |

### Techniques
**North-south choke (Top)**
1. From side control, Top wraps the near arm around Bottom's neck, palm down, under the far side of the neck.
2. Top walks to north-south, keeping chest pressure.
3. Top places the center of the armpit directly over Bottom's throat/Adam's apple (source: JitsuIQ, Marcelo Garcia teaching notes).
4. Top drops the hips toward the mat, angles the body, and squeezes the arm while driving the chest down.

**Kimura from north-south (Top)**
1. Top grips Bottom's wrist (as Bottom's arm comes up) with the same-side hand.
2. Top threads the other arm under Bottom's upper arm and grabs own wrist.
3. Top sits the hips back/to the side and rotates Bottom's hand behind Bottom's back (or toward Bottom's head).

**Escape: turn to side and pummel (Bottom)**
1. Bottom frames forearms on Top's shoulders/hips.
2. Bottom bridges and turns onto one side, shrimping the hips away from Top.
3. Bottom gets the knee in, then the legs, recovering guard (or comes to the knees and drives).

### Common mistakes and punishments
- **Top hips up (no weight):** Bottom bridges, shrimps, and recovers guard.
- **Bottom's arm straight up/away from the body:** kimura.
- **Bottom turns back into Top and lifts the head:** north-south choke.

---

## 10. Turtle

### Concepts
**Bottom (turtle)**
- Knees and elbows connected (no gaps), elbows tight to the knees, chin tucked, hands protecting the neck/collar. Hips low.
- Turtle is transitional. Bottom wants to sit out, roll to guard (granby), get a single-leg, or stand. Staying is dangerous (back take, clock choke).

**Top**
- Seatbelt or near-side control from the side or behind. Chest on Bottom's back, hips heavy.
- Attacks: back take (insert hooks), clock choke (gi), crucifix, front headlock if in front.

### Checkpoints
| ID | Check | Geometric test |
|---|---|---|
| T1 | Turtle | Bottom prone: knees and forearms/hands on the mat. Chest normal pointing down. Hips above knees |
| T2 | Bottom compact | Bottom's elbows within ~10 cm of own knees. Chin tucked |
| T3 | Top on back | Top's chest on Bottom's back/shoulder. Top on the side or behind |
| T4 | Seatbelt | Same as B4, with Bottom prone |
| T5 | Hook in | One Top heel inside Bottom's near thigh |

### Techniques
**Seatbelt back take (Top)**
1. Top on Bottom's left side seatbelts: right arm over Bottom's right shoulder, left arm under Bottom's left armpit, hands clasped.
2. Top inserts the left hook (heel inside Bottom's left thigh).
3. Top rolls over the right shoulder (choking-arm side), pulling Bottom on top. Top inserts the right hook.
4. Top secures the seatbelt and attacks the RNC.

**Clock choke (Top, gi)**
1. Top on the side opens Bottom's far collar and feeds it to the near hand, deep.
2. Top's other arm hooks under Bottom's near armpit (or controls the near arm).
3. Top sprawls the legs back and walks them around toward Bottom's head (like a clock hand), driving the chest onto Bottom's back.

**Sit-out to guard (Bottom)**
1. Bottom posts the near hand. Top-side leg steps out.
2. Bottom threads the far leg underneath toward Top, turning the hips.
3. Bottom sits onto the hip facing Top and brings the legs in to recover guard.

**Granby roll (Bottom)**
1. Bottom tucks the head and posts on the shoulder away from Top.
2. Bottom rolls over the shoulder, legs leading, inverting under Top.
3. Bottom faces Top and recovers guard.

**Single-leg from turtle (Bottom)**
1. Bottom reaches for Top's near ankle/leg.
2. Bottom drives forward and turns into Top, coming up to the knees/feet on the single.

### Common mistakes and punishments
- **Bottom elbows away from the knees:** Top inserts a hook and takes the back.
- **Bottom stays still in turtle:** clock choke, back take, crucifix.
- **Top too high on Bottom's back:** Bottom rolls/granbies to guard or reverses.
- **Top's hips away and loose seatbelt:** Bottom sits out.

---

## 11. Sources

- IBJJF Rule Book and scoring (official): https://ibjjf.com/books-videos. Secondary summaries:
  - Gymdesk, "The Jiu Jitsu Point System": https://gymdesk.com/blog/jiu-jitsu-point-system
  - BJJEE, "Ultimate guide BJJ tournament rules scoring": https://www.bjjee.com/articles/ultimate-guide-bjj-tournament-rules-scoring/
  - Elite Sports, "IBJJF Rules": https://elitesports.com/blogs/news/ibjjf-rules-everything-you-need-to-know-about-bjj-competition-points
  - jits.gg, "Knee on Belly" / "BJJ Scoring Rules": https://jits.gg/glossary/knee-on-belly , https://jits.gg/guides/bjj-scoring-rules
  - Wikipedia, "Back mount": https://en.wikipedia.org/wiki/Back_mount
- Gracie University, Gracie Combatives class schedules (36 techniques, e.g. Class 1 trap-and-roll, Class 9 elbow escape, Class 21 side mount elbow escape): https://www.gracieuniversity.com/UploadsFiles/Documents/UploadsConvert/lc59_it2829_5dea2e6a_CombativesMay2025.pdf
- Grapplearts (Stephan Kesting), "The 4 most common errors for the Upa mount escape": https://www.grapplearts.com/the-4-most-common-errors-for-the-upa-mount-escape/ and "Side mount escape help": https://www.grapplearts.com/side-mount-escape-help/
- BJJEE, "Do your side control escapes suck?": https://www.bjjee.com/articles/do-your-side-control-escapes-suck-these-details-change-everything/
- Evolve MMA, "How to perform the S-mount in BJJ": https://evolve-mma.com/blog/how-to-perform-the-s-mount-in-bjj/ ; "3 escapes from side control": https://evolve-mma.com/blog/3-escapes-from-the-side-control-in-bjj/ ; "5 best sweeps from half guard": https://evolve-mma.com/blog/the-5-best-sweeps-from-the-half-guard-in-bjj/
- JitsuIQ, "North South Choke", "Elbow Escape", "Technical Mount": https://jitsuiq.com/submissions/chokes/north-south-choke.html , https://jitsuiq.com/escapes/elbow-escape.html , https://jitsuiq.com/positions/mount/technical-mount.html
- Digitsu, "Half-Guard: Fundamental Overview": https://digitsu.com/a/half-guard-fundamental-overview
- Gracie Barra, "The Turtle Position": https://graciebarra.com/gb-news/the-turtle-position
- Let's Roll, "Half guard for beginners": https://letsroll.co/blog/half-guard-for-beginners

**Caveats:** BJJ Fanatics pages did not come up in search, so the half-guard and S-mount material is cross-checked against Evolve, Digitsu, and JitsuIQ instead. IBJJF details (knee-on-belly leg requirements, body triangle = advantage only) come from secondary summaries plus general knowledge of the rulebook. Check them against the current official PDF before shipping rule-scoring logic.
