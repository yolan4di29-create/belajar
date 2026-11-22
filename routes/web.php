<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::view('/admin', 'welcome')->name('admin.home');
Route::view('/login', 'welcome')->name('login');
Route::view('/register', 'welcome')->name('register');
Route::view('/pesanan', 'welcome')->middleware('auth')->name('orders.index');
Route::view('/pesanan/{order}', 'welcome')->middleware('auth')->name('orders.receipt');
