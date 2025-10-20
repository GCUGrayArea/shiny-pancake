import { signUp, signIn, mapFirebaseAuthError } from '@/services/auth.service';
import * as firebaseModule from '@/services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
}));

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(firebaseModule, 'getFirebaseAuth').mockReturnValue({} as any);
  });

  it('maps firebase errors to friendly messages', () => {
    expect(mapFirebaseAuthError('auth/invalid-email')).toMatch(/valid email/i);
    expect(mapFirebaseAuthError('auth/weak-password')).toMatch(/least/i);
  });

  it('signUp creates user and updates profile', async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid: 'u1', email: 'a@b.com', metadata: {} } });
    (updateProfile as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(require('@/services/user.service'), 'createUserProfile').mockResolvedValue(undefined);
    const user = await signUp('a@b.com', 'password123', 'Alice');
    expect(user.uid).toBe('u1');
  });

  it('signIn returns user on success', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid: 'u2', email: 'x@y.com', metadata: {} } });
    const user = await signIn('x@y.com', 'password123');
    expect(user.uid).toBe('u2');
  });
});



