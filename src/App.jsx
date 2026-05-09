import React from 'react';
import FloatingSupportButton from '@/components/shared/FloatingSupportButton';
import AppProviders from '@/app/AppProviders';
import AppRoutes from '@/app/AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
      <FloatingSupportButton />
    </AppProviders>
  );
}
