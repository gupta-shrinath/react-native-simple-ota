# react-native-simple-ota

A lightweight **OTA (Over-The-Air) update solution** for React Native apps. It allows you to update your JavaScript code without going through App Store or Play Store releases.

---

## 🚀 Concepts

- **OTA (Over-The-Air) Updates**: Updates pushed remotely to the app **without requiring a new version** from the App Store / Play Store.
- **JS Bundle**: The compiled version of your React Native JavaScript code. It can generated using the following commands.
  - **Android**: `react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res` 
  - **iOS**: `react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle`
- ⚠️ **Note**:  
  - `react-native-simple-ota` only updates **JavaScript code**, not native modules.  
  - Works only in **release builds**; in debug mode, Metro bundler is used instead.

---

## 🧩 Design Overview

- `react-native-simple-ota` stores and loads custom JS bundles (OTA updates) from the local device storage.
- OTA updates are **applied on the next app launch**.
- **You control** when and how to download OTA updates by implementing a custom `OtaUpdateProvider`. This ensures full flexibility for caching, version control, and download logic.
- On app launch, the library simply redirects the JS bundle loader to your downloaded OTA file (if available).

---

## Recommendations
- Host your JS Bundles on to CDNs for faster delivery.
- Validate hash of JS Bundle after download to avoid corruption.
- Take a look at the [example project](https://github.com/gupta-shrinath/react-native-simple-ota/tree/main/example) for reference.

## 📦 Installation

```sh
npm install react-native-simple-ota
```

## Integration

### Step 1: Define implementation of OTAUpdateProvider
```ts
import {
  getBundleVersion,
  type OtaUpdate,
  type OtaUpdateProvider,
} from 'react-native-simple-ota';


class MyOtaUpdateProvider implements OtaUpdateProvider {
  isUserApplicableForUpdate(): boolean {
    return true;
  }

  async getOtaUpdate(): Promise<OtaUpdate | null> {
    try {
      const bundleInfo: BundleInfo = await this.getUpdate();
      const update: OtaUpdate = {
        bundleVersion: bundleInfo.bundle_version,
        bundlePath: bundlePath,
      };
      return update;
    } catch (e: any) {
    }
    return null;
  }
}
```

### Step 2: Initialize (recommended in index.js or App.tsx)
```ts
import { init } from 'react-native-simple-ota';

init(new MyOtaUpdateProvider());
```

### Step 3: Perform OTA update check & Save the OTA JS bundle path
```ts
import {
  applyOTAIfApplicable,
} from 'react-native-simple-ota';

// ...

useEffect(() => {
   applyOTAIfApplicable();
}, []);
```

### Step 4: Native Side Integration
Note: Though the below file are in Kotlin and Swift they can be used in Java and Objective C respectively

- Android
The Application class might not exist in your Android code so you'll have to create it at `myapp/android/app/src/main/java` and add it in manifest file.

```kotlin

import android.app.Application
import dev.droid.simpleota.ReactNativeSimpleOtaModule

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages
            
        override fun getJSMainModuleName(): String = "index"


        override fun getJSBundleFile(): String? {
          return ReactNativeSimpleOtaModule.getJSBundleFile(this@MainApplication) ?: super.getJSBundleFile()
        }
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
}      
```

- iOS
```swift

import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import ReactNativeSimpleOta

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "SimpleOtaExample",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
  #if DEBUG
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
  #else
    if let customBundlePath = ReactNativeSimpleOta.getJSBundleFile() {
          return URL(fileURLWithPath: customBundlePath)
    }
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  #endif
  }
}

````