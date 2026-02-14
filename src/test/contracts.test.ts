import { describe, expect, it } from 'vitest';
import {
  confirmationKeywordSchema,
  emailSchema,
  parseMembershipPayload,
  profileNameSchema,
} from '../contracts';

describe('contract validators', () => {
  it('normalizes profile names', () => {
    const parsed = profileNameSchema.parse('  Alice  ');
    expect(parsed).toBe('Alice');
  });

  it('parses membership payload from object and array', () => {
    const payload = {
      household_id: '2a8adfd5-f018-45e9-8f92-f90a57107035',
      role: 'owner' as const,
    };

    expect(parseMembershipPayload(payload)).toEqual(payload);
    expect(parseMembershipPayload([payload])).toEqual(payload);
  });

  it('normalizes email casing', () => {
    expect(emailSchema.parse('  TeSt@Example.com ')).toBe('test@example.com');
  });

  it('requires DELETE confirmation keyword', () => {
    expect(confirmationKeywordSchema.safeParse('DELETE').success).toBe(true);
    expect(confirmationKeywordSchema.safeParse('delete').success).toBe(false);
  });
});
