import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Treasury OS App Dashboard',
  description: 'Deploy, verify, fund, and release AI-native smart escrows, monitor swap or bridging routes, and manage programmable agent fleets.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
