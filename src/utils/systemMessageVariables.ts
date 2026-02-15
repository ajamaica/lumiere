import i18n from 'i18next'
import { Platform } from 'react-native'

import { languageNames } from '../i18n'

/**
 * A variable that can be inserted into a system message template.
 * Variables use the `{{name}}` syntax and are resolved at send time.
 */
export interface SystemMessageVariable {
  /** The placeholder token, e.g. `"date"` → `{{date}}` in the template. */
  name: string
  /** i18n key for the human-readable label shown in the UI. */
  labelKey: string
  /** Resolve the current runtime value of this variable. */
  resolve: () => string
}

/** All supported system message variables. */
export const SYSTEM_MESSAGE_VARIABLES: SystemMessageVariable[] = [
  {
    name: 'date',
    labelKey: 'sessions.variables.date',
    resolve: () => new Date().toLocaleDateString(),
  },
  {
    name: 'time',
    labelKey: 'sessions.variables.time',
    resolve: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    name: 'datetime',
    labelKey: 'sessions.variables.datetime',
    resolve: () => new Date().toLocaleString(),
  },
  {
    name: 'day',
    labelKey: 'sessions.variables.day',
    resolve: () => new Date().toLocaleDateString([], { weekday: 'long' }),
  },
  {
    name: 'language',
    labelKey: 'sessions.variables.language',
    resolve: () => languageNames[i18n.language] ?? i18n.language,
  },
  {
    name: 'platform',
    labelKey: 'sessions.variables.platform',
    resolve: () => Platform.OS,
  },
]

/**
 * Replace all `{{variable}}` placeholders in `template` with their current
 * runtime values.  Unknown placeholders are left as-is.
 */
export function resolveSystemMessageVariables(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const variable = SYSTEM_MESSAGE_VARIABLES.find((v) => v.name === name)
    return variable ? variable.resolve() : match
  })
}
