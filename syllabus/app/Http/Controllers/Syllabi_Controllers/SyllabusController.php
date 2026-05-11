<?php

namespace App\Http\Controllers\Syllabi_Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Shared\Html;
use PhpOffice\PhpWord\Shared\Converter;
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
        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'landscape');
        return $pdf->download("{$baseName}.pdf");
    }

    private function streamDocx(
        string $baseName,
        string $courseCode,
        string $courseTitle,
        array $step1,
        array $step2,
        array $step3,
        array $step4,
        array $step5,
        string $header,
        string $footer
    )
    {
        $html = $this->buildHtml(
            $courseCode,
            $courseTitle,
            $step1,
            $step2,
            $step3,
            $step4,
            $step5,
            $header,
            $footer
        );

        // CLEAN HTML FOR PHPWORD
        $html = preg_replace('/<!DOCTYPE[^>]*>/i', '', $html);
        $html = preg_replace('/<meta[^>]+>/i', '', $html);

        libxml_use_internal_errors(true);

        $phpWord = new PhpWord();

        $section = $phpWord->addSection([
            'orientation' => 'landscape',
            'pageSizeW'   => Converter::cmToTwip(29.7),
            'pageSizeH'   => Converter::cmToTwip(21.0),
            'marginTop'   => Converter::cmToTwip(1.5),
            'marginBottom'=> Converter::cmToTwip(1.5),
            'marginLeft'  => Converter::cmToTwip(1.8),
            'marginRight' => Converter::cmToTwip(1.8),
        ]);

        libxml_use_internal_errors(true);

        // REMOVE DOCTYPE
        $html = preg_replace('/<!DOCTYPE[^>]*>/i', '', $html);

        // REMOVE <html>, <head>, <body>
        $html = preg_replace('/<\/?(html|body)[^>]*>/i', '', $html);

        // REMOVE <head>...</head>
        $html = preg_replace('/<head\b[^>]*>(.*?)<\/head>/is', '', $html);

        // REMOVE <style>...</style>
        $html = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $html);

        // REMOVE <meta>
        $html = preg_replace('/<meta[^>]+>/i', '', $html);

        // REMOVE colgroup (PhpWord crashes on it)
        $html = preg_replace('/<colgroup\b[^>]*>(.*?)<\/colgroup>/is', '', $html);

        // REMOVE thead/tbody
        $html = str_replace(
            ['<thead>', '</thead>', '<tbody>', '</tbody>'],
            '',
            $html
        );

        // CLEAN INVALID UTF
        $html = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');

        // WRAP CLEAN HTML
        $html = "<div>{$html}</div>";

        Html::addHtml($section, $html, false, false);

        $tmpPath = tempnam(sys_get_temp_dir(), 'syllabus_') . '.docx';

        IOFactory::createWriter($phpWord, 'Word2007')->save($tmpPath);

        return response()->download(
            $tmpPath,
            "{$baseName}.docx",
            [
                'Content-Type' =>
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
        )->deleteFileAfterSend(true);
    }

    private function buildHtml(string $courseCode, string $courseTitle,
        array $step1, array $step2, array $step3, array $step4, array $step5,
        string $header, string $footer): string
    {
        // ── Helpers ──────────────────────────────────────────────────────────
        $h  = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $nl = fn(string $v): string => nl2br(htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));

        // ── Step 1 ────────────────────────────────────────────────────────────
        $credit      = $h((string)($step1['course_credit']      ?? ''));
        $description = $step1['course_description'] ?? '';   // may contain HTML from rich editor
        $preReq      = $h($step1['pre_requisites']  ?? 'None');
        $coReq       = $h($step1['co_requisites']   ?? 'None');
        $codeH       = $h($courseCode);
        $titleH      = $h($courseTitle);

        // ── Step 2 ────────────────────────────────────────────────────────────
        $plos       = $step2['plos']       ?? [];
        $clos       = $step2['clos']       ?? [];
        $iloMapping = $step2['iloMapping'] ?? [];
        $ploMapping = $step2['ploMapping'] ?? [];
        $iloCount   = 9;

        // PLO → ILO rows
        $ploIloRows = '';
        foreach ($plos as $plo) {
            $pid  = $plo['id'] ?? '';
            $lbl  = $h($plo['label'] ?? ($plo['description'] ?? ''));
            $cells = '';
            for ($n = 1; $n <= $iloCount; $n++) {
                $checked = !empty($iloMapping["{$pid}-{$n}"]);
                $cells .= '<td style="border:1px solid black;text-align:center;font-weight:bold;">' . ($checked ? '✓' : '') . '</td>';
            }
            $ploIloRows .= "<tr><td style=\"border:1px solid black;padding:4px;font-size:8pt;\">{$lbl}</td>{$cells}</tr>";
        }

        // ILO header numbers
        $iloNums = '';
        for ($n = 1; $n <= $iloCount; $n++) {
            $iloNums .= "<th style=\"border:1px solid black;width:28px;text-align:center;\">{$n}</th>";
        }

        // CLO → PLO rows
        $cloPloRows = '';
        foreach ($clos as $clo) {
            $cid   = $clo['id'] ?? '';
            $lbl   = $h($clo['text'] ?? ($clo['description'] ?? ''));
            $cells = '';
            foreach ($plos as $plo) {
                $pid = $plo['id'] ?? '';
                $val = $h($ploMapping["{$cid}-{$pid}"] ?? '');
                $cells .= "<td style=\"border:1px solid black;text-align:center;font-weight:bold;\">{$val}</td>";
            }
            $cloPloRows .= "<tr><td style=\"border:1px solid black;padding:4px;font-size:8pt;\">{$lbl}</td>{$cells}</tr>";
        }

        // PLO header numbers
        $ploNums = '';
        foreach ($plos as $i => $plo) {
            $ploNums .= '<th style="border:1px solid black;width:28px;text-align:center;">' . ($i + 1) . '</th>';
        }

        // ── Step 3 ────────────────────────────────────────────────────────────
        $obtlData   = $step3['obtlData']        ?? [];
        $references = array_filter($step3['references']      ?? [], fn($r) => !empty(trim($r['text'] ?? '')));
        $otherRefs  = array_filter($step3['otherReferences'] ?? [], fn($r) => !empty(trim($r['text'] ?? '')));

        // Paginate OBTL at 7 rows
        $ROWS_PER_PAGE = 7;
        $obtlPages = array_chunk($obtlData, $ROWS_PER_PAGE) ?: [[]];

        // Build OBTL pages HTML
        $obtlPagesHtml = '';
        foreach ($obtlPages as $pageIdx => $pageRows) {
            $isFirst = $pageIdx === 0;
            $isLast  = $pageIdx === count($obtlPages) - 1;

            $theadHtml = '';
            if ($isFirst) {
                $theadHtml = '
                <thead>
                    <tr style="background:#ffe8e8;">
                        <th rowspan="3" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Weeks<br/>(18 Weeks)</th>
                        <th rowspan="3" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Learning Outcomes (DLOs)</th>
                        <th rowspan="3" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Alignment to (CLOs)</th>
                        <th rowspan="3" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Learning Content/Topics</th>
                        <th colspan="3" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;background:#e8f4ff;">Instructional Delivery Design</th>
                        <th rowspan="3" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Assessment Tasks (TAs)</th>
                    </tr>
                    <tr style="background:#e8f4ff;">
                        <th rowspan="2" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Face-to-Face</th>
                        <th colspan="2" style="border:1px solid black;padding:4px;text-align:center;font-size:8pt;">Flexible Learning and Teaching Activities (FLTAs)</th>
                    </tr>
                    <tr style="background:#e8f4ff;">
                        <th style="border:1px solid black;padding:4px;text-align:center;font-size:7pt;">Synchronous</th>
                        <th style="border:1px solid black;padding:4px;text-align:center;font-size:7pt;">Asynchronous</th>
                    </tr>
                </thead>';
            }

            $rowsHtml = '';
            foreach ($pageRows as $row) {
                if (($row['type'] ?? '') === 'header') {
                    $topic = $h($row['topics'] ?? '');
                    $rowsHtml .= "<tr><td colspan=\"8\" style=\"border:1px solid black;padding:8px;text-align:center;font-weight:bold;font-size:9pt;background:#fffbeb;\">{$topic}</td></tr>";
                } else {
                    $weeks  = $h((string)($row['weeks']         ?? ''));
                    $dlo    = $h($row['dlo']                     ?? '');
                    $clo    = $h($row['clo']                     ?? '');
                    $topics = $h($row['topics']                  ?? '');
                    $face   = $h($row['deliveryFace']            ?? '');
                    $sync   = $h($row['deliverySync']            ?? '');
                    $async  = $h($row['deliveryAsync']           ?? '');
                    $tasks  = $h($row['tasks']                   ?? '');
                    $rowsHtml .= "
                    <tr style=\"vertical-align:top;\">
                        <td style=\"border:1px solid black;padding:4px;text-align:center;font-weight:bold;font-size:8pt;\">{$weeks}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$dlo}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$clo}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$topics}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$face}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$sync}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$async}</td>
                        <td style=\"border:1px solid black;padding:4px;font-size:8pt;white-space:pre-wrap;\">{$tasks}</td>
                    </tr>";
                }
            }

            // References block on last OBTL page
            $refsHtml = '';
            if ($isLast) {
                $refItems = '';
                foreach ($references as $ref) {
                    $refItems .= '<p style="margin:2px 0;">' . $h($ref['text'] ?? '') . '</p>';
                }
                $otherRefItems = '';
                foreach ($otherRefs as $ref) {
                    $otherRefItems .= '<p style="margin:2px 0;">' . $h($ref['text'] ?? '') . '</p>';
                }
                $refsHtml = '
                <table style="width:100%;border-collapse:collapse;border:1px solid black;margin-top:8px;font-size:8pt;">
                    <tr><td style="border:1px solid black;padding:6px;font-weight:bold;text-transform:uppercase;">
                        REFERENCES FROM THE NINOY AQUINO LEARNING AND LIBRARY RESOURCES CENTER (NALLRC)<br/>OUTCOMES-BASED BOOK LISTINGS (CBBL)
                    </td></tr>
                    <tr><td style="border:1px solid black;padding:6px;">' . ($refItems ?: '<em style="color:#888;">No references added.</em>') . '</td></tr>
                    <tr><td style="border:1px solid black;padding:6px;font-weight:bold;text-transform:uppercase;">OTHER REFERENCES</td></tr>
                    <tr><td style="border:1px solid black;padding:6px;">' . ($otherRefItems ?: '<em style="color:#888;">No other references added.</em>') . '</td></tr>
                </table>';
            }

            // Yellow banner only on overall page 1 (Course Overview), not on OBTL pages
            $yellowBanner = '';

            $obtlPagesHtml .= '
            <div class="page" style="page-break-before:always;">
                ' . $this->renderHeaderHtml($header) . '
                ' . $yellowBanner . '
                <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:8pt;table-layout:fixed;">
                    <colgroup>
                        <col style="width:6%;"/><col style="width:18%;"/><col style="width:10%;"/>
                        <col style="width:15%;"/><col style="width:13%;"/><col style="width:13%;"/>
                        <col style="width:13%;"/><col style="width:12%;"/>
                    </colgroup>
                    ' . $theadHtml . '
                    <tbody>' . $rowsHtml . '</tbody>
                </table>
                ' . $refsHtml . '
                ' . $this->renderFooterHtml($footer) . '
            </div>';
        }

        // ── Step 4 ────────────────────────────────────────────────────────────
        $gradingComponents = $step4['gradingComponents'] ?? [];
        $requirements      = $step4['requirements']      ?? [];
        $f2fLink           = $h($step4['f2fLink']        ?? '');

        $reqItems = '';
        foreach ($requirements as $req) {
            $t   = $h($req['text'] ?? '');
            $clo = $h($req['clo']  ?? '');
            $reqItems .= "<li style=\"margin-bottom:8px;\"><span style=\"font-weight:bold;\">{$t}</span>" . ($clo ? " <span style=\"font-style:italic;color:#666;\">({$clo})</span>" : '') . "</li>";
        }

        $gradingRows = '';
        $total = 0;
        foreach ($gradingComponents as $comp) {
            $lbl  = $h($comp['label']      ?? ($comp['name'] ?? ''));
            $pct  = (int)($comp['percentage'] ?? 0);
            $total += $pct;
            $subs = isset($comp['subItems']) ? implode(', ', array_map(fn($s) => $h($s['label'] ?? ''), $comp['subItems'])) : '';
            $gradingRows .= "
            <div style=\"display:flex;justify-content:space-between;border-bottom:1px dotted #ccc;padding-bottom:6px;margin-bottom:6px;font-size:8.5pt;\">
                <div><p style=\"font-weight:bold;margin:0;\">{$lbl}</p>" . ($subs ? "<p style=\"font-size:7pt;color:#666;margin:0;\">{$subs}</p>" : '') . "</div>
                <p style=\"font-weight:bold;margin:0;\">{$pct}%</p>
            </div>";
        }

        // ── Step 5 ────────────────────────────────────────────────────────────
        $classInfo   = $step5['classInfo']    ?? [];
        $facultyInfo = $step5['facultyInfo']  ?? [];
        $rubrics     = $step5['rubrics']      ?? [];
        $groupCriteria = $step5['groupCriteria'] ?? [];
        $signatories = $step5['signatories']  ?? [];

        $ciSection  = $h($classInfo['section']          ?? '');
        $ciTime     = $h($classInfo['time']              ?? ($classInfo['schedule'] ?? ''));
        $ciRoom     = $h($classInfo['room']              ?? '');
        $ciSemester = $h($classInfo['semester']          ?? '');
        $fiName     = $h($facultyInfo['name']            ?? '');
        $fiConsult  = $h($facultyInfo['consultation']    ?? '');
        $fiContact  = $h($facultyInfo['contact']         ?? ($facultyInfo['office'] ?? ''));
        $fiEmail    = $h($facultyInfo['email']           ?? '');

        // Paginate rubrics at 5 per page
        $RUBRIC_PER_PAGE = 5;
        $rubricPages = array_chunk($rubrics, $RUBRIC_PER_PAGE) ?: [[]];

        $rubricPagesHtml = '';
        foreach ($rubricPages as $pageIdx => $pageRubrics) {
            $isFirst = $pageIdx === 0;

            $rubricRows = '';
            foreach ($pageRubrics as $r) {
                $skills = $h($r['skills'] ?? '');
                $v4 = $h($r['v4'] ?? '');
                $v3 = $h($r['v3'] ?? '');
                $v2 = $h($r['v2'] ?? '');
                $v1 = $h($r['v1'] ?? '');
                $rubricRows .= "
                <tr>
                    <td style=\"border:1px solid black;padding:4px;font-weight:bold;\">{$skills}</td>
                    <td style=\"border:1px solid black;padding:4px;\">{$v4}</td>
                    <td style=\"border:1px solid black;padding:4px;\">{$v3}</td>
                    <td style=\"border:1px solid black;padding:4px;\">{$v2}</td>
                    <td style=\"border:1px solid black;padding:4px;\">{$v1}</td>
                </tr>";
            }

            // Group grade + class/faculty + signatories — only on first rubric page
            $extraHtml = '';
            if ($isFirst) {
                $groupRows = '';
                foreach ($groupCriteria as $i => $g) {
                    $lbl = $h($g['label'] ?? '');
                    $wt  = $h((string)($g['weight'] ?? ''));
                    $sc  = (int)($g['score'] ?? 0);
                    $cells = '';
                    for ($n = 1; $n <= 4; $n++) {
                        $cells .= '<td style="border:1px solid black;padding:4px;text-align:center;">' . ($sc === $n ? '✔' : '') . '</td>';
                    }
                    $groupRows .= "<tr><td style=\"border:1px solid black;padding:4px;\">" . ($i + 1) . ". {$lbl} ({$wt}%)</td>{$cells}</tr>";
                }

                $sigRows = '';
                foreach ($signatories as $s) {
                    $name  = $h($s['name']  ?? '______________________');
                    $title = $h($s['title'] ?? '');
                    $role  = $h($s['role']  ?? '');
                    $sigImg = '';
                    if (!empty($s['signature'])) {
                        $sigImg = '<img src="' . $s['signature'] . '" style="height:40px;display:block;margin:0 auto 4px;" />';
                    }
                    $sigRows .= "
                    <td style=\"border:1px solid black;height:80px;vertical-align:bottom;padding:6px;text-align:center;\">
                        {$sigImg}
                        <span style=\"font-weight:bold;text-transform:uppercase;font-size:8pt;\">{$name}</span><br/>
                        <span style=\"font-size:7pt;\">{$title}</span><br/>
                        <span style=\"font-size:7pt;font-style:italic;\">{$role}</span>
                    </td>";
                }

                $extraHtml = "
                <p style=\"font-weight:bold;margin:8px 0 4px;\">Part 2. Group grade</p>
                <table style=\"width:100%;border-collapse:collapse;border:1px solid black;font-size:8pt;\">
                    <thead>
                        <tr>
                            <th style=\"border:1px solid black;padding:4px;\">Criteria</th>
                            <th style=\"border:1px solid black;text-align:center;padding:4px;\">1</th>
                            <th style=\"border:1px solid black;text-align:center;padding:4px;\">2</th>
                            <th style=\"border:1px solid black;text-align:center;padding:4px;\">3</th>
                            <th style=\"border:1px solid black;text-align:center;padding:4px;\">4</th>
                        </tr>
                    </thead>
                    <tbody>{$groupRows}</tbody>
                </table>

                <table style=\"width:100%;border-collapse:collapse;border:1px solid black;margin-top:8px;font-size:8pt;\">
                    <thead>
                        <tr>
                            <th style=\"border:1px solid black;padding:6px;\">CLASS INFORMATION</th>
                            <th style=\"border:1px solid black;padding:6px;\">FACULTY INFORMATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style=\"border:1px solid black;padding:8px;font-size:7.5pt;\">
                                Section: {$ciSection}<br/>
                                Time: {$ciTime}<br/>
                                Room: {$ciRoom}<br/>
                                Semester: {$ciSemester}
                            </td>
                            <td style=\"border:1px solid black;padding:8px;font-size:7.5pt;\">
                                Name of Faculty: {$fiName}<br/>
                                Consultation Time: {$fiConsult}<br/>
                                Office Tel. No./ Mobile Phone No.: {$fiContact}<br/>
                                Institutional Email: {$fiEmail}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style=\"width:100%;border-collapse:collapse;border:1px solid black;margin-top:8px;text-align:center;font-size:8pt;\">
                    <tbody>
                        <tr>{$sigRows}</tr>
                    </tbody>
                </table>";
            }

            $rubricPagesHtml .= '
            <div class="page" style="page-break-before:always;">
                ' . $this->renderHeaderHtml($header) . '
                <hr style="border:1px solid black;margin-bottom:8px;"/>
                <p style="font-weight:bold;margin-bottom:4px;font-size:8pt;">'
                    . ($isFirst ? 'Part 1. ' : '')
                    . 'Rubrics for Assessment (to be filled out by the assigned faculty)</p>
                <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:8pt;">
                    <thead>
                        <tr>
                            <th rowspan="2" style="border:1px solid black;padding:4px;width:20%;">Skills</th>
                            <th style="border:1px solid black;text-align:center;padding:4px;">4</th>
                            <th style="border:1px solid black;text-align:center;padding:4px;">3</th>
                            <th style="border:1px solid black;text-align:center;padding:4px;">2</th>
                            <th style="border:1px solid black;text-align:center;padding:4px;">1</th>
                        </tr>
                        <tr>
                            <th style="border:1px solid black;padding:4px;">Advanced</th>
                            <th style="border:1px solid black;padding:4px;">Competent</th>
                            <th style="border:1px solid black;padding:4px;">Progressing</th>
                            <th style="border:1px solid black;padding:4px;">Beginning</th>
                        </tr>
                    </thead>
                    <tbody>' . $rubricRows . '</tbody>
                </table>
                ' . $extraHtml . '
                ' . $this->renderFooterHtml($footer) . '
            </div>';
        }

        // ── Assemble full HTML ────────────────────────────────────────────────
        $ploCount    = count($plos);
        $f2fLinkHtml = $f2fLink ? "<p style=\"color:#1a56db;text-decoration:underline;word-break:break-all;margin-top:8px;font-size:7.5pt;\">{$f2fLink}</p>" : '';

        // Pre-compute these so they can be interpolated inside the heredoc
        // (PHP heredocs don't support $this->method() calls)
        $hdrHtml    = $this->renderHeaderHtml($header);
        $ftrHtml    = $this->renderFooterHtml($footer);
        $yellowBannerStatic = $this->yellowBannerHtml();

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body  { font-family: Arial, sans-serif; font-size: 9pt; margin: 0; padding: 0; color: #000; }
  .page { padding: 18px 22px; }
  /* ── Header/Footer: never use position:absolute on img here; images are inline ── */
  .custom-header {
    font-size: 9px;
    line-height: 1.4;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1.5px solid #aaa;
    word-break: break-word;
    overflow: visible;
    /* Make absolutely-positioned images inside the div visible by reserving height */
    min-height: 10px;
  }
  .custom-header img { max-height: 60px; max-width: 100%; display: inline-block; vertical-align: middle; }
  .custom-footer {
    font-size: 9px;
    line-height: 1.4;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1.5px solid #aaa;
    word-break: break-word;
    overflow: visible;
    min-height: 10px;
  }
  .custom-footer img { max-height: 60px; max-width: 100%; display: inline-block; vertical-align: middle; }
  /* Strip absolute positioning from editor images so they flow in the PDF */
  .custom-header img[data-hf-img],
  .custom-footer img[data-hf-img] {
    position: static !important;
    display: inline-block !important;
    vertical-align: middle;
    max-height: 60px;
    width: auto !important;
    height: auto !important;
    max-width: 120px;
  }
  .header-yellow { background-color: #FFF9C4; border: 1px solid black; font-weight: bold; text-align: center; text-transform: uppercase; padding: 8px; margin-bottom: 0; font-size: 9pt; }
  .syllabus-table { width: 100%; border-collapse: collapse; table-layout: fixed; word-wrap: break-word; font-size: 8pt; }
  .syllabus-table td, .syllabus-table th { border: 1px solid black; padding: 5px; vertical-align: top; }
  .label-cell { background-color: #fcfcfc; font-weight: bold; text-align: center; font-size: 7pt; text-transform: uppercase; }
  .section-banner { background: #e2e8f0; border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; font-size: 8pt; text-transform: uppercase; margin-bottom: 0; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════
     PAGE 1 — STEP 1: Course Overview
════════════════════════════════════════ -->
<div class="page">
    {$hdrHtml}
    <div class="header-yellow">
        Bachelor of Science in Information Technology<br/>
        Outcomes-Based Course Syllabus
    </div>
    <table class="syllabus-table" style="table-layout:fixed;">
        <colgroup>
            <col style="width:15%;"/><col style="width:15%;"/>
            <col style="width:12%;"/><col style="width:38%;"/>
            <col style="width:12%;"/><col style="width:8%;"/>
        </colgroup>
        <tbody>
            <tr>
                <td class="label-cell">Course Code</td>
                <td style="font-weight:bold;font-size:9pt;">{$codeH}</td>
                <td class="label-cell">Course Title</td>
                <td style="font-weight:bold;font-size:9pt;">{$titleH}</td>
                <td class="label-cell">Course Credit</td>
                <td style="text-align:center;font-size:9pt;">{$credit}</td>
            </tr>
            <tr>
                <td colspan="6" style="font-size:9pt;text-align:justify;padding:10px;">
                    <span style="font-weight:bold;text-transform:uppercase;display:block;margin-bottom:4px;">Course Description</span>
                    <span style="font-style:italic;">{$description}</span>
                </td>
            </tr>
            <tr>
                <td class="label-cell">Pre-Requisites</td>
                <td colspan="2" style="font-size:9pt;">{$preReq}</td>
                <td class="label-cell">Co-Requisites</td>
                <td colspan="2" style="font-size:9pt;">{$coReq}</td>
            </tr>
        </tbody>
    </table>
    <table class="syllabus-table" style="margin-top:-1px;table-layout:fixed;">
        <colgroup>
            <col style="width:15%;"/><col style="width:85%;"/>
        </colgroup>
        <tbody>
            <tr>
                <td class="label-cell">VISION</td>
                <td style="font-weight:bold;text-align:center;font-size:9pt;">
                    PUP: The National Polytechnic University<br/>
                    (PUP: Pambansang Politeknikong Unibersidad)
                </td>
            </tr>
            <tr>
                <td class="label-cell">MISSION</td>
                <td style="font-size:9pt;text-align:justify;">
                    Ensuring inclusive and equitable quality education and promoting lifelong learning opportunities through a re-engineered polytechnic university by committing to:
                    <ul style="margin:4px 0 0 16px;">
                        <li>provide democratized access to educational opportunities for the holistic development of individuals with global perspective</li>
                        <li>offer industry-oriented curricula that produce highly skilled professionals...</li>
                        <li>embed a culture of research and innovation</li>
                    </ul>
                </td>
            </tr>
            <tr>
                <td class="label-cell">QUALITY STATEMENT POLICY</td>
                <td style="font-size:9pt;text-align:justify;">
                    The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities... Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services...
                </td>
            </tr>
            <tr>
                <td class="label-cell">INSTITUTIONAL LEARNING OUTCOMES (ILO)</td>
                <td style="font-size:9pt;">
                    <ol style="margin:0 0 0 16px;padding:0;">
                        <li><strong>Creative and Critical Thinking</strong> - Graduates use their imaginative as well as rational thinking abilities...</li>
                        <li><strong>Effective Communication</strong> - Graduates are proficient in the four macro skills in communication...</li>
                        <li><strong>Strong Service Orientation</strong> - Graduates exemplify the potentialities of an efficient, well-rounded and responsible professional...</li>
                    </ol>
                </td>
            </tr>
        </tbody>
    </table>
    {$ftrHtml}
</div>

<!-- ═══════════════════════════════════════
     PAGE 2 — STEP 2: PLO/CLO Mapping Matrix
════════════════════════════════════════ -->
<div class="page" style="page-break-before:always;">
    {$hdrHtml}

    <!-- PLO → ILO table -->
    <table style="width:100%;border-collapse:collapse;font-size:8pt;">
        <tr>
            <td style="border:1px solid black;width:5%;text-align:center;padding:4px;vertical-align:middle;">
                <span style="font-weight:bold;font-size:7pt;writing-mode:vertical-lr;transform:rotate(180deg);display:inline-block;white-space:nowrap;">PROGRAM LEARNING OUTCOMES</span>
            </td>
            <td style="border:1px solid black;padding:0;">
                <table style="width:100%;border-collapse:collapse;font-size:8pt;">
                    <thead>
                        <tr>
                            <th style="border:1px solid black;padding:6px;text-align:left;font-style:italic;font-weight:normal;width:50%;">Based on CHED Memorandum Order (CMO) No. 25, series of 2015</th>
                            <th colspan="{$iloCount}" style="border:1px solid black;padding:4px;text-align:center;font-weight:bold;">Alignment to ILOs</th>
                        </tr>
                        <tr>
                            <th style="border:1px solid black;"></th>
                            {$iloNums}
                        </tr>
                    </thead>
                    <tbody>{$ploIloRows}</tbody>
                </table>
            </td>
        </tr>
    </table>

    <!-- CLO → PLO table -->
    <table style="width:100%;border-collapse:collapse;font-size:8pt;margin-top:-1px;">
        <tr>
            <td style="border:1px solid black;width:5%;text-align:center;padding:4px;vertical-align:middle;">
                <span style="font-weight:bold;font-size:7pt;writing-mode:vertical-lr;transform:rotate(180deg);display:inline-block;white-space:nowrap;">COURSE LEARNING OUTCOMES</span>
            </td>
            <td style="border:1px solid black;padding:0;">
                <table style="width:100%;border-collapse:collapse;font-size:8pt;">
                    <thead>
                        <tr>
                            <th style="border:1px solid black;padding:6px;text-align:left;font-weight:bold;width:50%;">After completion of the course, the students should be able to:</th>
                            <th colspan="{$ploCount}" style="border:1px solid black;padding:4px;text-align:center;font-weight:bold;">Alignment to PLOs</th>
                        </tr>
                        <tr>
                            <th style="border:1px solid black;"></th>
                            {$ploNums}
                        </tr>
                    </thead>
                    <tbody>{$cloPloRows}</tbody>
                </table>
            </td>
        </tr>
    </table>
    <p style="font-size:7pt;margin-top:6px;font-style:italic;">Legend: L-Learned, P-Practiced, O-Opportunity to Learn</p>
    {$ftrHtml}
</div>

<!-- ═══════════════════════════════════════
     PAGES 3+ — STEP 3: OBTL (paginated)
════════════════════════════════════════ -->
{$obtlPagesHtml}

<!-- ═══════════════════════════════════════
     STEP 4 PAGE 1 — Classroom Policies
════════════════════════════════════════ -->
<div class="page" style="page-break-before:always;">
    {$hdrHtml}
    <div class="section-banner">CLASSROOM POLICIES (to be filled out by the assigned faculty)</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:8pt;">
        <thead>
            <tr>
                <th style="border:1px solid black;padding:6px;background:#f1f5f9;width:50%;text-align:center;text-transform:uppercase;">FACE-TO-FACE DELIVERY</th>
                <th style="border:1px solid black;padding:6px;background:#f1f5f9;width:50%;text-align:center;text-transform:uppercase;">FLEXIBLE TEACHING AND LEARNING ACTIVITIES (FLTAs)</th>
            </tr>
        </thead>
        <tbody>
            <tr style="vertical-align:top;text-align:justify;">
                <td style="border:1px solid black;padding:10px;">
                    <p style="font-weight:bold;margin:0 0 6px;">General Classroom Guidelines:</p>
                    <p style="margin:0 0 4px;">1. Students shall attend set contact schedule ready with all the materials and outputs required to be read, discussed, and/or submitted.</p>
                    <p style="margin:0 0 4px;">2. <strong><u>PLAGIARISM SHALL NOT BE TOLERATED.</u></strong> Penalties: First offense – automatic failure in the output; Second offense – automatic failure + letter from parent/guardian; Third offense – automatic failure in the course.</p>
                    <p style="margin:0 0 4px;">3. Requirements shall be submitted on time. Late submissions will be subjected to deductions of no less than 0.25 per day.</p>
                    <p style="margin:0 0 4px;">4. Students with any form of disability must inform the course instructor immediately so that alternative arrangements may be considered.</p>
                    <p style="margin:0 0 4px;">5. All students are expected to read and strictly observe the PUP Student Code of Conduct.</p>
                    {$f2fLinkHtml}
                    <p style="font-weight:bold;font-style:italic;margin:8px 0 4px;">Guidelines for the face-to-face delivery:</p>
                    <p style="margin:0 0 4px;">1. Strictly observe the minimum health protocols set by the university.</p>
                    <p style="margin:0 0 4px;">2. Check your schedule on the class Facebook page before going to school.</p>
                    <p style="margin:0;">3. Be mindful of your classmates and teacher's time. Be alert, constructive, and responsive.</p>
                </td>
                <td style="border:1px solid black;padding:10px;">
                    <p style="font-weight:bold;font-size:9pt;margin:0 0 6px;">Synchronous Sessions:</p>
                    <p style="margin:0 0 3px;">1. Check your device ahead of your scheduled synchronous meeting (camera, microphone, keyboard, speakers, etc.)</p>
                    <p style="margin:0 0 3px;">2. Attend the synchronous class on time.</p>
                    <p style="margin:0 0 3px;">3. Be ready to turn on your microphone and camera anytime.</p>
                    <p style="margin:0 0 3px;">4. Choose a comfortable space to attend the online class.</p>
                    <p style="margin:0 0 3px;">5. Click the 'raise hand' button and wait to be acknowledged before unmuting your microphone.</p>
                    <p style="margin:0 0 3px;">6. Do not abuse the chatbox.</p>
                    <p style="margin:0 0 3px;">7. Read the assigned materials before attending the class.</p>
                    <p style="margin:0 0 12px;">8. Be mindful of your classmates and teacher's time. Be alert, constructive, and responsive.</p>
                    <p style="font-weight:bold;font-size:9pt;margin:0 0 6px;border-top:1px solid #e2e8f0;padding-top:8px;">Asynchronous Sessions:</p>
                    <p style="margin:0 0 3px;">1. Study the sections and functions of the assigned learning management system (LMS) ahead of time.</p>
                    <p style="margin:0 0 3px;">2. Check the expected submission schedule at all times. For some timed activities, late submission may cause deductions. For group activities, discuss the best time and platform with your groupmates.</p>
                    <p style="margin:0;">3. Ask for help from your teacher(s) and classmates when necessary.</p>
                </td>
            </tr>
        </tbody>
    </table>
    {$ftrHtml}
</div>

<!-- ═══════════════════════════════════════
     STEP 4 PAGE 2 — Requirements & Grading
════════════════════════════════════════ -->
<div class="page" style="page-break-before:always;">
    {$hdrHtml}
    <div class="section-banner">COURSE REQUIREMENTS &amp; EVALUATION</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid black;min-height:100mm;font-size:8.5pt;">
        <tr style="vertical-align:top;">
            <td style="border:1px solid black;padding:14px;width:60%;">
                <p style="font-weight:bold;font-size:9pt;text-transform:uppercase;text-decoration:underline;margin:0 0 8px;">Course Requirements</p>
                <ul style="margin:0 0 0 18px;padding:0;">
                    {$reqItems}
                </ul>
            </td>
            <td style="border:1px solid black;padding:14px;width:40%;">
                <p style="font-weight:bold;font-size:9pt;text-transform:uppercase;text-decoration:underline;margin:0 0 8px;">Grading System</p>
                {$gradingRows}
                <div style="display:flex;justify-content:space-between;font-weight:900;font-size:10pt;border-top:2px solid black;padding-top:6px;margin-top:2px;">
                    <span>TOTAL</span><span>100%</span>
                </div>
            </td>
        </tr>
    </table>
    {$ftrHtml}
</div>

<!-- ═══════════════════════════════════════
     STEP 5 PAGES — Rubrics, Group Grade, Signatories
════════════════════════════════════════ -->
{$rubricPagesHtml}

</body>
</html>
HTML;
    }

    // ── Small helpers used inside buildHtml ───────────────────────────────────

    private function yellowBannerHtml(): string
    {
        return '<div class="header-yellow">Bachelor of Science in Information Technology<br/>Outcomes-Based Course Syllabus</div>';
    }

    private function renderHeaderHtml(string $header): string
    {
        if (!$header) return '';
        return '<div class="custom-header">' . $header . '</div>';
    }

    private function renderFooterHtml(string $footer): string
    {
        if (!$footer) return '';
        return '<div class="custom-footer">' . $footer . '</div>';
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