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
        $courseName   = trim($step6['courseName'] ?? 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY');
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
                'course_code'        => $courseCode,
                'course_title'       => $courseTitle,
                'course_name_header' => $courseName,
                'step1'              => $step1,
                'step2'              => $step2,
                'step3'              => $step3,
                'step4'              => $step4,
                'step5'              => $step5,
                'step6'              => $step6,
                'final_data'         => $finalData,
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
            return response()->json(['message' => 'Saved', 'id' => $syllabus->id, 'data' => $syllabus]);
        }

        // Stream the file — DB is already saved above regardless of what happens here
        try {
            return $exportFormat === 'docx'
                ? $this->streamDocx($baseName, $courseCode, $courseTitle, $courseName, $step1, $step2, $step3, $step4, $step5, $header, $footer)
                : $this->streamPdf ($baseName, $courseCode, $courseTitle, $courseName, $step1, $step2, $step3, $step4, $step5, $header, $footer);
        } catch (\Throwable $e) {
            Log::error('Syllabus export failed', [
                'syllabus_id'  => $syllabus->id,
                'format'       => $exportFormat,
                'error'        => $e->getMessage(),
                'trace'        => $e->getTraceAsString(),
            ]);
            // The syllabus IS saved in the DB — only the file generation failed.
            return response()->json([
                'message'      => 'Syllabus saved successfully, but file export failed.',
                'saved'        => true,
                'id'           => $syllabus->id,
                'export_error' => $e->getMessage(),
            ], 500);
        }
    }

    private function streamPdf(string $baseName, string $courseCode, string $courseTitle, string $courseName,
        array $step1, array $step2, array $step3, array $step4, array $step5,
        string $header, string $footer)
    {
        $html = $this->buildHtml($courseCode, $courseTitle, $courseName, $step1, $step2, $step3, $step4, $step5, $header, $footer);
        $pdf  = Pdf::loadHTML($html)->setPaper([0, 0, 612, 1008], 'landscape'); // legal: 8.5x14in in points
        return $pdf->download("{$baseName}.pdf");
    }

    /**
     * Strip attributes and CSS that cause PhpWord's Html parser to crash
     * (position:absolute, data-* attrs, outline, box-shadow, etc.)
     */
    private function sanitizeHtmlForDocx(string $html): string
    {
        if (empty($html)) return '';

        // Remove data-* attributes entirely (e.g. data-hf-img)
        $html = preg_replace('/\s+data-[a-z0-9_-]+="[^"]*"/i', '', $html);
        $html = preg_replace("/\s+data-[a-z0-9_-]+='[^']*'/i", '', $html);

        // In style attributes, strip properties that confuse PhpWord
        $dangerousProps = [
            'position', 'top', 'left', 'right', 'bottom', 'z-index',
            'outline', 'box-shadow', '-webkit-user-drag', 'user-drag',
            'cursor', 'pointer-events', 'border-radius',
        ];
        $html = preg_replace_callback('/style="([^"]*)"/i', function ($m) use ($dangerousProps) {
            $style = $m[1];
            foreach ($dangerousProps as $prop) {
                $style = preg_replace('/\b' . preg_quote($prop, '/') . '\s*:[^;]+;?/i', '', $style);
            }
            $style = trim(preg_replace('/\s+/', ' ', $style), '; ');
            return $style !== '' ? 'style="' . $style . '"' : '';
        }, $html);

        // Convert absolutely-positioned images to inline block so they appear in flow
        // PhpWord can render basic <img> with width/height attributes
        $html = preg_replace_callback('/<img\b([^>]*)>/i', function ($m) {
            $attrs = $m[1];
            // Extract width/height from style if present
            $w = $h = null;
            if (preg_match('/width\s*:\s*(\d+)px/i', $attrs, $wm)) $w = (int)$wm[1];
            if (preg_match('/height\s*:\s*(\d+)px/i', $attrs, $hm)) $h = (int)$hm[1];
            // Cap to reasonable header size
            if ($w && $w > 150) { $h = $h ? (int)($h * 150 / $w) : null; $w = 150; }
            if ($h && $h > 80)  { $w = $w ? (int)($w * 80  / $h) : null; $h = 80; }
            $dim = ($w ? " width=\"{$w}\"" : '') . ($h ? " height=\"{$h}\"" : '');
            // Keep src, strip everything else to avoid parse errors
            $src = '';
            if (preg_match('/src="([^"]*)"/i', $attrs, $sm)) $src = 'src="' . $sm[1] . '"';
            elseif (preg_match("/src='([^']*)'/i", $attrs, $sm)) $src = 'src="' . $sm[1] . '"';
            return "<img {$src}{$dim} style=\"display:inline-block;vertical-align:middle;\">";
        }, $html);

        return $html;
    }

    private function prepareHtmlForPhpWord(string $html): string
    {
        libxml_use_internal_errors(true);

        $dom = new \DOMDocument();

        $html = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');

        $dom->loadHTML(
            '<?xml encoding="utf-8" ?>' . $html,
            LIBXML_HTML_NOIMPLIED |
            LIBXML_HTML_NODEFDTD |
            LIBXML_NOERROR |
            LIBXML_NOWARNING
        );

        // Remove unsupported tags
        $removeTags = [
            'style',
            'script',
            'svg',
            'meta',
            'link',
            'colgroup',
            'thead',
            'tbody',
        ];

        foreach ($removeTags as $tag) {
            while (($nodes = $dom->getElementsByTagName($tag))->length > 0) {
                $node = $nodes->item(0);

                if ($node && $node->parentNode) {
                    $node->parentNode->removeChild($node);
                }
            }
        }

        // Remove comments
        $xpath = new \DOMXPath($dom);

        foreach ($xpath->query('//comment()') as $comment) {
            $comment->parentNode?->removeChild($comment);
        }

        // Clean styles
        foreach ($dom->getElementsByTagName('*') as $el) {

            if ($el->hasAttribute('style')) {

                $style = $el->getAttribute('style');

                // Remove unsupported CSS
                $style = preg_replace(
                    '/(display\s*:\s*(flex|grid|inline-flex|inline-grid)|position\s*:\s*absolute|justify-content\s*:[^;]+|align-items\s*:[^;]+|flex-direction\s*:[^;]+|gap\s*:[^;]+|box-shadow\s*:[^;]+|z-index\s*:[^;]+)/i',
                    '',
                    $style
                );

                $el->setAttribute('style', trim($style));
            }

            // Remove data-* attributes
            if ($el->hasAttributes()) {

                $remove = [];

                foreach ($el->attributes as $attr) {
                    if (str_starts_with($attr->nodeName, 'data-')) {
                        $remove[] = $attr->nodeName;
                    }
                }

                foreach ($remove as $attrName) {
                    $el->removeAttribute($attrName);
                }
            }
        }

        $cleanHtml = $dom->saveHTML();

        libxml_clear_errors();

        return '<div>' . $cleanHtml . '</div>';
    }


/**
 * DROP-IN REPLACEMENT for the streamDocx() method in SyllabusController.php
 *
 * Replace the entire existing streamDocx() method (lines ~238-310) with this.
 * Also add the private helper methods at the bottom of the class
 * (docxBorder, docxCell, docxHeaderCell, docxTextPara, docxBoldPara).
 *
 * This bypasses Html::addHtml() entirely and builds every section natively
 * using the PhpWord object API, which is reliable for all content types.
 */

// ═══════════════════════════════════════════════════════════════════════════
// REPLACE the streamDocx() method with this:
// ═══════════════════════════════════════════════════════════════════════════

    private function streamDocx(
        string $baseName,
        string $courseCode,
        string $courseTitle,
        string $courseName,
        array $step1,
        array $step2,
        array $step3,
        array $step4,
        array $step5,
        string $header,
        string $footer
    ) {
        // ── Shorthands ───────────────────────────────────────────────────────
        $t = fn(string $v): string => strip_tags($v);   // strip HTML tags for plain text
        $s = fn($v): string => (string)($v ?? '');

        // ── Data extraction (mirrors buildHtml) ──────────────────────────────
        $credit      = $s($step1['course_credit']      ?? '');
        $description = $t($s($step1['course_description'] ?? ''));
        $preReq      = $s($step1['pre_requisites']     ?? 'None');
        $coReq       = $s($step1['co_requisites']      ?? 'None');

        // Use step1 dynamic values with PUP static fallbacks (mirrors PDF hardcoded text)
        $vision  = $t($s($step1['vision']  ?? '')) ?: 'PUP: The National Polytechnic University (PUP: Pambansang Politeknikong Unibersidad)';
        $mission = $t($s($step1['mission'] ?? '')) ?: 'Ensuring inclusive and equitable quality education and promoting lifelong learning opportunities through a re-engineered polytechnic university by committing to: provide democratized access to educational opportunities for the holistic development of individuals with global perspective; offer industry-oriented curricula that produce highly skilled professionals; embed a culture of research and innovation.';
        $quality = $t($s($step1['quality_statement_policy'] ?? '')) ?: 'The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities. Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services.';
        $ilos    = $step1['ilos'] ?? [];

        // College/Campus goals and Program goals/objectives (from step1 or static PUP defaults)
        $collegeGoals = $t($s($step1['college_goals'] ?? $step1['campus_goals'] ?? ''));
        $programGoals = $t($s($step1['program_goals'] ?? ''));
        $programObjList = $step1['program_objectives'] ?? [];

        // ── Static PUP defaults (from COMP 001 template) ─────────────────────
        $iloFallback = [
            ['bold' => 'Critical and Creative Thinking',                    'text' => 'Graduates use their rational and reflective thinking as well as innovative abilities to life situations in order to push boundaries, realize possibilities, and deepen their interdisciplinary, multidisciplinary, and/or transdisciplinary understanding of the world.'],
            ['bold' => 'Effective Communication',                           'text' => 'Graduates apply the four macro skills in communication (reading, writing, listening, and speaking), through conventional and digital means, and are able to use these skills in solving problems, making decisions, and articulating thoughts when engaging with people in various circumstances.'],
            ['bold' => 'Strong Service Orientation',                        'text' => 'Graduates exemplify strong commitment to service excellence for the people, the clientele, industry and other sectors.'],
            ['bold' => 'Adept and Responsible Use or Development of Technology', 'text' => 'Graduates demonstrate optimized and responsible use of state-of-the-art technologies of their profession. They possess digital learning abilities, including technical, numerical, and/or technopreneurial skills.'],
            ['bold' => 'Passion for Lifelong Learning',                     'text' => 'Graduates perform and function in society by taking responsibility in their quest for further improvement through lifelong learning.'],
            ['bold' => 'Leadership and Organizational Skills',               'text' => 'Graduates assume leadership roles and become leading professionals in their respective disciplines by equipping them with appropriate organizational skills.'],
            ['bold' => 'Personal and Professional Ethics',                   'text' => 'Graduates manifest integrity and adherence to moral and ethical principles in their personal and professional circumstances.'],
            ['bold' => 'Resilience and Agility',                            'text' => 'Graduates demonstrate flexibility and the growth mindset to adapt and thrive in the volatile, uncertain, complex and ambiguous (VUCA) environment.'],
            ['bold' => 'National and Global Responsiveness',                 'text' => 'Graduates exhibit a deep sense of nationalism as it complements the need to live as part of the global community where diversity is respected. They promote and fulfill various advocacies for human and social development.'],
        ];
        if (empty($ilos)) {
            // Convert to the format expected by the ILO rendering loop below
            $ilos = array_map(fn($x) => ['title' => $x['bold'] . '. ' . $x['text']], $iloFallback);
        }

        $collegeGoalsDefault = "Innovation and continuous improvement; to build a diverse, transparent, inclusive workforce; and reduce the organization's environmental impact. To offer curricula that are relevant and responsive to the changing needs of the industry and society; the ability of curriculum developers to translate knowledge about new development into curriculum content and structure; to promote critical thinking, a sense of adventure, and an openness to adapt challenges of their future workplace and give them the confidence and skills to continue to adapt; to provide a hierarchical system for grades levels/subjects within aims and objectives for individual lessons. To increase students' attention, and focus, promote a meaningful learning experience, encourage higher levels of student performance, motivate students to practice higher-order thinking skills; to prepare students to become productive, creative, innovative, and dynamic in their chosen fields of specialization and to provide state of the art facilities of learning to optimize student development; tap potentials of students, faculty, administrative staff, and other stakeholders in formulating policies for institutional development. To prepare holistic approaches to inculcate appropriate values that are necessary to build a humane, disciplined, nationalist, and independent society and to develop students, physical, emotional, social, and intellectual well-being through providing opportunities for students to learn and grow in all areas of their lives; to create a supportive, inclusive environment where students feel safe and respected; to be active participants in their learning for students to connect with others, build relationships and to help students develop a sense of purpose and direction. To build a culture of trust, deliver honest feedback, foster open communication, delegate responsibilities and tasks, and support growth opportunities to empower faculty members and employees. Also, to increase productivity and innovation; improve morale and satisfaction; better decision-making; increase engagement with students and clients, and make empowerment part of our university organizations, culture and vision. To a renowned leader and center of excellence in product utilization research, feasibility study, development, and technology transfer; develop the culture of collaborative research among students, faculty, and employees; to partner with industry and other research institutions in strengthening research capabilities of faculty, employees, and students; to facilitate presentation of research outputs in international fora, their publication in recognized local and international journals; and to develop the culture of collaborative research among students, faculty, and employees. To contribute to the attainment of Vision, Mission, Goal, and Objectives (VMGO) distinctively include complying with the rules and policies of the Polytechnic University of the Philippines (PUP); striving for academic excellence, participating actively in universities activities, becoming a role model, passing the board exam and conducting research. To maintain and enhance its high academic standards in the performance of its functions of instructions, research, and adaptive community for extension. To create value for each company and leverage combined expertise by offering students internship partnerships through a Memorandum of Agreement (MOA); undertake outreach and research-based extension programs by tapping all stakeholders; expertise and other resources. To increase understanding of stakeholder needs and expectations, improve communication and collaboration, and involve all stakeholders in enhancing student, faculty, and employee development programs, build trust and rapport with stakeholders, and get input from stakeholders on critical decisions. To ensure that our curricula possess Social Development Goals (SDG) such as social equity, justice, diversity, inclusion, democratic participation, empowerment, livelihood security, social well-being, and quality of life; to end poverty, to protect the earth, environment and climate and to ensure that students, educators, and stakeholders can enjoy peace and prosperity; to provide training to students that will enable them to become potent instruments for socio-economic development, produce technologies for commercialization or livelihood improvement, and achieve long-term economic growth.";

        $programGoalsDefault = "The Bachelor of Science in Information Technology (BSIT) program is a four-year degree program which focuses on the study of computer utilization and computer software to plan, install, customize, operate, manage, administer and maintain information technology infrastructure. It likewise deals with the design and development of computer-based information systems for real-world business solutions. The program prepares students to become IT professionals with primary competencies in the areas of systems analysis and design, applications development, database administration, network administration, and systems implementation and maintenance. The program also requires a Capstone project. It should be in the form of an IT applications development as a business solution for an industry need.";

        $programObjDefault = [
            'To introduce students to current technologies and tools while learning new methodologies that will lead to the development of better information systems.',
            'To enable students to understand the different components of the information technology field, including hardware, software, communication, networking, research, peopleware and management skills.',
            'To demonstrate awareness of how to methodically and practically approach a variety of technological and managerial issues to ultimately improve business strategies and attain competitive advantage.',
            'To inculcate to students the essential virtues and attitudes, as well as develop necessary knowledge and competency levels required of an information technology professional.',
            "To train students to systematically analyze and evaluate organizational systems and processes in order to recommend software solutions that properly address the organization's needs and goals.",
        ];

        // Apply defaults when step1 data is absent
        if ($collegeGoals === '') $collegeGoals = $t($collegeGoalsDefault);
        if ($programGoals === '') $programGoals = $t($programGoalsDefault);
        if (empty($programObjList)) {
            $programObjList = array_map(fn($txt) => ['text' => $txt], $programObjDefault);
        }
        // ─────────────────────────────────────────────────────────────────────

        $plos        = $step2['plos']                  ?? [];
        $clos        = $step2['clos']                  ?? [];
        $iloMapping  = $step2['iloMapping']            ?? [];
        $ploMapping  = $step2['ploMapping']            ?? [];
        $iloCount    = 9;

        $obtlData    = $step3['obtlData']              ?? [];
        $references  = array_filter($step3['references']      ?? [], fn($r) => !empty(trim($r['text'] ?? '')));
        $otherRefs   = array_filter($step3['otherReferences'] ?? [], fn($r) => !empty(trim($r['text'] ?? '')));

        $gradingComponents = $step4['gradingComponents'] ?? [];
        $requirements      = $step4['requirements']      ?? [];
        $f2fLink           = $s($step4['f2fLink']        ?? '');
        $f2fPolicies       = $step4['f2fPolicies']       ?? [];
        $syncPolicies      = $step4['syncPolicies']      ?? [];
        $asyncPolicies     = $step4['asyncPolicies']     ?? [];
        $generalPolicies   = $step4['generalPolicies']   ?? [];

        $classInfo     = $step5['classInfo']     ?? [];
        $facultyInfo   = $step5['facultyInfo']   ?? [];
        $rubrics       = $step5['rubrics']       ?? [];
        $groupCriteria = $step5['groupCriteria'] ?? [];
        $signatories   = $step5['signatories']   ?? [];

        // ── PhpWord setup ────────────────────────────────────────────────────
        $phpWord = new \PhpOffice\PhpWord\PhpWord();

        // Default font
        $phpWord->setDefaultFontName('Arial Narrow');
        $phpWord->setDefaultFontSize(9);

        // Section = one Legal landscape page group (35.56 x 21.59 cm)
        // headerHeight/footerHeight: space reserved for real Word header/footer
        $headerFooterH = Converter::cmToTwip(1.8);
        $sectionStyle = [
            'pageSizeW'      => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(35.56),
            'pageSizeH'      => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(21.59),
            'orientation'    => 'landscape',
            'marginTop'      => Converter::cmToTwip(2.5),   // enough room for header
            'marginBottom'   => Converter::cmToTwip(2.5),   // enough room for footer
            'marginLeft'     => Converter::cmToTwip(1.2),
            'marginRight'    => Converter::cmToTwip(1.2),
            'headerHeight'   => $headerFooterH,
            'footerHeight'   => $headerFooterH,
        ];

        // ── Shared style constants ───────────────────────────────────────────
        // Page content width in twips: (35.56 - 1.2 - 1.2) cm = 33.16 cm
        $pageW   = \PhpOffice\PhpWord\Shared\Converter::cmToTwip(33.16);
        $border  = $this->docxBorder();
        $fntSm   = ['name' => 'Arial', 'size' => 8];
        $fntXSm  = ['name' => 'Arial', 'size' => 7];
        $fntBold = ['name' => 'Arial Narrow', 'size' => 9, 'bold' => true];
        $fntNorm = ['name' => 'Arial', 'size' => 9];
        $cellPad = ['top' => 40, 'bottom' => 40, 'left' => 60, 'right' => 60];
        $center  = ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER];
        $bgYellow   = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'FFF9C4'];
        $bgBlue     = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'E8F4FF'];
        $bgGray     = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'E2E8F0'];
        $bgPink     = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'FFE8E8'];
        $bgBanner   = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'D6E4F0']; // section banner color
        $bgLightGray= ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'D9E2F3'];

        // ── Helper: add a full-width section banner row (matches PDF .section-banner) ──
        // Adds a 1-row table with one spanned bold centered dark-blue cell.
        $addSectionBanner = function(\PhpOffice\PhpWord\Element\Section $sec, string $label) use ($pageW, $border, $cellPad, $center) {
            $tbl = $sec->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
            $tbl->addRow();
            $cell = $tbl->addCell($pageW, array_merge($border, ['cellMargin' => $cellPad,
                'shading' => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => '365F91'],
            ]));
            $cell->addText($label, ['name' => 'Arial', 'size' => 9, 'bold' => true, 'color' => 'FFFFFF'], $center);
        };

        // ── Helper: attach genuine Word header & footer to a section ──────────
        // Uses PhpWord's native Header/Footer API so the header/footer appear
        // in the actual Word header/footer area (visible in Print Layout & print).
        $addWordHF = function (
            \PhpOffice\PhpWord\Element\Section $sec,
            string $headerHtml,
            string $footerHtml
        ) use ($pageW, $fntXSm) {

            // --- Header ---
            if (trim($headerHtml) !== '') {
                $hdr = $sec->addHeader();

                // Parse images and text from the rich HTML
                libxml_use_internal_errors(true);
                $dom = new \DOMDocument('1.0', 'UTF-8');
                $dom->loadHTML(
                    '<?xml encoding="UTF-8"><div id="__hf__">' . $headerHtml . '</div>',
                    LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
                );
                libxml_clear_errors();

                $root     = $dom->getElementById('__hf__');
                $leftImgs = []; $rightImgs = []; $EDITOR_W = 900; $toRemove = [];
                foreach ($dom->getElementsByTagName('img') as $img) {
                    $style = $img->getAttribute('style');
                    $leftPx = 0; $widthPx = 80; $heightPx = 60;
                    if (preg_match('/left\s*:\s*([\d.]+)px/i', $style, $m)) $leftPx  = (float)$m[1];
                    if (preg_match('/width\s*:\s*([\d.]+)px/i', $style, $m)) $widthPx = (int)$m[1];
                    if (preg_match('/height\s*:\s*([\d.]+)px/i', $style, $m)) $heightPx= (int)$m[1];
                    $src = $img->getAttribute('src');
                    if (empty($src)) { $toRemove[] = $img; continue; }
                    $scale  = min(1.0, 70 / max($heightPx, 1));
                    $wFinal = max(20, (int)($widthPx  * $scale));
                    $hFinal = max(10, (int)($heightPx * $scale));
                    $entry  = ['src' => $src, 'w' => $wFinal, 'h' => $hFinal, 'left' => $leftPx];
                    if ($leftPx < $EDITOR_W * 0.5) $leftImgs[] = $entry;
                    else                            $rightImgs[] = $entry;
                    $toRemove[] = $img;
                }
                foreach ($toRemove as $n) { $n->parentNode?->removeChild($n); }
                $inner = '';
                if ($root) { foreach ($root->childNodes as $child) { $inner .= $dom->saveHTML($child); } }
                $plainText = trim(strip_tags($inner));

                $addImgToElement = function ($element, array $img) use ($fntXSm) {
                    $src = $img['src'];
                    try {
                        if (str_starts_with($src, 'data:')) {
                            $parts   = explode(',', $src, 2);
                            $tmpFile = tempnam(sys_get_temp_dir(), 'hfimg_') . '.png';
                            file_put_contents($tmpFile, base64_decode($parts[1] ?? ''));
                            $element->addImage($tmpFile, ['width' => $img['w'], 'height' => $img['h'], 'wrappingStyle' => 'inline']);
                            @unlink($tmpFile);
                        } else {
                            $element->addImage($src, ['width' => $img['w'], 'height' => $img['h'], 'wrappingStyle' => 'inline']);
                        }
                    } catch (\Throwable $e) {
                        $element->addText('[img]', $fntXSm);
                    }
                };

                $hasLeft  = !empty($leftImgs);
                $hasRight = !empty($rightImgs);

                if (!$hasLeft && !$hasRight) {
                    // Plain text header
                    $hdr->addText($plainText, $fntXSm, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
                } else {
                    // 3-column table in header
                    $imgColW  = (int)($pageW * 0.15);
                    $textColW = $pageW - ($hasLeft ? $imgColW : 0) - ($hasRight ? $imgColW : 0);
                    $cellBase = ['borderTopSize' => 0, 'borderBottomSize' => 0, 'borderLeftSize' => 0, 'borderRightSize' => 0, 'cellMargin' => ['top' => 40, 'bottom' => 40, 'left' => 60, 'right' => 60]];
                    $tbl = $hdr->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
                    $tbl->addRow();
                    if ($hasLeft) {
                        usort($leftImgs, fn($a, $b) => $a['left'] <=> $b['left']);
                        $lCell = $tbl->addCell($imgColW, $cellBase);
                        foreach ($leftImgs as $img) { $addImgToElement($lCell, $img); }
                    }
                    $cCell = $tbl->addCell($textColW, array_merge($cellBase, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]));
                    if ($plainText !== '') { $cCell->addText($plainText, $fntXSm, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]); }
                    if ($hasRight) {
                        usort($rightImgs, fn($a, $b) => $a['left'] <=> $b['left']);
                        $rCell = $tbl->addCell($imgColW, $cellBase);
                        foreach ($rightImgs as $img) { $addImgToElement($rCell, $img); }
                    }
                }
            }

            // --- Footer ---
            if (trim($footerHtml) !== '') {
                $ftr = $sec->addFooter();

                libxml_use_internal_errors(true);
                $dom2 = new \DOMDocument('1.0', 'UTF-8');
                $dom2->loadHTML(
                    '<?xml encoding="UTF-8"><div id="__hf2__">' . $footerHtml . '</div>',
                    LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
                );
                libxml_clear_errors();

                $root2     = $dom2->getElementById('__hf2__');
                $leftImgs2 = []; $rightImgs2 = []; $toRemove2 = [];
                foreach ($dom2->getElementsByTagName('img') as $img) {
                    $style = $img->getAttribute('style');
                    $leftPx = 0; $widthPx = 80; $heightPx = 60;
                    if (preg_match('/left\s*:\s*([\d.]+)px/i', $style, $m)) $leftPx  = (float)$m[1];
                    if (preg_match('/width\s*:\s*([\d.]+)px/i', $style, $m)) $widthPx = (int)$m[1];
                    if (preg_match('/height\s*:\s*([\d.]+)px/i', $style, $m)) $heightPx= (int)$m[1];
                    $src = $img->getAttribute('src');
                    if (empty($src)) { $toRemove2[] = $img; continue; }
                    $scale  = min(1.0, 70 / max($heightPx, 1));
                    $wFinal = max(20, (int)($widthPx  * $scale));
                    $hFinal = max(10, (int)($heightPx * $scale));
                    $entry  = ['src' => $src, 'w' => $wFinal, 'h' => $hFinal, 'left' => $leftPx];
                    if ($leftPx < $EDITOR_W * 0.5) $leftImgs2[] = $entry;
                    else                            $rightImgs2[] = $entry;
                    $toRemove2[] = $img;
                }
                foreach ($toRemove2 as $n) { $n->parentNode?->removeChild($n); }
                $inner2 = '';
                if ($root2) { foreach ($root2->childNodes as $child) { $inner2 .= $dom2->saveHTML($child); } }
                $plainText2 = trim(strip_tags($inner2));

                $hasLeft2  = !empty($leftImgs2);
                $hasRight2 = !empty($rightImgs2);

                if (!$hasLeft2 && !$hasRight2) {
                    $ftr->addText($plainText2, $fntXSm, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
                } else {
                    $imgColW   = (int)($pageW * 0.15);
                    $textColW  = $pageW - ($hasLeft2 ? $imgColW : 0) - ($hasRight2 ? $imgColW : 0);
                    $cellBase  = ['borderTopSize' => 0, 'borderBottomSize' => 0, 'borderLeftSize' => 0, 'borderRightSize' => 0, 'cellMargin' => ['top' => 40, 'bottom' => 40, 'left' => 60, 'right' => 60]];
                    $tbl2 = $ftr->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
                    $tbl2->addRow();
                    if ($hasLeft2) {
                        usort($leftImgs2, fn($a, $b) => $a['left'] <=> $b['left']);
                        $lCell2 = $tbl2->addCell($imgColW, $cellBase);
                        foreach ($leftImgs2 as $img) { $addImgToElement($lCell2, $img); }
                    }
                    $cCell2 = $tbl2->addCell($textColW, array_merge($cellBase, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]));
                    if ($plainText2 !== '') { $cCell2->addText($plainText2, $fntXSm, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]); }
                    if ($hasRight2) {
                        usort($rightImgs2, fn($a, $b) => $a['left'] <=> $b['left']);
                        $rCell2 = $tbl2->addCell($imgColW, $cellBase);
                        foreach ($rightImgs2 as $img) { $addImgToElement($rCell2, $img); }
                    }
                }
            }
        };


        // ════════════════════════════════════════════════════════════════════
        // PAGE 1 — Course Overview (Step 1 + Step 2 top section)
        // ════════════════════════════════════════════════════════════════════
        $sec1 = $phpWord->addSection($sectionStyle);

        // Attach genuine Word header & footer to this section
        $addWordHF($sec1, $header, $footer);

        $sec1->addText(
            'POLYTECHNIC UNIVERSITY OF THE PHILIPPINES',
            [
                'name' => 'Arial Narrow',
                'size' => 10,
                'bold' => true
            ],
            [
                'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                'spaceAfter' => 0
            ]
        );

        $sec1->addText(
            'OFFICE OF THE VICE PRESIDENT FOR CAMPUSES',
            [
                'name' => 'Arial Narrow',
                'size' => 9
            ],
            [
                'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                'spaceAfter' => 0
            ]
        );

        $sec1->addText(
            'Santa Rosa Campus',
            [
                'name' => 'Arial Narrow',
                'size' => 9
            ],
            [
                'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                'spaceAfter' => 200
            ]
        );

        // ── BANNER: "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY / OUTCOMES-BASED COURSE SYLLABUS"
        // Matches COMP001 template: dark background banner rendered as a shaped text box.
        // We approximate it with a shaded table row (dark blue, white text), centered.
        $bgDarkBanner = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => '365F91'];
        $bannerTable = $sec1->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
        $bannerTable->addRow(500);
        $bannerCell = $bannerTable->addCell($pageW, array_merge($border, [
            'shading'     => $bgDarkBanner,
            'cellMargin'  => ['top' => 120, 'bottom' => 120, 'left' => 100, 'right' => 100],
            'valign'      => 'center',
        ]));
        $bannerCell->addText(
            strtoupper($courseName),
            [
                'name'  => 'Arial Narrow',
                'size'  => 13,
                'bold'  => true,
                'color' => 'FFFFFF'
            ],
            [
                'alignment'  => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                'spaceAfter' => 0,
                'spaceBefore'=> 0
            ]
        );

        $bannerCell->addText(
            'OUTCOMES-BASED COURSE SYLLABUS',
            [
                'name'  => 'Arial Narrow',
                'size'  => 11,
                'bold'  => true,
                'color' => 'FFFFFF'
            ],
            [
                'alignment'  => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                'spaceAfter' => 0,
                'spaceBefore'=> 0
            ]
        );

        // ── MAIN COURSE INFORMATION TABLE
        // Matches COMP001 layout: one unified table with:
        //   Row 0: "COURSE INFORMATION" spanning all 6 columns (merged header)
        //   Row 1: COURSE CODE | value | COURSE TITLE | value | COURSE CREDIT | value
        //   Row 2: COURSE DESCRIPTION (spanning col 0) | description text (spanning cols 1-5)
        //   Row 3: PRE-REQUISITES | value | CO-REQUISITES | value (spanning remaining)
        //   Row 4+: VISION / MISSION / QUALITY STATEMENT POLICY / ILO (label col + value spanning 5)
        $bgHeaderCell = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'B4C6E7'];
        $fntLabel     = ['name' => 'Arial Narrow', 'size' => 9, 'bold' => true];
        $fntValue     = ['name' => 'Arial Narrow', 'size' => 9];
        $fntValueBold = ['name' => 'Arial Narrow', 'size' => 9, 'bold' => true];

        // Column widths: 6-column grid matching COMP001 proportions
        $cW1 = (int)($pageW * 0.11);  // label: COURSE CODE
        $cW2 = (int)($pageW * 0.15);  // value: code
        $cW3 = (int)($pageW * 0.11);  // label: COURSE TITLE
        $cW4 = (int)($pageW * 0.33);  // value: title
        $cW5 = (int)($pageW * 0.13);  // label: COURSE CREDIT
        $cW6 = $pageW - $cW1 - $cW2 - $cW3 - $cW4 - $cW5; // value: credit

        $mainTable = $sec1->addTable([
            'width' => $pageW,
            'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP,
            'alignment' => \PhpOffice\PhpWord\SimpleType\JcTable::CENTER,
        ]);

        // ── Row 0: "COURSE INFORMATION" spanning header ──────────────────────
        $mainTable->addRow(350);
        $ciCell = $mainTable->addCell($pageW, array_merge($border, [
            'gridSpan'   => 6,
            'shading'    => $bgLightGray,
            'cellMargin' => $cellPad,
            'valign'     => 'center',
        ]));
        $ciCell->addText('COURSE INFORMATION', ['name' => 'Arial Narrow', 'size' => 10, 'bold' => true], $center);

        // ── Row 1: COURSE CODE | value | COURSE TITLE | value | COURSE CREDIT | value ──
        $mainTable->addRow(350);
        $mainTable->addCell($cW1, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('COURSE CODE', $fntLabel, $center);
        $mainTable->addCell($cW2, array_merge($border, ['cellMargin' => $cellPad, 'valign' => 'center']))->addText($courseCode, $fntValueBold, $center);
        $mainTable->addCell($cW3, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('COURSE TITLE', $fntLabel, $center);
        $mainTable->addCell($cW4, array_merge($border, ['cellMargin' => $cellPad, 'valign' => 'center']))->addText($courseTitle, $fntValueBold, $center);
        $mainTable->addCell($cW5, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('COURSE CREDIT', $fntLabel, $center);
        $mainTable->addCell($cW6, array_merge($border, ['cellMargin' => $cellPad, 'valign' => 'center']))->addText($credit, $fntValueBold, $center);

        // ── Row 2: COURSE DESCRIPTION ─────────────────────────────────────────
        $mainTable->addRow(350);
        $mainTable->addCell($cW1, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('COURSE DESCRIPTION', $fntLabel, $center);
        $descCell = $mainTable->addCell($cW2 + $cW3 + $cW4 + $cW5 + $cW6, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]));
        $descCell->addText($description ?: ' ', $fntValue);

        // ── Row 3: PRE-REQUISITES | value | CO-REQUISITES | value ─────────────
        $mainTable->addRow(350);
        $mainTable->addCell($cW1, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('PRE-REQUISITES', $fntLabel, $center);
        $mainTable->addCell($cW2, array_merge($border, ['cellMargin' => $cellPad, 'valign' => 'center']))->addText($preReq, $fntValue);
        $mainTable->addCell($cW3, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('CO-REQUISITES', $fntLabel, $center);
        $coCell = $mainTable->addCell($cW4 + $cW5 + $cW6, array_merge($border, ['gridSpan' => 3, 'cellMargin' => $cellPad, 'valign' => 'center']));
        $coCell->addText($coReq, $fntValue);

        // ── Rows 4+: VISION / MISSION / QUALITY / ILO (2-col: label | value spanning 5) ──
        $labelSpanW = $cW1;            // label column width
        $valueSpanW = $pageW - $cW1;   // value spans remaining 5 columns

        foreach ([
            ['VISION',                                   $vision],
            ['MISSION',                                  $mission],
            ['QUALITY POLICY STATEMENT',                 $quality],
        ] as [$lbl, $val]) {
            $mainTable->addRow(350);
            $mainTable->addCell($labelSpanW, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText($lbl, $fntLabel, $center);
            $vCell = $mainTable->addCell($valueSpanW, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]));
            $vCell->addText($val ?: ' ', $fntValue);
        }

        // ILO row (always shown — fallback ensures it's non-empty)
        $mainTable->addRow(350);
        $mainTable->addCell($labelSpanW, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('INSTITUTIONAL LEARNING OUTCOMES (ILO)', $fntLabel, $center);
        $iloCell = $mainTable->addCell($valueSpanW, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]));
        foreach ($ilos as $i => $ilo) {
            $iloText = ($i + 1) . '. ' . $t($s($ilo['title'] ?? ($ilo['text'] ?? '')));
            $iloCell->addText($iloText, $fntValue);
        }

        // College/Campus Goals row — numbered list
        $mainTable->addRow(350);
        $mainTable->addCell($labelSpanW, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('COLLEGE / CAMPUS GOALS', $fntLabel, $center);
        $cgCell = $mainTable->addCell($valueSpanW, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]));
        $cgSentences = array_filter(array_map('trim', preg_split('/(?<=\.)\s+(?=To\s)/i', $collegeGoals ?: ' ')));
        if (empty($cgSentences)) { $cgSentences = [$collegeGoals ?: ' ']; }
        foreach (array_values($cgSentences) as $gi => $goal) {
            $cgCell->addText(($gi + 1) . '. ' . $goal, $fntValue);
        }

        // Program Goals row (always shown — falls back to COMP001 default)
        $mainTable->addRow(350);
        $mainTable->addCell($labelSpanW, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('PROGRAM GOALS', $fntLabel, $center);
        $mainTable->addCell($valueSpanW, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]))->addText($programGoals ?: ' ', $fntValue);

        // Program Objectives row (always shown — falls back to COMP001 default)
        $mainTable->addRow(350);
        $mainTable->addCell($labelSpanW, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('PROGRAM OBJECTIVES', $fntLabel, $center);
        $objCell = $mainTable->addCell($valueSpanW, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]));
        foreach ($programObjList as $pi => $obj) {
            $objCell->addText(($pi + 1) . '. ' . $t($s($obj['text'] ?? ($obj['title'] ?? ''))), $fntValue);
        }

        // ════════════════════════════════════════════════════════════════════
        // PAGE 2 — PLO/ILO + CLO/PLO Mapping (Step 2)
        // ════════════════════════════════════════════════════════════════════
        $sec2 = $phpWord->addSection($sectionStyle);

        $addWordHF($sec2, $header, $footer);

        // Banner (same dark style as Page 1)
        $bannerTable2 = $sec2->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
        $bannerTable2->addRow();
        $bannerCell2 = $bannerTable2->addCell($pageW, array_merge($border, [
            'shading'    => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => '365F91'],
            'cellMargin' => ['top' => 120, 'bottom' => 120, 'left' => 100, 'right' => 100],
            'valign'     => 'center',
        ]));
        $bannerCell2->addText(strtoupper($courseName), ['name' => 'Arial Narrow', 'size' => 16, 'bold' => true, 'color' => 'FFFFFF'], $center);
        $bannerCell2->addText('OUTCOMES-BASED COURSE SYLLABUS', ['name' => 'Arial Narrow', 'size' => 14, 'bold' => true, 'color' => 'FFFFFF'], $center);

        // PLO → ILO table
        $sec2->addText('PROGRAM LEARNING OUTCOMES', $fntBold);
        $sec2->addText('Based on CHED Memorandum Order (CMO) No. 25, series of 2015', $fntXSm);

        $ploIloColW = (int)(($pageW - (int)($pageW * 0.45)) / $iloCount);
        $ploLblW    = $pageW - ($ploIloColW * $iloCount);
        $ploTable   = $sec2->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);

        // Header row: label + ILO numbers
        $ploTable->addRow(350);
        $ploTable->addCell($ploLblW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]))
            ->addText('Program Learning Outcomes', array_merge($fntSm, ['bold' => true]));
        for ($n = 1; $n <= $iloCount; $n++) {
            $c = $ploTable->addCell($ploIloColW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
            $c->addText((string)$n, array_merge($fntSm, ['bold' => true]), $center);
        }

        // PLO rows
        foreach ($plos as $plo) {
            $pid = $plo['id'] ?? '';
            $lbl = $t($s($plo['label'] ?? ($plo['description'] ?? '')));
            $ploTable->addRow(350);
            $ploTable->addCell($ploLblW, array_merge($border, ['cellMargin' => $cellPad]))->addText($lbl, $fntSm);
            for ($n = 1; $n <= $iloCount; $n++) {
                $checked = !empty($iloMapping["{$pid}-{$n}"]);
                $c = $ploTable->addCell($ploIloColW, array_merge($border, ['cellMargin' => $cellPad]));
                $c->addText($checked ? '✓' : '', array_merge($fntSm, ['bold' => true]), $center);
            }
        }

        // CLO → PLO table
        $sec2->addText('COURSE LEARNING OUTCOMES', $fntBold);
        $sec2->addText('After completion of the course, the students should be able to:', $fntSm);

        $ploCount   = count($plos);
        $cloColW    = $ploCount > 0 ? (int)(($pageW * 0.55) / $ploCount) : (int)($pageW * 0.055);
        $cloLblW    = $pageW - ($cloColW * $ploCount);
        $cloTable   = $sec2->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);

        // Header row
        $cloTable->addRow(350);
        $cloTable->addCell($cloLblW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]))
            ->addText('Course Learning Outcomes', array_merge($fntSm, ['bold' => true]));
        foreach ($plos as $i => $plo) {
            $c = $cloTable->addCell($cloColW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
            $c->addText((string)($i + 1), array_merge($fntSm, ['bold' => true]), $center);
        }

        // CLO rows
        foreach ($clos as $clo) {
            $cid = $clo['id'] ?? '';
            $lbl = $t($s($clo['text'] ?? ($clo['description'] ?? '')));
            $cloTable->addRow(350);
            $cloTable->addCell($cloLblW, array_merge($border, ['cellMargin' => $cellPad]))->addText($lbl, $fntSm);
            foreach ($plos as $plo) {
                $pid = $plo['id'] ?? '';
                $val = $s($ploMapping["{$cid}-{$pid}"] ?? '');
                $c   = $cloTable->addCell($cloColW, array_merge($border, ['cellMargin' => $cellPad]));
                $c->addText($val, array_merge($fntSm, ['bold' => true]), $center);
            }
        }

        $sec2->addText('Legend: L-Learned, P-Practiced, O-Opportunity to Learn', $fntXSm);

        // ════════════════════════════════════════════════════════════════════
        // PAGES — OBTL (Step 3), 7 rows per page
        // ════════════════════════════════════════════════════════════════════
        $ROWS_PER_PAGE = 7;
        $obtlPages     = array_chunk($obtlData, $ROWS_PER_PAGE) ?: [[]];

        // Column widths (8 cols) — proportional to CSS percentages
        $obtlWidths = [
            (int)($pageW * 0.06),  // Weeks
            (int)($pageW * 0.18),  // DLO
            (int)($pageW * 0.10),  // CLO alignment
            (int)($pageW * 0.15),  // Topics
            (int)($pageW * 0.13),  // Face-to-face
            (int)($pageW * 0.13),  // Sync
            (int)($pageW * 0.13),  // Async
            0,                     // Tasks — fill remainder
        ];
        $obtlWidths[7] = $pageW - array_sum(array_slice($obtlWidths, 0, 7));

        foreach ($obtlPages as $pageIdx => $pageRows) {
            $isFirst = $pageIdx === 0;
            $isLast  = $pageIdx === count($obtlPages) - 1;

            $secO = $phpWord->addSection($sectionStyle);

            $addWordHF($secO, $header, $footer);

            // Banner (same dark style as other pages)
            $obtlBanner = $secO->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
            $obtlBanner->addRow();
            $obtlBannerCell = $obtlBanner->addCell($pageW, array_merge($border, [
                'shading'    => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => '365F91'],
                'cellMargin' => ['top' => 120, 'bottom' => 120, 'left' => 100, 'right' => 100],
                'valign'     => 'center',
            ]));
            $obtlBannerCell->addText(strtoupper($courseName), ['name' => 'Arial Narrow', 'size' => 16, 'bold' => true, 'color' => 'FFFFFF'], $center);
            $obtlBannerCell->addText('OUTCOMES-BASED COURSE SYLLABUS', ['name' => 'Arial Narrow', 'size' => 14, 'bold' => true, 'color' => 'FFFFFF'], $center);

            // OBTL table
            $obtlTable = $secO->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);

            if ($isFirst) {
                // Header rows (3 rows with rowspan/colspan simulated)
                // Row 1: 4 rowspan=3 cells + "Instructional Delivery Design" (colspan=3) + rowspan=3
                $obtlTable->addRow(350);
                foreach ([
                    ['w' => $obtlWidths[0], 'txt' => "Weeks\n(18 Weeks)", 'rs' => 3],
                    ['w' => $obtlWidths[1], 'txt' => 'Learning Outcomes (DLOs)', 'rs' => 3],
                    ['w' => $obtlWidths[2], 'txt' => 'Alignment to (CLOs)', 'rs' => 3],
                    ['w' => $obtlWidths[3], 'txt' => 'Learning Content/Topics', 'rs' => 3],
                ] as $col) {
                    $opts = array_merge($border, ['fill' => 'F4CCCC', 'valign' => 'center', 'vMerge' => 'restart', 'cellMargin' => $cellPad]);
                    $c = $obtlTable->addCell($col['w'], $opts);
                    $c->addText($col['txt'], array_merge($fntSm, ['bold' => true]), $center);
                }
                // "Instructional Delivery Design" spans 3 cols
                $iddW = $obtlWidths[4] + $obtlWidths[5] + $obtlWidths[6];
                $iddCell = $obtlTable->addCell($iddW, array_merge($border, ['fill' => 'D9EAF7', 'gridSpan' => 3, 'valign' => 'center', 'cellMargin' => $cellPad]));
                $iddCell->addText('Instructional Delivery Design', array_merge($fntSm, ['bold' => true]), $center);
                // Assessment Tasks rowspan=3
                $opts = array_merge($border, ['fill' => 'F4CCCC', 'valign' => 'center', 'vMerge' => 'restart', 'cellMargin' => $cellPad]);
                $c = $obtlTable->addCell($obtlWidths[7], $opts);
                $c->addText('Assessment Tasks (TAs)', array_merge($fntSm, ['bold' => true]), $center);

                // Row 2: first 4 + FLTAs colspan=2 + last skip
                $obtlTable->addRow(350);
                foreach (range(0, 3) as $ci) {
                    $obtlTable->addCell($obtlWidths[$ci], ['vMerge' => 'continue', 'borders' => $border])->addText('');
                }
                $fltaW = $obtlWidths[5] + $obtlWidths[6];
                $obtlTable->addCell($obtlWidths[4], array_merge($border, ['fill' => 'D9EAF7', 'valign' => 'center', 'cellMargin' => $cellPad]))
                    ->addText('Face-to-Face', array_merge($fntSm, ['bold' => true]), $center);
                $fltaCell = $obtlTable->addCell($fltaW, array_merge($border, ['fill' => 'D9EAF7', 'gridSpan' => 2, 'valign' => 'center', 'cellMargin' => $cellPad]));
                $fltaCell->addText('Flexible Learning and Teaching Activities (FLTAs)', array_merge($fntSm, ['bold' => true]), $center);
                $obtlTable->addCell($obtlWidths[7], ['vMerge' => 'continue', 'borders' => $border])->addText('');

                // Row 3: first 4 + face-to-face + sync + async + last skip
                $obtlTable->addRow(350);
                foreach (range(0, 3) as $ci) {
                    $obtlTable->addCell($obtlWidths[$ci], ['vMerge' => 'continue', 'borders' => $border])->addText('');
                }
                $obtlTable->addCell($obtlWidths[4], ['vMerge' => 'continue', 'borders' => $border])->addText('');
                $obtlTable->addCell($obtlWidths[5], array_merge($border, ['fill' => 'D9EAF7', 'valign' => 'center', 'cellMargin' => $cellPad]))
                    ->addText('Synchronous', $fntXSm, $center);
                $obtlTable->addCell($obtlWidths[6], array_merge($border, ['fill' => 'D9EAF7', 'valign' => 'center', 'cellMargin' => $cellPad]))
                    ->addText('Asynchronous', $fntXSm, $center);
                $obtlTable->addCell($obtlWidths[7], ['vMerge' => 'continue', 'borders' => $border])->addText('');
            }

            // Data rows
            foreach ($pageRows as $row) {
                $obtlTable->addRow(350);
                if (($row['type'] ?? '') === 'header') {
                    // Span all 8 columns
                    $spanW = array_sum($obtlWidths);
                    $c = $obtlTable->addCell($spanW, array_merge($border, ['gridSpan' => 8, 'shading' => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'FFFBEB'], 'cellMargin' => $cellPad]));
                    $c->addText($t($s($row['topics'] ?? '')), array_merge($fntSm, ['bold' => true]), $center);
                } else {
                    $cols = [
                        $t($s($row['weeks']        ?? '')),
                        $t($s($row['dlo']          ?? '')),
                        $t($s($row['clo']          ?? '')),
                        $t($s($row['topics']       ?? '')),
                        $t($s($row['deliveryFace'] ?? '')),
                        $t($s($row['deliverySync'] ?? '')),
                        $t($s($row['deliveryAsync']?? '')),
                        $t($s($row['tasks']        ?? '')),
                    ];
                    foreach ($cols as $ci => $txt) {
                        $align = $ci === 0 ? $center : [];
                        $c = $obtlTable->addCell(
                            $obtlWidths[$ci],
                            array_merge($border, [
                                'cellMargin' => $cellPad,
                                'valign' => 'center'
                            ])
                        );
                        $c->addText($txt, $fntSm, $align);
                    }
                }
            }

            // References on last OBTL page — wrapped in a bordered table matching PDF
            if ($isLast) {
                $secO->addText('');
                $refTable = $secO->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);

                // NALLRC header row
                $refTable->addRow(350);
                $nallrcCell = $refTable->addCell($pageW, array_merge($border, ['cellMargin' => $cellPad]));
                $nallrcCell->addText('REFERENCES FROM THE NINOY AQUINO LEARNING AND LIBRARY RESOURCES CENTER (NALLRC)', array_merge($fntSm, ['bold' => true]));
                $nallrcCell->addText('OUTCOMES-BASED BOOK LISTINGS (CBBL)', array_merge($fntSm, ['bold' => true]));

                // NALLRC content row
                $refTable->addRow(350);
                $nallrcContent = $refTable->addCell($pageW, array_merge($border, ['cellMargin' => $cellPad]));
                if (empty($references)) {
                    $nallrcContent->addText('No references added.', array_merge($fntSm, ['italic' => true]));
                } else {
                    foreach ($references as $ref) {
                        $nallrcContent->addText($t($s($ref['text'] ?? '')), $fntSm);
                    }
                }

                // Other References header row
                $refTable->addRow(350);
                $refTable->addCell($pageW, array_merge($border, ['cellMargin' => $cellPad]))
                    ->addText('OTHER REFERENCES', array_merge($fntSm, ['bold' => true]));

                // Other references content row
                $refTable->addRow(350);
                $otherContent = $refTable->addCell($pageW, array_merge($border, ['cellMargin' => $cellPad]));
                if (empty($otherRefs)) {
                    $otherContent->addText('No other references added.', array_merge($fntSm, ['italic' => true]));
                } else {
                    foreach ($otherRefs as $ref) {
                        $otherContent->addText($t($s($ref['text'] ?? '')), $fntSm);
                    }
                }
            }

        }

        // ════════════════════════════════════════════════════════════════════
        // PAGE — Classroom Policies (Step 4)
        // ════════════════════════════════════════════════════════════════════
        $secP = $phpWord->addSection($sectionStyle);

        $addWordHF($secP, $header, $footer);

        // Section banner — matches PDF .section-banner "CLASSROOM POLICIES (TO BE FILLED OUT BY THE ASSIGNED FACULTY)"
        $addSectionBanner($secP, 'CLASSROOM POLICIES (TO BE FILLED OUT BY THE ASSIGNED FACULTY)');

        $policyColW = (int)($pageW / 2);
        $policyTable = $secP->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
        $policyTable->addRow();

        // Header row inside the table (matches PDF table header row)
        $ph1 = $policyTable->addCell($policyColW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
        $ph1->addText('FACE-TO-FACE DELIVERY', array_merge($fntSm, ['bold' => true]), $center);
        $ph2 = $policyTable->addCell($policyColW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
        $ph2->addText('FLEXIBLE TEACHING AND LEARNING ACTIVITIES (FLTAS)', array_merge($fntSm, ['bold' => true]), $center);

        $policyTable->addRow();
        $f2fCell  = $policyTable->addCell($policyColW, array_merge($border, ['cellMargin' => $cellPad]));
        $fltaCell = $policyTable->addCell($policyColW, array_merge($border, ['cellMargin' => $cellPad]));

        // General classroom guidelines
        $f2fCell->addText('General Classroom Guidelines:', array_merge($fntSm, ['bold' => true]));
        if (!empty($generalPolicies)) {
            foreach ($generalPolicies as $i => $p) {
                $f2fCell->addText(($i + 1) . '. ' . $t($s($p['text'] ?? '')), $fntSm);
            }
        } else {
            // Default policies
            foreach ([
                'Students shall attend set contact schedule ready with all materials and outputs required.',
                'PLAGIARISM SHALL NOT BE TOLERATED.',
                'Requirements shall be submitted on time. Late submissions will be subjected to deductions.',
                'Students with any form of disability must inform the course instructor immediately.',
                'All students are expected to read and strictly observe the PUP Student Code of Conduct.',
            ] as $i => $p) {
                $f2fCell->addText(($i + 1) . '. ' . $p, $fntSm);
            }
        }
        if ($f2fLink) {
            $f2fCell->addText($f2fLink, array_merge($fntSm, ['color' => '1a56db']));
        }
        $f2fCell->addText('');
        $f2fCell->addText('Guidelines for the face-to-face delivery:', array_merge($fntSm, ['bold' => true]));
        if (!empty($f2fPolicies)) {
            foreach ($f2fPolicies as $i => $p) {
                $f2fCell->addText(($i + 1) . '. ' . $t($s($p['text'] ?? '')), $fntSm);
            }
        } else {
            foreach ([
                'Strictly observe the minimum health protocols set by the university.',
                'Check your schedule on the class Facebook page before going to school.',
                'Be mindful of your classmates and teacher\'s time.',
            ] as $i => $p) {
                $f2fCell->addText(($i + 1) . '. ' . $p, $fntSm);
            }
        }

        // Sync/Async sessions
        $fltaCell->addText('Synchronous Sessions:', array_merge($fntSm, ['bold' => true]));
        if (!empty($syncPolicies)) {
            foreach ($syncPolicies as $i => $p) {
                $fltaCell->addText(($i + 1) . '. ' . $t($s($p['text'] ?? '')), $fntSm);
            }
        } else {
            foreach ([
                'Check your device ahead of your scheduled synchronous meeting (camera, microphone, etc.)',
                'Attend the synchronous class on time.',
                'Be ready to turn on your microphone and camera anytime.',
                'Choose a comfortable space to attend the online class.',
                'Click the \'raise hand\' button and wait to be acknowledged before unmuting.',
                'Do not abuse the chatbox.',
                'Read the assigned materials before attending the class.',
            ] as $i => $p) {
                $fltaCell->addText(($i + 1) . '. ' . $p, $fntSm);
            }
        }
        $fltaCell->addText('');
        $fltaCell->addText('Asynchronous Sessions:', array_merge($fntSm, ['bold' => true]));
        if (!empty($asyncPolicies)) {
            foreach ($asyncPolicies as $i => $p) {
                $fltaCell->addText(($i + 1) . '. ' . $t($s($p['text'] ?? '')), $fntSm);
            }
        } else {
            foreach ([
                'Study the sections and functions of the assigned learning management system (LMS) ahead of time.',
                'Check the expected submission schedule at all times.',
                'Ask for help from your teacher(s) and classmates when necessary.',
            ] as $i => $p) {
                $fltaCell->addText(($i + 1) . '. ' . $p, $fntSm);
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // PAGE — Course Requirements & Grading (Step 4 continued)
        // ════════════════════════════════════════════════════════════════════
        $secG = $phpWord->addSection($sectionStyle);

        $addWordHF($secG, $header, $footer);

        // Section banner matching PDF
        $addSectionBanner($secG, 'COURSE REQUIREMENTS & EVALUATION');

        $gradW1 = (int)($pageW * 0.60);
        $gradW2 = $pageW - $gradW1;
        $gradTable = $secG->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
        $gradTable->addRow();

        $reqCell  = $gradTable->addCell($gradW1, array_merge($border, ['cellMargin' => $cellPad]));
        $gradCell = $gradTable->addCell($gradW2, array_merge($border, ['cellMargin' => $cellPad]));

        $reqCell->addText('COURSE REQUIREMENT/S with CLO links', array_merge($fntNorm, ['bold' => true, 'underline' => \PhpOffice\PhpWord\Style\Font::UNDERLINE_SINGLE]));
        foreach ($requirements as $req) {
            $txt = $t($s($req['text'] ?? ''));
            $clo = $s($req['clo'] ?? '');
            $line = '• ' . $txt . ($clo ? ' (' . $clo . ')' : '');
            $reqCell->addText($line, $fntNorm);
        }

        $gradCell->addText('GRADING SYSTEM', array_merge($fntNorm, ['bold' => true, 'underline' => \PhpOffice\PhpWord\Style\Font::UNDERLINE_SINGLE]));
        foreach ($gradingComponents as $comp) {
            $lbl  = $t($s($comp['label'] ?? ($comp['name'] ?? '')));
            $pct  = (int)($comp['percentage'] ?? 0);
            $subs = isset($comp['subItems']) ? implode(', ', array_map(fn($sub) => $t($s($sub['label'] ?? '')), $comp['subItems'])) : '';

            $gradCell->addText($lbl, array_merge($fntNorm, ['bold' => true]));
            if ($subs) $gradCell->addText($subs, $fntXSm);
            $gradCell->addText($pct . '%', $fntNorm);
            $gradCell->addText('');
        }
        $gradCell->addText('TOTAL: 100%', array_merge($fntNorm, ['bold' => true]));

        // ════════════════════════════════════════════════════════════════════
        // PAGES — Rubrics + Group Grade + Class Info + Signatories (Step 5)
        // ════════════════════════════════════════════════════════════════════
        $RUBRIC_PER_PAGE = 5;
        $rubricPages     = array_chunk($rubrics, $RUBRIC_PER_PAGE) ?: [[]];

        foreach ($rubricPages as $pageIdx => $pageRubrics) {
            $isFirst = $pageIdx === 0;

            $secR = $phpWord->addSection($sectionStyle);

            $addWordHF($secR, $header, $footer);

            if ($isFirst) {
                $secR->addText('Part 1. Rubrics for Assessment (to be filled out by the assigned faculty)', array_merge($fntSm, ['bold' => true]));
            } else {
                $secR->addText('Rubrics for Assessment (continued)', $fntSm);
            }

            // Rubric table: Skills | 4-Advanced | 3-Competent | 2-Progressing | 1-Beginning
            $rW = (int)($pageW * 0.20);
            $rColW = (int)(($pageW - $rW) / 4);
            $rubTable = $secR->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);

            // Header row 1 — numbers
            $rubTable->addRow();
            $rubTable->addCell($rW, array_merge($border, ['shading' => $bgGray, 'vMerge' => 'restart', 'cellMargin' => $cellPad]))
                ->addText('Skills', array_merge($fntSm, ['bold' => true]), $center);
            foreach ([['4', 'Advanced'], ['3', 'Competent'], ['2', 'Progressing'], ['1', 'Beginning']] as [$num, $lbl]) {
                $c = $rubTable->addCell($rColW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
                $c->addText($num, array_merge($fntSm, ['bold' => true]), $center);
            }

            // Header row 2 — level names
            $rubTable->addRow();
            $rubTable->addCell($rW, array_merge($border, ['vMerge' => 'continue']))->addText('');
            foreach (['Advanced', 'Competent', 'Progressing', 'Beginning'] as $lbl) {
                $c = $rubTable->addCell($rColW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
                $c->addText($lbl, array_merge($fntSm, ['bold' => true]), $center);
            }

            // Rubric data rows
            foreach ($pageRubrics as $r) {
                $rubTable->addRow();
                $rubTable->addCell($rW, array_merge($border, ['cellMargin' => $cellPad]))->addText($t($s($r['skills'] ?? '')), array_merge($fntSm, ['bold' => true]));
                foreach (['v4', 'v3', 'v2', 'v1'] as $vk) {
                    $rubTable->addCell($rColW, array_merge($border, ['cellMargin' => $cellPad]))->addText($t($s($r[$vk] ?? '')), $fntSm);
                }
            }

            // Group grade + Class/Faculty info + Signatories on first rubric page only
            if ($isFirst) {
                $secR->addText('');
                $secR->addText('Part 2. Group grade', array_merge($fntSm, ['bold' => true]));

                $groupW = [(int)($pageW * 0.65)];
                for ($n = 0; $n < 4; $n++) $groupW[] = (int)(($pageW - $groupW[0]) / 4);
                $groupTable = $secR->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);

                // Header
                $groupTable->addRow();
                $groupTable->addCell($groupW[0], array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]))->addText('Criteria', array_merge($fntSm, ['bold' => true]));
                foreach ([1, 2, 3, 4] as $n) {
                    $groupTable->addCell($groupW[$n], array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]))->addText((string)$n, array_merge($fntSm, ['bold' => true]), $center);
                }

                foreach ($groupCriteria as $i => $g) {
                    $groupTable->addRow();
                    $lbl = $t($s($g['label'] ?? ''));
                    $wt  = $s($g['weight'] ?? '');
                    $sc  = (int)($g['score'] ?? 0);
                    $groupTable->addCell($groupW[0], array_merge($border, ['cellMargin' => $cellPad]))->addText(($i + 1) . '. ' . $lbl . ($wt ? " ({$wt}%)" : ''), $fntSm);
                    foreach ([1, 2, 3, 4] as $n) {
                        $c = $groupTable->addCell($groupW[$n], array_merge($border, ['cellMargin' => $cellPad]));
                        $c->addText($sc === $n ? '✔' : '', $fntSm, $center);
                    }
                }

                // Class info + Faculty info
                $secR->addText('');
                $ciW = (int)($pageW / 2);
                $ciTable = $secR->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
                $ciTable->addRow();
                $ciHdr = $ciTable->addCell($ciW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
                $ciHdr->addText('CLASS INFORMATION', array_merge($fntSm, ['bold' => true]), $center);
                $fiHdr = $ciTable->addCell($ciW, array_merge($border, ['shading' => $bgGray, 'cellMargin' => $cellPad]));
                $fiHdr->addText('FACULTY INFORMATION', array_merge($fntSm, ['bold' => true]), $center);

                $ciTable->addRow();
                $ciBody = $ciTable->addCell($ciW, array_merge($border, ['cellMargin' => $cellPad]));
                $fiBody = $ciTable->addCell($ciW, array_merge($border, ['cellMargin' => $cellPad]));

                $ciSection  = $t($s($classInfo['section']  ?? ''));
                $ciTime     = $t($s($classInfo['time']     ?? ($classInfo['schedule'] ?? '')));
                $ciRoom     = $t($s($classInfo['room']     ?? ''));
                $ciSemester = $t($s($classInfo['semester'] ?? ''));
                $fiName     = $t($s($facultyInfo['name']        ?? ''));
                $fiConsult  = $t($s($facultyInfo['consultation'] ?? ''));
                $fiContact  = $t($s($facultyInfo['contact']     ?? ($facultyInfo['office'] ?? '')));
                $fiEmail    = $t($s($facultyInfo['email']       ?? ''));

                foreach ([
                    "Section: {$ciSection}",
                    "Time: {$ciTime}",
                    "Room: {$ciRoom}",
                    "Semester: {$ciSemester}",
                ] as $line) $ciBody->addText($line, $fntSm);

                foreach ([
                    "Name of Faculty: {$fiName}",
                    "Consultation Time: {$fiConsult}",
                    "Office Tel. No./ Mobile Phone No.: {$fiContact}",
                    "Institutional Email: {$fiEmail}",
                ] as $line) $fiBody->addText($line, $fntSm);

                // Signatories
                if (!empty($signatories)) {
                    $secR->addText('');
                    $sigColW = (int)($pageW / max(1, count($signatories)));
                    $sigTable = $secR->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
                    $sigTable->addRow();
                    foreach ($signatories as $sig) {
                        $sName  = $t($s($sig['name']  ?? '______________________'));
                        $sTitle = $t($s($sig['title'] ?? ''));
                        $sRole  = $t($s($sig['role']  ?? ''));
                        $sCell  = $sigTable->addCell($sigColW, array_merge($border, ['cellMargin' => $cellPad]));
                        $sCell->addText('');  // space for signature
                        $sCell->addText('');
                        $sCell->addText(strtoupper($sName), array_merge($fntSm, ['bold' => true]), $center);
                        $sCell->addText($sTitle, $fntXSm, $center);
                        $sCell->addText($sRole, array_merge($fntXSm, ['italic' => true]), $center);
                    }
                }
            }

        }

        // ── Write & stream ───────────────────────────────────────────────────
        $tmpPath = tempnam(sys_get_temp_dir(), 'syllabus_') . '.docx';
        try {
            \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007')->save($tmpPath);
        } catch (\Throwable $e) {
            @unlink($tmpPath);
            Log::error('PhpWord save failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            throw $e; // re-throw so store()'s try/catch logs it properly
        }

        return response()->download(
            $tmpPath,
            "{$baseName}.docx",
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        )->deleteFileAfterSend(true);
    }


// ═══════════════════════════════════════════════════════════════════════════
// ADD these private helper methods to the class (before the closing brace):
// ═══════════════════════════════════════════════════════════════════════════

    /** Returns a full-border style array for table cells */
    private function docxBorder(): array
    {
        return [
            'borderTopSize'    => 4,
            'borderTopColor'   => '000000',

            'borderBottomSize' => 4,
            'borderBottomColor'=> '000000',

            'borderLeftSize'   => 4,
            'borderLeftColor'  => '000000',

            'borderRightSize'  => 4,
            'borderRightColor' => '000000',
        ];
    }

    /** Adds a plain data cell with one text run */
    private function docxCell(\PhpOffice\PhpWord\Element\Table $table, int $width, string $text, array $border, array $pad, array $font, array $align = []): void
    {
        $cell = $table->addCell($width, array_merge($border, ['cellMargin' => $pad, 'noWrap' => false]));
        $cell->addText($text ?: ' ', $font, $align ?: []);
    }

    /** Adds a bold label / header cell with light-gray background */
    private function docxHeaderCell(\PhpOffice\PhpWord\Element\Table $table, int $width, string $text, array $border, array $pad, array $font): void
    {
        $cell = $table->addCell($width, array_merge($border, ['cellMargin' => $pad, 'valign' => 'center', 'noWrap' => false,
            'shading' => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'F5F5F5']]));
        $cell->addText($text, array_merge($font, ['bold' => true]),
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
    }

    /** Convenience: add a normal paragraph to a section */
    private function docxTextPara(\PhpOffice\PhpWord\Element\Section $sec, string $text, array $font): void
    {
        $sec->addText($text, $font);
    }

    /** Convenience: add a bold paragraph to a section */
    private function docxBoldPara(\PhpOffice\PhpWord\Element\Section $sec, string $text, array $font): void
    {
        $sec->addText($text, array_merge($font, ['bold' => true]));
    }

    private function buildHtml(string $courseCode, string $courseTitle, string $courseName,
        array $step1, array $step2, array $step3, array $step4, array $step5,
        string $header, string $footer): string
    {
        // ── Helpers ──────────────────────────────────────────────────────────
        $h  = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $nl = fn(string $v): string => nl2br(htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        $courseNameH = $h(strtoupper($courseName ?: 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY'));

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
            $obtlLabel = $isFirst ? '<p style="font-weight:bold;font-size:9pt;margin:4px 0 2px;">OUTCOMES-BASED TEACHING AND LEARNING PLAN (OBTL PLAN)</p>' : '';

            $obtlPagesHtml .= '
            <div class="page" style="page-break-before:always;">
                ' . $this->renderHeaderHtml($header) . '
                ' . $yellowBanner . '
                ' . $obtlLabel . '
                <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:8pt;table-layout:fixed;margin-top:0;">
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
                <div class="section-banner">RUBRICS FOR ASSESSMENT (TO BE FILLED OUT BY THE ASSIGNED FACULTY)</div>
                <p style="font-weight:bold;margin:4px 0;font-size:8pt;">'
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
        $yellowBannerStatic = '<div class="header-yellow">' . $courseNameH . '<br/>Outcomes-Based Course Syllabus</div>';

        // ── Step 1 dynamic fields for HTML ───────────────────────────────────
        $visionVal  = strip_tags((string)($step1['vision']  ?? ''));
        $missionVal = strip_tags((string)($step1['mission'] ?? ''));
        $qualityVal = strip_tags((string)($step1['quality_statement_policy'] ?? ''));
        $ilosArr    = $step1['ilos'] ?? [];

        $visionH  = $h($visionVal  ?: 'A Leading Comprehensive Polytechnic University in Asia');
        $missionH = $h($missionVal ?: 'Advance an inclusive, equitable, and globally relevant polytechnic education towards national development.');
        $qualityH = $h($qualityVal ?: 'The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities. Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services.');

        // ILO list HTML
        $iloHtml = '<ol style="margin:0 0 0 16px;padding:0;">';
        // ── Static PUP defaults (from COMP 001 template) ─────────────────────
        $iloDefault = [
            ['bold' => 'Critical and Creative Thinking', 'text' => 'Graduates use their rational and reflective thinking as well as innovative abilities to life situations in order to push boundaries, realize possibilities, and deepen their interdisciplinary, multidisciplinary, and/or transdisciplinary understanding of the world.'],
            ['bold' => 'Effective Communication', 'text' => 'Graduates apply the four macro skills in communication (reading, writing, listening, and speaking), through conventional and digital means, and are able to use these skills in solving problems, making decisions, and articulating thoughts when engaging with people in various circumstances.'],
            ['bold' => 'Strong Service Orientation', 'text' => 'Graduates exemplify strong commitment to service excellence for the people, the clientele, industry and other sectors.'],
            ['bold' => 'Adept and Responsible Use or Development of Technology', 'text' => 'Graduates demonstrate optimized and responsible use of state-of-the-art technologies of their profession. They possess digital learning abilities, including technical, numerical, and/or technopreneurial skills.'],
            ['bold' => 'Passion for Lifelong Learning', 'text' => 'Graduates perform and function in society by taking responsibility in their quest for further improvement through lifelong learning.'],
            ['bold' => 'Leadership and Organizational Skills', 'text' => 'Graduates assume leadership roles and become leading professionals in their respective disciplines by equipping them with appropriate organizational skills.'],
            ['bold' => 'Personal and Professional Ethics', 'text' => 'Graduates manifest integrity and adherence to moral and ethical principles in their personal and professional circumstances.'],
            ['bold' => 'Resilience and Agility', 'text' => 'Graduates demonstrate flexibility and the growth mindset to adapt and thrive in the volatile, uncertain, complex and ambiguous (VUCA) environment.'],
            ['bold' => 'National and Global Responsiveness', 'text' => 'Graduates exhibit a deep sense of nationalism as it complements the need to live as part of the global community where diversity is respected. They promote and fulfill various advocacies for human and social development.'],
        ];

        $collegeGoalsDefault = 'Innovation and continuous improvement; to build a diverse, transparent, inclusive workforce; and reduce the organization\'s environmental impact. To offer curricula that are relevant and responsive to the changing needs of the industry and society; the ability of curriculum developers to translate knowledge about new development into curriculum content and structure; to promote critical thinking, a sense of adventure, and an openness to adapt challenges of their future workplace and give them the confidence and skills to continue to adapt; to provide a hierarchical system for grades levels/subjects within aims and objectives for individual lessons. To increase students\' attention, and focus, promote a meaningful learning experience, encourage higher levels of student performance, motivate students to practice higher-order thinking skills; to prepare students to become productive, creative, innovative, and dynamic in their chosen fields of specialization and to provide state of the art facilities of learning to optimize student development; tap potentials of students, faculty, administrative staff, and other stakeholders in formulating policies for institutional development. To prepare holistic approaches to inculcate appropriate values that are necessary to build a humane, disciplined, nationalist, and independent society and to develop students, physical, emotional, social, and intellectual well-being through providing opportunities for students to learn and grow in all areas of their lives; to create a supportive, inclusive environment where students feel safe and respected; to be active participants in their learning for students to connect with others, build relationships and to help students develop a sense of purpose and direction. To build a culture of trust, deliver honest feedback, foster open communication, delegate responsibilities and tasks, and support growth opportunities to empower faculty members and employees. Also, to increase productivity and innovation; improve morale and satisfaction; better decision-making; increase engagement with students and clients, and make empowerment part of our university organizations, culture and vision. To a renowned leader and center of excellence in product utilization research, feasibility study, development, and technology transfer; develop the culture of collaborative research among students, faculty, and employees; to partner with industry and other research institutions in strengthening research capabilities of faculty, employees, and students; to facilitate presentation of research outputs in international fora, their publication in recognized local and international journals; and to develop the culture of collaborative research among students, faculty, and employees. To contribute to the attainment of Vision, Mission, Goal, and Objectives (VMGO) distinctively include complying with the rules and policies of the Polytechnic University of the Philippines (PUP); striving for academic excellence, participating actively in universities activities, becoming a role model, passing the board exam and conducting research. To maintain and enhance its high academic standards in the performance of its functions of instructions, research, and adaptive community for extension. To create value for each company and leverage combined expertise by offering students internship partnerships through a Memorandum of Agreement (MOA); undertake outreach and research-based extension programs by tapping all stakeholders; expertise and other resources. To increase understanding of stakeholder needs and expectations, improve communication and collaboration, and involve all stakeholders in enhancing student, faculty, and employee development programs, build trust and rapport with stakeholders, and get input from stakeholders on critical decisions. To ensure that our curricula possess Social Development Goals (SDG) such as social equity, justice, diversity, inclusion, democratic participation, empowerment, livelihood security, social well-being, and quality of life; to end poverty, to protect the earth, environment and climate and to ensure that students, educators, and stakeholders can enjoy peace and prosperity; to provide training to students that will enable them to become potent instruments for socio-economic development, produce technologies for commercialization or livelihood improvement, and achieve long-term economic growth.';

        $programGoalsDefault = 'The Bachelor of Science in Information Technology (BSIT) program is a four-year degree program which focuses on the study of computer utilization and computer software to plan, install, customize, operate, manage, administer and maintain information technology infrastructure. It likewise deals with the design and development of computer-based information systems for real-world business solutions. The program prepares students to become IT professionals with primary competencies in the areas of systems analysis and design, applications development, database administration, network administration, and systems implementation and maintenance. The program also requires a Capstone project. It should be in the form of an IT applications development as a business solution for an industry need.';

        $programObjDefault = [
            'To introduce students to current technologies and tools while learning new methodologies that will lead to the development of better information systems.',
            'To enable students to understand the different components of the information technology field, including hardware, software, communication, networking, research, peopleware and management skills.',
            'To demonstrate awareness of how to methodically and practically approach a variety of technological and managerial issues to ultimately improve business strategies and attain competitive advantage.',
            'To inculcate to students the essential virtues and attitudes, as well as develop necessary knowledge and competency levels required of an information technology professional.',
            'To train students to systematically analyze and evaluate organizational systems and processes in order to recommend software solutions that properly address the organization\'s needs and goals.',
        ];
        // ─────────────────────────────────────────────────────────────────────

        if (!empty($ilosArr)) {
            foreach ($ilosArr as $ilo) {
                $iloHtml .= '<li>' . $h(strip_tags((string)($ilo['title'] ?? ($ilo['text'] ?? '')))) . '</li>';
            }
        } else {
            foreach ($iloDefault as $ilo) {
                $iloHtml .= '<li><strong>' . $h($ilo['bold']) . '.</strong> ' . $h($ilo['text']) . '</li>';
            }
        }
        $iloHtml .= '</ol>';

        // College/Campus Goals — use step1 data if present, otherwise use COMP001 default
        $collegeGoalsVal = strip_tags((string)($step1['college_goals'] ?? $step1['campus_goals'] ?? ''));
        $collegeGoalsDisplay = $collegeGoalsVal ?: $collegeGoalsDefault;
        // Split into numbered list: split on ". To " and "To " sentence starters for readability
        $collegeGoalsSentences = array_filter(array_map('trim', preg_split('/(?<=\.)\s+(?=To\s)/i', $collegeGoalsDisplay)));
        if (empty($collegeGoalsSentences)) { $collegeGoalsSentences = [$collegeGoalsDisplay]; }
        $collegeGoalsListHtml = '<ol style="margin:0 0 0 16px;padding:0;">';
        foreach ($collegeGoalsSentences as $goal) {
            $collegeGoalsListHtml .= '<li style="margin-bottom:2px;">' . $h($goal) . '</li>';
        }
        $collegeGoalsListHtml .= '</ol>';
        $collegeGoalsRow = '<tr><td class="label-cell">COLLEGE / CAMPUS GOALS</td><td style="font-size:8pt;">' . $collegeGoalsListHtml . '</td></tr>';

        // Program Goals — use step1 data if present, otherwise use COMP001 default
        $programGoalsVal = strip_tags((string)($step1['program_goals'] ?? ''));
        $programGoalsDisplay = $programGoalsVal ?: $programGoalsDefault;
        $programGoalsRow = '<tr><td class="label-cell">PROGRAM GOALS</td><td style="font-size:9pt;text-align:justify;">' . $h($programGoalsDisplay) . '</td></tr>';

        // Program Objectives — use step1 data if present, otherwise use COMP001 default
        $programObjListArr = $step1['program_objectives'] ?? [];
        $objItems = '<ol style="margin:0 0 0 16px;padding:0;">';
        if (!empty($programObjListArr)) {
            foreach ($programObjListArr as $obj) {
                $objItems .= '<li>' . $h(strip_tags((string)($obj['text'] ?? ($obj['title'] ?? '')))) . '</li>';
            }
        } else {
            foreach ($programObjDefault as $obj) {
                $objItems .= '<li>' . $h($obj) . '</li>';
            }
        }
        $objItems .= '</ol>';
        $programObjRow = '<tr><td class="label-cell">PROGRAM OBJECTIVES</td><td style="font-size:9pt;">' . $objItems . '</td></tr>';

        // Course Requirements rows for grading page
        $reqItems = '';
        foreach ($requirements as $req) {
            $rt  = $h($req['text'] ?? '');
            $clo = $h($req['clo']  ?? '');
            $reqItems .= "<li style=\"margin-bottom:8px;\"><span style=\"font-weight:bold;\">{$rt}</span>" . ($clo ? " <span style=\"font-style:italic;color:#666;\">({$clo})</span>" : '') . "</li>";
        }

        $gradingRows = '';
        $total = 0;
        foreach ($gradingComponents as $comp) {
            $lbl  = $h($comp['label']      ?? ($comp['name'] ?? ''));
            $pct  = (int)($comp['percentage'] ?? 0);
            $total += $pct;
            $subs = isset($comp['subItems']) ? implode(', ', array_map(fn($s) => $h($s['label'] ?? ''), $comp['subItems'])) : '';
            $gradingRows .= "
            <tr style=\"border-bottom:1px dotted #ccc;\">
                <td style=\"padding:4px 4px 4px 0;font-size:8.5pt;vertical-align:top;\">
                    <p style=\"font-weight:bold;margin:0;\">{$lbl}</p>" .
                    ($subs ? "<p style=\"font-size:7pt;color:#666;margin:0;\">{$subs}</p>" : '') . "
                </td>
                <td style=\"padding:4px 0 4px 4px;font-size:8.5pt;font-weight:bold;text-align:right;vertical-align:top;white-space:nowrap;\">{$pct}%</td>
            </tr>";
        }

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body  { font-family: Arial, sans-serif; font-size: 9pt; margin: 0; padding: 0; color: #000; }
  .page { padding: 8px 14px; }
  .custom-header {
    font-size: 8.5pt;
    line-height: 1.4;
    margin-bottom: 4px;
    padding-bottom: 3px;
    border-bottom: 1px solid #888;
  }
  .custom-footer {
    font-size: 8.5pt;
    line-height: 1.4;
    margin-top: 4px;
    padding-top: 3px;
    border-top: 1px solid #888;
  }
  .header-yellow { background-color: #FFF9C4; border: 1px solid black; font-weight: bold; text-align: center; text-transform: uppercase; padding: 6px; margin-bottom: 0; font-size: 9pt; }
  .syllabus-table { width: 100%; border-collapse: collapse; table-layout: fixed; word-wrap: break-word; font-size: 8pt; }
  .syllabus-table td, .syllabus-table th { border: 1px solid black; padding: 4px; vertical-align: top; }
  .label-cell { background-color: #fcfcfc; font-weight: bold; text-align: center; font-size: 7pt; text-transform: uppercase; vertical-align: middle; }
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
        {$courseNameH}<br/>
        Outcomes-Based Course Syllabus
    </div>
    <table class="syllabus-table" style="table-layout:fixed;">
        <colgroup>
            <col style="width:12%;"/><col style="width:12%;"/>
            <col style="width:10%;"/><col style="width:38%;"/>
            <col style="width:12%;"/><col style="width:8%;"/>
            <col style="width:8%;"/>
        </colgroup>
        <tbody>
            <tr>
                <td class="label-cell">COURSE CODE</td>
                <td style="font-weight:bold;font-size:9pt;vertical-align:middle;">{$codeH}</td>
                <td class="label-cell">COURSE TITLE</td>
                <td style="font-weight:bold;font-size:9pt;vertical-align:middle;">{$titleH}</td>
                <td class="label-cell">COURSE CREDIT</td>
                <td colspan="2" style="text-align:center;font-size:9pt;vertical-align:middle;">{$credit}</td>
            </tr>
            <tr>
                <td class="label-cell">COURSE DESCRIPTION</td>
                <td colspan="6" style="font-size:9pt;text-align:justify;">{$description}</td>
            </tr>
            <tr>
                <td class="label-cell">PRE-REQUISITES</td>
                <td colspan="2" style="font-size:9pt;">{$preReq}</td>
                <td class="label-cell">CO-REQUISITES</td>
                <td colspan="3" style="font-size:9pt;">{$coReq}</td>
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
                <td style="font-size:9pt;text-align:justify;">{$visionH}</td>
            </tr>
            <tr>
                <td class="label-cell">MISSION</td>
                <td style="font-size:9pt;text-align:justify;">{$missionH}</td>
            </tr>
            <tr>
                <td class="label-cell">QUALITY POLICY STATEMENT</td>
                <td style="font-size:9pt;text-align:justify;">{$qualityH}</td>
            </tr>
            <tr>
                <td class="label-cell">INSTITUTIONAL LEARNING OUTCOMES (ILO)</td>
                <td style="font-size:9pt;">{$iloHtml}</td>
            </tr>
            {$collegeGoalsRow}
            {$programGoalsRow}
            {$programObjRow}
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
            <td style="border:1px solid black;width:5%;text-align:center;padding:4px;vertical-align:middle;font-size:7pt;font-weight:bold;">PROGRAM LEARNING OUTCOMES</td>
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
            <td style="border:1px solid black;width:5%;text-align:center;padding:4px;vertical-align:middle;font-size:7pt;font-weight:bold;">COURSE LEARNING OUTCOMES</td>
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
    <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:8.5pt;">
        <tr style="vertical-align:top;">
            <td style="border:1px solid black;padding:10px;width:60%;">
                <p style="font-weight:bold;font-size:9pt;text-transform:uppercase;text-decoration:underline;margin:0 0 8px;">COURSE REQUIREMENT/S with CLO links</p>
                <ul style="margin:0 0 0 18px;padding:0;">
                    {$reqItems}
                </ul>
            </td>
            <td style="border:1px solid black;padding:10px;width:40%;">
                <p style="font-weight:bold;font-size:9pt;text-transform:uppercase;text-decoration:underline;margin:0 0 8px;">GRADING SYSTEM</p>
                <table style="width:100%;border-collapse:collapse;">
                    {$gradingRows}
                    <tr>
                        <td style="padding:4px 4px 4px 0;font-size:10pt;font-weight:900;border-top:2px solid black;">TOTAL</td>
                        <td style="padding:4px 0 4px 4px;font-size:10pt;font-weight:900;border-top:2px solid black;text-align:right;white-space:nowrap;">100%</td>
                    </tr>
                </table>
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

    private function yellowBannerHtml(string $courseName = 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY'): string
    {
        $safe = htmlspecialchars(strtoupper($courseName), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return '<div class="header-yellow">' . $safe . '<br/>Outcomes-Based Course Syllabus</div>';
    }

    /**
     * Convert the rich-editor HTML (which uses position:absolute for images) into
     * a DomPDF-compatible table layout.
     *
     * The editor stores images like:
     *   <img data-hf-img="true" style="position:absolute;left:Xpx;top:Ypx;width:Wpx;height:Hpx;" src="...">
     *
     * We split images into "left" (left < 50% of a typical 1000px editor) and "right",
     * then build: [left-img | text content | right-img]
     * This renders correctly in DomPDF without any absolute positioning.
     */
    private function layoutHfHtml(string $html): string
    {
        if (empty(trim($html))) return '';

        // Parse with DOMDocument
        libxml_use_internal_errors(true);
        $dom = new \DOMDocument('1.0', 'UTF-8');
        // Wrap in a div so we have a root; use UTF-8 encoding hint
        $dom->loadHTML(
            '<?xml encoding="UTF-8"><div id="__hf__">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
        );
        libxml_clear_errors();

        $root = $dom->getElementById('__hf__');
        if (!$root) return '<div class="custom-hf">' . $html . '</div>';

        // Collect all <img data-hf-img> nodes with their left offset
        $leftImgs  = [];  // left < 40% of assumed 900px width → left < 360px
        $rightImgs = [];  // left >= 60% → right side
        $EDITOR_W  = 900; // approximate editor pixel width

        $imgNodes = $dom->getElementsByTagName('img');
        $toRemove = [];
        foreach ($imgNodes as $img) {
            if ($img->getAttribute('data-hf-img') !== 'true') continue;
            $style = $img->getAttribute('style');
            $leftPx = 0;
            $widthPx = 80; $heightPx = 60;
            if (preg_match('/left\s*:\s*([\d.]+)px/i', $style, $m)) $leftPx  = (float)$m[1];
            if (preg_match('/width\s*:\s*([\d.]+)px/i', $style, $m)) $widthPx  = (int)$m[1];
            if (preg_match('/height\s*:\s*([\d.]+)px/i', $style, $m)) $heightPx = (int)$m[1];
            $src = $img->getAttribute('src');
            // Cap to reasonable PDF header sizes
            $scale = min(1, 90 / max($heightPx, 1));
            $wFinal = max(20, (int)($widthPx  * $scale));
            $hFinal = max(10, (int)($heightPx * $scale));
            $imgHtml = "<img src=\"{$src}\" width=\"{$wFinal}\" height=\"{$hFinal}\" style=\"display:inline-block;vertical-align:middle;border:none;outline:none;\">";
            if ($leftPx < $EDITOR_W * 0.5) {
                $leftImgs[] = ['img' => $imgHtml, 'left' => $leftPx];
            } else {
                $rightImgs[] = ['img' => $imgHtml, 'left' => $leftPx];
            }
            $toRemove[] = $img;
        }

        // Remove img nodes from DOM so we can get clean text/html
        foreach ($toRemove as $node) {
            $node->parentNode?->removeChild($node);
        }

        // Get remaining text HTML (strip the wrapper div)
        $inner = '';
        foreach ($root->childNodes as $child) {
            $inner .= $dom->saveHTML($child);
        }
        // Strip the outer wrapper tags DOMDocument may have added
        $inner = preg_replace('/^<div[^>]*>|<\/div>$/i', '', trim($inner));
        $inner = trim($inner);
        // Remove empty <br> only lines
        $textOnly = trim(strip_tags($inner));

        // Sort images by left position
        usort($leftImgs,  fn($a,$b) => $a['left'] <=> $b['left']);
        usort($rightImgs, fn($a,$b) => $a['left'] <=> $b['left']);

        $leftHtml  = implode(' ', array_column($leftImgs,  'img'));
        $rightHtml = implode(' ', array_column($rightImgs, 'img'));

        // Build a 3-column table: left-img | center text | right-img
        $cols = '';
        if ($leftHtml || $textOnly || $rightHtml) {
            $leftCell  = $leftHtml  ? "<td style=\"padding:0 6px 0 0;vertical-align:middle;white-space:nowrap;width:1%;\">{$leftHtml}</td>"  : '';
            $rightCell = $rightHtml ? "<td style=\"padding:0 0 0 6px;vertical-align:middle;white-space:nowrap;width:1%;text-align:right;\">{$rightHtml}</td>" : '';
            $textCell  = "<td style=\"padding:0 4px;vertical-align:middle;font-size:8.5pt;\">" . ($inner ?: '&nbsp;') . "</td>";
            $cols = $leftCell . $textCell . $rightCell;
        }

        return $cols
            ? "<table style=\"width:100%;border-collapse:collapse;\"><tr>{$cols}</tr></table>"
            : ($inner ?: '');
    }

    private function renderHeaderHtml(string $header): string
    {
        if (empty(trim($header))) return '';
        $inner = $this->layoutHfHtml($header);
        if (empty(trim($inner))) return '';
        return '<div class="custom-header">' . $inner . '</div>';
    }

    private function renderFooterHtml(string $footer): string
    {
        if (empty(trim($footer))) return '';
        $inner = $this->layoutHfHtml($footer);
        if (empty(trim($inner))) return '';
        return '<div class="custom-footer">' . $inner . '</div>';
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