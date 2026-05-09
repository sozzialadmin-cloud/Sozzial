import { z } from 'zod'

export const authModes = {
  SIGN_IN: 'signin',
  SIGN_UP: 'signup',
}

const baseSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must have at least 6 characters.'),
  rememberMe: z.boolean().default(true),
})

export const signInSchema = baseSchema

export const signUpSchema = baseSchema.extend({
  username: z
    .string()
    .trim()
    .min(2, 'Choose a public username.')
    .max(30, 'Username is too long.'),
})

