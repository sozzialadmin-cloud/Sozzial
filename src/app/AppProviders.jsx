import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster as SonnerToaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster as UiToaster } from '@/components/ui/toaster';

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
      <SonnerToaster richColors position="top-center" closeButton />
      <UiToaster />
    </QueryClientProvider>
  );
}