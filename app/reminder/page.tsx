import type { Metadata } from 'next';
import AgentScreen from '@/components/AgentScreen';

export const metadata: Metadata = { title: 'Payment Reminder · Voice Meeting Booker' };

export default function ReminderPage() {
  return <AgentScreen mode="reminder" />;
}
