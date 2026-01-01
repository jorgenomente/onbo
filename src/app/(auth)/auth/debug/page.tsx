'use client';

import DebugClient from './DebugClient';

export default function AuthDebugPage() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return <DebugClient />;
}
