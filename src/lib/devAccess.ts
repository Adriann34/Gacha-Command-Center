import type { User } from 'firebase/auth'

// The single account allowed to reach the developer-only Battle Chronicle inspector (/dev/chronicle).
// This client-side check keeps the route hidden from other users, but it is NOT the security
// boundary — the Worker's /hoyolab/raw endpoint independently verifies the same email from the
// signed Firebase ID token before returning any raw payload. Keep the two values in sync.
export const DEV_EMAIL = 'adriantanbusiness34@gmail.com'

export function isDevUser(user: Pick<User, 'email'> | null | undefined): boolean {
  return !!user && user.email === DEV_EMAIL
}
