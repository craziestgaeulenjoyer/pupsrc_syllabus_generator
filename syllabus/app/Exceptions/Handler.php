<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Session\TokenMismatchException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected function unauthenticated($request, \Illuminate\Auth\AuthenticationException $exception)
    {
        return redirect()
            ->route('login')
            ->with('error', 'Session expired. Please login again.');
    }

    public function render($request, Throwable $exception)
    {
        if ($exception instanceof TokenMismatchException) {
            return redirect()
                ->route('login')
                ->with('error', 'Session expired. Please login again.');
        }

        return parent::render($request, $exception);
    }
}