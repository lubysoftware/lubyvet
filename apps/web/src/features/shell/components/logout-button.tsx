'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { apiSend } from '@/lib/api-client';

/** 007/US-1: encerra a sessão no servidor e volta ao login. */
export function LogoutButton() {
  const t = useTranslations('session');
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await apiSend('DELETE', '/api/session');
        window.location.assign('/login');
      }}
    >
      <LogOut size={18} aria-hidden />
      {t('logout')}
    </Button>
  );
}
