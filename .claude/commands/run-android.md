# Run Android App (Expo)

Starts the Expo dev server and opens Android.

```powershell
cd "d:\Claude AI Projects\Restaurant App\AndroidApp"
npx expo start --android
```

Or for a specific device/emulator:
```powershell
npx expo start
# then press 'a' for Android
```

**Requirements:**
- Android Studio installed with an emulator configured, OR
- Physical Android device with Expo Go app installed and USB debugging enabled

**Login:** Demo mode — any email/password, pick a role from the grid.

Build APK (EAS):
```powershell
npx eas build --platform android --profile preview
```
