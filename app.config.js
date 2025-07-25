import 'dotenv/config';

console.log("🧪 Supabase URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log("🧪 Supabase Key:", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export default {
  expo: {
    name: "QuickPickall",
    slug: "quickpickall",
    version: "1.0.0",
    scheme: "quickpickall",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.quickpickall"
    },
    android: {
      package: "com.yourcompany.quickpickall",
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "quickpickall",
              host: "*",
              pathPrefix: "/"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: ["expo-router", "expo-font", "expo-web-browser"],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  }
};
