# Run the Erpcore app on your phone (Expo Go)

The app runs **directly in Expo Go** — no native build / EAS needed.

## 0. One-time
- Install **Expo Go** (App Store / Play Store).
- Put your **phone and this Mac on the same Wi-Fi**.
- This Mac's LAN IP: **192.168.1.6**

## A. Quick UI test — mock data, no backend (fastest)
```
cd mobile
npm run device
```
Scan the QR (iOS: Camera app; Android: the scanner inside Expo Go). You land in a
Student dashboard with sample data. To try the other personas:
```
EXPO_PUBLIC_DEV_FAKE_ROLE=Parent  npm run device   # parent + child switcher
EXPO_PUBLIC_DEV_FAKE_ROLE=Teacher npm run device   # mark attendance / schedule
```

## B. Real backend test — live login + real data
1. **Restart the backend bound to the LAN** (it's currently localhost-only, so the phone
   can't reach it). From `backend/`, add `--host 0.0.0.0` to your usual run command, e.g.:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Start Expo pointed at the LAN IP + a real school code:**
   ```
   cd mobile
   EXPO_PUBLIC_SCHOOL_CODE=<your-school-subdomain> \
   EXPO_PUBLIC_SCHOOL_NAME="<Your School Name>" \
   EXPO_PUBLIC_API_URL=http://192.168.1.6:8000/api/v1 \
   expo start
   ```
3. Scan the QR, then sign in with a **real student / parent / teacher** account in that
   school. The school-lock rejects any account from a different school; 2FA shows an OTP step.

## Notes
- App icon / splash are still the default Expo art (per-school icons = TODO).
- If Expo Go says "unsupported SDK", update Expo Go (this app is SDK 56).
- No backend needed for mode A; mode B needs the rebind in step 1.
