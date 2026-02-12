import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { SvgProps } from 'react-native-svg'

import ClaudeIcon from '../../assets/provider-claude.svg'
import GeminiIcon from '../../assets/provider-gemini.svg'
import KimiIcon from '../../assets/provider-kimi.svg'
import OllamaIcon from '../../assets/provider-ollama.svg'
import OpenAIIcon from '../../assets/provider-openai.svg'
import OpenClawIcon from '../../assets/provider-openclaw.svg'
import OpenRouterIcon from '../../assets/provider-openrouter.svg'
import { GradientButton } from '../components/ui/GradientButton'
import { Text } from '../components/ui/Text'
import { useTheme } from '../theme'

interface WelcomeScreenProps {
  onGetStarted: () => void
}

interface BubbleConfig {
  Icon: React.FC<SvgProps>
  size: number
  top: number
  left: number
  delay: number
  bg: string
}

// Chat bubble used inside the phone mockup
function ChatBubble({
  text,
  align,
  color,
  textColor,
  delay,
  maxWidth,
}: {
  text: string
  align: 'left' | 'right'
  color: string
  textColor: string
  delay: number
  maxWidth?: number
}) {
  const { theme } = useTheme()
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500).springify()}
      style={[
        chatStyles.bubble,
        {
          alignSelf: align === 'right' ? 'flex-end' : 'flex-start',
          backgroundColor: color,
          borderBottomRightRadius: align === 'right' ? 4 : 16,
          borderBottomLeftRadius: align === 'left' ? 4 : 16,
          maxWidth: maxWidth || '75%',
        },
      ]}
    >
      <Text
        style={{
          color: textColor,
          fontSize: theme.typography.fontSize.xs,
          lineHeight: 15,
        }}
      >
        {text}
      </Text>
    </Animated.View>
  )
}

const chatStyles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 3,
  },
})

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const { theme } = useTheme()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()

  // Responsive sizing
  const isSmallScreen = screenWidth < 380
  const isTablet = screenWidth >= 768
  const isWeb = Platform.OS === 'web'

  const phoneWidth = isTablet ? 260 : isSmallScreen ? 200 : 230
  const phoneHeight = phoneWidth * 1.6
  const iconBaseSize = isTablet ? 66 : isSmallScreen ? 51 : 57

  // 7 provider icon bubbles at double size with random variation
  const bubbles: BubbleConfig[] = [
    { Icon: OpenClawIcon, size: iconBaseSize + 12, top: -22, left: -34, delay: 100, bg: '#0F1D32' },
    {
      Icon: ClaudeIcon,
      size: iconBaseSize - 8,
      top: -14,
      left: phoneWidth - 24,
      delay: 200,
      bg: '#1A1412',
    },
    {
      Icon: OpenAIIcon,
      size: iconBaseSize + 6,
      top: phoneHeight * 0.3,
      left: -38,
      delay: 300,
      bg: '#0F1D32',
    },
    {
      Icon: GeminiIcon,
      size: iconBaseSize - 14,
      top: phoneHeight * 0.26,
      left: phoneWidth - 14,
      delay: 400,
      bg: '#121A2E',
    },
    {
      Icon: OllamaIcon,
      size: iconBaseSize + 16,
      top: phoneHeight * 0.6,
      left: -36,
      delay: 500,
      bg: '#141E14',
    },
    {
      Icon: OpenRouterIcon,
      size: iconBaseSize - 4,
      top: phoneHeight * 0.62,
      left: phoneWidth - 20,
      delay: 600,
      bg: '#1E1428',
    },
    {
      Icon: KimiIcon,
      size: iconBaseSize + 2,
      top: phoneHeight * 0.9,
      left: phoneWidth * 0.3,
      delay: 700,
      bg: '#1A1A2E',
    },
  ]

  const gradientColors = theme.isDark
    ? (['#050A18', '#0A1628', '#0F1D32'] as const)
    : (['#F0F4F8', '#E8EDF4', '#E0E8F0'] as const)

  const phoneBorderColor = theme.isDark ? '#1E3A5F' : '#CBD5E1'
  const phoneInnerBg = theme.isDark ? '#0A1628' : '#FFFFFF'
  const phoneScreenGradient = theme.isDark
    ? (['#0F1D32', '#162440', 'rgba(34, 211, 238, 0.05)'] as const)
    : (['#F8FAFC', '#F0F4F8', 'rgba(34, 211, 238, 0.08)'] as const)

  const agentBubbleColor = theme.isDark ? '#22D3EE' : '#22D3EE'
  const agentBubbleText = theme.isDark ? '#050A18' : '#050A18'
  const userBubbleColor = theme.isDark ? '#0F1D32' : '#E8EDF4'
  const userBubbleText = theme.isDark ? '#F0F4F8' : '#1A2A3A'

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
      minHeight: screenHeight - 100,
    },
    phoneSection: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isTablet ? theme.spacing.xxl : theme.spacing.xl,
    },
    phoneContainer: {
      width: phoneWidth,
      height: phoneHeight,
      position: 'relative',
    },
    phoneFrame: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      borderWidth: 2,
      borderColor: phoneBorderColor,
      backgroundColor: phoneInnerBg,
      overflow: 'hidden',
      // Shadow
      shadowColor: theme.isDark ? '#22D3EE' : '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme.isDark ? 0.15 : 0.1,
      shadowRadius: 24,
      elevation: 12,
    },
    phoneScreenGradient: {
      flex: 1,
      paddingTop: 40,
      paddingHorizontal: 14,
      paddingBottom: 20,
    },
    notch: {
      width: 80,
      height: 24,
      backgroundColor: phoneBorderColor,
      borderRadius: 12,
      alignSelf: 'center',
      marginBottom: 16,
      opacity: 0.6,
    },
    chatArea: {
      flex: 1,
      justifyContent: 'center',
      gap: 4,
    },
    homeIndicator: {
      width: 100,
      height: 4,
      backgroundColor: phoneBorderColor,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      opacity: 0.4,
    },
    iconBubble: {
      position: 'absolute',
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.isDark ? 'rgba(34, 211, 238, 0.2)' : 'rgba(34, 211, 238, 0.3)',
      // Shadow
      shadowColor: '#22D3EE',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    textSection: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      maxWidth: isTablet ? 500 : 360,
    },
    title: {
      fontSize: isTablet ? 32 : isSmallScreen ? 24 : 28,
      fontWeight: '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: isTablet ? 16 : 14,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: isTablet ? 24 : 21,
      marginBottom: theme.spacing.xxl,
    },
    buttonWrapper: {
      width: '100%',
      maxWidth: isTablet ? 400 : 320,
    },
  })

  return (
    <View style={styles.container} data-testid="welcome-screen">
      <LinearGradient colors={gradientColors} locations={[0, 0.5, 1]} style={styles.gradient} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Phone mockup + floating agent icons */}
        <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.phoneSection}>
          <View style={styles.phoneContainer}>
            {/* The phone frame */}
            <View style={styles.phoneFrame}>
              <LinearGradient colors={phoneScreenGradient} style={styles.phoneScreenGradient}>
                {/* Notch */}
                <View style={styles.notch} />

                {/* Chat bubbles inside phone */}
                <View style={styles.chatArea}>
                  <ChatBubble
                    text="Hey! What can you help me with?"
                    align="right"
                    color={userBubbleColor}
                    textColor={userBubbleText}
                    delay={300}
                  />
                  <ChatBubble
                    text="I can assist with coding, writing, analysis, and much more."
                    align="left"
                    color={agentBubbleColor}
                    textColor={agentBubbleText}
                    delay={500}
                  />
                  <ChatBubble
                    text="That sounds great!"
                    align="right"
                    color={userBubbleColor}
                    textColor={userBubbleText}
                    delay={700}
                  />
                  <ChatBubble
                    text="Ready when you are! Pick a provider and we can begin."
                    align="left"
                    color={agentBubbleColor}
                    textColor={agentBubbleText}
                    delay={900}
                  />
                </View>

                {/* Home indicator */}
                <View style={styles.homeIndicator} />
              </LinearGradient>
            </View>

            {/* Floating provider icon bubbles */}
            {bubbles.map((bubble, index) => (
              <Animated.View
                key={index}
                entering={FadeInUp.delay(bubble.delay).duration(600).springify()}
                style={[
                  styles.iconBubble,
                  {
                    width: bubble.size,
                    height: bubble.size,
                    top: bubble.top,
                    left: bubble.left,
                    backgroundColor: bubble.bg,
                  },
                ]}
              >
                <bubble.Icon
                  width={bubble.size * 0.5}
                  height={bubble.size * 0.5}
                  fill={theme.isDark ? '#F0F4F8' : '#1A2A3A'}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Welcome text */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(600).springify()}
          style={styles.textSection}
        >
          <Text style={styles.title}>
            Welcome to <Text style={[styles.title, { color: theme.colors.primary }]}>Lumiere</Text>
          </Text>
          <Text style={styles.subtitle}>
            Your AI agents, one beautiful app. Chat with Claude, OpenAI, Ollama, and more — all from
            a single, privacy-first interface.
          </Text>
        </Animated.View>

        {/* Get Started button */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(600).springify()}
          style={styles.buttonWrapper}
        >
          <GradientButton
            title="Get Started"
            size="lg"
            onPress={onGetStarted}
            animated
            data-testid="get-started-btn"
          />
        </Animated.View>
      </ScrollView>
    </View>
  )
}
