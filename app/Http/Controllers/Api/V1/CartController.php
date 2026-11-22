<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->cartResponse($request);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:99'],
        ]);

        $product = Product::query()
            ->where('is_active', true)
            ->findOrFail($validated['product_id']);
        $cartQuantities = $request->session()->get('cart', []);
        $nextQuantity = (int) ($cartQuantities[$product->id] ?? 0) + (int) ($validated['quantity'] ?? 1);

        if ($nextQuantity > $product->stock) {
            return response()->json([
                'message' => 'Jumlah melebihi stok yang tersedia.',
            ], 422);
        }

        $cartQuantities[$product->id] = $nextQuantity;
        $request->session()->put('cart', $cartQuantities);

        return $this->cartResponse($request);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        abort_unless($product->is_active, 404);

        if ($validated['quantity'] > $product->stock) {
            return response()->json([
                'message' => 'Jumlah melebihi stok yang tersedia.',
            ], 422);
        }

        $cartQuantities = $request->session()->get('cart', []);
        $cartQuantities[$product->id] = $validated['quantity'];
        $request->session()->put('cart', $cartQuantities);

        return $this->cartResponse($request);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $cartQuantities = $request->session()->get('cart', []);
        unset($cartQuantities[$product->id]);
        $request->session()->put('cart', $cartQuantities);

        return $this->cartResponse($request);
    }

    public function clear(Request $request): JsonResponse
    {
        $request->session()->forget('cart');

        return $this->cartResponse($request);
    }

    private function cartResponse(Request $request): JsonResponse
    {
        $cartQuantities = $request->session()->get('cart', []);
        $products = Product::query()
            ->where('is_active', true)
            ->whereIn('id', array_keys($cartQuantities))
            ->get(['id', 'name', 'price', 'stock', 'unit', 'image_url']);

        $items = $products->map(function (Product $product) use ($cartQuantities): array {
            $quantity = (int) ($cartQuantities[$product->id] ?? 0);
            $price = (float) $product->price;

            return [
                'product_id' => $product->id,
                'name' => $product->name,
                'price' => $price,
                'quantity' => $quantity,
                'stock' => $product->stock,
                'unit' => $product->unit,
                'image_url' => $product->image_url,
                'line_total' => (int) round($price * $quantity),
            ];
        });

        $validCartQuantities = $items->mapWithKeys(
            fn (array $item): array => [(string) $item['product_id'] => $item['quantity']],
        )->all();

        $request->session()->put('cart', $validCartQuantities);

        return response()->json([
            'items' => $items->values(),
            'item_count' => $items->sum('quantity'),
            'subtotal' => $items->sum('line_total'),
        ]);
    }
}
