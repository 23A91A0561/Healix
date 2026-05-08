import { useEffect, useState } from 'react';
import api from '../services/api.js';

export function useFetch(path, fallback = []) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get(path).then((res) => setData(res.data)).catch((err) => setError(err.response?.data?.message || err.message)).finally(() => setLoading(false));
  }, [path]);
  return { data, loading, error, setData };
}
