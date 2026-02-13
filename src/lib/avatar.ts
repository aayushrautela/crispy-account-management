export type DiceBearStyle = 'fun-emoji' | 'adventurer-neutral' | 'bottts-neutral';

export interface AvatarSource {
  type: 'dicebear' | 'upload';
  style?: DiceBearStyle;
  seed?: string;
  url: string | null;
}

interface DiceBearConfig {
  name: string;
  description: string;
  previewSeed: string;
}

export const DICEBEAR_STYLES: Record<DiceBearStyle, DiceBearConfig> = {
  'fun-emoji': {
    name: 'Fun Emoji',
    description: 'Playful emoji-style avatars',
    previewSeed: 'Felix',
  },
  'adventurer-neutral': {
    name: 'Adventurer',
    description: 'Neutral adventurer characters',
    previewSeed: 'Aneka',
  },
  'bottts-neutral': {
    name: 'Bots',
    description: 'Friendly robot avatars',
    previewSeed: 'Gizmo',
  },
};

const DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x';

export function generateDiceBearUrl(style: DiceBearStyle, seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `${DICEBEAR_BASE_URL}/${style}/svg?seed=${encodedSeed}`;
}

export function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getAvatarPreviewUrl(source: AvatarSource): string | null {
  if (source.type === 'dicebear' && source.style && source.seed) {
    return generateDiceBearUrl(source.style, source.seed);
  }
  return source.url;
}

export function isValidAvatarSource(source: unknown): source is AvatarSource {
  if (!source || typeof source !== 'object') return false;
  const s = source as Record<string, unknown>;
  return (
    (s.type === 'dicebear' || s.type === 'upload') &&
    (typeof s.url === 'string' || s.url === null)
  );
}

export function resolveAvatarUrl(avatar: string | null): string | null {
  if (!avatar) return null;
  
  if (avatar.startsWith('dicebear:')) {
    const [, style, seed] = avatar.split(':');
    if (style && seed) {
      return generateDiceBearUrl(style as DiceBearStyle, seed);
    }
    return null;
  }
  
  return avatar;
}
