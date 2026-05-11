<?php

use App\Http\Controllers\Authentication_Controllers\AuthController;
use App\Http\Controllers\Authentication_Controllers\ForgotPasswordController;
use App\Http\Controllers\Syllabi_Controllers\SyllabusController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ---------------- AUTHENTICATION ROUTES ---------------- */
Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/login', function () {
    return Inertia::render('login_sections/Login');
})->name('login');

Route::post('/login', [AuthController::class, 'login'])
    ->name('login.attempt')
    ->middleware('throttle:5,1');

// Forgot Password
Route::get('/forgot-password', fn() => Inertia::render('login_sections/ForgotPassword'))->name('password.request');
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendOtp'])->name('password.email');

// Verify OTP
Route::get('/verify-otp', function () {
    if (!session('otp_sent')) {
        return redirect()->route('password.request');
    }
    return Inertia::render('login_sections/VerifyOTP', [
        'email' => session('otp_email')
    ]);
})->name('otp.form');

Route::post('/verify-otp', [ForgotPasswordController::class, 'verifyOtp'])->name('otp.verify');

// Reset Password
Route::get('/reset-password', function () {
    if (!session('otp_verified')) {
        return redirect()->route('password.request');
    }
    return Inertia::render('login_sections/UpdatePassword', [
        'email' => session('otp_email')
    ]);
})->name('password.reset.form');

Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword'])->name('password.update');

// Logout
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

/* ---------------- PROTECTED ROUTES ---------------- */

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard_sections/Dashboard');
    })->name('dashboard');

    /* ---------------- SYLLABUS ROUTES ---------------- */

    // Step Views
    Route::get('/syllabus-generator/step-1', fn() => Inertia::render('syllabus_steps/Step1'))->name('syllabus.step1');
    Route::get('/syllabus-generator/step-2', fn() => Inertia::render('syllabus_steps/Step2'))->name('syllabus.step2');
    Route::get('/syllabus-generator/step-3', fn() => Inertia::render('syllabus_steps/Step3'))->name('syllabus.step3');
    Route::get('/syllabus-generator/step-4', fn() => Inertia::render('syllabus_steps/Step4'))->name('syllabus.step4');
    Route::get('/syllabus-generator/step-5', fn() => Inertia::render('syllabus_steps/Step5'))->name('syllabus.step5');
    Route::get('/syllabus-generator/step-6', fn() => Inertia::render('syllabus_steps/Step6'))->name('syllabus.step6');

    // Save syllabus (all steps + header/footer)
    Route::post('/syllabus-generator/save', [SyllabusController::class, 'store'])
        ->name('syllabus.save');

    // Alias kept for backward compatibility (older frontend references)
    Route::post('/syllabus/save', [SyllabusController::class, 'store'])
        ->name('syllabus.save.alias');

    /* ---------------- PDF VIEWER ROUTES ---------------- */
    Route::get('/viewer/{id}', function ($id) {
        $file = [
            "id"   => $id,
            "name" => "BSIT 2026 - SYLLABUS",
            "date" => "January 25, 2026",
            "url"  => "/sample.pdf"
        ];
        return Inertia::render('pdf_viewer_layout/PdfViewer', [
            'file' => $file
        ]);
    });
});