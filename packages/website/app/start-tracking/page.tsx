import type { Metadata } from 'next';
import { StartTracking } from '../../components/StartTracking';

export const metadata: Metadata = {
  title: 'Start tracking',
  robots: { index: false, follow: false },
};

export default function StartTrackingPage() {
  return <StartTracking />;
}
