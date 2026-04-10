<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PUP SyllabiSys</title>
    @viteReactRefresh
    @vite('resources/js/app.tsx')
    @inertiaHead
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
</head>
<body class="antialiased">
    @inertia
</body>
</html>