export type DiceBearStyle = 'fun-emoji' | 'adventurer-neutral' | 'bottts-neutral';

const DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x';

export function generateDiceBearUrl(style: DiceBearStyle, seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `${DICEBEAR_BASE_URL}/${style}/svg?seed=${encodedSeed}`;
}

export function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function getRandomDiceBearUrl(): string {
  const styles: DiceBearStyle[] = ['fun-emoji', 'adventurer-neutral', 'bottts-neutral'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  const randomSeed = generateRandomSeed();
  return generateDiceBearUrl(randomStyle, randomSeed);
}

export function resolveAvatarUrl(avatar: string | null): string | null {
  return avatar;
}
