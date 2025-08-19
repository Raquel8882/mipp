"use client";

import { useEffect, useState } from 'react';

export default function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) {
          setUser(null);
          setRoles([]);
        } else {
          const data = await res.json();
          if (mounted) {
            setUser(data.user || null);
            setRoles(data.roles || []);
          }
        }
      } catch (err) {
        console.error('useCurrentUser fetch error', err);
        setUser(null);
        setRoles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { user, roles, loading };
}
