import { useEffect, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { getOpsAccessStatus, type OpsAccessStatus } from './access';

interface UseOpsAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  error: string | null;
  source: OpsAccessStatus['source'] | null;
}

export function useOpsAccess(): UseOpsAccessResult {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [state, setState] = useState<UseOpsAccessResult>({
    hasAccess: false,
    isLoading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    let isMounted = true;

    if (isLoadingAuth) {
      setState((current) => ({ ...current, isLoading: true }));
      return () => {
        isMounted = false;
      };
    }

    if (!user) {
      setState({
        hasAccess: false,
        isLoading: false,
        error: null,
        source: null,
      });
      return () => {
        isMounted = false;
      };
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    void getOpsAccessStatus()
      .then((status) => {
        if (!isMounted) {
          return;
        }

        setState({
          hasAccess: status.hasAccess,
          isLoading: false,
          error: null,
          source: status.source,
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          hasAccess: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to verify ops access.',
          source: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [isLoadingAuth, user]);

  return state;
}
