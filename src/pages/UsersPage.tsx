import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UsersManagement } from '../components/UsersManagement';
import type { DashboardLayoutContext } from '../components/DashboardLayout';

export function UsersPage() {
  const { user, store, refetch } = useOutletContext<DashboardLayoutContext>();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    refetchRef.current?.();
  }, []);

  return <UsersManagement store={store} user={user} refetch={refetch} />;
}
