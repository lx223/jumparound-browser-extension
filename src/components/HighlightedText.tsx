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

  // One node per highlighted/plain run, rather than one per character.
  let start = 0;
  while (start < text.length) {
    const highlighted = positionSet.has(start);
    let end = start + 1;
    while (end < text.length && positionSet.has(end) === highlighted) end++;
    chars.push(
      <span key={start} className={`${highlighted ? 'bg-highlight' : ''} ${secondary ? 'text-text-secondary' : ''}`}>
        {text.slice(start, end)}
      </span>
    );
    start = end;
  }

  return <>{chars}</>;
};

export default HighlightedText;
