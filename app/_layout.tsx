import { Stack } from 'expo-router'
import { useAtom } from 'jotai'

import { OnboardingScreen } from '../src/screens/OnboardingScreen'
import { onboardingCompletedAtom } from '../src/store'
import { ThemeProvider } from '../src/theme'

function AppContent() {
  const [onboardingCompleted] = useAtom(onboardingCompletedAtom)

  if (!onboardingCompleted) {
    return <OnboardingScreen />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="servers"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sessions"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="overview"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="scheduler"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="gallery"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
