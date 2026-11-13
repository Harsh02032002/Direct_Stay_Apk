# DirectStay Admin (`/admin`) — React Native Mobile App

Dedicated **React Native** mobile application exclusively for the **DirectStay `/admin` Hotel Property Management Panel**, featuring a luxury Espresso & Gold UI (`#17120F` & `#C49A3A`), a **Bottom Navigation Bar**, live synchronization with `https://directstay.online/api/...`, **With GST / No GST** Advance Booking & Check-In controls, and **Strict Locked GST + Separate Invoice** billing.

---

## Included Modules (Bottom Navigation Bar)

1. **Dashboard** — Live KPIs (Occupancy, In-House, Arrivals, Pending Housekeeping, Today's Collection), room status snapshot, and quick action shortcuts.
2. **Front Desk** — Advance Bookings, In-House Guests, Checked-Out history, **New Advance Booking** (`With GST` `5% / 12% / 18%` vs `No GST 0%`), **Walk-In / Booking Check-In** (`With GST` vs `No GST 0%`), and 1-tap Checkout + Invoice generation.
3. **Rooms** — Live Room Grid filtered by status (`Available`, `Occupied`, `Cleaning`, `Maintenance`) with 1-tap room status updates synced to live PMS.
4. **Invoices** — Generated Hotel Invoices with **strict GST Immutability** (`🔒 Locked` GST / No-GST mode — never editable after creation) and **`+ Separate Invoice`** modal to generate a brand-new sequential invoice when the alternate GST mode is required.
5. **Operations** — Housekeeping task status board (`Pending`, `In Progress`, `Completed`), Maintenance work orders, hotel profile details, and secure `/admin` sign-out.

---

## Live API Integration (`https://directstay.online`)

Uses the existing production DirectStay endpoints directly (no backend duplication needed):
- `POST https://directstay.online/api/auth/login` (`portalMode: 'admin'` — blocks SuperAdmin accounts cleanly)
- `GET https://directstay.online/api/db/state?hotelId=<hotelId>`
- `POST https://directstay.online/api/pms-data`
- `POST https://directstay.online/api/invoices/generate`
- `POST https://directstay.online/api/auth/logout`

---

## Native Android XML & GitHub Automated APK Build

All Android XML configuration files and GitHub CI workflow files are pre-configured:
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/xml/network_security_config.xml`
- `android/app/src/main/res/values/strings.xml`, `colors.xml`, `styles.xml`
- `apk-build-config.xml`
- `.github/workflows/build-apk.yml`

### How to Build the `.apk` Automatically on GitHub

1. Create a new GitHub repository (for example, `directstay-admin-mobile`).
2. Run these commands inside `directstay-admin-mobile`:
   ```bash
   git init
   git add .
   git commit -m "Initial DirectStay /admin React Native mobile app with APK workflow"
   git branch -M main
   git remote add origin https://github.com/<your-username>/directstay-admin-mobile.git
   git push -u origin main
   ```
3. Open your GitHub repository -> **Actions** tab -> **Build DirectStay Admin APK**.
4. Once the workflow turns green, scroll down to **Artifacts** and download:
   - **`DirectStay-Admin-Release-APK`** (`DirectStay-Admin-Release.apk`)
   - **`DirectStay-Admin-Debug-APK`** (`DirectStay-Admin-Debug.apk`)

---

## Run Locally During Development

```bash
npm install --legacy-peer-deps
npm run start
```
