#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "error=$*" >&2
  exit 1
}

scan_files=(
  "apps/mobile/android/app/build.gradle.kts"
  "apps/mobile/android/build.gradle.kts"
  "apps/mobile/android/settings.gradle.kts"
  "apps/mobile/android/app/src/main/AndroidManifest.xml"
  "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
  "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/SharedCoreMobileApi.kt"
  "apps/mobile/android/app/src/main/java/chat/anotherdimension/android/JsonBridgeSharedCoreAdapter.kt"
  "apps/mobile/ios/AnotherDimension/Info.plist"
  "apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements"
  "apps/mobile/ios/AnotherDimension/ContentView.swift"
  "apps/mobile/ios/AnotherDimension/SharedCoreMobileApi.swift"
  "apps/mobile/ios/AnotherDimension/JsonBridgeSharedCoreAdapter.swift"
)

for file in "${scan_files[@]}"; do
  [ -f "$file" ] || fail "missing mobile dependency scan input: $file"
done

for pattern in \
  "android.permission.READ_CONTACTS" \
  "android.permission.GET_ACCOUNTS" \
  "android.permission.READ_PHONE_STATE" \
  "android.permission.CALL_PHONE" \
  "com.google.firebase" \
  "FirebaseMessaging" \
  "Firebase" \
  "GoogleSignIn" \
  "ContactsContract" \
  "Telephony" \
  "NSContactsUsageDescription" \
  "UIBackgroundModes" \
  "UserNotifications" \
  "CloudKit" \
  "CKContainer" \
  "APNs" \
  "iCloudDocuments"; do
  if grep -RInF "$pattern" "${scan_files[@]}" >/tmp/mobile-forbidden-scan.out 2>&1; then
    cat /tmp/mobile-forbidden-scan.out >&2
    fail "forbidden mobile dependency pattern present: $pattern"
  fi
done

if grep -RInE 'phone_number_account[": =]*true|email_account[": =]*true|global_account[": =]*true|central_contact_discovery[": =]*true|central_message_server[": =]*true|push_notification_delivery[": =]*true|cloud_backup[": =]*true' \
  apps/mobile/android/app/src/main apps/mobile/ios/AnotherDimension crates/mobile >/tmp/mobile-forbidden-semantics.out 2>&1; then
  cat /tmp/mobile-forbidden-semantics.out >&2
  fail "forbidden mobile account/discovery/push/cloud semantic present"
fi

cat <<'STATUS'
status=mobile-forbidden-dependency-scan-passed
phone_number_account_dependency=false
email_account_dependency=false
global_account_dependency=false
contacts_permission=false
telephony_permission=false
firebase_fcm_dependency=false
push_notification_delivery=false
cloud_backup_dependency=false
native_network_delivery_enabled=false
STATUS
