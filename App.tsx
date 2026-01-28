import { StatusBar } from 'expo-status-bar';
import { ChatScreen } from './src/components/chat';

const GATEWAY_URL = 'wss://ajamaica-standardpc.tail185e2.ts.net';
const GATEWAY_TOKEN = 'a4b48356b80d2e02bf40cf6a1cfdc1bbd0341db58b072325';
// Force reload with mode: local

export default function App() {
  return (
    <>
      <ChatScreen gatewayUrl={GATEWAY_URL} gatewayToken={GATEWAY_TOKEN} />
      <StatusBar style="auto" />
    </>
  );
}
