import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

const config = {
  apiKey: "demo-api-key",
  authDomain: "demo-kryvex.firebaseapp.com",
  projectId: "demo-kryvex",
};
const app = initializeApp(config);
const auth = getAuth(app);
connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
const firestore = getFirestore(app);
connectFirestoreEmulator(firestore, "localhost", 8080);
const functions = getFunctions(app);
connectFunctionsEmulator(functions, "localhost", 5001);

const email = `repro-${Date.now()}@example.com`;
const password = "some-fake-auth-secret-hex-string";

try {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(firestore, "users", cred.user.uid), {
    uid: cred.user.uid,
    email,
    kdfSalt: "aa",
    kdfParams: { m: 19456, t: 2, p: 1 },
    protectedVaultKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    settings: { autoLockMinutes: 5, clipboardClearSeconds: 30, biometricUnlockEnabled: false },
    createdAt: new Date(),
  });
  await signOut(auth);
  const getKdfParams = httpsCallable(functions, "getKdfParams");
  const result = await getKdfParams({ email });
  console.log("getKdfParams OK:", JSON.stringify(result.data));
  const signInCred = await signInWithEmailAndPassword(auth, email, password);
  console.log("SIGN-IN OK, uid:", signInCred.user.uid);
} catch (err) {
  console.error("REPRO ERROR:", err?.code, err?.message);
  process.exitCode = 1;
}
