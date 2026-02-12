import React from 'react'
import { SvgProps } from 'react-native-svg'

import AppleIcon from '../../assets/provider-apple.svg'
import ClaudeIcon from '../../assets/provider-claude.svg'
import DefaultIcon from '../../assets/provider-default.svg'
import EchoIcon from '../../assets/provider-echo.svg'
import GeminiIcon from '../../assets/provider-gemini.svg'
import GeminiNanoIcon from '../../assets/provider-gemini-nano.svg'
import KimiIcon from '../../assets/provider-kimi.svg'
import OllamaIcon from '../../assets/provider-ollama.svg'
import OpenAIIcon from '../../assets/provider-openai.svg'
import OpenClawIcon from '../../assets/provider-openclaw.svg'
import OpenRouterIcon from '../../assets/provider-openrouter.svg'
import { ProviderType } from '../services/providers'
import { isAndroid, isIOS } from '../utils/platform'

const ICON_SIZE = 20

function ProviderIcon({ Icon, color }: { Icon: React.FC<SvgProps>; color: string }) {
  return <Icon width={ICON_SIZE} height={ICON_SIZE} fill={color} />
}

export function getProviderIcon(type: ProviderType, color: string): React.ReactNode {
  const icons: Partial<Record<ProviderType, React.FC<SvgProps>>> = {
    molt: OpenClawIcon,
    ollama: OllamaIcon,
    claude: ClaudeIcon,
    openai: OpenAIIcon,
    'openai-compatible': OpenAIIcon,
    openrouter: OpenRouterIcon,
    apple: AppleIcon,
    echo: EchoIcon,
    gemini: GeminiIcon,
    'gemini-nano': GeminiNanoIcon,
    kimi: KimiIcon,
  }

  const Icon = icons[type] ?? DefaultIcon
  return <ProviderIcon Icon={Icon} color={color} />
}

export function getAllProviderOptions(color: string) {
  const options: { value: ProviderType; label: string; icon: React.ReactNode }[] = [
    { value: 'molt', label: 'OpenClaw', icon: getProviderIcon('molt', color) },
    { value: 'ollama', label: 'Ollama', icon: getProviderIcon('ollama', color) },
    { value: 'claude', label: 'Claude', icon: getProviderIcon('claude', color) },
    { value: 'openai', label: 'OpenAI', icon: getProviderIcon('openai', color) },
    {
      value: 'openai-compatible',
      label: 'OpenAI Compatible',
      icon: getProviderIcon('openai-compatible', color),
    },
    { value: 'openrouter', label: 'OpenRouter', icon: getProviderIcon('openrouter', color) },
    { value: 'gemini', label: 'Gemini', icon: getProviderIcon('gemini', color) },
    ...(isIOS
      ? [
          {
            value: 'apple' as ProviderType,
            label: 'Apple Intelligence',
            icon: getProviderIcon('apple', color),
          },
        ]
      : []),
    ...(isAndroid
      ? [
          {
            value: 'gemini-nano' as ProviderType,
            label: 'Gemini Nano',
            icon: getProviderIcon('gemini-nano', color),
          },
        ]
      : []),
    { value: 'kimi', label: 'Kimi', icon: getProviderIcon('kimi', color) },
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
      value: 'openai-compatible' as ProviderType,
      label: 'OpenAI Compatible',
      icon: getProviderIcon('openai-compatible', color),
    },
    {
      value: 'openrouter' as ProviderType,
      label: 'OpenRouter',
      icon: getProviderIcon('openrouter', color),
    },
    {
      value: 'gemini' as ProviderType,
      label: 'Gemini',
      icon: getProviderIcon('gemini', color),
    },
    ...(isIOS
      ? [
          {
            value: 'apple' as ProviderType,
            label: 'Apple Intelligence',
            icon: getProviderIcon('apple', color),
          },
        ]
      : []),
    ...(isAndroid
      ? [
          {
            value: 'gemini-nano' as ProviderType,
            label: 'Gemini Nano',
            icon: getProviderIcon('gemini-nano', color),
          },
        ]
      : []),
    {
      value: 'kimi' as ProviderType,
      label: 'Kimi',
      icon: getProviderIcon('kimi', color),
    },
    {
      value: 'echo' as ProviderType,
      label: 'Echo Server',
      icon: getProviderIcon('echo', color),
    },
  ]
}
