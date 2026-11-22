import React, { useEffect, useState } from 'react';
import { formatPrice, requestJson } from './api';

const emptyProduct = {
    category_id: '',
    name: '',
    sku: '',
    description: '',
    price: '',
    stock: '0',
    unit: '1 kg',
    image_url: '',
    is_active: true,
};

const allowedOrderTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['completed'],
    completed: [],
    cancelled: [],
};

const orderStatusLabels = {
    pending: 'Menunggu konfirmasi',
    confirmed: 'Dikonfirmasi',
    processing: 'Diproses',
    shipped: 'Dikirim',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

export default function AdminApp() {
    const [admin, setAdmin] = useState(null);
    const [checkingSession, setCheckingSession] = useState(true);
    const [login, setLogin] = useState({ email: '', password: '' });
    const [registration, setRegistration] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const isRegistrationPage = window.location.pathname === '/register';
    const [activeTab, setActiveTab] = useState('orders');
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [shippingFeeDrafts, setShippingFeeDrafts] = useState({});
    const [productForm, setProductForm] = useState(emptyProduct);
    const [editingProductId, setEditingProductId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const shouldResumeCheckout = new URLSearchParams(window.location.search).get('redirect') === 'checkout';

    async function loadAdminData() {
        const [productPayload, categoryPayload, orderPayload] = await Promise.all([
            requestJson('/api/v1/admin/products'),
            requestJson('/api/v1/categories'),
            requestJson('/api/v1/admin/orders'),
        ]);

        setProducts(productPayload.data);
        setCategories(categoryPayload.data);
        setOrders(orderPayload.data);
    }

    useEffect(() => {
        requestJson('/api/v1/auth/session')
            .then(async (payload) => {
                if (payload.authenticated && payload.user?.is_admin) {
                    if (window.location.pathname !== '/admin') {
                        window.location.replace('/admin');
                        return;
                    }

                    setAdmin(payload.user);
                    await loadAdminData();
                } else if (payload.authenticated) {
                    window.location.replace(shouldResumeCheckout ? '/?checkout=1' : '/');
                }
            })
            .catch((error) => setMessage(error.message))
            .finally(() => setCheckingSession(false));
    }, []);

    async function handleLogin(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');

        try {
            const payload = await requestJson('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify(login),
            });

            if (!payload.user.is_admin) {
                window.location.assign(shouldResumeCheckout ? '/?checkout=1' : '/');
                return;
            }

            if (window.location.pathname !== '/admin') {
                window.location.assign('/admin');
                return;
            }

            setAdmin(payload.user);
            setLogin({ email: '', password: '' });
            await loadAdminData();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleRegistration(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');

        try {
            await requestJson('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify(registration),
            });
            window.location.assign(shouldResumeCheckout ? '/?checkout=1' : '/');
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleLogout() {
        setBusy(true);

        try {
            await requestJson('/api/v1/auth/logout', { method: 'POST' });
            setAdmin(null);
            setProducts([]);
            setOrders([]);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    function startEditing(product) {
        setEditingProductId(product.id);
        setProductForm({
            category_id: String(product.category_id),
            name: product.name,
            sku: product.sku ?? '',
            description: product.description ?? '',
            price: String(product.price),
            stock: String(product.stock),
            unit: product.unit,
            image_url: product.image_url ?? '',
            is_active: product.is_active,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function saveProduct(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');

        const body = {
            ...productForm,
            category_id: Number(productForm.category_id),
            sku: productForm.sku || null,
            description: productForm.description || null,
            price: Number(productForm.price),
            stock: Number(productForm.stock),
            image_url: productForm.image_url || null,
        };
        const url = editingProductId
            ? `/api/v1/admin/products/${editingProductId}`
            : '/api/v1/admin/products';

        try {
            await requestJson(url, {
                method: editingProductId ? 'PATCH' : 'POST',
                body: JSON.stringify(body),
            });
            setProductForm(emptyProduct);
            setEditingProductId(null);
            setMessage('Produk berhasil disimpan.');
            await loadAdminData();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function disableProduct(product) {
        if (!window.confirm(`Nonaktifkan ${product.name}?`)) {
            return;
        }

        setBusy(true);
        setMessage('');

        try {
            await requestJson(`/api/v1/admin/products/${product.id}`, { method: 'DELETE' });
            setMessage('Produk dinonaktifkan.');
            await loadAdminData();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function updateOrderStatus(orderId, status) {
        setBusy(true);
        setMessage('');

        try {
            await requestJson(`/api/v1/admin/orders/${orderId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            setMessage('Status pesanan diperbarui.');
            await loadAdminData();
        } catch (error) {
            setMessage(error.message);
            await loadAdminData();
        } finally {
            setBusy(false);
        }
    }

    async function confirmPayment(orderId) {
        setBusy(true);
        setMessage('');

        try {
            await requestJson(`/api/v1/admin/orders/${orderId}/payment`, { method: 'PATCH' });
            setMessage('Pembayaran dikonfirmasi. Struk tersedia untuk pelanggan.');
            await loadAdminData();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function saveShippingFee(event, orderId) {
        event.preventDefault();
        setBusy(true);
        setMessage('');

        const order = orders.find((currentOrder) => currentOrder.id === orderId);
        const shippingFee = Number(shippingFeeDrafts[orderId] ?? order?.shipping_fee ?? 0);

        try {
            await requestJson(`/api/v1/admin/orders/${orderId}/shipping`, {
                method: 'PATCH',
                body: JSON.stringify({ shipping_fee: shippingFee }),
            });
            setMessage('Biaya kirim dan total pesanan diperbarui.');
            await loadAdminData();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }
    if (checkingSession) {
        return <main className="grid min-h-screen place-items-center bg-[#f7f8f2] text-sm text-[#637065]">Memeriksa sesi admin…</main>;
    }

    if (!admin) {
        return (
            <main className="grid min-h-screen place-items-center bg-[#f7f8f2] px-5 py-10 text-[#1b3024]">
                <section className="w-full max-w-md rounded-3xl border border-[#e5e9da] bg-white p-7 shadow-sm sm:p-9">
                    <a href={isRegistrationPage ? '/login' : '/'} className="text-sm font-semibold text-[#53704d]">{isRegistrationPage ? '← Kembali ke halaman masuk' : '← Kembali ke Toko Amad'}</a>
                    <div className="mt-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#173d2a] text-2xl text-white">🌱</div>
                    <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#71825e]">{isRegistrationPage ? 'Akun pelanggan' : 'Masuk ke Toko Amad'}</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">{isRegistrationPage ? 'Buat akun pelanggan' : 'Masuk'}</h1>
                    <p className="mt-3 text-sm leading-6 text-[#788478]">{isRegistrationPage ? 'Daftar untuk menyimpan akun dan mulai berbelanja.' : 'Admin masuk ke panel pengelola. Pelanggan masuk ke beranda toko.'}</p>
                    {message && <p role="alert" className="mt-5 rounded-xl bg-[#fff4ed] p-3 text-sm text-[#85452e]">{message}</p>}
                    {isRegistrationPage ? <form onSubmit={handleRegistration} className="mt-6 space-y-4">
                        <label className="block text-sm font-medium">Nama lengkap<input required autoComplete="name" maxLength="255" value={registration.name} onChange={(event) => setRegistration({ ...registration, name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label>
                        <label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={registration.email} onChange={(event) => setRegistration({ ...registration, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label>
                        <label className="block text-sm font-medium">Kata sandi<input required type="password" minLength="8" autoComplete="new-password" value={registration.password} onChange={(event) => setRegistration({ ...registration, password: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label>
                        <label className="block text-sm font-medium">Ulangi kata sandi<input required type="password" minLength="8" autoComplete="new-password" value={registration.password_confirmation} onChange={(event) => setRegistration({ ...registration, password_confirmation: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label>
                        <button disabled={busy} className="w-full rounded-full bg-[#173d2a] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Membuat akun…' : 'Daftar sebagai pelanggan'}</button>
                    </form> : <><form onSubmit={handleLogin} className="mt-6 space-y-4">
                        <label className="block text-sm font-medium">Email<input required type="email" autoComplete="username" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label>
                        <label className="block text-sm font-medium">Kata sandi<input required type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label>
                        <button disabled={busy} className="w-full rounded-full bg-[#173d2a] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Memeriksa…' : 'Masuk'}</button>
                    </form><p className="mt-5 text-center text-sm text-[#788478]">Belum punya akun? <a href={shouldResumeCheckout ? '/register?redirect=checkout' : '/register'} className="font-semibold text-[#315b3c]">Daftar sebagai pelanggan</a></p></>}
                </section>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f8f2] text-[#1b3024]">
            <header className="border-b border-[#e5e9da] bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
                    <div><a href="/" className="text-xs font-semibold text-[#71825e]">← Toko Amad</a><h1 className="mt-1 text-2xl font-semibold">Panel Toko Amad</h1></div>
                    <div className="flex items-center gap-3"><span className="hidden text-sm text-[#788478] sm:inline">{admin.name}</span><button onClick={handleLogout} disabled={busy} className="rounded-full border border-[#dfe4d7] px-4 py-2 text-sm font-semibold">Keluar</button></div>
                </div>
                <nav className="mx-auto flex max-w-7xl gap-2 px-5 pb-4 lg:px-8">{[['orders', 'Pesanan'], ['products', 'Produk']].map(([tab, label]) => <button key={tab} onClick={() => { setActiveTab(tab); setMessage(''); }} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${activeTab === tab ? 'bg-[#173d2a] text-white' : 'bg-[#f0f3e9] text-[#53704d]'}`}>{label}</button>)}</nav>
            </header>
            <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
                {message && <p role="status" className="mb-5 rounded-xl bg-[#eaf1df] px-4 py-3 text-sm text-[#315b3c]">{message}</p>}
                {activeTab === 'products' ? <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                    <section className="h-fit rounded-3xl border border-[#e5e9da] bg-white p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71825e]">Katalog</p><h2 className="mt-1 text-xl font-semibold">{editingProductId ? 'Edit produk' : 'Tambah produk'}</h2></div>{editingProductId && <button onClick={() => { setEditingProductId(null); setProductForm(emptyProduct); }} className="text-sm font-semibold text-[#53704d]">Batal</button>}</div>
                        <form onSubmit={saveProduct} className="mt-5 space-y-4"><label className="block text-sm font-medium">Nama produk<input required maxLength="180" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3 outline-none focus:border-[#66845b]" /></label><label className="block text-sm font-medium">Kategori<select required value={productForm.category_id} onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-4 py-3"><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Harga (Rp)<input required type="number" min="0" step="1" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3" /></label><label className="block text-sm font-medium">Stok<input required type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3" /></label></div><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Satuan<input required maxLength="40" value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3" /></label><label className="block text-sm font-medium">SKU <span className="font-normal text-[#899187]">(opsional)</span><input maxLength="255" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3" /></label></div><label className="block text-sm font-medium">URL gambar <span className="font-normal text-[#899187]">(opsional)</span><input type="url" value={productForm.image_url} onChange={(event) => setProductForm({ ...productForm, image_url: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3" /></label><label className="block text-sm font-medium">Deskripsi<textarea maxLength="10000" rows="3" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] px-4 py-3" /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={productForm.is_active} onChange={(event) => setProductForm({ ...productForm, is_active: event.target.checked })} className="h-4 w-4 accent-[#315b3c]" />Tampilkan di katalog</label><button disabled={busy || categories.length === 0} className="w-full rounded-full bg-[#173d2a] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : editingProductId ? 'Simpan perubahan' : 'Tambah produk'}</button></form>
                    </section>
                    <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71825e]">Daftar barang</p><h2 className="mt-1 text-xl font-semibold">Produk ({products.length})</h2></div><div className="space-y-3">{products.map((product) => <article key={product.id} className="flex flex-col gap-4 rounded-2xl border border-[#e5e9da] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{product.name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${product.is_active ? 'bg-[#eaf1df] text-[#315b3c]' : 'bg-[#f3eee9] text-[#80604b]'}`}>{product.is_active ? 'Aktif' : 'Nonaktif'}</span></div><p className="mt-1 text-sm text-[#788478]">{product.category?.name} · {product.stock} {product.unit}</p><p className="mt-1 text-sm font-semibold text-[#245239]">{formatPrice(product.price)}</p></div><div className="flex gap-2"><button onClick={() => startEditing(product)} className="rounded-full border border-[#dfe4d7] px-4 py-2 text-sm font-semibold">Edit</button>{product.is_active && <button onClick={() => void disableProduct(product)} disabled={busy} className="rounded-full border border-[#ead8ce] px-4 py-2 text-sm font-semibold text-[#8b5945]">Nonaktifkan</button>}</div></article>)}</div></section>
                </div> : <section><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71825e]">Transaksi terbaru</p><h2 className="mt-1 text-xl font-semibold">Pesanan ({orders.length})</h2></div>{orders.length === 0 ? <div className="rounded-2xl border border-[#e5e9da] bg-white p-8 text-center text-sm text-[#788478]">Belum ada pesanan.</div> : <div className="grid gap-4 lg:grid-cols-2">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-[#e5e9da] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{order.order_number}</h3><p className="mt-1 text-sm text-[#788478]">{order.customer_name} · {order.customer_phone}</p><p className="mt-1 text-xs text-[#899187]">{order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : ''}</p></div><select value={order.status} disabled={busy || allowedOrderTransitions[order.status]?.length === 0} onChange={(event) => void updateOrderStatus(order.id, event.target.value)} className="rounded-full border border-[#dfe4d7] bg-white px-3 py-2 text-xs font-semibold"><option value={order.status}>{orderStatusLabels[order.status] ?? order.status}</option>{(allowedOrderTransitions[order.status] ?? []).map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></div><p className="mt-3 text-sm leading-5 text-[#637065]">{order.shipping_address}</p><div className="mt-4 space-y-2 border-t border-[#eef0e8] pt-3">{order.items?.map((item) => <div key={`${order.id}-${item.product_id}`} className="flex justify-between gap-3 text-sm"><span>{item.product_name} × {item.quantity}</span><span className="shrink-0 font-medium">{formatPrice(item.line_total)}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-[#eef0e8] pt-3 text-sm"><span>Subtotal produk</span><strong>{formatPrice(order.subtotal)}</strong></div>{!['shipped', 'completed', 'cancelled'].includes(order.status) && <form onSubmit={(event) => void saveShippingFee(event, order.id)} className="mt-3 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-medium">Biaya kirim (Rp)<input type="number" min="0" step="1" value={shippingFeeDrafts[order.id] ?? order.shipping_fee ?? ''} onChange={(event) => setShippingFeeDrafts({ ...shippingFeeDrafts, [order.id]: event.target.value })} required className="mt-1 w-full rounded-lg border border-[#dfe4d7] px-3 py-2 text-sm" /></label><button disabled={busy} className="rounded-lg bg-[#173d2a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Simpan ongkir</button></form>}{order.total !== null && <div className="mt-3 flex justify-between text-sm"><span>Total pesanan</span><strong>{formatPrice(order.total)}</strong></div>}<p className="mt-2 text-xs text-[#899187]">Pembayaran tetap dikonfirmasi langsung kepada pelanggan.</p></article>)}</div>}</section>}
                {activeTab === 'orders' && orders.some((order) => order.payment_status !== 'paid' && order.total !== null && order.status !== 'cancelled') && <section className="mt-8 rounded-3xl border border-[#e5e9da] bg-white p-5 sm:p-7"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71825e]">Pembayaran</p><h2 className="mt-1 text-xl font-semibold">Konfirmasi pembayaran masuk</h2><p className="mt-2 text-sm text-[#788478]">Konfirmasi secara manual setelah menerima pembayaran atau COD.</p></div><div className="mt-4 space-y-3">{orders.filter((order) => order.payment_status !== 'paid' && order.total !== null && order.status !== 'cancelled').map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f7f8f2] p-4"><div><p className="font-semibold">{order.order_number}</p><p className="mt-1 text-xs text-[#788478]">{order.customer_name} · {order.payment_method === 'cash_on_delivery' ? 'COD' : 'Transfer bank'} · {formatPrice(order.total)}</p></div><button onClick={() => void confirmPayment(order.id)} disabled={busy} className="rounded-full bg-[#173d2a] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Konfirmasi pembayaran</button></div>)}</div></section>}
            </main>
        </div>
    );
}
