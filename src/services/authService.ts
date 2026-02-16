/**
 * Authentication service — wraps all supabase.auth calls.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/database';

/* ── Sign-in ─────────────────────────────────────────────── */
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/* ── Sign-up ─────────────────────────────────────────────── */
export const signUp = async (
  email: string,
  password: string,
  redirectTo: string,
  metadata?: Record<string, unknown>,
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo, data: metadata },
  });
  if (error) throw error;
  return data;
};

/* ── Password reset ──────────────────────────────────────── */
export const resetPasswordForEmail = async (email: string, redirectTo: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
};

export const updatePassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
};

/* ── Session ─────────────────────────────────────────────── */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/* ── Profile ─────────────────────────────────────────────── */
export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
};
