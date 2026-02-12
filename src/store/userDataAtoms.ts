import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'
import type { FavoriteItem, TriggersDict } from './types'

/** User's saved/favorited messages */
export const favoritesAtom = atomWithStorage<FavoriteItem[]>('favorites', [], storage)

/** Deep link trigger configurations keyed by slug */
export const triggersAtom = atomWithStorage<TriggersDict>('triggers', {}, storage)
