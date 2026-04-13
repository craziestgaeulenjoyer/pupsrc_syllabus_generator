<?php

use App\Http\Controllers\Authentication_Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'apiLogin']);
Route::post('/logout', [AuthController::class, 'apiLogout']);
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');