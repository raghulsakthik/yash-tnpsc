import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    // Reads google-services.json (below) into generated resources for FCM push.
    id("com.google.gms.google-services")
}

// local.properties is already gitignored by the Android Studio template
// (it holds the SDK path on every dev machine) -- piggybacking API_BASE_URL
// onto it means a real release config lives per-machine, never committed.
fun localProperty(key: String): String? {
    val file = rootProject.file("local.properties")
    if (!file.exists()) return null
    return Properties().apply { file.inputStream().use { load(it) } }.getProperty(key)
}

android {
    namespace = "com.nova.tnpsc"
    compileSdk = 34

    defaultConfig {
        // Firebase's google-services.json registers only one Android client,
        // under com.yash.yash (not this project's Kotlin namespace below) --
        // applicationId must match it exactly or the google-services plugin
        // fails the build with "No matching client found". The namespace
        // (and every file's `package com.nova.tnpsc`) is untouched; AGP
        // allows applicationId and namespace to differ.
        applicationId = "com.yash.yash"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "0.2.0"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    // Release signing credentials -- RELEASE_STORE_FILE/PASSWORD/KEY_ALIAS/KEY_PASSWORD
    // in local.properties (gitignored, per-machine, same pattern as API_BASE_URL
    // above). A fresh clone has none of this: generate a keystore with keytool
    // and add those four keys before running assembleRelease/bundleRelease.
    val isBuildingRelease = gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = false) }
    val releaseStoreFile = localProperty("RELEASE_STORE_FILE")
    val releaseStorePassword = localProperty("RELEASE_STORE_PASSWORD")
    val releaseKeyAlias = localProperty("RELEASE_KEY_ALIAS")
    val releaseKeyPassword = localProperty("RELEASE_KEY_PASSWORD")
    if (isBuildingRelease && (releaseStoreFile == null || releaseStorePassword == null || releaseKeyAlias == null || releaseKeyPassword == null)) {
        throw GradleException(
            "Missing release signing config. Add RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD, " +
                "RELEASE_KEY_ALIAS and RELEASE_KEY_PASSWORD to android/local.properties."
        )
    }

    signingConfigs {
        if (releaseStoreFile != null) {
            create("release") {
                storeFile = file(releaseStoreFile)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            // 10.0.2.2 is the Android emulator's alias for the host
            // machine's localhost -- this is what lets the emulator reach
            // `npm run dev` running on the host (near-carriage uses port 3001).
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3001/\"")
        }
        release {
            isMinifyEnabled = false
            if (releaseStoreFile != null) {
                signingConfig = signingConfigs.getByName("release")
            }
            // Must be passed at build time: `./gradlew assembleRelease -PapiBaseUrl=https://your-app.vercel.app/`
            // (or set API_BASE_URL in local.properties for a repeatable local
            // release build). No baked-in default here on purpose -- a release
            // build silently pointed at the emulator's localhost would look
            // fine in CI and then fail for every real user, which is worse
            // than a build that refuses to guess.
            //
            // The missing-value check only fires when a release task is
            // actually in the requested task graph -- AGP configures every
            // buildType block eagerly even for `assembleDebug`, so throwing
            // unconditionally here would break debug builds too.
            val apiBaseUrl = (project.findProperty("apiBaseUrl") as String?) ?: localProperty("API_BASE_URL")
            val isBuildingRelease = gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = false) }
            if (apiBaseUrl == null && isBuildingRelease) {
                throw GradleException(
                    "No API_BASE_URL for the release build. Pass -PapiBaseUrl=https://your-deployed-app.vercel.app/ " +
                        "or add API_BASE_URL=https://... to android/local.properties."
                )
            }
            buildConfigField("String", "API_BASE_URL", "\"${apiBaseUrl ?: ""}\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")
    // Forces a modern androidx.fragment past a transitive 1.1.0 pulled in
    // elsewhere -- that old version's FragmentActivity doesn't call
    // super.onRequestPermissionsResult(), which breaks registerForActivityResult
    // (the permission launcher in MainActivity.kt) on some devices/OS versions.
    implementation("androidx.fragment:fragment-ktx:1.8.3")

    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Networking: Retrofit over OkHttp, kotlinx.serialization for JSON. The
    // backend's session is an httpOnly cookie (see src/lib/auth.mjs on the
    // server), not a bearer token, so OkHttp's CookieJar -- backed by
    // DataStore so it survives process death -- carries auth on every
    // request instead of an Authorization header.
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Android push -- real google-services.json (project yash-278de) now
    // in app/, read by the google-services plugin above. See
    // push/FcmTokenRegistrar.kt for the registration call.
    // Pinned below the version that pulls in a kotlin-stdlib this project's
    // Kotlin plugin (1.9.24) can't read the metadata of -- 35.1.0 broke
    // compileDebugKotlin project-wide with "compiled with an incompatible
    // version of Kotlin" on every file, not just this one.
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging")

    debugImplementation("androidx.compose.ui:ui-tooling")

    // Camera-only proctoring during a test attempt (see
    // data/proctoring/ProctoringRecorder.kt) -- records short local segment
    // files and uploads each one, same contract as the web client's
    // MediaRecorder + /api/proctoring/chunk.
    implementation("androidx.camera:camera-core:1.3.4")
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-video:1.3.4")
}
