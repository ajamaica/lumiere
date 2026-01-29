import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import { ThemeProvider, useTheme } from '../src/theme'
import { useColorScheme } from 'react-native'
import { onboardingCompletedAtom } from '../src/store'
import { OnboardingScreen } from '../src/screens/OnboardingScreen'

function TabsLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#0A84FF' : '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
          borderTopColor: isDark ? '#38383A' : '#E5E5EA',
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
