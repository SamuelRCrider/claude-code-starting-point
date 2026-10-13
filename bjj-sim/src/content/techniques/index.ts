import type { Technique } from '../types';
import { GUARD_TECHNIQUES } from './guard';
import { MORE_TECHNIQUES } from './more';
import { MOUNT_TECHNIQUES } from './mount';
import { SIDE_TECHNIQUES } from './side-control';

export const TECHNIQUES: Technique[] = [...MOUNT_TECHNIQUES, ...GUARD_TECHNIQUES, ...SIDE_TECHNIQUES, ...MORE_TECHNIQUES];

export const techniquesFor = (positionId: string) => TECHNIQUES.filter((t) => t.from === positionId);
