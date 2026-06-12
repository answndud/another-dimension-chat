#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_MANIFEST="$ROOT_DIR/apps/mobile/android/app/src/main/AndroidManifest.xml"
ANDROID_VIEW="$ROOT_DIR/apps/mobile/android/app/src/main/java/chat/anotherdimension/android/MainActivity.kt"
IOS_INFO="$ROOT_DIR/apps/mobile/ios/AnotherDimension/Info.plist"
IOS_ENTITLEMENTS="$ROOT_DIR/apps/mobile/ios/AnotherDimension/AnotherDimension.entitlements"
IOS_VIEW="$ROOT_DIR/apps/mobile/ios/AnotherDimension/ContentView.swift"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing mobile launch network boundary file: $1" >&2
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  if ! grep -Fq -- "$text" "$file"; then
    echo "missing mobile launch network boundary text in $file: $text" >&2
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    echo "forbidden mobile launch network boundary text in $file: $text" >&2
    exit 1
  fi
}

require_file "$ANDROID_MANIFEST"
require_file "$ANDROID_VIEW"
require_file "$IOS_INFO"
require_file "$IOS_ENTITLEMENTS"
require_file "$IOS_VIEW"

require_text "$ANDROID_MANIFEST" "android.intent.action.MAIN"
require_text "$ANDROID_MANIFEST" "android.intent.category.LAUNCHER"
reject_text "$ANDROID_MANIFEST" "android.permission.INTERNET"
reject_text "$ANDROID_MANIFEST" "android.permission.POST_NOTIFICATIONS"
reject_text "$ANDROID_MANIFEST" "android.permission.FOREGROUND_SERVICE"
reject_text "$ANDROID_MANIFEST" "android.permission.RECEIVE_BOOT_COMPLETED"
reject_text "$ANDROID_MANIFEST" "android.permission.WAKE_LOCK"
reject_text "$ANDROID_MANIFEST" "android.permission.ACCESS_NETWORK_STATE"

require_text "$IOS_INFO" "chat.anotherdimension.ios"
reject_text "$IOS_INFO" "UIBackgroundModes"
reject_text "$IOS_INFO" "NSBonjourServices"
reject_text "$IOS_INFO" "NSLocalNetworkUsageDescription"
reject_text "$IOS_INFO" "NSAppTransportSecurity"
reject_text "$IOS_INFO" "NSUserNotificationUsageDescription"

require_text "$IOS_ENTITLEMENTS" "icloud-container-identifiers"
require_text "$IOS_ENTITLEMENTS" "<array/>"
reject_text "$IOS_ENTITLEMENTS" "aps-environment"
reject_text "$IOS_ENTITLEMENTS" "com.apple.developer.networking"
reject_text "$IOS_ENTITLEMENTS" "com.apple.developer.usernotifications"

for view in "$ANDROID_VIEW" "$IOS_VIEW"; do
  require_text "$view" "renderLaunchNetworkRuntimeBoundary"
  require_text "$view" "sharedCore.sharedCoreStatusSurface()"
  require_text "$view" "launch_network_boundary=no_native_network_permission_no_bootstrap"
  require_text "$view" "launch_runtime_boundary=no_runtime_messaging_loop_no_background_delivery"
  require_text "$view" "push_notification_boundary=not_requested_not_configured"
  require_text "$view" "implicit_delivery_start=false"
  require_text "$view" "generated_callable_binding=false"
  require_text "$view" "runtime_command_surface="
  require_text "$view" "mobile_command_surface="

  reject_text "$view" "startRuntime"
  reject_text "$view" "startMessaging"
  reject_text "$view" "bootstrapNetwork"
  reject_text "$view" "backgroundDelivery"
  reject_text "$view" "ForegroundService"
  reject_text "$view" "WorkManager"
  reject_text "$view" "URLSession"
  reject_text "$view" "NWConnection"
  reject_text "$view" "HttpURLConnection"
  reject_text "$view" "Socket"
  reject_text "$view" "UserNotifications"
done

printf 'status=mobile-launch-network-boundary-verified\n'
printf 'native_network_permission=false\n'
printf 'runtime_messaging_launch=false\n'
printf 'background_delivery_launch=false\n'
printf 'push_notification_configured=false\n'
printf 'mobile_readiness_claim=false\n'
