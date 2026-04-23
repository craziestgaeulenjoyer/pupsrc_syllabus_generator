<?php

namespace App\Http\Controllers\Authentication_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Professor;

class AuthController extends Controller
{
    // WEB LOGIN (Inertia)
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $key = 'login_attempts_' . $credentials['email'];
        $fakeLock = Cache::get($key . '_lock');

        if ($fakeLock && now()->lt($fakeLock)) {
            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'lock_until' => $fakeLock->toISOString(),
            ]);
        }

        $user = Professor::where('email', $credentials['email'])->first();

        // USER NOT FOUND
        if (!$user) {
            usleep(300000); // anti-timing

            $key = 'login_attempts_' . $credentials['email'];

            $attempts = Cache::get($key, 0) + 1;
            Cache::put($key, $attempts, now()->addMinutes(5));

            $maxAttempts = 3;
            $attemptsLeft = max(0, $maxAttempts - $attempts);

            // LOCK fake user too
            if ($attempts >= $maxAttempts) {
                $lockUntil = now()->addMinutes(1);

                Cache::put($key . '_lock', $lockUntil, now()->addMinutes(1));

                return back()->withErrors([
                    'email' => 'Invalid credentials.',
                    'lock_until' => $lockUntil->toISOString(),
                ]);
            }

            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'attempts_left' => $attemptsLeft,
            ]);
        }

        // CHECK IF LOCKED
        if ($user->lock_until && Carbon::now()->lt($user->lock_until)) {
            $remaining = Carbon::now()->diffInSeconds($user->lock_until, false);

            $minutes = floor($remaining / 60);
            $seconds = $remaining % 60;

            $timeLeft = $minutes > 0
                ? "{$minutes} minute(s) {$seconds} second(s)"
                : "{$seconds} second(s)";

            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'lock_until' => $user->lock_until->toISOString(),
            ]);
        }

        // ATTEMPT LOGIN
        if (Auth::attempt($credentials)) {
            Cache::forget('login_attempts_' . $credentials['email']);
            Cache::forget('login_attempts_' . $credentials['email'] . '_lock');

            // RESET attempts on success
            $user->update([
                'login_attempts' => 0,
                'lock_until' => null,
            ]);

            $request->session()->regenerate();

            return redirect()->route('dashboard');
        }

        // FAILED LOGIN
        $user->login_attempts += 1;

        $maxAttempts = 3;
        $attemptsLeft = $maxAttempts - $user->login_attempts;

        // LOCK AFTER 3 ATTEMPTS
        if ($user->login_attempts >= 3) {
            $lockMinutes = 1;  // set to '30' when in production; currently set to '1' for testing purposes

            $user->lock_until = Carbon::now()->addMinutes($lockMinutes);
            $user->login_attempts = 0;
            $user->save();

            $remaining = Carbon::now()->diffInSeconds($user->lock_until, false);

            $minutes = floor($remaining / 60);
            $seconds = $remaining % 60;

            $timeLeft = $minutes > 0
                ? "{$minutes} minute(s) {$seconds} second(s)"
                : "{$seconds} second(s)";

            return back()->withErrors([
                'email' => 'Invalid credentials.',
                'lock_until' => $user->lock_until->toISOString(),
            ]);
        }

        $user->save();

        return back()->withErrors([
            'email' => 'Invalid credentials.',
            'attempts_left' => $attemptsLeft,
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    // API LOGIN (optional)
    public function apiLogin(Request $request)
    {
        $user = Professor::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user
        ]);
    }

    public function apiLogout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }
}