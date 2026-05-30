export type SupabaseAuthErrorLike =
  | {
      code?: string;
      message?: string;
    }
  | null
  | undefined;

export function getPasswordUpdateErrorMessage(error: unknown, fallbackMessage: string): string {
  const authError = error as SupabaseAuthErrorLike;

  if (authError?.code === 'same_password') {
    return 'La nueva contraseña debe ser diferente a la anterior.';
  }

  return authError?.message ?? fallbackMessage;
}
