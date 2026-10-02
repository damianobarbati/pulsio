import { describe, expect, it } from 'vitest';
import { toAmount } from '#webapp/helpers.ts';

describe('toAmount', () => {
  it.each(['en', 'it', 'de', 'fr', 'es', 'pt'])('uses the USD symbol in %s', (locale) => {
    const amount = toAmount(1234, 'USD', '', locale);

    expect(amount).toContain('$');
    expect(amount).not.toContain('USD');
  });
});
