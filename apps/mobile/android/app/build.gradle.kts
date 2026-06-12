plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "chat.anotherdimension.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "chat.anotherdimension.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-hp-source-scaffold"
    }
}
