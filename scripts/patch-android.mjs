/**
 * Patches the freshly generated Capacitor Android shell for the game:
 *  1. lock the activity to landscape (sensorLandscape — matches the game's UX);
 *  2. draw behind the status bar (windowFullscreen) for an immersive frame.
 * Idempotent: safe to run twice. The theme patch warns instead of failing, so a
 * Capacitor template change can never break the APK build — orientation is the
 * only hard requirement.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
try {
  let m = readFileSync(manifestPath, 'utf8');
  if (m.includes('android:screenOrientation')) {
    console.log('[patch-android] orientation already set');
  } else if (m.includes('android:launchMode="singleTask"')) {
    m = m.replace(
      'android:launchMode="singleTask"',
      'android:screenOrientation="sensorLandscape" android:launchMode="singleTask"',
    );
    writeFileSync(manifestPath, m);
    console.log('[patch-android] manifest: sensorLandscape ✓');
  } else {
    throw new Error('launchMode anchor not found');
  }
} catch (err) {
  console.error('[patch-android] FATAL: could not set landscape orientation:', err.message);
  process.exit(1);
}

const themesPath = 'android/app/src/main/res/values/themes.xml';
try {
  let t = readFileSync(themesPath, 'utf8');
  if (t.includes('windowFullscreen')) {
    console.log('[patch-android] fullscreen already set');
  } else {
    const before = t;
    t = t.replace(
      /(<style name="AppTheme\.NoActionBar"[^>]*>)/,
      '$1\n        <item name="android:windowFullscreen">true</item>',
    );
    if (t === before) throw new Error('AppTheme.NoActionBar not found');
    writeFileSync(themesPath, t);
    console.log('[patch-android] themes: windowFullscreen ✓');
  }
} catch (err) {
  console.warn('[patch-android] WARN: fullscreen patch skipped —', err.message);
}
