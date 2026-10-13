import type { Who } from '../physics/sim';

// Per-device progress. Storage can be unavailable (private mode, sandboxed
// previews), so every access is guarded and the app works without it.
const KEY = 'matlab.v1';
interface State { done: string[]; role: Who; flags: string[] }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { done: [], role: 'top', flags: [], ...JSON.parse(raw) };
  } catch { /* unavailable */ }
  return { done: [], role: 'top', flags: [] };
}

const state = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* unavailable */ } };

export const progress = {
  isDone: (id: string) => state.done.includes(id),
  doneCount: () => state.done.length,
  markDone(id: string) { if (!state.done.includes(id)) { state.done.push(id); save(); } },
  role: () => state.role,
  setRole(r: Who) { state.role = r; save(); },
  flag: (f: string) => state.flags.includes(f),
  setFlag(f: string) { if (!state.flags.includes(f)) { state.flags.push(f); save(); } },
};
