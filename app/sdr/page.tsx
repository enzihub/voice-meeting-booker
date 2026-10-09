import type { Metadata } from 'next';
import AgentScreen from '@/components/AgentScreen';

export const metadata: Metadata = { title: 'AI SDR · Voice Meeting Booker' };

export default function SDRPage() {
  return <AgentScreen mode="sdr" />;
}
