// Les erreurs Supabase (`{ code, message, details, hint }`) ne sont pas des
// instances d'Error au runtime malgré leur typage — `err instanceof Error` y
// est faux et `String(err)` retombe sur "[object Object]". On lit `.message`
// directement si présent avant de se rabattre sur les cas génériques.
export function messageErreur(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return err instanceof Error ? err.message : String(err)
}
