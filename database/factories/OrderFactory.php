<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_number' => 'TA-'.fake()->unique()->bothify('########-????'),
            'user_id' => null,
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => fake()->numerify('08##########'),
            'shipping_address' => fake()->address(),
            'status' => 'pending',
            'subtotal' => 50000,
            'shipping_fee' => null,
            'total' => null,
            'notes' => null,
        ];
    }
}
