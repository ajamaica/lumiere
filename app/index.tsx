import { ChatScreen } from '../src/components/chat';
import { gatewayConfig } from '../src/config/gateway.config';

export default function HomeScreen() {
  return <ChatScreen gatewayUrl={gatewayConfig.url} gatewayToken={gatewayConfig.token} />;
}
