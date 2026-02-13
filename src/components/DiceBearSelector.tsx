import React from 'react';
import type { DiceBearStyle } from '../lib/avatar';
import { generateRandomSeed } from '../lib/avatar';
import { Shuffle } from 'lucide-react';

interface DiceBearSelectorProps {
  selectedStyle: DiceBearStyle;
  seed: string;
  onStyleChange: (style: DiceBearStyle) => void;
  onSeedChange: (seed: string) => void;
}

export const DiceBearSelector: React.FC<DiceBearSelectorProps> = ({
  onSeedChange,
}) => {
  const handleRandomize = () => {
    onSeedChange(generateRandomSeed());
  };

  return (
    <button
      type="button"
      onClick={handleRandomize}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors text-sm"
    >
      <Shuffle size={16} />
      Randomize
    </button>
  );
};
