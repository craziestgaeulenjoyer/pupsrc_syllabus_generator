<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ---------------- AUTHENTICATION ROUTES ---------------- */

// Login Page
Route::get('/', function () {
    return Inertia::render('login_sections/Login');
})->name('login');

// 1. Forgot Password - Input Email
Route::get('/forgot-password', function () {
    return Inertia::render('login_sections/ForgotPassword');
})->name('password.request');

// 2. Verify OTP - Input 6-digit code
Route::get('/verify-access', function () {
    return Inertia::render('login_sections/VerifyOTP');
})->name('password.verify');

// 3. Update Password - Input New Credentials
Route::get('/update-password', function () {
    return Inertia::render('login_sections/UpdatePassword');
})->name('password.reset');


/* ---------------- DASHBOARD ROUTES ---------------- */

Route::get('/dashboard', function () {
    return Inertia::render('dashboard_sections/Dashboard');
})->name('dashboard');

/* ---------------- SYLLABUS ROUTES ---------------- */

Route::get('/syllabus-generator/step-1', function () {
    return Inertia::render('syllabus_steps/Step1');
})->name('syllabus.step1');