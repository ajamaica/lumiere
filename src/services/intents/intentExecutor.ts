import * as Calendar from 'expo-calendar'
import * as Clipboard from 'expo-clipboard'
import * as Contacts from 'expo-contacts'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

import { type ChatIntent } from '../../utils/chatIntents'
import { logger } from '../../utils/logger'

const intentLogger = logger.create('IntentExecutor')

/** Callbacks for session-related operations that depend on app state. */
export interface SessionHandlers {
  setSessionAlias: (key: string, label: string) => void
  switchSession: (key: string) => void
  clearMessages: () => void
}

/** Copy text to the system clipboard. */
export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text)
}

/** Save a contact to the device address book. */
export async function saveContact(params: Record<string, string>): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync()
  if (status !== 'granted') {
    intentLogger.warn('Contacts permission not granted')
    return false
  }

  const contact: Contacts.Contact = {
    contactType: Contacts.ContactTypes.Person,
    name: params.name ?? '',
    firstName: params.firstName ?? '',
    lastName: params.lastName ?? '',
    emails: params.email ? [{ email: params.email, label: 'email' }] : undefined,
    phoneNumbers: params.phone ? [{ number: params.phone, label: 'mobile' }] : undefined,
    company: params.company ?? '',
    jobTitle: params.jobTitle ?? '',
  }

  await Contacts.addContactAsync(contact)
  return true
}

/** Create a calendar event on the device. */
export async function createCalendarEvent(params: Record<string, string>): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync()
  if (status !== 'granted') {
    intentLogger.warn('Calendar permission not granted')
    return false
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const defaultCalendar =
    calendars.find((cal) => cal.isPrimary) ??
    calendars.find((cal) => cal.allowsModifications) ??
    calendars[0]

  if (!defaultCalendar) {
    intentLogger.warn('No calendar available')
    return false
  }

  const startDate = params.startDate ? new Date(params.startDate) : new Date()
  const endDate = params.endDate
    ? new Date(params.endDate)
    : new Date(startDate.getTime() + 60 * 60 * 1000) // Default 1 hour duration

  await Calendar.createEventAsync(defaultCalendar.id, {
    title: params.title ?? 'New Event',
    startDate,
    endDate,
    location: params.location,
    notes: params.notes,
    allDay: params.allDay === 'true',
  })

  return true
}

/** Initiate a phone call. */
export async function makePhoneCall(phone: string): Promise<void> {
  await Linking.openURL(`tel:${encodeURIComponent(phone)}`)
}

/** Open a location in the device maps application. */
export async function openMaps(params: Record<string, string>): Promise<void> {
  const { latitude, longitude, label } = params
  // Use geo: URI scheme which works on both iOS and Android
  const geoUrl = label
    ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}`
  await Linking.openURL(geoUrl)
}

/** Open a URL in the in-app browser. */
export async function openBrowser(url: string, controlsColor?: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor,
  })
}

/**
 * Execute a chat intent. Returns true if the intent produced a
 * "confirmable" action (e.g. copied, saved) that the UI may want
 * to acknowledge with feedback.
 */
export async function executeIntent(
  intent: ChatIntent,
  sessionHandlers: SessionHandlers,
): Promise<boolean> {
  switch (intent.action) {
    case 'copyToClipboard': {
      const text = intent.params.text ?? ''
      await copyToClipboard(text)
      return true
    }
    case 'openSession': {
      const key = intent.params.key
      if (!key) return false
      const label = intent.params.label
      if (label) {
        sessionHandlers.setSessionAlias(key, label)
      }
      sessionHandlers.switchSession(key)
      sessionHandlers.clearMessages()
      return false
    }
    case 'storeContact': {
      return await saveContact(intent.params)
    }
    case 'storeCalendarEvent': {
      return await createCalendarEvent(intent.params)
    }
    case 'makeCall': {
      const phone = intent.params.phone
      if (!phone) {
        intentLogger.warn('No phone number provided for makeCall intent')
        return false
      }
      await makePhoneCall(phone)
      return false
    }
    case 'openMaps': {
      const { latitude, longitude } = intent.params
      if (!latitude || !longitude) {
        intentLogger.warn('Missing latitude or longitude for openMaps intent')
        return false
      }
      await openMaps(intent.params)
      return false
    }
    default:
      await Linking.openURL(intent.raw)
      return false
  }
}
