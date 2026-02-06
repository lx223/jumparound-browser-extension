import React from 'react';
import { Box } from '@mui/material';
import type { MatchHighlight } from '../types';

interface HighlightedTextProps {
  highlight?: MatchHighlight;
  defaultText: string;
  color?: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  highlight,
  defaultText,
  color = 'rgba(255, 255, 255, 0.95)',
}) => {
  if (!highlight) {
    return <>{defaultText}</>;
  }

  const { text, positions } = highlight;
  const positionSet = new Set(positions);
  const chars: React.ReactNode[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (positionSet.has(i)) {
      chars.push(
        <Box
          key={i}
          component="span"
          sx={{
            backgroundColor: 'rgba(255, 193, 7, 0.4)',
            color,
          }}
        >
          {char}
        </Box>
      );
    } else {
      chars.push(
        <Box
          key={i}
          component="span"
          sx={{ color }}
        >
          {char}
        </Box>
      );
    }
  }

  return <>{chars}</>;
};

export default HighlightedText;
