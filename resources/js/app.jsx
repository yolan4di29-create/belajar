import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './admin';
import OrdersApp from './orders';
import { formatPrice, requestJson } from './api';

const productColors = ['bg-[#e9f0df]', 'bg-[#f2ead9]', 'bg-[#e1ede7]', 'bg-[#f5e8dc]'];

function App() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [catalogStatus, setCatalogStatus] = useState('loading');
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategorySlug, setSelectedCategorySlug] = useState('all');

    useEffect(() => {
        async function loadCatalog() {
            try {
                const [categoryResponse, productResponse] = await Promise.all([
                    fetch('/api/v1/categories'),
                    fetch('/api/v1/products'),
                ]);

                if (!categoryResponse.ok || !productResponse.ok) {
                    throw new Error('Katalog belum dapat dimuat.');
                }

                const [categoryPayload, productPayload] = await Promise.all([
                    categoryResponse.json(),
                    productResponse.json(),
                ]);

                setCategories(categoryPayload.data);
                setProducts(productPayload.data);
                setCatalogStatus('ready');
            } catch {
                setCatalogStatus('error');
            }
        }

        loadCatalog();
    }, []);

    useEffect(() => {
        requestJson('/api/v1/auth/session')
            .then((payload) => {
                if (payload.user?.is_admin) {
                    window.location.replace('/admin');

                    return;
                }

                setCurrentUser(payload.user);

                if (new URLSearchParams(window.location.search).get('checkout') === '1') {
                    setIsCartOpen(true);
                    setCheckoutOpen(true);
                }
            })
            .catch(() => setCurrentUser(null));
    }, []);

    const [cart, setCart] = useState({ items: [], item_count: 0, subtotal: 0 });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartBusy, setCartBusy] = useState(false);
    const [cartMessage, setCartMessage] = useState('');
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkoutBusy, setCheckoutBusy] = useState(false);
    const [checkoutMessage, setCheckoutMessage] = useState('');
    const [orderConfirmation, setOrderConfirmation] = useState(null);
    const [checkoutForm, setCheckoutForm] = useState({
        shipping_address: '',
        payment_method: 'bank_transfer',
        notes: '',
    });

    const filteredProducts = products.filter((product) => {
        const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('id-ID');
        const matchesCategory = selectedCategorySlug === 'all' || product.category?.slug === selectedCategorySlug;
        const matchesSearch = normalizedSearchTerm === '' || [product.name, product.description, product.category?.name]
            .some((value) => value?.toLocaleLowerCase('id-ID').includes(normalizedSearchTerm));

        return matchesCategory && matchesSearch;
    });

    useEffect(() => {
        requestJson('/api/v1/cart')
            .then(setCart)
            .catch((error) => setCartMessage(error.message));
    }, []);

    async function sendCartRequest(url, options = {}) {
        const { openAfterSave, ...requestOptions } = options;
        setCartBusy(true);
        setCartMessage('');

        try {
            const updatedCart = await requestJson(url, requestOptions);
            setCart(updatedCart);

            if (openAfterSave) {
                setOrderConfirmation(null);
                setCheckoutOpen(false);
                setIsCartOpen(true);
            }
        } catch (error) {
            setCartMessage(error.message);
        } finally {
            setCartBusy(false);
        }
    }

    function changeCartQuantity(item, amount) {
        const nextQuantity = item.quantity + amount;

        if (nextQuantity < 1) {
            return sendCartRequest(`/api/v1/cart/items/${item.product_id}`, { method: 'DELETE' });
        }

        return sendCartRequest(`/api/v1/cart/items/${item.product_id}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: nextQuantity }),
        });
    }

    function closeCart() {
        setIsCartOpen(false);
        setOrderConfirmation(null);
        setCheckoutOpen(false);
        setCheckoutMessage('');
    }

    async function submitCheckout(event) {
        event.preventDefault();
        setCheckoutBusy(true);
        setCheckoutMessage('');

        try {
            const payload = await requestJson('/api/v1/checkout', {
                method: 'POST',
                body: JSON.stringify(checkoutForm),
            });

            setOrderConfirmation(payload.order);
            setProducts((currentProducts) => currentProducts.map((product) => {
                const purchasedItem = cart.items.find((item) => item.product_id === product.id);

                return purchasedItem
                    ? { ...product, stock: Math.max(product.stock - purchasedItem.quantity, 0) }
                    : product;
            }));
            setCart({ items: [], item_count: 0, subtotal: 0 });
            setCheckoutForm({ shipping_address: '', payment_method: 'bank_transfer', notes: '' });
            setCheckoutOpen(false);
        } catch (error) {
            setCheckoutMessage(error.message);
        } finally {
            setCheckoutBusy(false);
        }
    }

    async function logoutCustomer() {
        try {
            await requestJson('/api/v1/auth/logout', { method: 'POST' });
            setCurrentUser(null);
        } catch {
            setCartMessage('Belum berhasil keluar. Coba lagi.');
        }
    }

    return (
        <div className="min-h-screen bg-[#f7f8f2] text-[#1b3024]">
            <div className="bg-[#173d2a] px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
                Teman tumbuh untuk kebun dan sawah Anda <span className="mx-2 text-[#c9d8a7]">•</span> Kirim ke seluruh Indonesia
            </div>
            <header className="border-b border-[#e8e9df] bg-[#fbfcf8]">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 lg:px-8">
                    <a href="/" className="flex shrink-0 items-center gap-3" aria-label="Toko Amad beranda">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173d2a] text-2xl">🌱</span>
                        <span><strong className="block text-lg leading-tight tracking-tight">Toko Amad</strong><small className="text-xs text-[#788478]">Sahabat tumbuh petani</small></span>
                    </a>
                    <label className="hidden max-w-xl flex-1 items-center gap-3 rounded-full border border-[#e5e8dc] bg-white px-5 py-3 text-sm text-[#899187] md:flex">
                        <span>⌕</span><input className="w-full bg-transparent outline-none placeholder:text-[#899187]" placeholder="Cari pupuk, pestisida, atau kebutuhan tani..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                        <button type="button" onClick={() => document.getElementById('produk')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full bg-[#eff3e9] px-4 py-2 font-semibold text-[#315b3c]">Cari</button>
                    </label>
                    <div className="flex items-center gap-3">
                        {currentUser ? <><a href="/pesanan" className="rounded-full px-2 py-2 text-sm font-semibold text-[#315b3c]">Pesanan saya</a><span className="hidden max-w-32 truncate text-sm font-semibold text-[#315b3c] sm:block">Halo, {currentUser.name}</span><button onClick={() => void logoutCustomer()} className="rounded-full px-3 py-2 text-sm font-semibold text-[#315b3c]">Keluar</button></> : <a href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#315b3c] sm:block">Masuk</a>}
                        <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 rounded-full border border-[#e5e8dc] bg-white px-4 py-2.5 text-sm font-semibold"><span>🛒</span><span className="hidden sm:inline">Keranjang</span><span className="grid h-5 w-5 place-items-center rounded-full bg-[#dce9c4] text-[11px]">{cart.item_count}</span></button>
                    </div>
                </div>
                <nav className="mx-auto flex max-w-7xl gap-7 overflow-x-auto px-5 pb-4 text-sm font-medium text-[#637065] lg:px-8">
                    <a className="whitespace-nowrap text-[#245239]" href="#beranda">Beranda</a><a className="whitespace-nowrap" href="#kategori">Kategori</a><a className="whitespace-nowrap" href="#produk">Produk pilihan</a><a className="whitespace-nowrap" href="#tentang">Tentang kami</a>
                </nav>
            </header>

            <main id="beranda" className="mx-auto max-w-7xl px-5 pb-16 pt-7 lg:px-8 lg:pt-10">
                <section className="relative overflow-hidden rounded-[2rem] bg-[#173d2a] px-7 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
                    <div className="absolute -right-12 -top-24 h-80 w-80 rounded-full border border-white/10" />
                    <div className="absolute -right-2 -top-14 h-64 w-64 rounded-full border border-white/10" />
                    <div className="absolute -bottom-32 right-48 h-72 w-72 rounded-full bg-[#8aab60]/20 blur-3xl" />
                    <div className="relative max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-[#e0ebd1]"><span>✳</span> KEBUTUHAN TANI, LEBIH DEKAT</span>
                        <h1 className="mt-6 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">Rawat tanaman hari ini,<br className="hidden sm:block" /> panen lebih berarti.</h1>
                        <p className="mt-5 max-w-lg text-base leading-7 text-[#d3dfd0]">Temukan pupuk dan perlindungan tanaman pilihan untuk mendukung setiap langkah tumbuh di kebun Anda.</p>
                        <div className="mt-8 flex flex-wrap gap-3"><a href="#produk" className="rounded-full bg-[#dce9c4] px-6 py-3.5 text-sm font-bold text-[#173d2a] transition hover:bg-white">Jelajahi produk <span className="ml-2">→</span></a><a href="#kategori" className="rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white">Lihat kategori</a></div>
                        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-[#d3dfd0]"><span>✓ Produk pilihan</span><span>✓ Belanja mudah</span><span>✓ Dukungan ramah</span></div>
                    </div>
                    <div className="relative mt-10 flex justify-center lg:absolute lg:bottom-0 lg:right-12 lg:mt-0 lg:h-full lg:w-[38%] lg:items-center">
                        <div className="grid h-48 w-48 place-items-center rounded-full bg-[#dce9c4] text-8xl shadow-2xl shadow-black/20 sm:h-56 sm:w-56 sm:text-9xl">🪴</div>
                        <span className="absolute bottom-0 right-0 rounded-2xl bg-[#fbfcf8] px-4 py-3 text-sm font-semibold text-[#315b3c] shadow-lg sm:right-8 lg:bottom-12">Mulai dari kebutuhan tanaman 🌿</span>
                    </div>
                </section>

                {catalogStatus === 'error' && <p role="alert" className="mt-8 rounded-2xl border border-[#e9c9b8] bg-[#fff4ed] px-5 py-4 text-sm text-[#85452e]">Katalog belum dapat dimuat. Pastikan server Laravel dan database MySQL berjalan.</p>}

                <section id="kategori" className="pt-14">
                    <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#71825e]">Belanja lebih mudah</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Cari berdasarkan kategori</h2></div><a href="#produk" className="hidden text-sm font-semibold text-[#315b3c] sm:block">Lihat semua →</a></div>
                    {catalogStatus === 'loading' ? <p className="rounded-2xl border border-[#e9eadf] bg-white p-5 text-sm text-[#788478]">Memuat kategori…</p> : categories.length === 0 ? <p className="rounded-2xl border border-[#e9eadf] bg-white p-5 text-sm text-[#788478]">Belum ada kategori aktif.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{categories.map((category) => <a href="#produk" onClick={() => setSelectedCategorySlug(category.slug)} key={category.id} className="group flex items-center gap-3 rounded-2xl border border-[#e9eadf] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#c8d5b8] hover:shadow-md sm:gap-4 sm:p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f0f3e9] text-2xl transition group-hover:bg-[#e5edd8]">{category.icon || '🌱'}</span><span><strong className="block text-sm font-semibold">{category.name}</strong><small className="mt-1 block text-[11px] text-[#899187] sm:text-xs">{category.description}</small></span></a>)}</div>}
                </section>

                <section id="produk" className="pt-14">
                    <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#71825e]">Rekomendasi untuk Anda</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Produk pilihan</h2></div><button onClick={() => { setSelectedCategorySlug('all'); setSearchTerm(''); }} className="text-sm font-semibold text-[#315b3c]">Lihat semua →</button></div>
                    {catalogStatus === 'loading' ? <p className="rounded-2xl border border-[#e9eadf] bg-white p-5 text-sm text-[#788478]">Memuat produk…</p> : products.length === 0 ? <p className="rounded-2xl border border-[#e9eadf] bg-white p-5 text-sm text-[#788478]">Belum ada produk aktif.</p> : filteredProducts.length === 0 ? <p className="rounded-2xl border border-[#e9eadf] bg-white p-5 text-sm text-[#788478]">Tidak ada produk yang cocok dengan pencarian ini.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">{filteredProducts.map((product, index) => <article key={product.id} className="overflow-hidden rounded-2xl border border-[#e9eadf] bg-white transition hover:-translate-y-1 hover:shadow-lg"><div className={`relative grid aspect-[1.12] place-items-center ${productColors[index % productColors.length]}`}>{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <span className="text-7xl drop-shadow-sm sm:text-8xl">{product.category?.icon || '🌱'}</span>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#53704d] sm:text-xs">{product.stock > 0 ? `Stok ${product.stock}` : 'Stok habis'}</span><button onClick={() => void sendCartRequest('/api/v1/cart/items', { method: 'POST', body: JSON.stringify({ product_id: product.id }), openAfterSave: true })} disabled={cartBusy || product.stock < 1} aria-label={`Tambah ${product.name} ke keranjang`} className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-[#173d2a] text-xl text-white transition hover:bg-[#315b3c] disabled:cursor-not-allowed disabled:opacity-50">{product.stock > 0 ? '+' : '−'}</button></div><div className="p-3.5 sm:p-4"><p className="text-[11px] text-[#899187] sm:text-xs">Kemasan {product.unit}</p><h3 className="mt-1 min-h-10 text-sm font-semibold leading-5 sm:text-base">{product.name}</h3><p className="mt-3 text-sm font-bold text-[#245239] sm:text-base">{formatPrice(product.price)}</p></div></article>)}</div>}
                </section>

                <section id="tentang" className="mt-14 flex flex-col gap-5 rounded-3xl border border-[#e5e9da] bg-[#eef2e7] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex items-start gap-4"><span className="text-3xl">🌾</span><div><h2 className="text-lg font-semibold">Belanja dengan bijak, bertani dengan aman</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#667367]">Gunakan pupuk dan pestisida sesuai label serta petunjuk penggunaan. Simpan produk jauh dari jangkauan anak-anak dan hewan peliharaan.</p></div></div><a href="#produk" className="shrink-0 self-start rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#315b3c] sm:self-auto">Hubungi Toko Amad</a></section>
            </main>
            {isCartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-black/40"><button aria-label="Tutup keranjang" className="absolute inset-0 cursor-default" onClick={closeCart} /><aside role="dialog" aria-modal="true" aria-labelledby="cart-title" className="relative flex h-full w-full max-w-md flex-col bg-[#fbfcf8] shadow-2xl"><div className="flex items-center justify-between border-b border-[#e8e9df] px-6 py-5"><div><h2 id="cart-title" className="text-xl font-semibold">{orderConfirmation ? 'Pesanan berhasil' : checkoutOpen ? 'Checkout' : 'Keranjang'}</h2><p className="mt-1 text-sm text-[#788478]">{orderConfirmation ? 'Terima kasih sudah berbelanja.' : checkoutOpen ? 'Lengkapi alamat dan pembayaran.' : `${cart.item_count} barang dipilih`}</p></div><button onClick={closeCart} aria-label="Tutup keranjang" className="grid h-10 w-10 place-items-center rounded-full bg-[#eff3e9] text-xl">×</button></div>{orderConfirmation ? <div className="grid flex-1 place-items-center px-8 text-center"><div><span className="text-5xl">✅</span><h3 className="mt-4 text-lg font-semibold">Pesanan sudah dicatat</h3><p className="mt-2 text-sm text-[#788478]">Nomor pesanan</p><p className="mt-1 font-bold text-[#245239]">{orderConfirmation.order_number}</p><p className="mt-4 text-sm">Subtotal produk: <strong>{formatPrice(orderConfirmation.subtotal)}</strong></p><p className="mt-2 max-w-xs text-xs leading-5 text-[#788478]">Toko Amad akan mengonfirmasi biaya pengiriman dan pembayaran. Struk dapat dicetak setelah pembayaran dikonfirmasi.</p><a href="/pesanan" className="mt-5 inline-block rounded-full bg-[#173d2a] px-5 py-3 text-sm font-semibold text-white">Lihat pesanan saya</a></div></div> : checkoutOpen && !currentUser ? <div className="grid flex-1 place-items-center px-8 text-center"><div><span className="text-5xl">🔐</span><h3 className="mt-4 text-lg font-semibold">Masuk untuk checkout</h3><p className="mt-2 text-sm text-[#788478]">Keranjang Anda tetap tersimpan. Masuk atau daftar sebagai pelanggan untuk melanjutkan.</p><a href="/login?redirect=checkout" className="mt-5 inline-block rounded-full bg-[#173d2a] px-6 py-3 text-sm font-semibold text-white">Masuk / daftar</a><button onClick={() => setCheckoutOpen(false)} className="mt-3 block w-full py-2 text-sm font-semibold text-[#53704d]">Kembali ke keranjang</button></div></div> : checkoutOpen ? <form id="checkout-form" onSubmit={submitCheckout} className="flex-1 space-y-4 overflow-y-auto p-5">{checkoutMessage && <p role="alert" className="rounded-xl bg-[#fff4ed] p-3 text-sm text-[#85452e]">{checkoutMessage}</p>}<label className="block text-sm font-medium">Alamat pengiriman<textarea required name="shipping_address" value={checkoutForm.shipping_address} onChange={(event) => setCheckoutForm({ ...checkoutForm, shipping_address: event.target.value })} minLength="10" maxLength="1000" rows="4" className="mt-2 w-full resize-y rounded-xl border border-[#dfe4d7] bg-white px-4 py-3 outline-none focus:border-[#66845b]" /></label><label className="block text-sm font-medium">Metode pembayaran<select required name="payment_method" value={checkoutForm.payment_method} onChange={(event) => setCheckoutForm({ ...checkoutForm, payment_method: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe4d7] bg-white px-4 py-3"><option value="bank_transfer">Transfer bank</option><option value="cash_on_delivery">Tunai saat barang diterima (COD)</option></select></label><label className="block text-sm font-medium">Catatan <span className="font-normal text-[#899187]">(opsional)</span><textarea name="notes" value={checkoutForm.notes} onChange={(event) => setCheckoutForm({ ...checkoutForm, notes: event.target.value })} maxLength="1000" rows="2" className="mt-2 w-full resize-y rounded-xl border border-[#dfe4d7] bg-white px-4 py-3 outline-none focus:border-[#66845b]" /></label><p className="rounded-xl bg-[#eef2e7] p-3 text-xs leading-5 text-[#667367]">Pembayaran dikonfirmasi oleh Toko Amad. Struk tersedia di halaman Pesanan Saya setelah pembayaran diterima.</p></form> : cartMessage ? <p role="alert" className="m-5 rounded-xl bg-[#fff4ed] p-3 text-sm text-[#85452e]">{cartMessage}</p> : cart.items.length === 0 ? <div className="grid flex-1 place-items-center px-8 text-center"><div><span className="text-5xl">🧺</span><p className="mt-4 font-semibold">Keranjang masih kosong</p><p className="mt-2 text-sm text-[#788478]">Pilih produk untuk mulai berbelanja.</p></div></div> : <div className="flex-1 space-y-4 overflow-y-auto p-5">{cart.items.map((item) => <article key={item.product_id} className="flex gap-4 rounded-2xl border border-[#e9eadf] bg-white p-3"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#edf1e5] text-3xl">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : '🌱'}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold leading-5">{item.name}</h3><p className="mt-1 text-xs text-[#788478]">{formatPrice(item.price)} / {item.unit}</p></div><button onClick={() => void sendCartRequest(`/api/v1/cart/items/${item.product_id}`, { method: 'DELETE' })} disabled={cartBusy} className="text-xs font-semibold text-[#8b5945]">Hapus</button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => void changeCartQuantity(item, -1)} disabled={cartBusy} aria-label="Kurangi jumlah" className="grid h-8 w-8 place-items-center rounded-full border border-[#e5e8dc] disabled:opacity-50">−</button><span className="min-w-5 text-center text-sm font-semibold">{item.quantity}</span><button onClick={() => void changeCartQuantity(item, 1)} disabled={cartBusy || item.quantity >= item.stock} aria-label="Tambah jumlah" className="grid h-8 w-8 place-items-center rounded-full border border-[#e5e8dc] disabled:opacity-50">+</button></div><strong className="text-sm">{formatPrice(item.line_total)}</strong></div>{item.quantity > item.stock && <p className="mt-2 text-xs text-[#9a4e35]">Stok tersisa {item.stock}. Sesuaikan jumlah sebelum checkout.</p>}</div></article>)}</div>}{!orderConfirmation && <div className="border-t border-[#e8e9df] bg-white p-5"><div className="flex justify-between text-sm"><span className="text-[#788478]">Subtotal produk</span><strong>{formatPrice(cart.subtotal)}</strong></div><p className="mt-2 text-xs leading-5 text-[#899187]">Biaya pengiriman dikonfirmasi oleh Toko Amad.</p>{checkoutOpen && currentUser ? <div className="mt-4 flex gap-3"><button type="button" onClick={() => { setCheckoutOpen(false); setCheckoutMessage(''); }} className="flex-1 rounded-full border border-[#dfe4d7] px-4 py-3 text-sm font-semibold">Kembali</button><button form="checkout-form" type="submit" disabled={checkoutBusy} className="flex-1 rounded-full bg-[#173d2a] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{checkoutBusy ? 'Menyimpan…' : 'Buat pesanan'}</button></div> : !checkoutOpen ? <button onClick={() => { if (!currentUser) { window.location.assign('/login?redirect=checkout'); return; } setCheckoutOpen(true); setCartMessage(''); }} disabled={cart.items.length === 0 || cartBusy} className="mt-4 w-full rounded-full bg-[#173d2a] px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Lanjut ke checkout</button> : null}</div>}{orderConfirmation && <div className="border-t border-[#e8e9df] bg-white p-5"><button onClick={closeCart} className="w-full rounded-full bg-[#173d2a] px-5 py-3.5 text-sm font-bold text-white">Selesai</button></div>}</aside></div>}
            <footer className="border-t border-[#e8e9df] bg-[#fbfcf8]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[#788478] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 Toko Amad. Sahabat tumbuh petani.</span><span>Pupuk • Perlindungan tanaman • Perlengkapan tani</span></div></footer>
        </div>
    );
}

const currentPath = window.location.pathname;
const isAuthenticationPage = ['/admin', '/login', '/register'].includes(currentPath);
const isOrdersPage = currentPath === '/pesanan' || currentPath.startsWith('/pesanan/');

createRoot(document.getElementById('app')).render(isAuthenticationPage ? <AdminApp /> : isOrdersPage ? <OrdersApp /> : <App />);
