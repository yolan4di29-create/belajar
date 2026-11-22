<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return OrderResource::collection(
            Order::query()->with('items')->latest()->paginate(20),
        );
    }

    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,confirmed,processing,shipped,completed,cancelled'],
        ]);

        $updatedOrder = DB::transaction(function () use ($order, $validated): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            $allowedTransitions = [
                'pending' => ['confirmed', 'cancelled'],
                'confirmed' => ['processing', 'cancelled'],
                'processing' => ['shipped', 'cancelled'],
                'shipped' => ['completed'],
                'completed' => [],
                'cancelled' => [],
            ];

            if (! in_array($validated['status'], $allowedTransitions[$lockedOrder->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Perubahan status pesanan tidak dapat dilakukan.'],
                ]);
            }

            if ($validated['status'] === 'cancelled' && $lockedOrder->payment_status === 'paid') {
                throw ValidationException::withMessages([
                    'status' => ['Pesanan yang sudah dibayar perlu proses pengembalian dana sebelum dibatalkan.'],
                ]);
            }

            if ($validated['status'] === 'cancelled') {
                $items = $lockedOrder->items()
                    ->orderBy('product_id')
                    ->get(['product_id', 'quantity']);
                $products = Product::query()
                    ->whereIn('id', $items->pluck('product_id'))
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                foreach ($items as $item) {
                    $product = $products->get($item->product_id);

                    if ($product !== null) {
                        $product->increment('stock', $item->quantity);
                    }
                }
            }

            $lockedOrder->update(['status' => $validated['status']]);

            return $lockedOrder->load('items');
        }, attempts: 3);

        return new OrderResource($updatedOrder);
    }

    public function confirmPayment(Order $order): OrderResource
    {
        $updatedOrder = DB::transaction(function () use ($order): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->payment_status === 'paid') {
                return $lockedOrder->load('items');
            }

            if ($lockedOrder->status === 'cancelled' || $lockedOrder->total === null) {
                throw ValidationException::withMessages([
                    'payment' => ['Pembayaran hanya dapat dikonfirmasi untuk pesanan aktif dengan total yang sudah ditetapkan.'],
                ]);
            }

            $lockedOrder->update([
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);

            return $lockedOrder->load('items');
        }, attempts: 3);

        return new OrderResource($updatedOrder);
    }

    public function updateShippingFee(Request $request, Order $order): OrderResource
    {
        $validated = $request->validate([
            'shipping_fee' => ['required', 'numeric', 'min:0'],
        ]);

        $updatedOrder = DB::transaction(function () use ($order, $validated): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->payment_status === 'paid' || in_array($lockedOrder->status, ['shipped', 'completed', 'cancelled'], true)) {
                throw ValidationException::withMessages([
                    'shipping_fee' => ['Biaya kirim tidak dapat diubah untuk status pesanan ini.'],
                ]);
            }

            $subtotalInCents = (int) round((float) $lockedOrder->subtotal * 100);
            $shippingFeeInCents = (int) round((float) $validated['shipping_fee'] * 100);

            $lockedOrder->update([
                'shipping_fee' => number_format($shippingFeeInCents / 100, 2, '.', ''),
                'total' => number_format(($subtotalInCents + $shippingFeeInCents) / 100, 2, '.', ''),
            ]);

            return $lockedOrder->load('items');
        }, attempts: 3);

        return new OrderResource($updatedOrder);
    }
}
