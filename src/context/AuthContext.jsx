import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        try {
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          const snap = await get(userRef);
          const dbUserData = snap.val();

          if (dbUserData) {
            setDbUser({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: dbUserData.name || "User",
              role: dbUserData.role || "MEMBER",
            });
          } else {
            const defaultUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || "User",
              role: "MEMBER",
            };
            setDbUser(defaultUser);
          }
        } catch (error) {
          console.error("Failed to fetch user from RTDB", error);
          setDbUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || "User",
            role: "MEMBER",
          });
        }
      } else {
        setDbUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, dbUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
