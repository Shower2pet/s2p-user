import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Indirizzo email non valido'),
  password: z.string().min(8, 'La password deve essere di almeno 8 caratteri'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Il nome è troppo corto').max(100, 'Il nome è troppo lungo'),
  email: z.string().trim().email('Indirizzo email non valido'),
  password: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .regex(/[A-Z]/, 'Deve contenere almeno una lettera maiuscola')
    .regex(/[a-z]/, 'Deve contenere almeno una lettera minuscola')
    .regex(/[0-9]/, 'Deve contenere almeno un numero'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Le password non corrispondono',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
