import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

/**
 * Build-time configuration. Values come from (first match wins):
 *   1. Gradle properties  (-PVIDORA_API_KEY=… or ~/.gradle/gradle.properties)
 *   2. Environment variables (CI)
 *   3. local.properties     (git-ignored; for local development)
 * Nothing environment-specific is committed: no LAN IPs, no client keys.
 */
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun cfg(name: String, default: String): String =
    (findProperty(name) as String?) ?: System.getenv(name) ?: localProps.getProperty(name) ?: default
fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

// Google's official AdMob sample IDs — always used in debug builds (AdMob policy).
val admobTestAppId = "ca-app-pub-3940256099942544~3347511713"

android {
    namespace = "com.mynk.vidora"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.mynk.vidora"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Public client identifier (ships in the APK; not a secret). Keep it out of git.
        buildConfigField("String", "API_KEY", quoted(cfg("VIDORA_API_KEY", "")))
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            // 10.0.2.2 is the host machine as seen from the Android emulator.
            buildConfigField("String", "API_BASE_URL", quoted(cfg("VIDORA_DEBUG_API_BASE_URL", "http://10.0.2.2:5001/")))
            buildConfigField("String", "WEB_BASE_URL", quoted(cfg("VIDORA_DEBUG_WEB_BASE_URL", "http://10.0.2.2:8080/")))
            manifestPlaceholders["admobAppId"] = admobTestAppId
            manifestPlaceholders["webHost"] = cfg("VIDORA_DEBUG_WEB_HOST", "10.0.2.2")
        }
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", quoted(cfg("VIDORA_API_BASE_URL", "https://api.vidora.app/")))
            buildConfigField("String", "WEB_BASE_URL", quoted(cfg("VIDORA_WEB_BASE_URL", "https://vidora.app/")))
            manifestPlaceholders["admobAppId"] = cfg("VIDORA_ADMOB_APP_ID", "ca-app-pub-9387570944207452~6751708815")
            manifestPlaceholders["webHost"] = cfg("VIDORA_WEB_HOST", "vidora.app")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    // AndroidX
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.constraintlayout)
    implementation(libs.cardview)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)

    // Video Player (ExoPlayer / Media3)
    implementation(libs.exoplayer)
    implementation(libs.exoplayer.ui)
    implementation(libs.exoplayer.hls)

    // Image loading
    implementation(libs.glide)

    // Google AdMob
    implementation("com.google.android.gms:play-services-ads:23.6.0")

    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-analytics")
    implementation("com.google.firebase:firebase-config")
    implementation("com.google.firebase:firebase-crashlytics")
    implementation("com.google.firebase:firebase-messaging")

    // Google Play Billing
    implementation("com.android.billingclient:billing:7.1.1")

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
