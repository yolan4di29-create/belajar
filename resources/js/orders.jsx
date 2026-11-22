import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { formatPrice, requestJson } from './api';

const orderStatusLabels = {
    pending: 'Menunggu konfirmasi',
    confirmed: 'Dikonfirmasi',
    processing: 'Diproses',
    shipped: 'Dikirim',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const paymentMethodLabels = {
    bank_transfer: 'Transfer bank',
    cash_on_delivery: 'Tunai saat barang diterima (COD)',
};

function OrdersApp() {
    const [orders, setOrders] = useState([]);
    const [receipt, setReceipt] = useState(null);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const selectedOrderId = window.location.pathname.split('/')[2];

    useEffect(() => {
        const endpoint = selectedOrderId
            ? `/api/v1/orders/${selectedOrderId}/receipt`
            : '/api/v1/orders';

        requestJson(endpoint)
            .then((payload) => {
                if (selectedOrderId) {
                    setReceipt(payload.data);
                } else {
                    setOrders(payload.data);
                }
                setStatus('ready');
            })
            .catch((error) => {
                setMessage(error.message);
                setStatus('error');
            });
    }, [selectedOrderId]);

    if (status === 'loading') {
        return <main className="grid min-h-screen place-items-center bg-[#f7f8f2] text-sm text-[#637065]">Memuat pesanan…</main>;
    }

    if (status === 'error') {
        return <main className="mx-auto grid min-h-screen max-w-xl place-items-center bg-[#f7f8f2] px-5 text-center text-[#1b3024]"><div><p className="font-semibold">{message}</p><a href="/pesanan" className="mt-5 inline-block rounded-full bg-[#173d2a] px-5 py-3 text-sm font-semibold text-white">Kembali ke pesanan</a></div></main>;
    }

    if (receipt) {
        return (
            <main className="min-h-screen bg-[#f7f8f2] px-5 py-8 text-[#1b3024] sm:py-12 print:bg-white print:py-0">
                <article className="mx-auto max-w-2xl rounded-3xl border border-[#e5e9da] bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
                    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#dfe4d7] pb-6">
                        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#71825e]">Toko Amad</p><h1 className="mt-2 text-2xl font-semibold">Struk pembayaran</h1><p className="mt-2 text-sm text-[#788478]">{receipt.order_number}</p></div>
                        <span className="rounded-full bg-[#eaf1df] px-3 py-1.5 text-xs font-semibold text-[#315b3c]">LUNAS</span>
                    </header>
                    <section className="grid gap-4 border-b border-dashed border-[#dfe4d7] py-6 text-sm sm:grid-cols-2">
                        <div><p className="text-xs text-[#899187]">Pelanggan</p><p className="mt-1 font-semibold">{receipt.customer_name}</p><p className="text-[#788478]">{receipt.customer_email}</p></div>
                        <div><p className="text-xs text-[#899187]">Tanggal pembayaran</p><p className="mt-1 font-semibold">{receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('id-ID') : '—'}</p></div>
                        <div><p className="text-xs text-[#899187]">Alamat pengiriman</p><p className="mt-1 leading-6">{receipt.shipping_address}</p></div>
                        <div><p className="text-xs text-[#899187]">Metode pembayaran</p><p className="mt-1 font-semibold">{paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method}</p></div>
                    </section>
                    <section className="space-y-3 border-b border-dashed border-[#dfe4d7] py-6">
                        {receipt.items?.map((item) => <div key={`${receipt.id}-${item.product_id}`} className="flex justify-between gap-4 text-sm"><span>{item.product_name} × {item.quantity}</span><span className="shrink-0 font-medium">{formatPrice(item.line_total)}</span></div>)}
                    </section>
                    <section className="space-y-2 py-6 text-sm">
                        <div className="flex justify-between"><span className="text-[#788478]">Subtotal</span><span>{formatPrice(receipt.subtotal)}</span></div>
                        <div className="flex justify-between"><span className="text-[#788478]">Biaya pengiriman</span><span>{formatPrice(receipt.shipping_fee ?? 0)}</span></div>
                        <div className="flex justify-between border-t border-[#eef0e8] pt-3 text-base font-bold"><span>Total dibayar</span><span>{formatPrice(receipt.total)}</span></div>
                    </section>
                    {receipt.notes && <p className="border-t border-dashed border-[#dfe4d7] py-4 text-sm"><span className="font-semibold">Catatan:</span> {receipt.notes}</p>}
                    <footer className="border-t border-dashed border-[#dfe4d7] pt-5 text-center text-xs text-[#899187]">Terima kasih telah berbelanja di Toko Amad.</footer>
                    <div className="mt-7 flex flex-wrap justify-center gap-3 print:hidden"><button onClick={() => window.print()} className="rounded-full bg-[#173d2a] px-5 py-3 text-sm font-semibold text-white">Cetak struk</button><a href="/pesanan" className="rounded-full border border-[#dfe4d7] px-5 py-3 text-sm font-semibold">Kembali ke pesanan</a></div>
                </article>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f8f2] px-5 py-8 text-[#1b3024] sm:py-12">
            <div className="mx-auto max-w-4xl">
                <header className="mb-7 flex items-center justify-between gap-4"><div><a href="/" className="text-sm font-semibold text-[#53704d]">← Toko Amad</a><h1 className="mt-2 text-3xl font-semibold">Pesanan saya</h1></div><a href="/" className="rounded-full bg-[#173d2a] px-4 py-2.5 text-sm font-semibold text-white">Belanja lagi</a></header>
                {orders.length === 0 ? <p className="rounded-2xl border border-[#e5e9da] bg-white p-8 text-center text-sm text-[#788478]">Belum ada pesanan.</p> : <div className="space-y-4">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-[#e5e9da] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{order.order_number}</h2><p className="mt-1 text-xs text-[#899187]">{new Date(order.created_at).toLocaleString('id-ID')}</p></div><span className="rounded-full bg-[#f0f3e9] px-3 py-1.5 text-xs font-semibold">{orderStatusLabels[order.status] ?? order.status}</span></div><div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-[#eef0e8] pt-4 text-sm"><span className="text-[#788478]">Pembayaran: {order.payment_status === 'paid' ? 'Lunas' : 'Menunggu konfirmasi'} · {paymentMethodLabels[order.payment_method] ?? order.payment_method ?? '—'}</span><strong>{order.total === null ? `Subtotal ${formatPrice(order.subtotal)}` : formatPrice(order.total)}</strong></div>{order.payment_status === 'paid' ? <a href={`/pesanan/${order.id}`} className="mt-4 inline-flex rounded-full bg-[#173d2a] px-4 py-2.5 text-sm font-semibold text-white">Lihat struk</a> : <p className="mt-3 text-xs text-[#899187]">Struk tersedia setelah pembayaran dikonfirmasi oleh Toko Amad.</p>}</article>)}</div>}
            </div>
        </main>
    );
}

export default OrdersApp;
