import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseGuard } from '../src/auth/firebase.guard';
import { FirebaseService } from '../src/auth/firebase.service';

const contextFor = (authorization?: string) => {
  const request = {
    header: (name: string) => name === 'authorization' ? authorization : undefined,
  } as any;

  return {
    switchToHttp: () => ({ getRequest: () => request }),
    request,
  };
};

describe('FirebaseGuard', () => {
  it('rejects requests without a Bearer token', async () => {
    const guard = new FirebaseGuard({ verifyIdToken: jest.fn() } as unknown as FirebaseService);

    await expect(guard.canActivate(contextFor() as unknown as ExecutionContext))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies and attaches the Firebase user', async () => {
    const user = { uid: 'firebase-user-id' };
    const verifyIdToken = jest.fn().mockResolvedValue(user);
    const guard = new FirebaseGuard({ verifyIdToken } as unknown as FirebaseService);
    const context = contextFor('Bearer valid-token');

    await expect(guard.canActivate(context as unknown as ExecutionContext)).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(context.request.user).toBe(user);
  });

  it('rejects invalid Firebase tokens', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('invalid'));
    const guard = new FirebaseGuard({ verifyIdToken } as unknown as FirebaseService);

    await expect(guard.canActivate(contextFor('Bearer invalid-token') as unknown as ExecutionContext))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
