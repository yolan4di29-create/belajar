<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'category' => 'pupuk',
                'name' => 'Pupuk NPK Mutiara',
                'slug' => 'pupuk-npk-mutiara',
                'sku' => 'TA-PUP-0001',
                'description' => 'Pupuk NPK untuk membantu memenuhi kebutuhan nutrisi tanaman. Ikuti dosis pada label produk.',
                'price' => 28000,
                'stock' => 24,
                'unit' => '1 kg',
            ],
            [
                'category' => 'pupuk',
                'name' => 'Pupuk Kompos Organik',
                'slug' => 'pupuk-kompos-organik',
                'sku' => 'TA-PUP-0002',
                'description' => 'Kompos organik untuk perawatan tanah dan tanaman.',
                'price' => 35000,
                'stock' => 18,
                'unit' => '5 kg',
            ],
            [
                'category' => 'pupuk',
                'name' => 'Pupuk Urea Prill',
                'slug' => 'pupuk-urea-prill',
                'sku' => 'TA-PUP-0003',
                'description' => 'Pupuk urea untuk mendukung kebutuhan nutrisi tanaman sesuai rekomendasi.',
                'price' => 16000,
                'stock' => 32,
                'unit' => '1 kg',
            ],
            [
                'category' => 'pupuk',
                'name' => 'Pupuk Gandasil B',
                'slug' => 'pupuk-gandasil-b',
                'sku' => 'TA-PUP-0004',
                'description' => 'Pupuk daun untuk tanaman berbunga dan berbuah. Gunakan sesuai label.',
                'price' => 12000,
                'stock' => 15,
                'unit' => '100 g',
            ],
            [
                'category' => 'pestisida',
                'name' => 'Pestisida Nabati Ekstrak Mimba',
                'slug' => 'pestisida-nabati-ekstrak-mimba',
                'sku' => 'TA-PES-0001',
                'description' => 'Contoh data katalog. Gunakan sesuai label resmi dan petunjuk keselamatan produk.',
                'price' => 27000,
                'stock' => 12,
                'unit' => '250 ml',
            ],
            [
                'category' => 'benih',
                'name' => 'Benih Sayur Pilihan',
                'slug' => 'benih-sayur-pilihan',
                'sku' => 'TA-BEN-0001',
                'description' => 'Contoh benih untuk kebutuhan kebun rumah dan lahan tanam.',
                'price' => 15000,
                'stock' => 20,
                'unit' => '1 pack',
            ],
            [
                'category' => 'alat-tani',
                'name' => 'Sarung Tangan Kebun',
                'slug' => 'sarung-tangan-kebun',
                'sku' => 'TA-ALT-0001',
                'description' => 'Contoh perlengkapan untuk membantu pekerjaan berkebun.',
                'price' => 18000,
                'stock' => 16,
                'unit' => '1 pasang',
            ],
        ];

        foreach ($products as $product) {
            $category = Category::query()
                ->where('slug', $product['category'])
                ->firstOrFail();

            unset($product['category']);

            Product::query()->updateOrCreate(
                ['slug' => $product['slug']],
                [...$product, 'category_id' => $category->id, 'is_active' => true],
            );
        }
    }
}
