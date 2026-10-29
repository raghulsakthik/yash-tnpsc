plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.24" apply false
    // Firebase config (google-services.json) -> generated resources, for FCM push.
    id("com.google.gms.google-services") version "4.5.0" apply false
}
