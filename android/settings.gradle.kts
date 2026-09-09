pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Dana"
include(":app")

// Build output redirecionado pra fora do OneDrive: a sincronizacao em tempo
// real do OneDrive corrompe o estado incremental do Gradle no meio do build
// (arquivos de intermediates virando "not a regular file" durante o build).
gradle.beforeProject {
    layout.buildDirectory.set(File("C:/DanaBuild/" + if (path == ":") "root" else path.removePrefix(":")))
}
