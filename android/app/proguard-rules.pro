# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# react-native-fs - برای دانلود ویدیو
-keep class com.rnfs.** { *; }
-keep class com.rnfs.DownloaderParams { *; }
-keep class com.rnfs.DownloadResult { *; }
-dontwarn com.rnfs.**

# react-native-video - برای پخش ویدیو
-keep class com.brentvatne.react.** { *; }
-keep class com.yqritc.scalablevideoview.** { *; }
-dontwarn com.brentvatne.react.**
-dontwarn com.yqritc.scalablevideoview.**

# OkHttp (مورد استفاده در react-native-fs)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep annotation default values
-keepattributes AnnotationDefault

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Add any project specific keep options here:
