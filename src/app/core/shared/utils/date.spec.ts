import { describe, expect, it } from 'vitest';

import { formatDateOnly } from './date';

describe('formatDateOnly', () => {
  it('formats a date as yyyy-MM-dd without timezone conversion', () => {
    expect(formatDateOnly(new Date(2026, 5, 1))).toBe('2026-06-01');
  });

  it('pads single digit month and day values', () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
