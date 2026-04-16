export type UserStatusType = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE';

/** Bordure autour de l’avatar médecin : vert = libre, jaune = occupé, rose = absent. */
export function statusAvatarRing(s: UserStatusType): string {
  switch (s) {
    case 'AVAILABLE':
      return 'ring-[3px] ring-emerald-500 ring-offset-2 ring-offset-white';
    case 'BUSY':
      return 'ring-[3px] ring-amber-500 ring-offset-2 ring-offset-white';
    case 'AWAY':
      return 'ring-[3px] ring-rose-500 ring-offset-2 ring-offset-white';
    default:
      return 'ring-[3px] ring-slate-400 ring-offset-2 ring-offset-white';
  }
}

/** Pastille pleine (mini indicateur). */
export function statusDotSolid(s: UserStatusType): string {
  switch (s) {
    case 'AVAILABLE':
      return 'bg-emerald-500';
    case 'BUSY':
      return 'bg-amber-500';
    case 'AWAY':
      return 'bg-rose-500';
    default:
      return 'bg-slate-400';
  }
}
