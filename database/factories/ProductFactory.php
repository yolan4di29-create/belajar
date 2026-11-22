<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name' => fake()->words(3, true),
            'slug' => fake()->unique()->slug(),
            'sku' => fake()->unique()->bothify('TA-####-????'),
            'description' => fake()->sentence(),
            'price' => fake()->randomFloat(2, 5000, 250000),
            'stock' => fake()->numberBetween(0, 100),
            'unit' => fake()->randomElement(['1 kg', '500 g', '1 liter', '1 pcs']),
            'image_url' => null,
            'is_active' => true,
        ];
    }
}
