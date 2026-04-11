import React from 'react';
import type { MatchHighlight } from '../types';

interface HighlightedTextProps {
  highlight?: MatchHighlight;
  defaultText: string;
  secondary?: boolean;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  highlight,
  defaultText,
  secondary = false,
}) => {
  if (!highlight) {
    return <span className={secondary ? 'text-text-secondary' : ''}>{defaultText}</span>;
  }

  const { text, positions } = highlight;
  const positionSet = new Set(positions);
  const chars: React.ReactNode[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (positionSet.has(i)) {
      chars.push(
        <span key={i} className={`bg-highlight ${secondary ? 'text-text-secondary' : ''}`}>
          {char}
        </span>
      );
    } else {
      chars.push(
        <span key={i} className={secondary ? 'text-text-secondary' : ''}>
          {char}
        </span>
      );
    }
  }

  return <>{chars}</>;
};

export default HighlightedText;
