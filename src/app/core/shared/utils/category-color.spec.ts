import { describe, expect, it } from 'vitest';

import { getCategoryColorValue } from './category-color';

describe('getCategoryColorValue', () => {
  it('maps known semantic colors to the dashboard color value', () => {
    expect(getCategoryColorValue('teal')).toBe('#009688');
    expect(getCategoryColorValue(' Purple ')).toBe('#7e57c2');
  });

  it('keeps custom colors selected by the user unchanged', () => {
    expect(getCategoryColorValue('#12abef')).toBe('#12abef');
  });

  it('falls back to the neutral material token when no color is provided', () => {
    expect(getCategoryColorValue()).toBe('var(--mat-sys-outline)');
  });
});
