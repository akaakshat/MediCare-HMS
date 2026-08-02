import { useEffect, useState } from 'react';

export type NetworkState = 'online' | 'offline' | 'syncing';

export const useNetworkMonitor = () => {
  const [networkState, setNetworkState] = useState<NetworkState>(navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    const updateState = () => setNetworkState(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);

    return () => {
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
    };
  }, []);

  return networkState;
};
