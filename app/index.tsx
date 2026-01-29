import { useAtomValue } from 'jotai'

import { ChatScreen } from '../src/components/chat'
import { gatewayTokenAtom,gatewayUrlAtom } from '../src/store'

export default function HomeScreen() {
  const gatewayUrl = useAtomValue(gatewayUrlAtom)
  const gatewayToken = useAtomValue(gatewayTokenAtom)

  return <ChatScreen gatewayUrl={gatewayUrl} gatewayToken={gatewayToken} />
}
