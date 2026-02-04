import { useAtomValue } from 'jotai'
import { useEffect } from 'react'

import { syncTriggersToWidget } from '../services/widgetSync'
import { triggersAtom } from '../store'

/**
 * Watches the triggers atom and syncs changes to the shared App Group
 * UserDefaults so the iOS widget can offer them for selection.
 */
export function useWidgetSync() {
  const triggers = useAtomValue(triggersAtom)

  useEffect(() => {
    syncTriggersToWidget(triggers)
  }, [triggers])
}
