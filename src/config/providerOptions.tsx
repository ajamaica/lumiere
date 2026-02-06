import React from 'react'
import { Platform } from 'react-native'
import { SvgProps } from 'react-native-svg'

import AppleIcon from '../../assets/provider-apple.svg'
import ClaudeIcon from '../../assets/provider-claude.svg'
import EchoIcon from '../../assets/provider-echo.svg'
import OllamaIcon from '../../assets/provider-ollama.svg'
import OpenAIIcon from '../../assets/provider-openai.svg'
import OpenClawIcon from '../../assets/provider-openclaw.svg'
import OpenRouterIcon from '../../assets/provider-openrouter.svg'
import { ProviderType } from '../services/providers'

const ICON_SIZE = 20

function ProviderIcon({ Icon, color }: { Icon: React.FC<SvgProps>; color: string }) {
  return <Icon width={ICON_SIZE} height={ICON_SIZE} fill={color} />
}

export function getProviderIcon(type: ProviderType, color: string): React.ReactNode {
  const icons: Record<ProviderType, React.FC<SvgProps> | null> = {
    molt: OpenClawIcon,
    ollama: OllamaIcon,
    claude: ClaudeIcon,
    openai: OpenAIIcon,
    openrouter: OpenRouterIcon,
    apple: AppleIcon,
    echo: EchoIcon,
    'gemini-nano': null, // TODO: Add Gemini icon
  }

  const Icon = icons[type]
  if (!Icon) return null
  return <ProviderIcon Icon={Icon} color={color} />
}

export function getAllProviderOptions(color: string) {
  const options: { value: ProviderType; label: string; icon: React.ReactNode }[] = [
    { value: 'molt', label: 'OpenClaw', icon: getProviderIcon('molt', color) },
    { value: 'ollama', label: 'Ollama', icon: getProviderIcon('ollama', color) },
    { value: 'claude', label: 'Claude', icon: getProviderIcon('claude', color) },
    { value: 'openai', label: 'OpenAI', icon: getProviderIcon('openai', color) },
    { value: 'openrouter', label: 'OpenRouter', icon: getProviderIcon('openrouter', color) },
    ...(Platform.OS === 'ios'
      ? [
          {
            value: 'apple' as ProviderType,
            label: 'Apple Intelligence',
            icon: getProviderIcon('apple', color),
          },
        ]
      : []),
    ...(Platform.OS === 'android'
      ? [
          {
            value: 'gemini-nano' as ProviderType,
            label: 'Gemini Nano',
            icon: getProviderIcon('gemini-nano', color),
          },
        ]
      : []),
    { value: 'echo', label: 'Echo Server', icon: getProviderIcon('echo', color) },
  ]
  return options
}

export function getBasicProviderOptions(color: string) {
  return [
    { value: 'molt' as ProviderType, label: 'OpenClaw', icon: getProviderIcon('molt', color) },
    {
      value: 'ollama' as ProviderType,
      label: 'Ollama',
      icon: getProviderIcon('ollama', color),
    },
    {
      value: 'claude' as ProviderType,
      label: 'Claude',
      icon: getProviderIcon('claude', color),
    },
    {
      value: 'openai' as ProviderType,
      label: 'OpenAI',
      icon: getProviderIcon('openai', color),
    },
    {
      value: 'openrouter' as ProviderType,
      label: 'OpenRouter',
      icon: getProviderIcon('openrouter', color),
    },
    ...(Platform.OS === 'ios'
      ? [
          {
            value: 'apple' as ProviderType,
            label: 'Apple Intelligence',
            icon: getProviderIcon('apple', color),
          },
        ]
      : []),
    ...(Platform.OS === 'android'
      ? [
          {
            value: 'gemini-nano' as ProviderType,
            label: 'Gemini Nano',
            icon: getProviderIcon('gemini-nano', color),
          },
        ]
      : []),
    {
      value: 'echo' as ProviderType,
      label: 'Echo Server',
      icon: getProviderIcon('echo', color),
    },
  ]
}
