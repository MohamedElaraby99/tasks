import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TasksView } from '../components/TasksView';
import type { DashboardLayoutContext } from '../components/DashboardLayout';

export function TasksPage() {
  const { user, store, refetch } = useOutletContext<DashboardLayoutContext>();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    refetchRef.current?.();
  }, []);

  return <TasksView store={store} user={user} refetch={refetch} />;
}
