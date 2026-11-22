<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection(
            Order::query()
                ->where('user_id', $request->user()->id)
                ->with('items')
                ->latest()
                ->paginate(20),
        );
    }

    public function receipt(Request $request, Order $order): JsonResponse|OrderResource
    {
        $ownedOrder = Order::query()
            ->where('user_id', $request->user()->id)
            ->with('items')
            ->findOrFail($order->id);

        if ($ownedOrder->payment_status !== 'paid') {
            return response()->json([
                'message' => 'Struk tersedia setelah pembayaran dikonfirmasi oleh Toko Amad.',
            ], 409);
        }

        return new OrderResource($ownedOrder);
    }
}
