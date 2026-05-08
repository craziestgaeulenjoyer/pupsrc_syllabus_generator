<!DOCTYPE html>
<html>
<head>
    <title>Syllabus</title>
</head>
<body>
    <h1>{{ $syllabus->course_title }}</h1>
    <p>{{ $syllabus->course_code }}</p>

    <hr>

    <pre>
        {{ json_encode($syllabus->final_data, JSON_PRETTY_PRINT) }}
    </pre>
</body>
</html>