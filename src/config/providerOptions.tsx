import React from 'react'
import { Platform } from 'react-native'
import { SvgProps } from 'react-native-svg'

import { ProviderType } from '../services/providers'

import AppleIcon from '../../assets/provider-apple.svg'
import ClaudeIcon from '../../assets/provider-claude.svg'
import EchoIcon from '../../assets/provider-echo.svg'
import OllamaIcon from '../../assets/provider-ollama.svg'
import OpenClawIcon from '../../assets/provider-openclaw.svg'

const ICON_SIZE = 20

function ProviderIcon({ Icon, color }: { Icon: React.FC<SvgProps>; color: string }) {
  return <Icon width={ICON_SIZE} height={ICON_SIZE} fill={color} />
}

export function getProviderIcon(type: ProviderType, color: string): React.ReactNode {
  const icons: Record<ProviderType, React.FC<SvgProps> | null> = {
    molt: OpenClawIcon,
    ollama: OllamaIcon,
    claudie: ClaudeIcon,
    apple: AppleIcon,
    echo: EchoIcon,
  }

  const Icon = icons[type]
  if (!Icon) return null
  return <ProviderIcon Icon={Icon} color={color} />
}

export function getAllProviderOptions(color: string) {
  const options: { value: ProviderType; label: string; icon: React.ReactNode }[] = [
    { value: 'molt', label: 'OpenClaw', icon: getProviderIcon('molt', color) },
    { value: 'ollama', label: 'Ollama', icon: getProviderIcon('ollama', color) },
    { value: 'claudie', label: 'Claude', icon: getProviderIcon('claudie', color) },
    ...(Platform.OS === 'ios'
      ? [
          {
            value: 'apple' as ProviderType,
            label: 'Apple Intelligence',
            icon: getProviderIcon('apple', color),
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
      value: 'claudie' as ProviderType,
      label: 'Claude',
      icon: getProviderIcon('claudie', color),
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
    {
      value: 'echo' as ProviderType,
      label: 'Echo Server',
      icon: getProviderIcon('echo', color),
    },
  ]
}
