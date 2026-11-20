import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  ensureUserProfile,
  getUserProfileDoc,
  logoutUser,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  updateUserProfileDoc,
} from '../services/firebaseService';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isCloudSynced: boolean;
  profileName: string;
  homeAirport: string;
  signInGoogle: () => Promise<User>;
  signInEmail: (email: string, password: string) => Promise<User>;
  signUpEmail: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfileInfo: (name: string, homeAirport: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_PROFILE_KEY = 'voyagemind_demo_profile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileName, setProfileName] = useState('Traveller');
  const [homeAirport, setHomeAirport] = useState('Chennai (MAA)');

  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_PROFILE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { name?: string; homeAirport?: string };
        if (parsed.name) setProfileName(parsed.name);
        if (parsed.homeAirport) setHomeAirport(parsed.homeAirport);
      }
    } catch {
      // ignore storage errors
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setProfileName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Traveller');
        if (firebaseUser.emailVerified) {
          try {
            await ensureUserProfile(firebaseUser);
            const prof = await getUserProfileDoc(firebaseUser.uid);
            if (prof) {
              setProfileName(prof.name);
              if (prof.homeAirport) setHomeAirport(prof.homeAirport);
            }
          } catch (err) {
            console.error('Failed to sync user profile:', err);
          }
        }
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isCloudSynced = Boolean(user && user.emailVerified);

  const updateProfileInfo = async (name: string, airport: string) => {
    setProfileName(name);
    setHomeAirport(airport);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify({ name, homeAirport: airport }));
    if (user && user.emailVerified) {
      await updateUserProfileDoc(user.uid, { name, homeAirport: airport });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isCloudSynced,
        profileName,
        homeAirport,
        signInGoogle: signInWithGoogle,
        signInEmail: signInWithEmail,
        signUpEmail: registerWithEmail,
        signOut: logoutUser,
        updateProfileInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
