<?php

namespace App\Http\Controllers\Authentication_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
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

        $user = Professor::where('email', $credentials['email'])->first();

        // USER NOT FOUND
        if (!$user) {
            return back()->withErrors([
                'email' => 'Invalid professor credentials.',
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
                'email' => 'Account locked.',
                'lock_until' => $user->lock_until->toISOString(),
            ]);
        }

        // ATTEMPT LOGIN
        if (Auth::attempt($credentials)) {

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
                'email' => 'Account locked.',
                'lock_until' => $user->lock_until->toISOString(),
            ]);
        }

        $user->save();

        return back()->withErrors([
            'email' => "Invalid credentials. {$attemptsLeft} attempt(s) left."
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