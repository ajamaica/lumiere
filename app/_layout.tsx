import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useAtom } from 'jotai'

import { OnboardingScreen } from '../src/screens/OnboardingScreen'
import { onboardingCompletedAtom } from '../src/store'
import { ThemeProvider, useTheme } from '../src/theme'

function TabsLayout() {
  const { theme } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

function AppContent() {
  const [onboardingCompleted] = useAtom(onboardingCompletedAtom)

  if (!onboardingCompleted) {
    return <OnboardingScreen />
  }

  return <TabsLayout />
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
