export async function requestJson(url, options = {}) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
            ...options.headers,
        },
    });
    const payload = response.status === 204 ? {} : await response.json();

    if (!response.ok) {
        const firstValidationError = Object.values(payload.errors ?? {})[0]?.[0];
        throw new Error(firstValidationError ?? payload.message ?? 'Permintaan belum berhasil.');
    }

    return payload;
}

export function formatPrice(price) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(price));
}
