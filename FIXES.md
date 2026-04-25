# Bug Fixes & New Features Applied
## Summary of all changes from both rounds of fixes

---

## Fix 1 — Change Password (BCrypt + Real-Time Firestore)
**Files:** `auth.service.ts`, `profile.component.ts`, `profile.component.html`

**Root cause:** `changePassword()` was a stub that only showed a toast. No Firestore write occurred.

**Now:**
1. Fetches user document from Firestore
2. `bcrypt.compare(currentPassword, storedHash)` — rejects wrong current passwords
3. `bcrypt.hash(newPassword, 10)` — hashes new password
4. `updateDoc()` writes new `passwordHash` to Firestore in real-time
5. Button shows "Updating…" and is disabled while in-flight

---

## Fix 2 — Auto-Delete Completed Reports After 1 Week
**File:** `incident.service.ts`

Runs on startup + every hour. Queries `incidents` collection, deletes any document where
`status === 'completed'` AND `completedAt` is older than 7 days. Uses `Promise.all()` for
batch deletion. Interval cleared in `ngOnDestroy()`.

---

## Fix 3 — Navbar Role Label Bug (NGO Admin → Victim/User on /profile)
**File:** `navbar.component.ts`

**Root cause:** Role was inferred from the URL path. `/profile` has no role prefix, so it
always fell through to "Victim / User".

**Now:** Uses `authService.getUserRole()` which reads `localStorage.getItem('userRole')` — the
actual stored role set at login. Role label is re-evaluated on every `NavigationEnd` event.

---

## Fix 4 — Google Maps Directions for Volunteers
**Files:** `volunteer-missions.component.ts`, `volunteer-missions.component.html`, `volunteer-missions.component.scss`

**Was:** `getDirectionsUrl()` existed but only built a destination-only URL. No embedded map.

**Now:**
- `navigator.geolocation.getCurrentPosition()` gets volunteer's live GPS at page load
- **Embedded map preview** (`<iframe>`) renders below each mission card showing incident location
- **"Navigate There"** button uses `window.open()` with `origin=myLat,myLng&destination=incidentLat,incidentLng&travelmode=driving`
- **"Open in Maps"** fallback link for external Google Maps
- Distance label ("3.2 km away") computed with `IncidentService.haversineKm()`

---

## Fix 5 — In-App Alert Notifications for Victims
**Files:** `notification.service.ts` (new), `incident.service.ts`, `navbar.component.ts`, `navbar.component.html`, `victim-dashboard.component.ts`

**New `NotificationService`:**
- Stores alerts in Firestore: `notifications/{victimEmail}/alerts/{notifId}`
- Real-time `onSnapshot` listener per logged-in user
- Two notification types: `volunteer_assigned` and `incident_completed`

**Triggered automatically:**
- When NGO assigns a volunteer → victim gets: *"🙌 Volunteer Assigned — [Name] is on the way"*
- When volunteer marks served → victim gets: *"✅ Your Incident Has Been Resolved — you can now rate"*

**Navbar bell:**
- Shows live unread count badge
- Dropdown lists latest 5 notifications with icon, color, message preview
- "Mark all read" button updates Firestore `read: true` in batch

**Production SMS/Email:**
To add real SMS/email delivery, configure **Firebase Extension: Trigger Email** or
**Twilio SMS** in the Firebase console pointed at the `notifications` Firestore collection.

---

## Fix 6 — Victim Can Rate Volunteers After Completion
**Files:** `victim-reports.component.ts`, `victim-reports.component.html`, `victim-reports.component.scss`

**Now:**
- Completed report cards show a **"Rate Volunteer Service"** button
- Clicking opens a star rating panel (1–5 stars) with optional comment textarea
- `incidentService.addReview()` saves the review to Firestore under the incident's `reviews[]` array
- Once rated, button is replaced with *"You rated this X/5 — Thank you!"*
- `hasAlreadyRated()` prevents double-rating by checking `review.victimId === currentUserEmail`
- Volunteer missions page shows the received star rating in completed cards

---

## Setup Instructions

```bash
# 1. Copy environment file and fill in your Firebase + API keys
cp src/environments/environment.example.ts src/environments/environment.ts

# 2. Install dependencies
npm install

# 3. Run dev server
ng serve
# → http://localhost:4200
```

## Firestore Security Rules (recommended addition)
```
match /notifications/{email}/alerts/{notifId} {
  allow read, write: if request.auth == null ||
    request.resource.data.recipientEmail == email;
}
```
