import { useState, useEffect } from 'react';
const API = import.meta.env.VITE_API_URL ?? '';
export function useMenu(slug) {
    const [result, setResult] = useState({ status: 'loading' });
    useEffect(() => {
        if (!slug)
            return;
        setResult({ status: 'loading' });
        const controller = new AbortController();
        fetch(`${API}/v1/menu/${encodeURIComponent(slug)}`, { signal: controller.signal })
            .then(async (res) => {
            const body = await res.json();
            if (!res.ok || !body.ok) {
                setResult({ status: 'error', message: body.error ?? 'Failed to load menu' });
            }
            else {
                setResult({ status: 'success', data: body.data });
            }
        })
            .catch((err) => {
            if (err.name !== 'AbortError') {
                setResult({ status: 'error', message: err.message });
            }
        });
        return () => controller.abort();
    }, [slug]);
    return result;
}
