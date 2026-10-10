'use client';

import { useRouter } from 'next/navigation';
import DemoBcqs from '../../features/demo/DemoBcqs';

export default function DemoPage() {
  const router = useRouter();

  return (
    <main style={{ minHeight: '100vh', background: 'var(--paper)', padding: '24px 16px' }}>
      <DemoBcqs
        onExit={() => router.push('/')}
        onSignUp={() => router.push('/')}
      />
    </main>
  );
}
