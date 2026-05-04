# Team Task Manager

A role-based project and task management app built with **React**, **Firebase Authentication**, and **Firebase Realtime Database (RTDB)**. Admins create projects and assign tasks; Members track and update progress on their own tasks — all in real time, no page reload needed.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How Firebase Auth Works in This Project](#how-firebase-auth-works-in-this-project)
- [How Firebase RTDB Works in This Project](#how-firebase-rtdb-works-in-this-project)
- [Role & Permission System](#role--permission-system)
- [Setup Guide for New Users](#setup-guide-for-new-users)
- [Environment Variables](#environment-variables)
- [Common Issues & Fixes](#common-issues--fixes)

---

## Features

- Email/password signup and login via Firebase Auth
- Role-based access: **ADMIN** and **MEMBER**
- Admins can create/delete projects and assign tasks to members
- Members can update status (To Do → In Progress → Done) on their own tasks
- All data updates are **real-time** — no page refresh required
- Persistent login — session survives page reloads

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Auth | Firebase Authentication |
| Database | Firebase Realtime Database |
| Animations | Framer Motion |
| UI | Bootstrap 5 + Lucide Icons |

---

## Project Structure

```
src/
├── context/
│   └── AuthContext.jsx      # Auth state + dbUser provider
├── pages/
│   ├── Login.jsx            # Login form
│   ├── Signup.jsx           # Signup form (with role selection)
│   ├── Dashboard.jsx        # Project list + all/my tasks
│   └── ProjectDetails.jsx   # Tasks for a single project
├── utils/
│   └── permissions.js       # Role-based permission helpers
├── firebase.js              # Firebase app init + exports
└── App.jsx                  # Routes + PrivateRoute guard
```

---

## How Firebase Auth Works in This Project

### Auth Flow

```
User visits app
      │
      ▼
PrivateRoute checks loading state
      │
      ├── loading === true  →  show spinner (wait for Firebase)
      │
      ├── currentUser === null  →  redirect to /login
      │
      └── currentUser exists  →  render the page
```

### Why the loading check matters

Firebase Auth restores the session **asynchronously** on page reload. Without the `loading` guard in `PrivateRoute`, `currentUser` is `null` for ~300ms on every refresh, which causes an immediate redirect to `/login` even for logged-in users.

```jsx
// App.jsx — PrivateRoute
const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <Spinner />; // ← wait for Firebase to restore session
  return currentUser ? children : <Navigate to="/login" replace />;
};
```

### AuthContext — two users in one

Firebase gives you a `firebaseUser` object (from Auth) that holds `uid`, `email`, and `displayName`. But role and name are stored in RTDB. `AuthContext` fetches both and merges them into a single `dbUser` object available everywhere:

```js
// What dbUser looks like after AuthContext resolves:
{
  id: "uid_abc123",
  email: "alice@company.com",
  name: "Alice",
  role: "ADMIN"   // or "MEMBER"
}
```

**On login / signup / reload:**

1. `onAuthStateChanged` fires with the `firebaseUser`
2. A `get()` call fetches `users/{uid}` from RTDB
3. Both are merged into `dbUser` and stored in context
4. `loading` is set to `false` — the app renders

### Signup

During signup, two things happen in sequence:

```js
// 1. Create the Firebase Auth account
const credential = await createUserWithEmailAndPassword(auth, email, password);

// 2. Write the user profile (including role) to RTDB
await set(ref(db, `users/${credential.user.uid}`), { name, email, role });
```

The role (`ADMIN` or `MEMBER`) is written to RTDB at signup and validated by the database rules.

---

## How Firebase RTDB Works in This Project

### Data Shape

```
/
├── users/
│   └── {uid}/
│       ├── name:      "Alice"
│       ├── email:     "alice@company.com"
│       └── role:      "ADMIN"  |  "MEMBER"
│
├── projects/
│   └── {projectId}/
│       ├── name:        "Website Redesign"
│       ├── description: "..."
│       ├── managerId:   "{uid}"
│       └── createdAt:   "2024-01-01T00:00:00.000Z"
│
└── tasks/
    └── {taskId}/
        ├── title:       "Build login page"
        ├── description: "..."
        ├── projectId:   "{projectId}"
        ├── assigneeId:  "{uid}"
        ├── status:      "TODO"  |  "IN_PROGRESS"  |  "DONE"
        └── createdAt:   "2024-01-01T00:00:00.000Z"
```

### Real-Time Listeners

Dashboard and ProjectDetails both use `onValue()` — Firebase's real-time listener — instead of one-time `get()` calls. This means any change written to RTDB (by any user) is pushed to all connected clients instantly.

```js
// Three parallel listeners — each updates a ref and re-derives state
const unsubUsers    = onValue(ref(db, "users"),    (snap) => { ... });
const unsubProjects = onValue(ref(db, "projects"), (snap) => { ... });
const unsubTasks    = onValue(ref(db, "tasks"),    (snap) => { ... });

// Clean up when component unmounts
return () => { unsubUsers(); unsubProjects(); unsubTasks(); };
```

### Why `useRef` instead of `useState` for raw data

The three raw data maps (`usersData`, `projectsData`, `tasksData`) are stored in `useRef` rather than `useState`. This is intentional:

- Each listener fires independently. If stored in `useState`, one listener updating its state would trigger a re-render before the other two have updated — causing a brief render with stale cross-references (e.g. a task rendered before its project name is loaded).
- With `useRef`, all three maps are always in sync when `sync()` runs, because refs are mutable and don't trigger re-renders themselves. Only the derived `projects` and `tasks` arrays (set via `useState`) cause re-renders.

```js
const usersRef    = useRef({});   // raw map, no re-render
const projectsRef = useRef({});
const tasksRef    = useRef({});

const sync = () => {
  // derive display data from all three maps at once
  // then call setProjects / setTasks → single re-render
};
```

---

## Role & Permission System

All permission logic lives in `src/utils/permissions.js`. Components import these helpers and use them to conditionally render UI and guard write operations.

| Action | ADMIN | MEMBER |
|---|:---:|:---:|
| Create project | ✅ | ❌ |
| Delete project | ✅ | ❌ |
| Create task | ✅ | ❌ |
| Assign task to member | ✅ | ❌ |
| Delete task | ✅ | ❌ |
| Update status on **own** task | ✅ | ✅ |
| Update status on **others'** tasks | ✅ | ❌ |
| View all tasks | ✅ | ❌ (own only) |

---

## Setup Guide for New Users

### 1. Clone the repository

```bash
git clone https://github.com/your-username/team-task-manager.git
cd team-task-manager
npm install
```

### 2. Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → click through the steps
3. On the project dashboard, click the **Web** icon (`</>`) to register a web app
4. Give it a nickname (e.g. `team-task-manager-web`)
5. Copy the `firebaseConfig` object shown — you'll need it in the next step

### 3. Enable Firebase Authentication

1. In the Firebase console, go to **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Email/Password**
4. Click **Save**

### 5. Enable Firebase Realtime Database

1. Go to **Build → Realtime Database**
2. Click **Create Database**
3. Choose your region (pick the one closest to your users)
4. Start in **locked mode** (you'll add the rules next)
5. Click **Enable**

### 6. Deploy the Database Rules

1. In the Realtime Database console, click the **Rules** tab
2. Replace the contents with the rules from `database.rules.json` in this project
3. Click **Publish**

### 7. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

All values come from the `firebaseConfig` object you copied in step 2.

### 8. Wire up the config in `firebase.js`

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getDatabase(app);
```

### 9. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 10. First-time usage

1. Go to `/signup` and create an **Admin** account (select Administrator role)
2. Create another account as a **Member**
3. Log in as Admin → create a project → open it → assign tasks to the Member
4. Log in as Member → see only your tasks → update their status

---

## Environment Variables

| Variable | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same as above |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database → Data tab (the URL at the top) |
| `VITE_FIREBASE_PROJECT_ID` | Project Settings → General |
| `VITE_FIREBASE_STORAGE_BUCKET` | Project Settings → Your apps |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Project Settings → Your apps |
| `VITE_FIREBASE_APP_ID` | Project Settings → Your apps |

> **Never commit your `.env` file.** Add it to `.gitignore`.

---

## Common Issues & Fixes

**Dashboard shows spinner forever / user gets logged out on reload**
→ Make sure `PrivateRoute` in `App.jsx` checks `loading` before checking `currentUser`. Firebase needs ~300ms to restore the session on page load.

**"Failed to load users" error in console**
→ Your database rule for `users` must have `.read: "auth != null"` at the **collection level**, not nested inside `$uid`. See `database.rules.json`.

**Members can't update task status**
→ The task write rule requires `data.exists()` — meaning the task must already exist (members cannot create tasks, only update them). If you're seeing permission errors, check that `assigneeId` in the task matches the logged-in user's `uid` exactly.

**No members showing in the assign dropdown**
→ The dropdown only lists users with `role === "MEMBER"` in RTDB. Make sure the member signed up with the Member role — check the Firebase Console under Realtime Database → users → {uid} → role.

**Tasks not updating in real time**
→ Confirm you haven't removed the `onValue` listeners or added `return` statements before the cleanup function in `useEffect`.