import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.');

export const profileNameSchema = z
  .string()
  .trim()
  .min(1, 'Profile name is required.')
  .max(32, 'Profile name must be 32 characters or fewer.')
  .transform((value) => value.trim());

export const avatarUrlSchema = z
  .string()
  .trim()
  .url('Avatar URL must be a valid URL.')
  .max(1024, 'Avatar URL is too long.')
  .nullable();

export const confirmationKeywordSchema = z.literal('DELETE');
