<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        window.GOOGLE_DOCS_CLIENT_ID = "1018371869413-9iku4qkf5mebale45f6p13chnj8or71v.apps.googleusercontent.com";
    </script>
    <title>PUP SyllabiSys</title>
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
    @inertiaHead
</head>
<body class="antialiased">
    @inertia
</body>
</html>