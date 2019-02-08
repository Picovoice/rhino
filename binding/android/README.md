# Prerequisites

Install the latest version of [Android Studio](https://developer.android.com/studio/index.html).

# Building

Using Android Studio open [binding/android](/binding/android) as an Android project and build it. The build creates an 
[Android Archive](https://developer.android.com/studio/projects/android-library.html) (AAR) at
`binding/android/rhino/build/outputs/aar` that can be used as a dependency of your Android app module.

# Binding Class
 
[Rhino](/binding/android/rhino/src/main/java/ai/picovoice/rhino/Rhino.java) provides a binding for android
using [JNI](https://en.wikipedia.org/wiki/Java_Native_Interface). For an example usage please refer to
[Android demo application](/demo/android).

