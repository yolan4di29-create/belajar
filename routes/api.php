<?php

use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\SessionController as AdminSessionController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\Customer\OrderController as CustomerOrderController;
use App\Http\Controllers\Api\V1\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::get('categories', CategoryController::class)->name('categories.index');
    Route::get('products', ProductController::class)->name('products.index');

    Route::middleware('web')->group(function (): void {
        Route::get('cart', [CartController::class, 'show'])->name('cart.show');
        Route::post('cart/items', [CartController::class, 'store'])->name('cart.items.store');
        Route::patch('cart/items/{product}', [CartController::class, 'update'])->name('cart.items.update');
        Route::delete('cart/items/{product}', [CartController::class, 'destroy'])->name('cart.items.destroy');
        Route::delete('cart', [CartController::class, 'clear'])->name('cart.clear');
        Route::middleware('auth')->group(function (): void {
            Route::post('checkout', CheckoutController::class)->name('checkout.store');
            Route::get('orders', [CustomerOrderController::class, 'index'])->name('orders.index');
            Route::get('orders/{order}/receipt', [CustomerOrderController::class, 'receipt'])->name('orders.receipt');
        });
        Route::get('admin/session', [AdminSessionController::class, 'show'])->name('admin.session.show');
        Route::post('admin/login', [AdminSessionController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('admin.login');

        Route::get('auth/session', [AdminSessionController::class, 'show'])->name('auth.session.show');
        Route::post('auth/login', [AdminSessionController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('auth.login');
        Route::post('auth/register', [AdminSessionController::class, 'register'])
            ->middleware('throttle:5,1')
            ->name('auth.register');
        Route::post('auth/logout', [AdminSessionController::class, 'destroy'])
            ->middleware('auth')
            ->name('auth.logout');

        Route::prefix('admin')
            ->name('admin.')
            ->middleware(['auth', 'can:manage-store'])
            ->group(function (): void {
                Route::post('logout', [AdminSessionController::class, 'destroy'])->name('logout');
                Route::apiResource('products', AdminProductController::class)->except(['show']);
                Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
                Route::patch('orders/{order}/status', [AdminOrderController::class, 'updateStatus'])
                    ->name('orders.status.update');
                Route::patch('orders/{order}/shipping', [AdminOrderController::class, 'updateShippingFee'])
                    ->name('orders.shipping.update');
                Route::patch('orders/{order}/payment', [AdminOrderController::class, 'confirmPayment'])
                    ->name('orders.payment.confirm');
            });
    });
});
