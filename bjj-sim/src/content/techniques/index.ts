import type { Technique } from '../types';
import { MOUNT_TECHNIQUES } from './mount';

export const TECHNIQUES: Technique[] = [...MOUNT_TECHNIQUES];

export const techniquesFor = (positionId: string) => TECHNIQUES.filter((t) => t.from === positionId);
