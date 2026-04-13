<?php

namespace App\Http\Controllers\Authentication_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Professor;

class AuthController extends Controller
{
    // WEB LOGIN (Inertia)
    public function login(Request $request)
    {
        Log::info('🔥 Login attempt started', [
            'email' => $request->email,
            'password' => $request->password
        ]);

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        Log::info('📦 Credentials validated');

        $attempt = Auth::guard('web')->attempt([
            'email' => $credentials['email'],
            'password' => $credentials['password']
        ]);

        Log::info('🔐 Auth attempt result', [
            'success' => $attempt
        ]);

        if ($attempt) {
            $request->session()->regenerate();

            Log::info('✅ Login successful', [
                'user_id' => Auth::id()
            ]);

            return redirect()->route('dashboard');
        }

        Log::warning('❌ Login failed - invalid credentials');

        return back()->withErrors([
            'email' => 'Invalid professor credentials.',
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