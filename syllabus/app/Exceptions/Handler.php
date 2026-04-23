<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Session\TokenMismatchException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        // API / JSON requests
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Web / Inertia requests
        return redirect()->route('login')
            ->with([
                'error' => 'Session expired. Please login again.',
            ]);
    }

    public function render($request, Throwable $exception)
    {
        // CSRF / session expired
        if ($exception instanceof TokenMismatchException) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Session expired',
                ], 419);
            }

            return redirect()->route('login')
                ->with([
                    'error' => 'Session expired. Please login again.',
                ]);
        }

        return parent::render($request, $exception);
    }
}