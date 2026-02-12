import { StyleSheet } from 'react-native'

import { Theme } from '../../theme'

export const createChatScreenStyles = (
  theme: Theme,
  deviceType: 'phone' | 'tablet' | 'foldable',
  foldState: 'folded' | 'unfolded' | 'half-folded',
  messageListPadding: number,
) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    messageList: {
      paddingTop: deviceType === 'foldable' && foldState === 'half-folded' ? 100 : 110,
      paddingBottom: 60,
      paddingHorizontal: messageListPadding,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    loadingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    scrollToBottomButton: {
      position: 'absolute',
      bottom: 150,
      left: '50%',
      marginLeft: -24,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 1000,
    },
  })
}
