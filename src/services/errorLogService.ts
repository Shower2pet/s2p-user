/**
 * Error logging service — logs errors to app_error_logs table.
 * Shows generic messages to users, stores real details in DB.
 */
import { supabase } from '@/integrations/supabase/client';

export const GENERIC_ERROR_MESSAGE = 'Si è verificato un errore. Riprova più tardi.';

interface ErrorLogParams {
  error_message: string;
  error_stack?: string | null;
  error_context?: string | null;
  component?: string | null;
  severity?: 'error' | 'warning' | 'critical';
}

export async function logErrorToDb(params: ErrorLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('app_error_logs').insert({
      error_message: params.error_message,
      error_stack: params.error_stack ?? null,
      error_context: params.error_context ?? null,
      component: params.component ?? null,
      severity: params.severity ?? 'error',
      page_url: window.location.href,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
    });
  } catch {
    // Silently fail — we don't want error logging to cause more errors
    console.error('[ErrorLog] Failed to persist error log');
  }
}

/** Setup global handlers for uncaught errors */
export function setupGlobalErrorHandlers(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;

    logErrorToDb({
      error_message: message,
      error_stack: stack,
      error_context: 'unhandledrejection',
      severity: 'error',
    });
  });

  window.addEventListener('error', (event) => {
    logErrorToDb({
      error_message: event.message || 'Unknown error',
      error_stack: event.error?.stack,
      error_context: `Global error at ${event.filename}:${event.lineno}`,
      severity: 'error',
    });
  });
}
