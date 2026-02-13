import React, { useState } from 'react';
import { DiceBearSelector } from './DiceBearSelector';
import type { AvatarSource, DiceBearStyle } from '../lib/avatar';
import { generateRandomSeed, generateDiceBearUrl } from '../lib/avatar';

interface AvatarPickerProps {
  initialSource?: AvatarSource;
  onChange: (source: AvatarSource) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  initialSource,
  onChange,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<DiceBearStyle>(
    initialSource?.type === 'dicebear' ? (initialSource.style || 'fun-emoji') : 'fun-emoji'
  );
  const [seed, setSeed] = useState<string>(
    initialSource?.type === 'dicebear' ? (initialSource.seed || generateRandomSeed()) : generateRandomSeed()
  );

  const handleStyleChange = (style: DiceBearStyle) => {
    setSelectedStyle(style);
    const source: AvatarSource = {
      type: 'dicebear',
      style,
      seed,
      url: null,
    };
    onChange(source);
  };

  const handleSeedChange = (newSeed: string) => {
    setSeed(newSeed);
    const source: AvatarSource = {
      type: 'dicebear',
      style: selectedStyle,
      seed: newSeed,
      url: null,
    };
    onChange(source);
  };

  const previewUrl = generateDiceBearUrl(selectedStyle, seed);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-stone-800 border-2 border-stone-700">
          <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
        </div>
      </div>

      <DiceBearSelector
        selectedStyle={selectedStyle}
        seed={seed}
        onStyleChange={handleStyleChange}
        onSeedChange={handleSeedChange}
      />
    </div>
  );
};
