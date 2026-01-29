import { StatusBar } from 'expo-status-bar';
import { ChatScreen } from './src/components/chat';
import { gatewayConfig } from './src/config/gateway.config';
import { ThemeProvider } from './src/theme';

export default function App() {
  return (
    <ThemeProvider>
      <ChatScreen gatewayUrl={gatewayConfig.url} gatewayToken={gatewayConfig.token} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
