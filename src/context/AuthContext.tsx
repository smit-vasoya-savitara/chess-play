/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { MatchRecord, UserStats } from '../types/chess';
import { cloudSync, UserProfile } from '../services/cloudSync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveMatchToCloud: (record: MatchRecord) => Promise<void>;
  syncStatsToCloud: (stats: UserStats) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Load or initialize user profile in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const snapshot = await getDoc(userDocRef);
          if (!snapshot.exists()) {
            // Initialize new user profile
            const currentStats = cloudSync.getStats();
            const currentProfile = cloudSync.getProfile();

            const newUserData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Grandmaster',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              house: currentProfile.house,
              rating: currentStats.rating,
              peakRating: currentStats.peakRating,
              tier: currentStats.tier,
              division: currentStats.division,
              gamesPlayed: currentStats.gamesPlayed,
              wins: currentStats.wins,
              losses: currentStats.losses,
              draws: currentStats.draws,
              winStreak: currentStats.winStreak,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUserData);
          } else {
            // Restore from cloud
            const data = snapshot.data();
            if (data) {
              const localStats = cloudSync.getStats();
              localStats.rating = data.rating ?? localStats.rating;
              localStats.peakRating = data.peakRating ?? localStats.peakRating;
              localStats.tier = data.tier ?? localStats.tier;
              localStats.division = data.division ?? localStats.division;
              localStats.gamesPlayed = data.gamesPlayed ?? localStats.gamesPlayed;
              localStats.wins = data.wins ?? localStats.wins;
              localStats.losses = data.losses ?? localStats.losses;
              localStats.draws = data.draws ?? localStats.draws;
              cloudSync.saveStats(localStats);

              const localProfile = cloudSync.getProfile();
              if (data.displayName) localProfile.name = data.displayName;
              if (data.house) localProfile.house = data.house;
              cloudSync.saveProfile(localProfile);
            }
          }
        } catch (err) {
          console.warn('Error fetching Firestore user profile:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const saveMatchToCloud = async (record: MatchRecord) => {
    if (!user) return;
    const matchDocPath = `users/${user.uid}/matches/${record.id}`;
    try {
      const matchDocRef = doc(db, 'users', user.uid, 'matches', record.id);
      await setDoc(matchDocRef, {
        id: record.id,
        userId: user.uid,
        opponentName: record.opponentName,
        opponentElo: record.opponentElo,
        opponentHouse: record.opponentHouse,
        playerColor: record.playerColor,
        result: record.result,
        reason: record.reason,
        pgn: record.pgn,
        movesCount: record.movesCount,
        ratingDelta: record.ratingDelta,
        playerAccuracy: record.accuracy.player,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, matchDocPath);
    }
  };

  const syncStatsToCloud = async (stats: UserStats) => {
    if (!user) return;
    const userDocPath = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        rating: stats.rating,
        peakRating: stats.peakRating,
        tier: stats.tier,
        division: stats.division,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winStreak: stats.winStreak,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userDocPath);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
        saveMatchToCloud,
        syncStatsToCloud
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
