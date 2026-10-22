import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import HighlightedText from './HighlightedText';

it('groups contiguous text without losing highlighted positions', () => {
  const html = renderToStaticMarkup(<HighlightedText defaultText="" highlight={{ text: 'abcdefghi', positions: [1, 2, 5] }} />);
  const container = document.createElement('div');
  container.innerHTML = html;
  expect(container.textContent).toBe('abcdefghi');
  expect([...container.querySelectorAll('.bg-highlight')].map(node => node.textContent)).toEqual(['bc', 'f']);
  expect(container.querySelectorAll('span')).toHaveLength(5);
});
