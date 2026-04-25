
# Community Impact Web — Redesigned UI

## 🚀 Quick Start

### 1. Install Dependencies

```bash

npm install

```

### 2. Configure Google Maps API Key

In `src/index.html`, replace `YOUR_API_KEY` with your actual Google Maps JavaScript API key:

```html

<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>

```

### 3. Configure Gemini API Key

In `src/app/core/services/gemini.service.ts`, replace `YOUR_GEMINI_API_KEY`:

```typescript

const GEMINI_API_KEY = 'your-actual-gemini-key';

```

### 4. Run the Development Server

```bash

ng serve

```

Navigate to `http://localhost:4200`

---

## 🔥 Connect Firebase (Production)

### Install Firebase

```bash

npm install firebase @angular/fire

```

### Update `src/app/core/services/auth.service.ts`

Uncomment Firebase imports and replace stub methods with real Firebase Auth calls.

### Update `src/app/core/services/incident.service.ts`

Uncomment Firestore imports and replace in-memory BehaviorSubject with real Firestore queries.

---

## 🎨 What Was Redesigned

| Page | Changes |

|------|---------|

| **Landing** | Hero section, animated role cards with feature lists, stat pills |

| **Login / Register** | Centered glass-morphism card, role-colored icon, clean form |

| **All Dashboards** | Glossy green sidebar, sticky top navbar, proper grid layout |

| **NGO Dashboard** | 4-stat grid with icons, map section, incident cards with assign button |

| **Volunteer Dashboard** | Mission alert banner, map + report side-by-side |

| **Victim Dashboard** | Emergency alert, report form + history + map grid |

| **Profile** | Identity card with stats, tab navigation (General / Contact / Activity) |

| **Report Incident** | Image preview, voice recording state, location row, **FIXED submission error** |

## 🐛 Bug Fixes

### Report Submission Error — FIXED

**Root cause:** `submitReport()` was throwing if Gemini API call failed, aborting the Firestore write.

**Fix:** Gemini analysis is now wrapped in its own `try/catch`. If it fails, safe defaults are used (`severity: 'Medium'`, `type: 'Other'`) and the Firestore submission still proceeds. See `report-incident.component.ts`.

---

## 📁 Project Structure

```

src/

├── styles.scss                    ← Global Poppins font + CSS variables

├── index.html                     ← Google Maps + Material Icons CDN links

└── app/

    ├── core/services/

    │   ├── auth.service.ts        ← Auth (stub → replace with Firebase)

    │   ├── incident.service.ts    ← Incidents (stub → replace with Firestore)

    │   └── gemini.service.ts      ← Gemini AI (add your API key)

    ├── features/

    │   ├── auth/landing/          ← Landing page

    │   ├── auth/login/            ← Login

    │   ├── auth/register/         ← Register

    │   ├── ngo/dashboard/         ← NGO dashboard

    │   ├── volunteer/dashboard/   ← Volunteer dashboard

    │   ├── victim/dashboard/      ← Victim dashboard

    │   └── profile/profile/       ← Profile page

    └── shared/components/

        ├── sidebar/               ← Glossy green sidebar

        ├── navbar/                ← Top navbar with user menu

        └── report-incident/       ← Report form (submission fixed)

```
