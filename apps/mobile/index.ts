// Inject process.env variables needed for @zyro/shared in React Native before any imports
if (typeof process === 'undefined') {
  (global as any).process = { env: {} };
}
if (typeof process.env === 'undefined') {
  process.env = {};
}
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
process.env.NEXT_PUBLIC_LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL;

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
