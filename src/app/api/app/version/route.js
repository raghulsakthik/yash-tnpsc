import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The latest published Android build, checked by the app on launch so it
// can show an "update available" banner instead of silently going stale.
// No session required -- this has to work before the app knows whether
// its own session is valid. Bump ANDROID_VERSION_CODE (must match
// android/app/build.gradle.kts's versionCode exactly) whenever a new APK
// is cut, same as the manual step every release process has; there is no
// store-published build yet to read this from automatically.
const ANDROID_LATEST = {
  versionCode: 2,
  versionName: '0.2.0',
  url: 'https://github.com/raghulsakthik/yash-tnpsc/releases/tag/android-v0.1.0',
  notes: 'Design refresh: real color palette, 5-tab navigation, and screen copy matched to the design package.',
};

export async function GET() {
  return NextResponse.json({ android: ANDROID_LATEST });
}
