import { StatusBar } from 'expo-status-bar';
import { ChatScreen } from './src/components/chat';
import { gatewayConfig } from './src/config/gateway.config';

export default function App() {
  return (
    <>
      <ChatScreen gatewayUrl={gatewayConfig.url} gatewayToken={gatewayConfig.token} />
      <StatusBar style="auto" />
    </>
  );
}
