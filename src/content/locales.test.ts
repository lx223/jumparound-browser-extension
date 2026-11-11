import { expect, it } from 'vitest';
import component from './TabSwitcher.tsx?raw';
import manifest from '../../public/manifest.json?raw';

const catalogs = import.meta.glob<{ default: Record<string, { message: string }> }>('../../public/_locales/*/messages.json', { eager: true });

it('provides every UI and manifest message in every supported locale', () => {
  const english = catalogs['../../public/_locales/en/messages.json'].default;
  const referenced = [
    ...Array.from(component.matchAll(/(?:message|getMessage)\('([^']+)'/g), match => match[1]),
    ...Array.from(manifest.matchAll(/__MSG_(\w+)__/g), match => match[1]),
    'themeLight', 'themeDark', 'themeAuto',
  ];
  for (const key of referenced) expect(english[key], key).toBeDefined();
  for (const [locale, { default: catalog }] of Object.entries(catalogs)) {
    expect(Object.keys(catalog).sort(), locale).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(catalog)) {
      expect(value.message.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
    }
  }
});
