<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AdminProductResource::collection(
            Product::query()->with('category')->latest()->paginate(20),
        );
    }

    public function store(Request $request): Response
    {
        $validated = $this->validatedProduct($request);
        $validated['slug'] = $this->makeSlug($validated['name']);

        $product = Product::query()->create($validated);

        return AdminProductResource::make($product->load('category'))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Product $product): Response
    {
        $validated = $this->validatedProduct($request, $product);

        if ($product->name !== $validated['name']) {
            $validated['slug'] = $this->makeSlug($validated['name']);
        }

        $product->update($validated);

        return AdminProductResource::make($product->load('category'))
            ->response();
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->update(['is_active' => false]);

        return response()->json(['message' => 'Produk dinonaktifkan.']);
    }

    /** @return array<string, mixed> */
    private function validatedProduct(Request $request, ?Product $product = null): array
    {
        $skuRule = Rule::unique('products', 'sku');

        if ($product !== null) {
            $skuRule->ignore($product);
        }

        return $request->validate([
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:180'],
            'sku' => ['nullable', 'string', 'max:255', $skuRule],
            'description' => ['nullable', 'string', 'max:10000'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'unit' => ['required', 'string', 'max:40'],
            'image_url' => ['nullable', 'url', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    private function makeSlug(string $name): string
    {
        return Str::slug($name).'-'.Str::lower(Str::random(6));
    }
}
