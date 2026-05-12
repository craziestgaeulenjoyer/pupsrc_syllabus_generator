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
        $vision      = $t($s($step1['vision']          ?? ''));
        $mission     = $t($s($step1['mission']         ?? ''));
        $quality     = $t($s($step1['quality_statement_policy'] ?? ''));
        $ilos        = $step1['ilos']                  ?? [];

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

        // Section = one A4 landscape page group
        $sectionStyle = [
            'pageSizeW'    => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(29.7),
            'pageSizeH'    => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(21.0),
            'orientation'  => 'landscape',
            'marginTop'    => Converter::cmToTwip(1.0),
            'marginBottom' => Converter::cmToTwip(1.0),
            'marginLeft'   => Converter::cmToTwip(1.2),
            'marginRight'  => Converter::cmToTwip(1.2),
        ];

        // ── Shared style constants ───────────────────────────────────────────
        // Page content width in twips: (29.7 - 1.8 - 1.8) cm = 26.1 cm
        $pageW   = \PhpOffice\PhpWord\Shared\Converter::cmToTwip(26.1);
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

        // ── Helper: add a custom header/footer strip — mirrors layoutHfHtml() in PDF ──
        // Parses the rich-editor HTML to extract left/right positioned images and
        // center text, then builds a 3-column DOCX table matching the PDF layout.
        $addHfTable = function (
            \PhpOffice\PhpWord\Element\Section $sec,
            string $html,
            bool $isFooter
        ) use ($pageW, $fntXSm) {

            if (trim($html) === '') return;

            // Parse HTML to extract images and remaining text
            libxml_use_internal_errors(true);
            $dom = new \DOMDocument('1.0', 'UTF-8');
            $dom->loadHTML(
                '<?xml encoding="UTF-8"><div id="__hf__">' . $html . '</div>',
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
            );
            libxml_clear_errors();

            $root      = $dom->getElementById('__hf__');
            $leftImgs  = [];
            $rightImgs = [];
            $EDITOR_W  = 900;
            $toRemove  = [];

            foreach ($dom->getElementsByTagName('img') as $img) {
                $style    = $img->getAttribute('style');
                $leftPx   = 0; $widthPx = 80; $heightPx = 60;
                if (preg_match('/left\s*:\s*([\d.]+)px/i',   $style, $m)) $leftPx   = (float)$m[1];
                if (preg_match('/width\s*:\s*([\d.]+)px/i',  $style, $m)) $widthPx  = (int)$m[1];
                if (preg_match('/height\s*:\s*([\d.]+)px/i', $style, $m)) $heightPx = (int)$m[1];
                $src = $img->getAttribute('src');
                if (empty($src)) { $toRemove[] = $img; continue; }
                $scale  = min(1.0, 90 / max($heightPx, 1));
                $wFinal = max(20, (int)($widthPx  * $scale));
                $hFinal = max(10, (int)($heightPx * $scale));
                $entry  = ['src' => $src, 'w' => $wFinal, 'h' => $hFinal, 'left' => $leftPx];
                if ($leftPx < $EDITOR_W * 0.5) { $leftImgs[]  = $entry; }
                else                            { $rightImgs[] = $entry; }
                $toRemove[] = $img;
            }
            foreach ($toRemove as $node) { $node->parentNode?->removeChild($node); }

            // Remaining text after image removal
            $inner = '';
            if ($root) { foreach ($root->childNodes as $child) { $inner .= $dom->saveHTML($child); } }
            $plainText = trim(strip_tags($inner));

            // Shared cell style (no noWrap so text can wrap)
            $bdrTop    = $isFooter ? 6 : 0;
            $bdrBottom = $isFooter ? 0 : 6;
            $shading   = ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => 'F8F8F8'];
            $cellBase  = [
                'borderTopSize'    => $bdrTop,    'borderTopColor'    => 'CCCCCC',
                'borderBottomSize' => $bdrBottom, 'borderBottomColor' => 'CCCCCC',
                'borderLeftSize'   => 0,          'borderLeftColor'   => 'FFFFFF',
                'borderRightSize'  => 0,          'borderRightColor'  => 'FFFFFF',
                'shading'          => $shading,
                'cellMargin'       => ['top' => 40, 'bottom' => 40, 'left' => 80, 'right' => 80],
                'valign'           => 'center',
                'noWrap'           => false,
            ];

            $hasLeft  = !empty($leftImgs);
            $hasRight = !empty($rightImgs);

            // Helper to add an image into a cell safely
            $addImgToCell = function ($cell, array $img) use ($fntXSm) {
                $src = $img['src'];
                try {
                    if (str_starts_with($src, 'data:')) {
                        $parts   = explode(',', $src, 2);
                        $tmpFile = tempnam(sys_get_temp_dir(), 'hfimg_') . '.png';
                        file_put_contents($tmpFile, base64_decode($parts[1] ?? ''));
                        $cell->addImage($tmpFile, ['width' => $img['w'], 'height' => $img['h'], 'wrappingStyle' => 'inline']);
                        @unlink($tmpFile);
                    } else {
                        $cell->addImage($src, ['width' => $img['w'], 'height' => $img['h'], 'wrappingStyle' => 'inline']);
                    }
                } catch (\Throwable $e) {
                    $cell->addText('[img]', $fntXSm);
                }
            };

            // No images — plain single-cell row
            if (!$hasLeft && !$hasRight) {
                $tbl = $sec->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
                $tbl->addRow();
                $tbl->addCell($pageW, $cellBase)->addText($plainText, $fntXSm);
                return;
            }

            // 3-column layout: [left-img | center text | right-img]
            $imgColW  = (int)($pageW * 0.15);
            $textColW = $pageW - ($hasLeft ? $imgColW : 0) - ($hasRight ? $imgColW : 0);

            $tbl = $sec->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
            $tbl->addRow();

            if ($hasLeft) {
                usort($leftImgs, fn($a, $b) => $a['left'] <=> $b['left']);
                $lCell = $tbl->addCell($imgColW, $cellBase);
                foreach ($leftImgs as $img) { $addImgToCell($lCell, $img); }
            }

            $cCell = $tbl->addCell($textColW, array_merge($cellBase, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]));
            if ($plainText !== '') { $cCell->addText($plainText, $fntXSm); }

            if ($hasRight) {
                usort($rightImgs, fn($a, $b) => $a['left'] <=> $b['left']);
                $rCell = $tbl->addCell($imgColW, array_merge($cellBase, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::RIGHT]));
                foreach ($rightImgs as $img) { $addImgToCell($rCell, $img); }
            }
        };

        // ════════════════════════════════════════════════════════════════════
        // PAGE 1 — Course Overview (Step 1 + Step 2 top section)
        // ════════════════════════════════════════════════════════════════════
        $sec1 = $phpWord->addSection($sectionStyle);

        // Custom header strip (matches PDF custom-header)
        $addHfTable($sec1, $header, false);

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
            'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY',
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

        // ILO row
        if (!empty($ilos)) {
            $mainTable->addRow(350);
            $mainTable->addCell($labelSpanW, array_merge($border, ['shading' => $bgHeaderCell, 'cellMargin' => $cellPad, 'valign' => 'center']))->addText('INSTITUTIONAL LEARNING OUTCOMES (ILO)', $fntLabel, $center);
            $iloCell = $mainTable->addCell($valueSpanW, array_merge($border, ['gridSpan' => 5, 'cellMargin' => $cellPad]));
            foreach ($ilos as $i => $ilo) {
                $iloText = ($i + 1) . '. ' . $t($s($ilo['title'] ?? ($ilo['text'] ?? '')));
                $iloCell->addText($iloText, $fntValue);
            }
        }

        // Custom footer strip
        $addHfTable($sec1, $footer, true);

        // ════════════════════════════════════════════════════════════════════
        // PAGE 2 — PLO/ILO + CLO/PLO Mapping (Step 2)
        // ════════════════════════════════════════════════════════════════════
        $sec2 = $phpWord->addSection($sectionStyle);

        $addHfTable($sec2, $header, false);

        // Banner (same dark style as Page 1)
        $bannerTable2 = $sec2->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
        $bannerTable2->addRow();
        $bannerCell2 = $bannerTable2->addCell($pageW, array_merge($border, [
            'shading'    => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => '365F91'],
            'cellMargin' => ['top' => 120, 'bottom' => 120, 'left' => 100, 'right' => 100],
            'valign'     => 'center',
        ]));
        $bannerCell2->addText('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY', ['name' => 'Arial Narrow', 'size' => 16, 'bold' => true, 'color' => 'FFFFFF'], $center);
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

        $addHfTable($sec2, $footer, true);

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

            $addHfTable($secO, $header, false);

            // Banner (same dark style as other pages)
            $obtlBanner = $secO->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
            $obtlBanner->addRow();
            $obtlBannerCell = $obtlBanner->addCell($pageW, array_merge($border, [
                'shading'    => ['val' => \PhpOffice\PhpWord\Style\Shading::PATTERN_CLEAR, 'color' => 'auto', 'fill' => '365F91'],
                'cellMargin' => ['top' => 120, 'bottom' => 120, 'left' => 100, 'right' => 100],
                'valign'     => 'center',
            ]));
            $obtlBannerCell->addText('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY', ['name' => 'Arial Narrow', 'size' => 16, 'bold' => true, 'color' => 'FFFFFF'], $center);
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

            $addHfTable($secO, $footer, true);
        }

        // ════════════════════════════════════════════════════════════════════
        // PAGE — Classroom Policies (Step 4)
        // ════════════════════════════════════════════════════════════════════
        $secP = $phpWord->addSection($sectionStyle);

        $addHfTable($secP, $header, false);

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

        $addHfTable($secP, $footer, true);

        // ════════════════════════════════════════════════════════════════════
        // PAGE — Course Requirements & Grading (Step 4 continued)
        // ════════════════════════════════════════════════════════════════════
        $secG = $phpWord->addSection($sectionStyle);

        $addHfTable($secG, $header, false);

        // Section banner matching PDF
        $addSectionBanner($secG, 'COURSE REQUIREMENTS & EVALUATION');

        $gradW1 = (int)($pageW * 0.60);
        $gradW2 = $pageW - $gradW1;
        $gradTable = $secG->addTable(['width' => $pageW, 'unit' => \PhpOffice\PhpWord\SimpleType\TblWidth::TWIP]);
        $gradTable->addRow();

        $reqCell  = $gradTable->addCell($gradW1, array_merge($border, ['cellMargin' => $cellPad]));
        $gradCell = $gradTable->addCell($gradW2, array_merge($border, ['cellMargin' => $cellPad]));

        $reqCell->addText('COURSE REQUIREMENTS', array_merge($fntNorm, ['bold' => true, 'underline' => \PhpOffice\PhpWord\Style\Font::UNDERLINE_SINGLE]));
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

        $addHfTable($secG, $footer, true);

        // ════════════════════════════════════════════════════════════════════
        // PAGES — Rubrics + Group Grade + Class Info + Signatories (Step 5)
        // ════════════════════════════════════════════════════════════════════
        $RUBRIC_PER_PAGE = 5;
        $rubricPages     = array_chunk($rubrics, $RUBRIC_PER_PAGE) ?: [[]];

        foreach ($rubricPages as $pageIdx => $pageRubrics) {
            $isFirst = $pageIdx === 0;

            $secR = $phpWord->addSection($sectionStyle);

            $addHfTable($secR, $header, false);

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

            $addHfTable($secR, $footer, true);
        }

        // ── Write & stream ───────────────────────────────────────────────────
        $tmpPath = tempnam(sys_get_temp_dir(), 'syllabus_') . '.docx';
        \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007')->save($tmpPath);

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
            <tr style=\"border-bottom:1px dotted #ccc;\">
                <td style=\"padding:4px 4px 4px 0;font-size:8.5pt;vertical-align:top;\">
                    <p style=\"font-weight:bold;margin:0;\">{$lbl}</p>" .
                    ($subs ? "<p style=\"font-size:7pt;color:#666;margin:0;\">{$subs}</p>" : '') . "
                </td>
                <td style=\"padding:4px 0 4px 4px;font-size:8.5pt;font-weight:bold;text-align:right;vertical-align:top;white-space:nowrap;\">{$pct}%</td>
            </tr>";
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
  .page { padding: 10px 18px; }
  .custom-header {
    font-size: 8.5pt;
    line-height: 1.4;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #888;
  }
  .custom-footer {
    font-size: 8.5pt;
    line-height: 1.4;
    margin-top: 6px;
    padding-top: 4px;
    border-top: 1px solid #888;
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

    private function yellowBannerHtml(): string
    {
        return '<div class="header-yellow">Bachelor of Science in Information Technology<br/>Outcomes-Based Course Syllabus</div>';
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