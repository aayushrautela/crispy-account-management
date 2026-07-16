import { describe, expect, it } from 'vitest';
import {
  confirmationKeywordSchema,
  emailSchema,
  profileNameSchema,
} from '../contracts';

describe('contract validators', () => {
  it('normalizes profile names', () => {
    const parsed = profileNameSchema.parse('  Alice  ');
    expect(parsed).toBe('Alice');
  });

  it('normalizes email casing', () => {
    expect(emailSchema.parse('  TeSt@Example.com ')).toBe('test@example.com');
  });

  it('requires DELETE confirmation keyword', () => {
    expect(confirmationKeywordSchema.safeParse('DELETE').success).toBe(true);
    expect(confirmationKeywordSchema.safeParse('delete').success).toBe(false);
  });
});
