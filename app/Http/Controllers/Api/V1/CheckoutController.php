<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipping_address' => ['required', 'string', 'min:10', 'max:1000'],
            'payment_method' => ['required', 'string', 'in:bank_transfer,cash_on_delivery'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $cartQuantities = $request->session()->get('cart', []);

        if ($cartQuantities === []) {
            throw ValidationException::withMessages([
                'cart' => ['Keranjang masih kosong.'],
            ]);
        }

        $user = $request->user();
        $order = DB::transaction(function () use ($cartQuantities, $validated, $user): Order {
            $products = Product::query()
                ->where('is_active', true)
                ->whereIn('id', array_keys($cartQuantities))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($cartQuantities)) {
                throw ValidationException::withMessages([
                    'cart' => ['Ada produk di keranjang yang sudah tidak tersedia.'],
                ]);
            }

            $orderLines = [];
            $subtotalInCents = 0;

            foreach ($cartQuantities as $productId => $quantity) {
                $product = $products->get((int) $productId);
                $quantity = (int) $quantity;

                if ($product === null || $quantity < 1 || $quantity > $product->stock) {
                    throw ValidationException::withMessages([
                        'cart' => ['Stok produk berubah. Perbarui keranjang sebelum membuat pesanan.'],
                    ]);
                }

                $unitPriceInCents = (int) round((float) $product->price * 100);
                $lineTotalInCents = $unitPriceInCents * $quantity;
                $subtotalInCents += $lineTotalInCents;
                $orderLines[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => number_format($unitPriceInCents / 100, 2, '.', ''),
                    'line_total' => number_format($lineTotalInCents / 100, 2, '.', ''),
                ];
            }

            $subtotal = number_format($subtotalInCents / 100, 2, '.', '');

            $order = Order::query()->create([
                'order_number' => 'TA-'.now()->format('Ymd').'-'.Str::upper(Str::random(8)),
                'user_id' => $user->id,
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'customer_phone' => null,
                'shipping_address' => $validated['shipping_address'],
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'pending',
                'paid_at' => null,
                'subtotal' => $subtotal,
                'shipping_fee' => null,
                'total' => null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($orderLines as $orderLine) {
                /** @var Product $product */
                $product = $orderLine['product'];

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'sku' => $product->sku,
                    'quantity' => $orderLine['quantity'],
                    'unit_price' => $orderLine['unit_price'],
                    'line_total' => $orderLine['line_total'],
                ]);

                $product->decrement('stock', $orderLine['quantity']);
            }

            return $order;
        }, attempts: 3);

        $request->session()->forget('cart');

        return response()->json([
            'message' => 'Pesanan berhasil dibuat. Toko Amad akan menghubungi Anda untuk konfirmasi biaya pengiriman dan pembayaran.',
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'subtotal' => $order->subtotal,
                'shipping_fee' => $order->shipping_fee,
                'total' => $order->total,
            ],
        ], 201);
    }
}
