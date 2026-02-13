import React from 'react';
import { Shuffle } from 'lucide-react';
import { getRandomDiceBearUrl } from '../lib/avatar';

interface AvatarPickerProps {
  value: string | null;
  onChange: (url: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange }) => {
  const handleRandomize = () => {
    onChange(getRandomDiceBearUrl());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-stone-800 border-2 border-stone-700">
          {value ? (
            <img src={value} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs text-center px-2">
              No icon selected
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleRandomize}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors text-sm text-stone-200 border border-stone-700"
        >
          <Shuffle size={16} />
          Randomize Icon
        </button>
      </div>
    </div>
  );
};
