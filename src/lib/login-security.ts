import { prisma } from "./prisma";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface ConsecutiveFailureState {
  count: number;
  lockoutAnchor: Date | null;
}

async function getConsecutiveFailureState(
  email: string
): Promise<ConsecutiveFailureState> {
  const attempts = await prisma.loginAttempt.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    take: MAX_ATTEMPTS + 1,
    select: { success: true, createdAt: true },
  });

  const consecutiveFailures: Date[] = [];

  for (const attempt of attempts) {
    if (attempt.success) break;
    consecutiveFailures.push(attempt.createdAt);
  }

  if (consecutiveFailures.length < MAX_ATTEMPTS) {
    return { count: consecutiveFailures.length, lockoutAnchor: null };
  }

  // El lockout arranca cuando se alcanza el N-ésimo fallo consecutivo (el más antiguo del bloqueo).
  const lockoutAnchor = consecutiveFailures[MAX_ATTEMPTS - 1];

  return { count: consecutiveFailures.length, lockoutAnchor };
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const { count, lockoutAnchor } = await getConsecutiveFailureState(email);

  if (count < MAX_ATTEMPTS || !lockoutAnchor) return false;

  const unlockAt = lockoutAnchor.getTime() + LOCKOUT_MINUTES * 60 * 1000;
  return Date.now() < unlockAt;
}

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, success, ipAddress },
  });
}

export function getLockoutMessage(): string {
  return `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Espera ${LOCKOUT_MINUTES} minutos.`;
}

export async function getRemainingLockoutMinutes(email: string): Promise<number> {
  const { count, lockoutAnchor } = await getConsecutiveFailureState(email);

  if (count < MAX_ATTEMPTS || !lockoutAnchor) return 0;

  const unlockAt = lockoutAnchor.getTime() + LOCKOUT_MINUTES * 60 * 1000;
  return Math.max(0, Math.ceil((unlockAt - Date.now()) / 60000));
}
