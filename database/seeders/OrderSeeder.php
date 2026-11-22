<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = Product::query()
            ->where('is_active', true)
            ->limit(2)
            ->get();

        if ($products->isEmpty()) {
            return;
        }

        $subtotal = (int) $products->sum(fn (Product $product): float => (float) $product->price);
        $order = Order::factory()->create(['subtotal' => $subtotal]);

        foreach ($products as $product) {
            OrderItem::factory()->create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'sku' => $product->sku,
                'unit_price' => $product->price,
                'line_total' => $product->price,
            ]);
        }
    }
}
