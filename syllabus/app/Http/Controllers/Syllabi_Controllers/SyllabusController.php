<?php

namespace App\Http\Controllers\Syllabi_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use App\Models\Syllabus;

class SyllabusController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'syllabus_session_id' => 'required_without:session_id|string|max:255|nullable',
            'session_id'          => 'required_without:syllabus_session_id|string|max:255|nullable',
        ]);

        $sessionId   = $request->session_id ?? $request->syllabus_session_id;
        $professorId = Auth::id();

        if (!$professorId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        if (!$sessionId) {
            return response()->json(['error' => 'Missing session ID'], 422);
        }

        $step1 = $this->safeJson($request->step1);
        $step2 = $this->safeJson($request->step2);
        $step3 = $this->safeJson($request->step3);
        $step4 = $this->safeJson($request->step4);
        $step5 = $this->safeJson($request->step5);
        $step6 = $this->safeJson($request->step6);

        $courseCode  = $request->course_code  ?: ($step1['course_code']  ?? '');
        $courseTitle = $request->course_title ?: ($step1['course_title'] ?? '');

        // Export options
        $exportFormat = $step6['exportFormat'] ?? 'pdf';
        $customName   = trim($step6['fileName'] ?? '');
        $header       = $request->header ?? ($step6['header'] ?? '');
        $footer       = $request->footer ?? ($step6['footer'] ?? '');

        $baseName = $customName ?: ($courseCode ?: 'syllabus');
        $baseName = trim(preg_replace('/[^a-zA-Z0-9_\-\. ]/', '', $baseName)) ?: 'syllabus';

        // final_data for text column
        $finalDataRaw = $request->final_data;
        $finalData = is_array($finalDataRaw)
            ? json_encode($finalDataRaw)
            : (is_string($finalDataRaw) && $finalDataRaw !== '' ? $finalDataRaw : null);

        // Persist to DB
        $syllabus = Syllabus::updateOrCreate(
            ['session_id' => $sessionId, 'professor_id' => $professorId],
            [
                'course_code'  => $courseCode,
                'course_title' => $courseTitle,
                'step1'        => $step1,
                'step2'        => $step2,
                'step3'        => $step3,
                'step4'        => $step4,
                'step5'        => $step5,
                'step6'        => $step6,
                'final_data'   => $finalData,
            ]
        );

        Log::info('Syllabus saved', [
            'session_id'  => $sessionId,
            'professor_id'=> $professorId,
            'syllabus_id' => $syllabus->id,
            'format'      => $exportFormat,
            'file_name'   => $baseName,
        ]);

        // Auto-save only — frontend passes download=false for checklist saves
        if ($request->input('download') === false || $request->input('download') === 'false') {
            return response()->json(['message' => 'Saved', 'data' => $syllabus]);
        }

        return $exportFormat === 'docx'
            ? $this->streamDocx($baseName, $courseCode, $courseTitle, $step1, $step2, $step3, $step4, $step5, $header, $footer)
            : $this->streamPdf ($baseName, $courseCode, $courseTitle, $step1, $step2, $step3, $step4, $step5, $header, $footer);
    }

    private function streamPdf(string $baseName, string $courseCode, string $courseTitle,
        array $step1, array $step2, array $step3, array $step4, array $step5,
        string $header, string $footer)
    {
        $html = $this->buildHtml($courseCode, $courseTitle, $step1, $step2, $step3, $step4, $step5, $header, $footer);
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->download("{$baseName}.pdf");
    }

    private function streamDocx(string $baseName, string $courseCode, string $courseTitle,
        array $step1, array $step2, array $step3, array $step4, array $step5,
        string $header, string $footer)
    {
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Arial');
        $phpWord->setDefaultFontSize(11);

        $section = $phpWord->addSection([
            'marginTop' => 1000, 'marginBottom' => 1000,
            'marginLeft' => 1200, 'marginRight' => 1200,
        ]);

        if ($header) {
            $section->addHeader()->addText(strip_tags($header), ['size' => 9]);
        }
        if ($footer) {
            $section->addFooter()->addText(strip_tags($footer), ['size' => 9]);
        }

        $section->addText($courseTitle, ['bold' => true,  'size' => 16], ['alignment' => 'center']);
        $section->addText($courseCode,  ['bold' => false, 'size' => 12], ['alignment' => 'center']);
        $section->addTextBreak(1);

        $this->addDocxSection($section, 'Course Information', [
            'Credit Units'   => $step1['course_credit']      ?? '',
            'Description'    => $step1['course_description'] ?? '',
            'Pre-requisites' => $step1['pre_requisites']     ?? 'None',
            'Co-requisites'  => $step1['co_requisites']      ?? 'None',
        ]);

        $section->addText('Program & Course Outcomes', ['bold' => true, 'size' => 13]);
        $section->addTextBreak(1);
        foreach (($step2['plos'] ?? []) as $i => $plo) {
            $section->addListItem("PLO " . ($i + 1) . ": " . ($plo['description'] ?? ''));
        }
        foreach (($step2['clos'] ?? []) as $i => $clo) {
            $section->addListItem("CLO " . ($i + 1) . ": " . ($clo['description'] ?? ''));
        }
        $section->addTextBreak(1);

        $section->addText('Course Schedule', ['bold' => true, 'size' => 13]);
        $section->addTextBreak(1);
        foreach (($step3['obtlData'] ?? []) as $row) {
            $section->addText("Week {$row['week']}: " . ($row['topic'] ?? '') . " — " . ($row['activity'] ?? ''), ['size' => 10]);
        }
        $section->addTextBreak(1);

        $section->addText('Grading Components', ['bold' => true, 'size' => 13]);
        foreach (($step4['gradingComponents'] ?? []) as $comp) {
            $section->addText(($comp['name'] ?? '') . ' — ' . ($comp['percentage'] ?? '') . '%', ['size' => 10]);
        }
        $section->addTextBreak(1);

        $classInfo   = $step5['classInfo']   ?? [];
        $facultyInfo = $step5['facultyInfo'] ?? [];
        $this->addDocxSection($section, 'Class Information', [
            'Section'  => $classInfo['section']   ?? '',
            'Schedule' => $classInfo['schedule']  ?? '',
            'Room'     => $classInfo['room']       ?? '',
        ]);
        $this->addDocxSection($section, 'Faculty Information', [
            'Name'   => $facultyInfo['name']   ?? '',
            'Email'  => $facultyInfo['email']  ?? '',
            'Office' => $facultyInfo['office'] ?? '',
        ]);

        $tmpPath = tempnam(sys_get_temp_dir(), 'syllabus_') . '.docx';
        IOFactory::createWriter($phpWord, 'Word2007')->save($tmpPath);

        return response()->download(
            $tmpPath,
            "{$baseName}.docx",
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        )->deleteFileAfterSend(true);
    }

    private function buildHtml(string $courseCode, string $courseTitle,
        array $step1, array $step2, array $step3, array $step4, array $step5,
        string $header, string $footer): string
    {
        $plos = collect($step2['plos'] ?? [])->map(function($p, $i) {
            return "<li>PLO " . ($i+1) . ": " . htmlspecialchars($p['description'] ?? '') . "</li>";
        })->implode('');

        $clos = collect($step2['clos'] ?? [])->map(function($c, $i) {
            return "<li>CLO " . ($i+1) . ": " . htmlspecialchars($c['description'] ?? '') . "</li>";
        })->implode('');

        $obtl = collect($step3['obtlData'] ?? [])->map(function($r) {
            return "<tr>
                <td>" . htmlspecialchars($r['week']       ?? '') . "</td>
                <td>" . htmlspecialchars($r['topic']      ?? '') . "</td>
                <td>" . htmlspecialchars($r['activity']   ?? '') . "</td>
                <td>" . htmlspecialchars($r['assessment'] ?? '') . "</td>
             </tr>";
        })->implode('');

        $grading = collect($step4['gradingComponents'] ?? [])->map(function($g) {
            return "<tr>
                <td>" . htmlspecialchars($g['name']       ?? '') . "</td>
                <td>" . htmlspecialchars($g['percentage'] ?? '') . "%</td>
             </tr>";
        })->implode('');

        $ci = $step5['classInfo']   ?? [];
        $fi = $step5['facultyInfo'] ?? [];

        $ciSection  = $ci['section']   ?? '';
        $ciSchedule = $ci['schedule']  ?? '';
        $ciRoom     = $ci['room']      ?? '';
        $fiName     = $fi['name']      ?? '';
        $fiEmail    = $fi['email']     ?? '';
        $fiOffice   = $fi['office']    ?? '';

        $credit      = $step1['course_credit']      ?? '';
        $description = $step1['course_description'] ?? '';
        $preReq      = $step1['pre_requisites']     ?? 'None';
        $coReq       = $step1['co_requisites']      ?? 'None';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body  { font-family: Arial, sans-serif; font-size: 11pt; margin: 0; padding: 0; }
  .page { padding: 24px 36px; }
  .hdr  { border-bottom: 1px solid #999; padding-bottom: 6px; margin-bottom: 12px; font-size: 9pt; }
  .ftr  { border-top: 1px solid #999; padding-top: 6px; margin-top: 24px; font-size: 9pt; }
  h1    { font-size: 18pt; text-align: center; margin-bottom: 2px; }
  h2    { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; }
  h3    { font-size: 11pt; text-align: center; color: #444; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
  th,td { border: 1px solid #bbb; padding: 5px 8px; }
  th    { background: #f0f0f0; font-weight: bold; }
  ul    { margin: 6px 0 6px 20px; }
  .lbl  { font-weight: bold; display: inline-block; min-width: 160px; }
</style>
</head>
<body>
<div class="page">
  <div class="hdr">{$header}</div>

  <h1>{$courseTitle}</h1>
  <h3>{$courseCode}</h3>

  <h2>Course Information</h2>
  <p><span class="lbl">Credit Units:</span> {$credit}</p>
  <p><span class="lbl">Description:</span> {$description}</p>
  <p><span class="lbl">Pre-requisites:</span> {$preReq}</p>
  <p><span class="lbl">Co-requisites:</span> {$coReq}</p>

  <h2>Program Learning Outcomes</h2>
  <ul>{$plos}</ul>

  <h2>Course Learning Outcomes</h2>
  <ul>{$clos}</ul>

  <h2>Course Schedule (OBTL)</h2>
  <table>
    <tr><th>Week</th><th>Topic</th><th>Activity</th><th>Assessment</th></tr>
    {$obtl}
  </table>

  <h2>Grading</h2>
  <table>
    <tr><th>Component</th><th>Percentage</th></tr>
    {$grading}
  </table>

  <h2>Class Information</h2>
  <p><span class="lbl">Section:</span>  {$ciSection}</p>
  <p><span class="lbl">Schedule:</span> {$ciSchedule}</p>
  <p><span class="lbl">Room:</span>     {$ciRoom}</p>

  <h2>Faculty Information</h2>
  <p><span class="lbl">Name:</span>   {$fiName}</p>
  <p><span class="lbl">Email:</span>  {$fiEmail}</p>
  <p><span class="lbl">Office:</span> {$fiOffice}</p>

  <div class="ftr">{$footer}</div>
</div>
</body>
</html>
HTML;
    }

    private function addDocxSection($section, string $title, array $fields): void
    {
        $section->addText($title, ['bold' => true, 'size' => 13]);
        foreach ($fields as $label => $value) {
            $section->addText("{$label}: {$value}", ['size' => 10]);
        }
        $section->addTextBreak(1);
    }

    private function safeJson($data): array
    {
        if (is_array($data))  return $data;
        if (empty($data))     return [];
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            return json_last_error() === JSON_ERROR_NONE ? ($decoded ?? []) : [];
        }
        return [];
    }
}