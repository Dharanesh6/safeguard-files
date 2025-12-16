import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return { user: userCredential.user, token };
};

export const logoutUser = () => {
  return signOut(auth);
};

export const registerUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return { user: userCredential.user, token };
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const token = await userCredential.user.getIdToken();
  return { user: userCredential.user, token };
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};