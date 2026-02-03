import { Redirect } from 'expo-router'

/**
 * Catch-all for routes not matched by Expo Router's file-based routing.
 * This prevents deep links like lumiere://trigger/autotrigger/{slug} from
 * showing a 404 screen. The useDeepLinking hook in _layout.tsx independently
 * picks up the URL via Linking.getInitialURL() and handles it.
 */
export default function NotFound() {
  return <Redirect href="/" />
}
