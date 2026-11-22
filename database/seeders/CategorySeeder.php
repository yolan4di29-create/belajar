<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Pupuk', 'slug' => 'pupuk', 'description' => 'Nutrisi untuk mendukung pertumbuhan tanaman.', 'icon' => '🌱'],
            ['name' => 'Pestisida', 'slug' => 'pestisida', 'description' => 'Perlindungan tanaman sesuai petunjuk penggunaan.', 'icon' => '🛡️'],
            ['name' => 'Benih', 'slug' => 'benih', 'description' => 'Pilihan benih untuk memulai musim tanam.', 'icon' => '🌾'],
            ['name' => 'Alat Tani', 'slug' => 'alat-tani', 'description' => 'Perlengkapan untuk kegiatan kebun dan sawah.', 'icon' => '🧤'],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'is_active' => true],
            );
        }
    }
}
