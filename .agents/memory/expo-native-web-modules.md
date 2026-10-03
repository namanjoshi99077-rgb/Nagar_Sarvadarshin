---
name: Expo native-only modules
description: Platform-specific isolation for native dependencies in Expo apps that also bundle for web.
---

Keep native-only dependencies such as `react-native-maps` inside `.native.tsx` files and provide a `.web.tsx` implementation. Keep a lightweight generic `.tsx` module when TypeScript needs to resolve extensionless imports.

**Why:** Metro web bundling followed a shared map import into native React Native internals and returned a 500 bundle error. Platform-specific resolution removed the native package from the web bundle.

**How to apply:** When a native module breaks Expo web bundling, isolate its imports by platform and provide a safe web fallback instead of trying to polyfill the native package.