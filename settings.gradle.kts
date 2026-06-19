rootProject.name = "CulinaryOS"

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

include(":shared")
include(":backend")
include(":pos-client")
include(":kds-client")
include(":admin-client")
