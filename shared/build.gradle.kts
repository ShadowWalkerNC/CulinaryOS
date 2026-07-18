plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.sqldelight)
    alias(libs.plugins.kotlinx.serialization)
}

kotlin {
    jvm()
    androidTarget()

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(libs.kotlinx.serialization.json)
                implementation(libs.kotlinx.coroutines.core)
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(libs.kotest.assertions)
                implementation(libs.kotest.property)
                implementation(kotlin("test"))
            }
        }
        val jvmMain by getting {
            dependencies {
                implementation(libs.sqldelight.jvm)
                implementation(libs.sqldelight.coroutines)
            }
        }
        val androidMain by getting {
            dependencies {
                implementation(libs.sqldelight.android)
                implementation(libs.sqldelight.coroutines)
            }
        }
    }
}

sqldelight {
    databases {
        create("CulinaryDatabase") {
            packageName.set("com.culinaryos.shared.db")
            srcDirs.setFrom("src/commonMain/sqldelight")
        }
    }
}
