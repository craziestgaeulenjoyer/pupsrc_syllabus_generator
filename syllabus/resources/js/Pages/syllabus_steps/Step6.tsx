import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import Navbar from '../navbar_layouts/Navbar'; 
import { 
    ChevronLeft, ChevronRight, CheckCircle, FileText, 
    Download, FileJson, ShieldCheck, Info, Check,
    FileDown, X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link2, Image, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// ─── Rich Document Editor (Word-like toolbar, custom-built) ────────────────────

const FONTS = [
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Calibri, sans-serif', label: 'Calibri' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
];

const FONT_SIZES = ['8','9','10','11','12','14','16','18','20','24','28','32','36','40','48'];

const COLORS = [
    '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#ffffff',
    '#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#0000ff','#9900ff','#ff00ff',
    '#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#cfe2f3','#d9d2e9','#ead1dc',
    '#800000','#783f04','#7f6000','#274e13','#0c343d','#1c4587','#20124d','#4c1130',
];

// Tooltip wrapper
const Tip: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLDivElement>(null);

    const handleEnter = () => {
        if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
        }
        setShow(true);
    };

    return (
        <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ display: 'contents' }}>
            {children}
            {show && typeof document !== 'undefined' && (
                <div
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        transform: 'translateX(-50%)',
                        zIndex: 99999,
                        pointerEvents: 'none',
                        background: '#1e293b',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                >
                    {title}
                    <div style={{
                        position:'absolute', top:'-4px', left:'50%', transform:'translateX(-50%)',
                        width:0, height:0,
                        borderLeft:'4px solid transparent',
                        borderRight:'4px solid transparent',
                        borderBottom:'4px solid #1e293b',
                    }}/>
                </div>
            )}
        </div>
    );
};

// Generic fixed-position dropdown (never clipped by overflow:hidden)
interface FixedDropdownProps {
    trigger: React.ReactNode;
    children: React.ReactNode;
    tooltip: string;
}
const FixedDropdown: React.FC<FixedDropdownProps> = ({ trigger, children, tooltip }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const portalRef  = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            const t = e.target as Node;
            if (
                (triggerRef.current && triggerRef.current.contains(t)) ||
                (portalRef.current  && portalRef.current.contains(t))
            ) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    // Prevent any mousedown inside the portal from stealing focus from the editor
    const stopFocusSteal = (e: React.MouseEvent) => e.preventDefault();

    const handleTriggerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // don't blur the editor
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPos({ top: r.bottom + 2, left: r.left });
        setOpen(v => !v);
    };

    return (
        <>
            <Tip title={tooltip}>
                <button
                    ref={triggerRef}
                    type="button"
                    onMouseDown={handleTriggerMouseDown}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 h-7 min-w-[60px]"
                >
                    {trigger}
                    <ChevronDown size={10} className="text-slate-400 shrink-0" />
                </button>
            </Tip>
            {open && typeof document !== 'undefined' && (
                <div
                    ref={portalRef}
                    onMouseDown={stopFocusSteal}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        zIndex: 99998,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                        minWidth: '140px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        padding: '4px',
                    }}
                >
                    {children}
                </div>
            )}
        </>
    );
};

// Color picker dropdown
interface ColorDropdownProps {
    tooltip: string;
    icon: React.ReactNode;
    onSelect: (color: string) => void;
}
const ColorDropdown: React.FC<ColorDropdownProps> = ({ tooltip, icon, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const portalRef  = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            const t = e.target as Node;
            if (
                (triggerRef.current && triggerRef.current.contains(t)) ||
                (portalRef.current  && portalRef.current.contains(t))
            ) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const handleTriggerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // don't blur the editor
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPos({ top: r.bottom + 2, left: r.left });
        setOpen(v => !v);
    };

    return (
        <>
            <Tip title={tooltip}>
                <button
                    ref={triggerRef}
                    type="button"
                    onMouseDown={handleTriggerMouseDown}
                    className="flex items-center justify-center w-7 h-7 rounded text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200 bg-slate-100"
                >
                    {icon}
                </button>
            </Tip>
            {open && typeof document !== 'undefined' && (
                <div
                    ref={portalRef}
                    onMouseDown={e => e.preventDefault()}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        zIndex: 99998,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                        padding: '8px',
                        width: '176px',
                    }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => { onSelect(c); setOpen(false); }}
                                style={{
                                    background: c,
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '3px',
                                    border: c === '#ffffff' ? '1px solid #e2e8f0' : 'none',
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

// Toolbar button
const ToolBtn: React.FC<{ title: string; active?: boolean; onClick: () => void; children: React.ReactNode }> = ({ title, active, onClick, children }) => (
    <Tip title={title}>
        <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={onClick}
            className={`flex items-center justify-center w-7 h-7 rounded transition-colors border text-xs font-bold
                ${active ? 'bg-[#4B6333] text-white border-[#4B6333]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'}`}
        >
            {children}
        </button>
    </Tip>
);

interface RichDocEditorProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    onHeightChange?: (px: number) => void;
}

// ─── Body-level image resize/drag overlay ────────────────────────────────────
const IMG_HANDLE_ID = 'hf-img-resize-overlay';

function removeImgOverlay() {
    const existing = document.getElementById(IMG_HANDLE_ID) as any;
    if (existing) {
        if (existing._stopTracking) existing._stopTracking();
        existing.remove();
    }
}

function attachImgOverlay(
    img: HTMLImageElement,
    onCommit: () => void,
) {
    removeImgOverlay();

    const overlay = document.createElement('div') as any;
    overlay.id = IMG_HANDLE_ID;
    overlay.style.cssText = `position:fixed;z-index:99999;pointer-events:none;border:none;border-radius:3px;box-sizing:border-box;`;

    // ── Position overlay over the img ────────────────────────────────────────
    function positionOverlay() {
        const r = img.getBoundingClientRect();
        overlay.style.left   = r.left   + 'px';
        overlay.style.top    = r.top    + 'px';
        overlay.style.width  = r.width  + 'px';
        overlay.style.height = r.height + 'px';
    }
    positionOverlay();

    const rafId = { v: 0 };
    const track = () => { positionOverlay(); rafId.v = requestAnimationFrame(track); };
    rafId.v = requestAnimationFrame(track);
    overlay._stopTracking = () => cancelAnimationFrame(rafId.v);

    // ── Resize handles ───────────────────────────────────────────────────────
    const HANDLES = [
        { id:'nw', cursor:'nw-resize', top:'-5px',            left:'-5px'            },
        { id:'n',  cursor:'n-resize',  top:'-5px',            left:'calc(50% - 5px)' },
        { id:'ne', cursor:'ne-resize', top:'-5px',            right:'-5px'           },
        { id:'e',  cursor:'e-resize',  top:'calc(50% - 5px)', right:'-5px'           },
        { id:'se', cursor:'se-resize', bottom:'-5px',         right:'-5px'           },
        { id:'s',  cursor:'s-resize',  bottom:'-5px',         left:'calc(50% - 5px)' },
        { id:'sw', cursor:'sw-resize', bottom:'-5px',         left:'-5px'            },
        { id:'w',  cursor:'w-resize',  top:'calc(50% - 5px)', left:'-5px'            },
    ] as const;

    HANDLES.forEach(c => {
        const h = document.createElement('div');
        const pos = Object.entries(c)
            .filter(([k]) => ['top','bottom','left','right'].includes(k))
            .map(([k, v]) => `${k}:${v}`)
            .join(';');
        h.style.cssText = `position:absolute;width:10px;height:10px;background:#4B6333;border:2px solid white;border-radius:2px;cursor:${c.cursor};pointer-events:auto;box-sizing:border-box;${pos};`;
        h.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault(); e.stopPropagation();
            overlay._stopTracking();
            const corner = c.id;
            const sx = e.clientX, sy = e.clientY;
            const sw = img.offsetWidth  || img.naturalWidth;
            const sh = img.offsetHeight || img.naturalHeight;
            const MIN = 20, MAX = 800;
            const onMove = (ev: MouseEvent) => {
                const dx = ev.clientX - sx, dy = ev.clientY - sy;
                let nw = sw, nh = sh;
                if (corner.includes('e')) nw = Math.max(MIN, Math.min(MAX, sw + dx));
                if (corner.includes('w')) nw = Math.max(MIN, Math.min(MAX, sw - dx));
                if (corner.includes('s')) nh = Math.max(MIN, Math.min(MAX, sh + dy));
                if (corner.includes('n')) nh = Math.max(MIN, Math.min(MAX, sh - dy));
                img.style.width  = nw + 'px';
                img.style.height = nh + 'px';
                positionOverlay();
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup',   onUp);
                onCommit();
                // restart tracking
                rafId.v = requestAnimationFrame(track);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup',   onUp);
        });
        overlay.appendChild(h);
    });

    // ── ✥ Move handle — drags the img's left/top within the editor ───────────
    const moveHandle = document.createElement('div');
    moveHandle.title = 'Drag to reposition';
    moveHandle.textContent = '✥';
    moveHandle.style.cssText = `
        position:absolute;top:-16px;left:50%;transform:translateX(-50%);
        width:20px;height:20px;line-height:20px;text-align:center;
        background:#4B6333;color:white;border-radius:50%;
        font-size:13px;font-weight:bold;cursor:grab;pointer-events:auto;user-select:none;
    `;

    moveHandle.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        moveHandle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        overlay._stopTracking();

        const editor = img.offsetParent as HTMLElement | null; // the position:relative editor div
        if (!editor) return;

        const startImgLeft = parseInt(img.style.left || '0', 10);
        const startImgTop  = parseInt(img.style.top  || '0', 10);
        const startMx = e.clientX;
        const startMy = e.clientY;

        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startMx;
            const dy = ev.clientY - startMy;
            img.style.left = (startImgLeft + dx) + 'px';
            img.style.top  = (startImgTop  + dy) + 'px';
            positionOverlay();
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
            moveHandle.style.cursor = 'grab';
            document.body.style.userSelect = '';
            onCommit();
            // restart tracking
            rafId.v = requestAnimationFrame(track);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    });
    overlay.appendChild(moveHandle);

    document.body.appendChild(overlay);
}

const RichDocEditor: React.FC<RichDocEditorProps> = ({ label, value, onChange, placeholder, onHeightChange }) => {
    const editorRef      = useRef<HTMLDivElement>(null);
    const fileInputRef   = useRef<HTMLInputElement>(null);
    const selectedImgRef = useRef<HTMLImageElement | null>(null);
    const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
    const [currentFont, setCurrentFont] = useState('Times New Roman, serif');
    const [currentSize, setCurrentSize] = useState('12');

    // Report editor height after mount so the preview can match it exactly
    useEffect(() => {
        if (!editorRef.current || !onHeightChange) return;
        const h = editorRef.current.offsetHeight;
        if (h > 0) onHeightChange(h);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Persist the last known selection ─────────────────────────────────────
    const savedSelRef = useRef<Range | null>(null);

    const saveSelection = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            // Only save if the range is inside our editor
            if (editorRef.current?.contains(range.commonAncestorContainer)) {
                savedSelRef.current = range.cloneRange();
            }
        }
    }, []);

    const restoreSelection = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const saved = savedSelRef.current;
        if (!saved) return;
        try {
            const sel = window.getSelection();
            if (!sel) return;
            sel.removeAllRanges();
            sel.addRange(saved.cloneRange());
        } catch (_) { /* range may have gone stale */ }
    }, []);

    // Track focus state — stays true even while toolbar dropdowns are open
    // because those use onMouseDown preventDefault (no focus change)
    const isFocusedRef = useRef(false);
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        const onFocusIn  = () => { isFocusedRef.current = true; };
        const onFocusOut = (e: FocusEvent) => {
            // Don't mark unfocused if focus moved to a toolbar portal element
            // (those use onMouseDown preventDefault so focus never actually leaves,
            //  but add this guard just in case)
            const overlay = document.getElementById(IMG_HANDLE_ID);
            if (overlay && overlay.contains(e.relatedTarget as Node)) return;
            isFocusedRef.current = false;
        };
        // Save selection on every mouseup inside the editor (catches click-drag selections)
        const onMouseUp = () => { if (isFocusedRef.current) saveSelection(); };
        el.addEventListener('focusin',  onFocusIn);
        el.addEventListener('focusout', onFocusOut as EventListener);
        el.addEventListener('mouseup',  onMouseUp);
        return () => {
            el.removeEventListener('focusin',  onFocusIn);
            el.removeEventListener('focusout', onFocusOut as EventListener);
            el.removeEventListener('mouseup',  onMouseUp);
        };
    }, [saveSelection]);

    useEffect(() => {
        const onSelChange = () => {
            if (!isFocusedRef.current) return;
            saveSelection();
            setActiveFormats({
                bold:          document.queryCommandState('bold'),
                italic:        document.queryCommandState('italic'),
                underline:     document.queryCommandState('underline'),
                justifyLeft:   document.queryCommandState('justifyLeft'),
                justifyCenter: document.queryCommandState('justifyCenter'),
                justifyRight:  document.queryCommandState('justifyRight'),
                justifyFull:   document.queryCommandState('justifyFull'),
            });
            // Read font-size from the anchor node's computed style
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
                while (node && node !== editorRef.current) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const fs = (node as HTMLElement).style?.fontSize;
                        if (fs) {
                            const px = parseFloat(fs);
                            if (!isNaN(px)) { setCurrentSize(String(Math.round(px))); break; }
                        }
                    }
                    node = node.parentNode;
                }
            }
        };
        document.addEventListener('selectionchange', onSelChange);
        return () => document.removeEventListener('selectionchange', onSelChange);
    }, [saveSelection]);

    // ── Execute a document command, always restoring the saved selection first ─
    const exec = useCallback((cmd: string, val?: string) => {
        const el = editorRef.current;
        if (!el) return;
        restoreSelection();
        if (cmd === 'foreColor' || cmd === 'hiliteColor') {
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand(cmd === 'hiliteColor' ? 'backColor' : 'foreColor', false, val);
            document.execCommand('styleWithCSS', false, 'false');
        } else {
            document.execCommand(cmd, false, val);
        }
        onChange(el.innerHTML || '');
        // Re-save selection after command (selection may have shifted)
        requestAnimationFrame(saveSelection);
    }, [restoreSelection, saveSelection, onChange]);

    const handleInput = () => {
        onChange(editorRef.current?.innerHTML || '');
    };

    // ── Editor height is fixed — this is a no-op kept for call-site compatibility ──
    const updateEditorMinHeight = useCallback(() => {
        // Height is locked via CSS; do nothing.
    }, []);

    // Sync innerHTML when value changes externally (initial load)
    const lastVal = useRef('');
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        el.style.direction = 'ltr';
        el.style.textAlign = 'left';
        el.setAttribute('dir', 'ltr');
        if (value !== lastVal.current) {
            lastVal.current = value;
            // Only update DOM if content actually differs (avoid caret jumps while typing)
            if (el.innerHTML !== value) {
                el.innerHTML = value;
            }
            // After content loads, recalculate min-height for any saved images
            requestAnimationFrame(() => updateEditorMinHeight());
        }
    }, [value, updateEditorMinHeight]);

    // ── Image upload ─────────────────────────────────────────────────────────
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    const insertImage = () => { fileInputRef.current?.click(); };

    const onImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) { alert('Image is too large (max 5 MB).'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const tmp = document.createElement('img');
            tmp.onload = () => {
                let w = tmp.naturalWidth, h = tmp.naturalHeight;
                // Scale to a reasonable default size
                const MAX_W = 180, MAX_H = 100;
                const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
                w = Math.round(w * ratio); h = Math.round(h * ratio);

                const el = editorRef.current;
                if (!el) return;

                // Position image absolutely within the editor (which is position:relative).
                // Default placement: top-left with a small offset so it's clearly visible.
                const img = document.createElement('img');
                img.src = src;
                img.dataset.hfImg = 'true';
                img.draggable = false;
                img.style.cssText =
                    `position:absolute;left:8px;top:8px;` +
                    `width:${w}px;height:${h}px;` +
                    `cursor:default;outline:none;border-radius:3px;` +
                    `z-index:5;-webkit-user-drag:none;`;

                el.appendChild(img);
                onChange(el.innerHTML);
                // Let the browser paint the image, then measure and expand editor
                requestAnimationFrame(() => updateEditorMinHeight());
            };
            tmp.src = src;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── Image selection: click to select, Backspace/Delete to remove ─────────
    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;

        const deselect = () => {
            if (selectedImgRef.current) {
                selectedImgRef.current.style.outline = 'none';
                selectedImgRef.current = null;
            }
            removeImgOverlay();
        };

        const onMouseDown = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (t.tagName === 'IMG' && (t as HTMLImageElement).dataset.hfImg === 'true') {
                deselect();
                const img = t as HTMLImageElement;
                selectedImgRef.current = img;
                img.style.outline = '2px dashed #4B6333';
                attachImgOverlay(
                    img,
                    () => {
                        onChange(el.innerHTML);
                        updateEditorMinHeight();
                    },
                );
            } else {
                deselect();
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedImgRef.current) {
                e.preventDefault();
                selectedImgRef.current.remove();
                selectedImgRef.current = null;
                removeImgOverlay();
                onChange(el.innerHTML);
            }
        };

        // Deselect when editor loses focus (but not to the overlay handles)
        const onBlur = (e: FocusEvent) => {
            const overlay = document.getElementById(IMG_HANDLE_ID);
            if (overlay && overlay.contains(e.relatedTarget as Node)) return;
            deselect();
        };

        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('keydown',   onKeyDown);
        el.addEventListener('blur',      onBlur as EventListener, true);

        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            el.removeEventListener('keydown',   onKeyDown);
            el.removeEventListener('blur',      onBlur as EventListener, true);
            removeImgOverlay();
        };
    }, [onChange]);

    // ── Link modal state ──────────────────────────────────────────────────────
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');
    const [linkText, setLinkText] = useState('');
    const savedRangeRef = useRef<Range | null>(null);

    const insertLink = () => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
            setLinkText(sel.toString() || '');
        } else {
            savedRangeRef.current = null;
            setLinkText('');
        }
        setLinkUrl('https://');
        setLinkModalOpen(true);
    };

    const confirmInsertLink = () => {
        const el = editorRef.current;
        if (!el || !linkUrl.trim()) { setLinkModalOpen(false); return; }
        el.focus();
        const sel = window.getSelection();
        sel?.removeAllRanges();
        if (savedRangeRef.current) sel?.addRange(savedRangeRef.current);
        const url = linkUrl.trim();
        if (linkText.trim()) {
            const a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = linkText.trim();
            const range = savedRangeRef.current;
            if (range) {
                range.deleteContents();
                range.insertNode(a);
                const after = document.createRange();
                after.setStartAfter(a); after.collapse(true);
                sel?.removeAllRanges(); sel?.addRange(after);
            } else { el.appendChild(a); }
        } else {
            document.execCommand('createLink', false, url);
            el.querySelectorAll(`a[href="${url}"]`).forEach(a => {
                (a as HTMLAnchorElement).target = '_blank';
                (a as HTMLAnchorElement).rel = 'noopener noreferrer';
            });
        }
        onChange(el.innerHTML);
        setLinkModalOpen(false);
    };

    // ── Font size ─────────────────────────────────────────────────────────────
    const applyFontSize = useCallback((px: string) => {
        const el = editorRef.current;
        if (!el) return;
        restoreSelection();
        const sel = window.getSelection();
        if (!sel) return;

        // If nothing is selected or selection is outside the editor, put caret at end
        if (sel.rangeCount === 0 || !el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        const range = sel.getRangeAt(0);

        if (range.collapsed) {
            // No selection: insert a zero-width marker span; next typed chars inherit the size
            const span = document.createElement('span');
            span.style.fontSize = px + 'px';
            span.appendChild(document.createTextNode('\u200B'));
            range.insertNode(span);
            // Place caret after the zero-width char
            const newRange = document.createRange();
            newRange.setStartAfter(span);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            savedSelRef.current = newRange.cloneRange();
        } else {
            // Extract selected content, strip existing font-size from top-level spans,
            // re-wrap everything in a single new span with the chosen size
            const frag = range.extractContents();
            // Flatten nested font-size so they don't fight the outer span
            const flattenSize = (node: Node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const e2 = node as HTMLElement;
                    if (e2.style?.fontSize) e2.style.fontSize = '';
                    e2.childNodes.forEach(flattenSize);
                }
            };
            flattenSize(frag);
            const span = document.createElement('span');
            span.style.fontSize = px + 'px';
            span.appendChild(frag);
            range.insertNode(span);
            // Re-select the span contents so the user can see what changed
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(newRange);
            savedSelRef.current = newRange.cloneRange();
        }

        setCurrentSize(px);
        onChange(el.innerHTML);
    }, [restoreSelection, onChange]);

    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {label}
            </label>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-[#F1F5F9] border border-slate-200 rounded-t-xl border-b-slate-200">

                {/* Font family */}
                <FixedDropdown
                    tooltip="Font Family"
                    trigger={<span className="truncate max-w-[80px] text-[11px]">{FONTS.find(f=>f.value===currentFont)?.label ?? 'Font'}</span>}
                >
                    {FONTS.map(f => (
                        <button
                            key={f.value}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setCurrentFont(f.value); exec('fontName', f.value); }}
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 rounded"
                            style={{ fontFamily: f.value }}
                        >
                            {f.label}
                        </button>
                    ))}
                </FixedDropdown>

                {/* Font size */}
                <FixedDropdown
                    tooltip="Font Size"
                    trigger={<span className="text-[11px] w-6 text-center">{currentSize}</span>}
                >
                    {FONT_SIZES.map(s => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setCurrentSize(s); applyFontSize(s); }}
                            className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-100 rounded"
                        >
                            {s}
                        </button>
                    ))}
                </FixedDropdown>

                <div className="w-px h-5 bg-slate-300 mx-0.5" />

                {/* Bold, Italic, Underline */}
                <ToolBtn title="Bold (Ctrl+B)" active={activeFormats.bold} onClick={() => exec('bold')}><span className="font-black text-sm">B</span></ToolBtn>
                <ToolBtn title="Italic (Ctrl+I)" active={activeFormats.italic} onClick={() => exec('italic')}><span className="italic text-sm">I</span></ToolBtn>
                <ToolBtn title="Underline (Ctrl+U)" active={activeFormats.underline} onClick={() => exec('underline')}><span className="underline text-sm">U</span></ToolBtn>

                <div className="w-px h-5 bg-slate-300 mx-0.5" />

                {/* Text Color */}
                <ColorDropdown
                    tooltip="Text Color"
                    icon={<span className="text-xs font-black" style={{borderBottom:'2px solid #800000'}}>A</span>}
                    onSelect={c => exec('foreColor', c)}
                />
                {/* Highlight */}
                <ColorDropdown
                    tooltip="Highlight Color"
                    icon={<span className="text-xs font-black" style={{background:'#ffff00', padding:'0 2px', borderRadius:2}}>H</span>}
                    onSelect={c => exec('hiliteColor', c)}
                />

                <div className="w-px h-5 bg-slate-300 mx-0.5" />

                {/* Alignment */}
                <ToolBtn title="Align Left" active={activeFormats.justifyLeft} onClick={() => exec('justifyLeft')}>
                    <AlignLeft size={13}/>
                </ToolBtn>
                <ToolBtn title="Align Center" active={activeFormats.justifyCenter} onClick={() => exec('justifyCenter')}>
                    <AlignCenter size={13}/>
                </ToolBtn>
                <ToolBtn title="Align Right" active={activeFormats.justifyRight} onClick={() => exec('justifyRight')}>
                    <AlignRight size={13}/>
                </ToolBtn>
                <ToolBtn title="Justify" active={activeFormats.justifyFull} onClick={() => exec('justifyFull')}>
                    <AlignJustify size={13}/>
                </ToolBtn>

                <div className="w-px h-5 bg-slate-300 mx-0.5" />

                {/* Indent */}
                <ToolBtn title="Decrease Indent" onClick={() => exec('outdent')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/><polyline points="7 9 3 12 7 15"/></svg>
                </ToolBtn>
                <ToolBtn title="Increase Indent" onClick={() => exec('indent')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="17 9 21 12 17 15"/></svg>
                </ToolBtn>

                <div className="w-px h-5 bg-slate-300 mx-0.5" />

                {/* Link */}
                <ToolBtn title="Insert Link" onClick={insertLink}>
                    <Link2 size={13}/>
                </ToolBtn>

                {/* Image */}
                <ToolBtn title="Insert Image" onClick={insertImage}>
                    <Image size={13}/>
                </ToolBtn>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageFile} />
            </div>

            {/* Content area — fixed height; images are freely dragged inside.
                Enter key is suppressed so the user cannot expand the box height. */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                    handleInput();
                    updateEditorMinHeight();
                }}
                onKeyDown={(e) => {
                    // Block Enter so height stays fixed
                    if (e.key === 'Enter') {
                        e.preventDefault();
                    }
                }}
                data-placeholder={placeholder}
                dir="ltr"
                className="px-4 py-3 border border-slate-200 border-t-0 rounded-b-xl bg-white text-sm outline-none focus:ring-2 focus:ring-[#4B6333]/30 transition-all overflow-hidden"
                style={{
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    position: 'relative',
                    direction: 'ltr',
                    textAlign: 'left',
                    unicodeBidi: 'plaintext',
                    whiteSpace: 'pre-wrap',
                    height: '110px',
                    minHeight: '110px',
                    maxHeight: '110px',
                }}
            />

            {/* Link Modal */}
            {linkModalOpen && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 100000,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseDown={e => { if (e.target === e.currentTarget) setLinkModalOpen(false); }}
                >
                    <div style={{
                        background: 'white', borderRadius: '14px', padding: '24px 28px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', minWidth: '340px', maxWidth: '90vw',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>Insert Link</span>
                            <button
                                type="button"
                                onClick={() => setLinkModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Display Text (optional)
                                </label>
                                <input
                                    type="text"
                                    value={linkText}
                                    onChange={e => setLinkText(e.target.value)}
                                    placeholder="Link label (leave blank to use selection)"
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                                        border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={e => (e.target.style.borderColor = '#4B6333')}
                                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    URL <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    autoFocus
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                                        border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={e => (e.target.style.borderColor = '#4B6333')}
                                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                    onKeyDown={e => { if (e.key === 'Enter') confirmInsertLink(); if (e.key === 'Escape') setLinkModalOpen(false); }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setLinkModalOpen(false)}
                                style={{
                                    padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
                                    background: 'white', color: '#64748b', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmInsertLink}
                                disabled={!linkUrl.trim() || linkUrl === 'https://'}
                                style={{
                                    padding: '8px 22px', borderRadius: '8px', border: 'none',
                                    background: '#4B6333', color: 'white', fontWeight: 700, fontSize: '13px',
                                    cursor: !linkUrl.trim() || linkUrl === 'https://' ? 'not-allowed' : 'pointer',
                                    opacity: !linkUrl.trim() || linkUrl === 'https://' ? 0.5 : 1,
                                }}
                            >
                                Insert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Step6 = ({ allSyllabusData }: { allSyllabusData: any }) => {
    // ── Inertia props (present only in edit mode) ─────────────────────────────
    const { props } = usePage<{
        isEditMode?:   boolean;
        syllabusHash?: string;
        sessionId?:    string;
        step1?: Record<string, any>;
        step2?: Record<string, any>;
        step3?: Record<string, any>;
        step4?: Record<string, any>;
        step5?: Record<string, any>;
        step6?: Record<string, any>;
    }>();

    const isEditMode   = props.isEditMode   ?? false;
    const syllabusHash = props.syllabusHash ?? null;

    const [isGenerating, setIsGenerating] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf');
    const [fileName, setFileName] = useState('INTE_30063_Syllabus');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [finalSyllabusData, setFinalSyllabusData] = useState<any>({});
    const [sessionId, setSessionId] = useState<string | null>(null); 

    const [courseName, setCourseName] = useState('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY');
    const [headerContent, setHeaderContent] = useState('');
    const [footerContent, setFooterContent] = useState('');
    const [headerError, setHeaderError] = useState(false);
    const [footerError, setFooterError] = useState(false);
    // Track the pixel height of each editor so the preview pages use the same height
    const [headerEditorHeight, setHeaderEditorHeight] = useState(110);
    const [footerEditorHeight, setFooterEditorHeight] = useState(110);
    
    const checklistOptions = [
        "Institutional and course headers verified",
        "All learning outcomes properly mapped",
        "Instructional plan covers all 18 weeks",
        "Grading components total to 100%",
        "Signatories and faculty details encoded"
    ];
    const [checkedItems, setCheckedItems] = useState<number[]>([]);

    const progressPercentage = (checkedItems.length / checklistOptions.length) * 100;

    const toggleCheck = (index: number) => {
        if (checkedItems.includes(index)) {
            setCheckedItems(checkedItems.filter(i => i !== index));
        } else {
            setCheckedItems([...checkedItems, index]);
        }
    };

    // ─── Build clean, fully structured payload from all steps ──────────────
    const buildFullPayload = () => {
        const id = sessionIdRef.current;
        if (!id) return null;
        const safeparse = (key: string) => {
            try { return JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { return {}; }
        };
        const s1 = safeparse(`syllabus_step1_${id}`);
        const s2 = safeparse(`syllabus_step2_${id}`);
        const s3 = safeparse(`syllabus_step3_${id}`);
        const s4 = safeparse(`syllabus_step4_${id}`);
        const s5 = safeparse(`syllabus_step5_${id}`);

        // Always read header/footer from their dedicated sessionStorage keys
        // (these are written by the onChange handlers in real time)
        const curHeader   = sessionStorage.getItem(`syllabus_header_${id}`) ?? headerRef.current ?? '';
        const curFooter   = sessionStorage.getItem(`syllabus_footer_${id}`) ?? footerRef.current ?? '';
        const curFormat   = exportFormatRef.current;
        const curFileName = fileNameRef.current;
        const curCourseName = courseNameRef.current;

        // Also persist step6 so DB gets the latest
        if (hasLoadedRef.current) {
            sessionStorage.setItem(`syllabus_step6_${id}`, JSON.stringify({
                exportFormat: curFormat,
                fileName:     curFileName,
                courseName:   curCourseName,
                header:       curHeader,
                footer:       curFooter,
            }));
        }

        const step6Data = {
            exportFormat: curFormat,
            fileName:     curFileName,
            courseName:   curCourseName,
            header:       curHeader,
            footer:       curFooter,
        };

        return {
            syllabus_session_id: id,          // matches controller validation key
            ...(isEditMode && syllabusHash ? { edit_hash: syllabusHash } : {}),
            course_code:  s1.course_code  || '',
            course_title: s1.course_title || '',

            // Each step's raw data (for DB columns)
            step1: s1,
            step2: s2,
            step3: s3,
            step4: s4,
            step5: s5,
            // step6 column — header & footer so they persist in DB
            step6: step6Data,

            // Expanded flat final_data for PDF/DOCX generation
            final_data: {
                // Step 1
                course_code:        s1.course_code        || '',
                course_title:       s1.course_title       || '',
                course_credit:      s1.course_credit      ?? '',
                course_description: s1.course_description || '',
                pre_requisites:     s1.pre_requisites     || 'None',
                co_requisites:      s1.co_requisites      || 'None',

                // Step 2
                plos:       s2.plos       || [],
                clos:       s2.clos       || [],
                iloMapping: s2.iloMapping || {},
                ploMapping: s2.ploMapping || {},

                // Step 3
                obtlData:        s3.obtlData        || [],
                references:      s3.references      || [],
                otherReferences: s3.otherReferences || [],

                // Step 4
                gradingComponents: s4.gradingComponents || [],
                requirements:      s4.requirements      || [],
                f2fLink:           s4.f2fLink           || '',

                // Step 5
                classInfo:     s5.classInfo     || {},
                facultyInfo:   s5.facultyInfo   || {},
                rubrics:       s5.rubrics       || [],
                groupCriteria: s5.groupCriteria || [],
                signatories:   s5.signatories   || [],

                // Step 6 — header/footer + export options
                format:     curFormat,
                customName: curFileName,
                courseName: curCourseName,
                header:     curHeader,
                footer:     curFooter,
            }
        };
    };

    // ── Google Drive upload helper ────────────────────────────────────────────
    // Uploads a DOCX blob to the user's Google Drive and opens it in Google Docs
    // for editing. Uses the Google Drive REST API with a popup OAuth flow.
    // No server-side OAuth or publicly-accessible URL needed.
    // Helper: encode a string to UTF-8 bytes
    const encodeText = (str: string): Uint8Array<ArrayBuffer> => {
        const encoded = new TextEncoder().encode(str);
        // TextEncoder.encode() returns Uint8Array<ArrayBufferLike> in newer TS lib types.
        // Copying into a fresh ArrayBuffer-backed Uint8Array satisfies the stricter
        // BlobPart constraint (Uint8Array<ArrayBuffer>) without any unsafe casts.
        const buf = new ArrayBuffer(encoded.byteLength);
        new Uint8Array(buf).set(encoded);
        return new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
    };

    // Helper: concatenate multiple Uint8Arrays into one
    const concatBuffers = (...parts: Uint8Array[]): Uint8Array => {
        const total = parts.reduce((n, p) => n + p.byteLength, 0);
        const out   = new Uint8Array(total);
        let offset  = 0;
        for (const p of parts) { out.set(p, offset); offset += p.byteLength; }
        return out;
    };

    const uploadToGoogleDocs = async (base64: string, fileName: string): Promise<void> => {
        // ── Step 1: Decode base64 → raw bytes ────────────────────────────────
        const binaryStr = atob(base64);
        const bytes     = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        // Sanity-check: DOCX is a ZIP — must start with PK\x03\x04
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
            throw new Error('Server returned an invalid DOCX (bad magic bytes). Check PHP logs.');
        }
        console.log('[GDocs] DOCX valid, size:', bytes.byteLength);

        // ── Step 2: Client-ID guard ───────────────────────────────────────────
        const GOOGLE_CLIENT_ID = (window as any).GOOGLE_DOCS_CLIENT_ID ?? '';
        if (!GOOGLE_CLIENT_ID) {
            alert('Google Docs export requires GOOGLE_DOCS_CLIENT_ID.\nCheck your .env and app.blade.php.');
            return;
        }

        // ── Step 3: OAuth popup ───────────────────────────────────────────────
        const token = await new Promise<string>((resolve, reject) => {
            const redirectUri = `${window.location.origin}/google-oauth-callback`;
            const scope       = 'https://www.googleapis.com/auth/drive.file';
            // prompt=select_account forces the user to explicitly pick an account.
            // That chosen account becomes authuser=0 in the newly-opened Docs tab,
            // which is what we pass in the open URL below.  Using prompt=consent
            // can silently re-use a cached session that doesn't match the browser's
            // active Google account, causing "File could not open" in Docs.
            const authUrl     =
                `https://accounts.google.com/o/oauth2/v2/auth` +
                `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&response_type=token` +
                `&scope=${encodeURIComponent(scope)}` +
                `&prompt=select_account`;

            const popup = window.open(authUrl, 'googleOAuth', 'width=500,height=600,left=300,top=100');
            if (!popup) { reject(new Error('Popup blocked — please allow popups for this site.')); return; }

            const handler = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'GOOGLE_OAUTH_TOKEN') {
                    window.removeEventListener('message', handler);
                    clearInterval(timer);
                    resolve(event.data.token);
                } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
                    window.removeEventListener('message', handler);
                    clearInterval(timer);
                    reject(new Error(event.data.error || 'Google sign-in failed.'));
                }
            };
            window.addEventListener('message', handler);

            let closedAt: number | null = null;
            const timer = setInterval(() => {
                // Under a strict COOP policy the browser blocks popup.closed reads
                // with a SecurityError once the popup navigates cross-origin.
                // Treat that error as "popup is closed" so we don't loop forever.
                let isClosed = false;
                try { isClosed = popup.closed; } catch { isClosed = true; }
                if (!isClosed) { closedAt = null; return; }
                if (closedAt === null) { closedAt = Date.now(); return; }
                if (Date.now() - closedAt > 1500) {
                    clearInterval(timer);
                    window.removeEventListener('message', handler);
                    reject(new Error('Sign-in window closed before completing.'));
                }
            }, 500);
        });

        // ── Step 4: Validate token ────────────────────────────────────────────
        const tokenInfo = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`
        );
        if (!tokenInfo.ok) {
            const info = await tokenInfo.json().catch(() => ({}));
            throw new Error(
                `OAuth token invalid/expired.\n` +
                `Details: ${info?.error_description ?? info?.error ?? 'unknown'}\n\n` +
                `Ensure your OAuth client type is "Web application" and\n` +
                `${window.location.origin}/google-oauth-callback is an Authorized redirect URI.`
            );
        }
        const tokenData = await tokenInfo.json();
        if (tokenData.aud && tokenData.aud !== GOOGLE_CLIENT_ID) {
            throw new Error(`Token client ID mismatch.\nExpected: ${GOOGLE_CLIENT_ID}\nGot: ${tokenData.aud}`);
        }
        if (!(tokenData.scope ?? '').includes('drive')) {
            throw new Error(`Token missing drive scope.\nGranted: ${tokenData.scope}\n\nEnable Google Drive API in Cloud Console.`);
        }

        // ── Step 5: Upload DOCX with server-side conversion to a native Google Doc ──
        //
        // Setting mimeType:'application/vnd.google-apps.document' in the multipart
        // metadata tells the Drive v3 API to convert the DOCX and store it as a
        // native Google Doc on ingestion.  No extra query param is required — the
        // mimeType field alone is what triggers conversion in Drive v3.
        //
        // Opening the result via docs.google.com/document/d/{id}/edit (the real
        // Docs editor URL) avoids the "File could not open" error that occurred
        // with the old drive.google.com/file/d/{id}/view viewer URL.
        //
        // Binary integrity: assemble the multipart body with Blob concatenation.
        // Never pass the binary `bytes` through TextEncoder — it corrupts bytes > 0x7F.
        // p1 / p2h / p2c are ASCII-only so TextEncoder is safe for those parts only.
        //
        const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const GDOC_MIME = 'application/vnd.google-apps.document';
        const docName   = fileName.replace(/\.docx$/i, '');
        const boundary  = `gdocs_${Date.now()}`;

        // mimeType in metadata is all Drive v3 needs to trigger DOCX → Google Doc conversion.
        const meta = JSON.stringify({ name: docName, mimeType: GDOC_MIME });

        const enc = new TextEncoder();
        const p1  = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`);
        const p2h = enc.encode(`--${boundary}\r\nContent-Type: ${DOCX_MIME}\r\n\r\n`);
        const p2c = enc.encode(`\r\n--${boundary}--\r\n`);

        // Blob concat keeps binary bytes byte-for-byte intact.
        const bodyBlob = new Blob([p1, p2h, bytes, p2c]);

        console.log('[GDocs] Uploading multipart body, total bytes:', bodyBlob.size);

        // Drive v3 converts DOCX → Google Doc based solely on the mimeType field in
        // the metadata above.  No extra query param is needed — convert=true was a
        // Drive v2-only parameter and causes a 400 badRequest in v3.
        const uploadResp = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  `multipart/related; boundary="${boundary}"`,
                },
                body: bodyBlob,
            }
        );

        if (!uploadResp.ok) {
            const err = await uploadResp.text();
            console.error('[GDocs] Upload failed:', uploadResp.status, err);
            throw new Error(`Google Drive upload failed (${uploadResp.status}): ${err}`);
        }

        const uploaded = await uploadResp.json();
        if (!uploaded.id) throw new Error('Drive did not return a file ID.');

        console.log('[GDocs] Upload complete! File ID:', uploaded.id);

        // ── Step 6: Open the converted Google Doc with the correct account ────
        //
        // "File could not open" also occurs when the browser's active Google account
        // doesn't match the account that owns the uploaded file.
        //
        // Important: ?authuser= only accepts INTEGER indices (0, 1, 2…), NOT an
        // email address.  Passing an email is silently ignored by Google and the
        // wrong account may be used.  The correct approach:
        //   • We used prompt=select_account in the OAuth URL (Step 3 above), which
        //     forces the user to explicitly choose an account in the popup.
        //   • That chosen account is always index 0 in the new tab's Google session.
        //   • Therefore authuser=0 reliably pins the correct account.
        //
        // We still fetch the email via userinfo purely for the console log so it is
        // easy to confirm which account was used during debugging.
        let authEmail = '';
        try {
            const meResp = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (meResp.ok) {
                const me = await meResp.json();
                authEmail = me.email ?? '';
                console.log('[GDocs] Authenticated as:', authEmail);
            }
        } catch { /* non-fatal — authuser=0 still works without the email log */ }

        // docs.google.com/document/d/{id}/edit  ← real Docs editor, never shows
        // "File could not open" for a converted Google Doc.
        // authuser=0 works because prompt=select_account in the OAuth popup
        // guarantees the chosen account is position 0 in this new tab's session.
        const openUrl = `https://docs.google.com/document/d/${uploaded.id}/edit?authuser=0`;
        console.log('[GDocs] Opening:', openUrl, '| account:', authEmail || '(unknown)');

        window.open(openUrl, '_blank', 'noopener,noreferrer');
    };

    const handleGenerateSyllabus = async () => {
        // Validate header and footer are not empty
        const headerText = headerContent.replace(/<[^>]*>/g, '').trim();
        const footerText = footerContent.replace(/<[^>]*>/g, '').trim();

        if (!headerText) {
            alert("Please fill in the Header content before generating the syllabus.");
            return;
        }
        if (!footerText) {
            alert("Please fill in the Footer content before generating the syllabus.");
            return;
        }

        if (checkedItems.length < checklistOptions.length) {
            alert("Please verify all items in the checklist before generating.");
            return;
        }

        setIsGenerating(true);

        try {
            const payload = buildFullPayload();
            if (!payload) { alert("Session expired. Please restart."); return; }

            const isGdocs = exportFormatRef.current === 'gdocs';

            if (isEditMode && syllabusHash) {
                if (isGdocs) {
                    // Edit mode + Google Docs: single PATCH with download:true.
                    // The update() controller now returns the same base64 JSON as store(),
                    // so we can avoid a redundant second POST to /syllabus-generator/save.
                    const response = await axios.patch(
                        `/syllabi/${syllabusHash}`,
                        { ...payload, download: true },
                        { responseType: 'json' }
                    );
                    const { base64, file_name } = response.data;
                    if (!base64) throw new Error('Server returned no file data.');
                    await uploadToGoogleDocs(base64, file_name ?? `${fileNameRef.current}.docx`);
                } else {
                    // Edit mode + PDF/DOCX: save first, then download via POST
                    await axios.patch(
                        `/syllabi/${syllabusHash}`,
                        { ...payload, download: false }
                    );

                    const response = await axios.post(
                        '/syllabus-generator/save',
                        { ...payload, download: true },
                        { responseType: 'blob' }
                    );

                    const contentType: string = response.headers?.['content-type'] ?? '';
                    if (contentType.includes('application/json')) {
                        const text   = await (response.data as Blob).text();
                        const parsed = JSON.parse(text);
                        throw new Error(parsed?.export_error ?? parsed?.message ?? 'Export failed.');
                    }

                    const mimeType = exportFormatRef.current === 'docx'
                        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        : 'application/pdf';

                    const blob        = new Blob([response.data], { type: mimeType });
                    const downloadUrl = URL.createObjectURL(blob);
                    const link        = document.createElement('a');
                    link.href         = downloadUrl;
                    link.download     = `${fileNameRef.current}.${exportFormatRef.current === 'docx' ? 'docx' : 'pdf'}`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(downloadUrl);
                }
            } else if (isGdocs) {
                // Google Docs path: server generates DOCX and returns it as base64 JSON.
                // We then upload it directly from the browser to Google Drive, which
                // converts it to a native Google Doc that the user can edit online.
                const response = await axios.post(
                    '/syllabus-generator/save',
                    { ...payload, download: true },
                    { responseType: 'json' }
                );

                const { base64, file_name } = response.data;
                if (!base64) throw new Error('Server returned no file data.');

                await uploadToGoogleDocs(base64, file_name ?? `${fileNameRef.current}.docx`);
            } else {
                // PDF / DOCX download path
                const response = await axios.post(
                    '/syllabus-generator/save',
                    { ...payload, download: true },
                    { responseType: 'blob' }
                );

                // Guard: if the server returned JSON (e.g. an error object) instead of a
                // binary blob, parse and surface it rather than saving a corrupt file.
                const contentType: string = response.headers?.['content-type'] ?? '';
                if (contentType.includes('application/json')) {
                    const text   = await (response.data as Blob).text();
                    const parsed = JSON.parse(text);
                    throw new Error(parsed?.export_error ?? parsed?.message ?? 'Export failed.');
                }

                const mimeType = exportFormatRef.current === 'docx'
                    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    : 'application/pdf';

                const blob        = new Blob([response.data], { type: mimeType });
                const downloadUrl = URL.createObjectURL(blob);
                const link        = document.createElement('a');
                link.href         = downloadUrl;
                link.download     = `${fileNameRef.current}.${exportFormatRef.current === 'docx' ? 'docx' : 'pdf'}`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(downloadUrl);
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                window.location.href = '/dashboard';
            }, 3000);

        } catch (error: any) {
            console.error("Export failed:", error);
            const msg = error?.message ?? error?.response?.data?.export_error ?? 'Something went wrong while generating the file.';
            alert(msg + '\n\nPlease try again or contact support.');
        } finally {
            setIsGenerating(false);
        }
    };

    const saveToDatabase = async () => {
        const payload = buildFullPayload();
        if (!payload) return;
        try {
            if (isEditMode && syllabusHash) {
                // Update the existing record
                await axios.patch(`/syllabi/${syllabusHash}`, { ...payload, download: false });
            } else {
                await axios.post('/syllabus-generator/save', { ...payload, download: false });
            }
            console.log("Auto-saved to DB");
        } catch (error) {
            console.error("DB Save failed:", error);
        }
    };

    // Auto-save to DB whenever all checklist items are verified
    useEffect(() => {
        if (checkedItems.length === checklistOptions.length && sessionId) {
            saveToDatabase();
        }
    }, [checkedItems, sessionId]);

    useEffect(() => {
        // ── Edit mode: seed sessionStorage from the DB data the controller passed,
        //    BUT only if sessionStorage doesn't already have a fresher draft
        //    (i.e. the user navigated here after editing earlier steps).
        if (isEditMode && props.sessionId) {
            const id = props.sessionId;

            const seed = (key: string, value: Record<string, any> | undefined) => {
                const storageKey = `syllabus_${key}_${id}`;
                // Don't overwrite an existing draft — it may be newer than the DB
                if (!sessionStorage.getItem(storageKey) && value && Object.keys(value).length > 0) {
                    sessionStorage.setItem(storageKey, JSON.stringify(value));
                }
            };

            seed('step1', props.step1);
            seed('step2', props.step2);
            seed('step3', props.step3);
            seed('step4', props.step4);
            seed('step5', props.step5);

            // step6 carries header/footer + export options
            if (props.step6) {
                const s6 = props.step6;
                seed('step6', s6);
                if (s6.header && !sessionStorage.getItem(`syllabus_header_${id}`)) {
                    sessionStorage.setItem(`syllabus_header_${id}`, s6.header);
                }
                if (s6.footer && !sessionStorage.getItem(`syllabus_footer_${id}`)) {
                    sessionStorage.setItem(`syllabus_footer_${id}`, s6.footer);
                }
            }

            sessionStorage.setItem('syllabus_session_id', id);
            setSessionId(id);
            return;
        }

        // ── Create mode: read session id written by Step 1 ──
        const id = sessionStorage.getItem('syllabus_session_id');
        if (!id) {
            console.warn("No syllabus_session_id found. Redirecting or fallback may be needed.");
            return;
        }
        setSessionId(id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!sessionId) return;

        try {
            const step1 = JSON.parse(sessionStorage.getItem(`syllabus_step1_${sessionId}`) || '{}');
            const step2 = JSON.parse(sessionStorage.getItem(`syllabus_step2_${sessionId}`) || '{}');
            const step3 = JSON.parse(sessionStorage.getItem(`syllabus_step3_${sessionId}`) || '{}');
            const step4 = JSON.parse(sessionStorage.getItem(`syllabus_step4_${sessionId}`) || '{}');
            const step5 = JSON.parse(sessionStorage.getItem(`syllabus_step5_${sessionId}`) || '{}');

            // Also load step6 (header/footer/export options) — source of truth is
            // the dedicated header/footer keys; step6 key stores the rest.
            const savedHeader = sessionStorage.getItem(`syllabus_header_${sessionId}`) ?? '';
            const savedFooter = sessionStorage.getItem(`syllabus_footer_${sessionId}`) ?? '';
            let step6: Record<string, any> = {};
            try {
                const raw = sessionStorage.getItem(`syllabus_step6_${sessionId}`);
                step6 = raw ? JSON.parse(raw) : {};
            } catch {}
            step6 = { ...step6, header: savedHeader, footer: savedFooter };

            const merged = {
                step1,
                step2,
                step3,
                step4,
                step5,
                step6,
                syllabus_session_id: sessionId
            };

            setFinalSyllabusData(merged);

            console.log("Final Aggregated Data:", merged);

        } catch (err) {
            console.error("Failed to load syllabus steps", err);
        }
    }, [sessionId]);

    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if (!sessionId) return;

        hasLoadedRef.current = false;

        // Load header/footer from their dedicated keys first
        const savedHeader = sessionStorage.getItem(`syllabus_header_${sessionId}`) ?? '';
        const savedFooter = sessionStorage.getItem(`syllabus_footer_${sessionId}`) ?? '';

        try {
            const saved = JSON.parse(sessionStorage.getItem(`syllabus_step6_${sessionId}`) || '{}');
            if (saved.exportFormat) setExportFormat(saved.exportFormat);
            if (saved.fileName)     setFileName(saved.fileName);

            // course_name now lives in Step 1 — read from step1 draft first,
            // fall back to any legacy value stored in step6 for backwards compat
            try {
                const step1Draft = JSON.parse(sessionStorage.getItem(`syllabus_step1_${sessionId}`) || '{}');
                const name = step1Draft.course_name || saved.courseName || 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY';
                setCourseName(name);
            } catch {
                if (saved.courseName) setCourseName(saved.courseName);
            }
        } catch {}

        // Always apply the header/footer (dedicated keys are source of truth)
        headerRef.current = savedHeader;
        footerRef.current = savedFooter;
        setHeaderContent(savedHeader);
        setFooterContent(savedFooter);

        setTimeout(() => {
            hasLoadedRef.current = true;
        }, 0);
    }, [sessionId]);

    // Refs mirror the latest state so persistStep6 never closes over stale values
    const sessionIdRef    = useRef(sessionId);
    const headerRef       = useRef(headerContent);
    const footerRef       = useRef(footerContent);
    const exportFormatRef = useRef(exportFormat);
    const fileNameRef     = useRef(fileName);
    const courseNameRef   = useRef(courseName);
    const finalDataRef    = useRef(finalSyllabusData);

    useEffect(() => { sessionIdRef.current    = sessionId; },         [sessionId]);
    useEffect(() => { headerRef.current       = headerContent; },     [headerContent]);
    useEffect(() => { footerRef.current       = footerContent; },     [footerContent]);
    useEffect(() => { exportFormatRef.current = exportFormat; },      [exportFormat]);
    useEffect(() => { fileNameRef.current     = fileName; },          [fileName]);
    useEffect(() => { courseNameRef.current   = courseName; },        [courseName]);
    useEffect(() => { finalDataRef.current    = finalSyllabusData; }, [finalSyllabusData]);

    // Stable persist — skipped until hasLoadedRef is true
    const persistStep6 = useCallback(() => {
        const id = sessionIdRef.current;
        if (!id || !hasLoadedRef.current) return;

        const header = sessionStorage.getItem(`syllabus_header_${id}`) ?? headerRef.current ?? '';
        const footer = sessionStorage.getItem(`syllabus_footer_${id}`) ?? footerRef.current ?? '';

        sessionStorage.setItem(`syllabus_step6_${id}`, JSON.stringify({
            exportFormat: exportFormatRef.current,
            fileName:     fileNameRef.current,
            courseName:   courseNameRef.current,
            header,
            footer,
        }));
    }, []);

    // Trigger persist on every relevant state change
    useEffect(() => {
        if (!sessionId) return;
        sessionStorage.setItem(`syllabus_header_${sessionId}`, headerContent);
        persistStep6();
    }, [headerContent, sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        sessionStorage.setItem(`syllabus_footer_${sessionId}`, footerContent);
        persistStep6();
    }, [footerContent, sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        persistStep6();
    }, [exportFormat, fileName, courseName, sessionId]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-[#800000] selection:text-white">
            <style dangerouslySetInnerHTML={{ __html: `
                /* Contenteditable placeholder */
                [contenteditable][data-placeholder]:empty::before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    pointer-events: none;
                }
                /* Links inside editor look like real links */
                [contenteditable] a {
                    color: #1a56db !important;
                    text-decoration: underline !important;
                    cursor: pointer;
                }
                /* Ensure inline color/background styles from execCommand are visible */
                [contenteditable] span[style] {
                    display: inline;
                }
                /* Images inside the editor — freely positioned, absolute within the editor */
                [contenteditable] img[data-hf-img] {
                    position: absolute;
                    cursor: default;
                    border-radius: 3px;
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                    -webkit-user-drag: none;
                    user-drag: none;
                    z-index: 5;
                }
                /* Preview rendering of hf images */
                .syllabus-custom-header img[data-hf-img],
                .syllabus-custom-footer img[data-hf-img] {
                    position: absolute;
                    border-radius: 3px;
                    border: none !important;
                    outline: none !important;
                    box-shadow: none !important;
                }
                /* Custom header/footer preview strip */
                .syllabus-custom-header,
                .syllabus-custom-footer {
                    font-size: 10px;
                    padding: 4px 0;
                    word-break: break-word;
                }
                .syllabus-custom-header { border-bottom: 1px solid #888; margin-bottom: 6px; }
                .syllabus-custom-footer { border-top: 1px solid #888; margin-top: 6px; }
                /* Links in preview */
                .syllabus-custom-header a,
                .syllabus-custom-footer a {
                    color: #1a56db !important;
                    text-decoration: underline !important;
                }
            `}} />
            <Navbar />
            <Head title="SyllabiSys: Review & Export" />


            <main className="grow pt-20 md:pt-28 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-32">
                
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[#800000] font-bold text-[10px] md:text-sm tracking-widest uppercase mb-1">Finalization</span>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 flex flex-wrap items-center gap-2">
                            Step 6 of 6: <span className="text-slate-600 font-bold text-lg sm:text-2xl md:text-3xl"> Review & Export</span>
                        </h1>
                    </div>     
                    <button
                        onClick={() => setShowPreview(true)}
                        className="w-full lg:w-auto bg-[#800000] hover:bg-[#600000] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <FileDown size={18}/> <span className="whitespace-nowrap">View Full Preview</span>
                    </button>    
                </div>
            
                <hr className="border-t-2 border-slate-200 mb-6" />
            
                {/* Instruction */}
                <div className="bg-white border-l-4 border-[#800000] p-4 rounded-r-xl shadow-sm mb-8 flex items-start gap-3">
                    <Info className="text-[#800000] mt-0.5 shrink-0" size={18} />
                    <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Instructions:</span> Perform a final check of your data. Once all items are checked, you can generate your official document.
                    </p>
                </div>

                {/* Progress Stepper */}
                <div className="relative mb-12 mt-4 w-full max-w-3xl mx-auto px-4">
                    <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-200 -translate-y-1/2 rounded-full"></div>
                    
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        className="absolute top-1/2 left-0 h-1.5 bg-[#4B6333] -translate-y-1/2 rounded-full z-10"
                    ></motion.div>
                    
                    <div className="relative flex justify-between">
                        {checklistOptions.map((_, index) => {
                            const isCompleted = checkedItems.includes(index);
                            return (
                                <div key={index} className="relative flex flex-col items-center">
                                    <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black z-20 transition-all border-2 sm:border-4
                                        ${isCompleted ? 'bg-[#4B6333] text-white border-white shadow-md' : 'bg-white text-slate-300 border-slate-100'}`}>
                                        {isCompleted ? <Check size={14} strokeWidth={3} /> : index + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                    
                    {/* Left: Final Checklist */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-7 bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden h-fit"
                    >
                        <div className="bg-[#4B6333] p-5 md:p-6 flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                                <ShieldCheck size={20} /> Final Verification
                            </h3>
                            <button 
                                onClick={() => setCheckedItems(checklistOptions.map((_, i) => i))}
                                className="text-[9px] md:text-[10px] bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest transition-colors"
                            >
                                Check All
                            </button>
                        </div>

                        <div className="p-4 md:p-8 space-y-3">
                            {checklistOptions.map((text, i) => (
                                <motion.div 
                                    whileTap={{ scale: 0.98 }}
                                    key={i} 
                                    onClick={() => toggleCheck(i)}
                                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all cursor-pointer select-none
                                        ${checkedItems.includes(i) 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all
                                        ${checkedItems.includes(i) 
                                            ? 'bg-green-500 border-2 border-green-500' 
                                            : 'bg-white border-2 border-slate-300'}`}>
                                        {checkedItems.includes(i) && (
                                            <Check size={13} strokeWidth={3} className="text-white" />
                                        )}
                                    </div>
                                    <span className={`text-xs md:text-sm font-bold leading-tight ${checkedItems.includes(i) ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {text}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right: Export Engine */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-5 flex flex-col gap-6"
                    >
                        <div className="bg-[#800000] rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl shadow-[#800000]/20 relative overflow-hidden group">
                            <FileText className="absolute -right-6 -bottom-6 text-white opacity-10" size={140} />
                            
                            <h3 className="text-white font-black text-lg md:text-xl mb-6 relative z-10">Export Options</h3>
                            
                            <div className="space-y-3 relative z-10">
                                {/* PDF Selection */}
                                <div 
                                    onClick={() => setExportFormat('pdf')}
                                    className={`cursor-pointer p-4 md:p-5 rounded-xl border-2 transition-all flex items-center justify-between
                                    ${exportFormat === 'pdf' ? 'bg-white border-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${exportFormat === 'pdf' ? 'bg-red-50 text-[#800000]' : 'bg-white/20 text-white'}`}>
                                            <FileText size={20} />
                                        </div>
                                        <span className={`font-black text-xs md:text-sm uppercase ${exportFormat === 'pdf' ? 'text-[#800000]' : 'text-white'}`}>PDF Document</span>
                                    </div>
                                    {exportFormat === 'pdf' && <CheckCircle size={18} className="text-[#800000]" fill="currentColor" />}
                                </div>

                                {/* DOCX Selection */}
                                <div 
                                    onClick={() => setExportFormat('docx')}
                                    className={`cursor-pointer p-4 md:p-5 rounded-xl border-2 transition-all flex items-center justify-between
                                    ${exportFormat === 'docx' ? 'bg-white border-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${exportFormat === 'docx' ? 'bg-blue-50 text-blue-600' : 'bg-white/20 text-white'}`}>
                                            <FileJson size={20} />
                                        </div>
                                        <span className={`font-black text-xs md:text-sm uppercase ${exportFormat === 'docx' ? 'text-blue-600' : 'text-white'}`}>Word (DOCX)</span>
                                    </div>
                                    {exportFormat === 'docx' && <CheckCircle size={18} className="text-blue-600" fill="currentColor" />}
                                </div>

                                {/* Google Docs Selection — temporarily hidden */}
                                {false && <div
                                    onClick={() => setExportFormat('gdocs')}
                                    className={`cursor-pointer p-4 md:p-5 rounded-xl border-2 transition-all flex items-center justify-between
                                    ${exportFormat === 'gdocs' ? 'bg-white border-white' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg flex items-center justify-center ${exportFormat === 'gdocs' ? 'bg-green-50' : 'bg-white/20'}`}>
                                            {/* Google Docs icon */}
                                            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M28 4H12C9.8 4 8 5.8 8 8v32c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4V20L28 4Z"
                                                    fill={exportFormat === 'gdocs' ? '#1A73E8' : 'white'} opacity={exportFormat === 'gdocs' ? 1 : 0.85}/>
                                                <path d="M28 4v16h16L28 4Z"
                                                    fill={exportFormat === 'gdocs' ? '#4285F4' : 'white'} opacity={exportFormat === 'gdocs' ? 0.55 : 0.4}/>
                                                <rect x="14" y="26" width="20" height="2.5" rx="1.25"
                                                    fill={exportFormat === 'gdocs' ? 'white' : '#1A73E8'}/>
                                                <rect x="14" y="31" width="20" height="2.5" rx="1.25"
                                                    fill={exportFormat === 'gdocs' ? 'white' : '#1A73E8'}/>
                                                <rect x="14" y="36" width="13" height="2.5" rx="1.25"
                                                    fill={exportFormat === 'gdocs' ? 'white' : '#1A73E8'}/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className={`font-black text-xs md:text-sm uppercase leading-tight ${exportFormat === 'gdocs' ? 'text-green-700' : 'text-white'}`}>
                                                Google Docs
                                            </p>
                                            <p className={`text-[9px] md:text-[10px] font-medium mt-0.5 ${exportFormat === 'gdocs' ? 'text-green-600' : 'text-white/55'}`}>
                                                Upload &amp; edit online in your Drive
                                            </p>
                                        </div>
                                    </div>
                                    {exportFormat === 'gdocs' && <CheckCircle size={18} className="text-green-600" fill="currentColor" />}
                                </div>}

                                {/* Filename Input */}
                                <div className="pt-4 space-y-2">
                                    <label className="text-white/70 font-black text-[9px] md:text-[10px] uppercase tracking-widest ml-1">Syllabus Filename</label>
                                    <input 
                                        type="text" 
                                        value={fileName}
                                        onChange={(e) => setFileName(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 md:p-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all font-bold text-xs md:text-sm"
                                    />
                                </div>
                            </div>

                        </div>

                    </motion.div>
                </div>

                {/* Header & Footer Rich Editor — full width, centered below the grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-6 md:mt-8 bg-white rounded-2xl md:rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
                >
                    <div className="bg-[#4B6333] p-5 md:p-6 flex items-center gap-3">
                        <FileText size={20} className="text-white" />
                        <div>
                            <h3 className="text-white font-black text-sm md:text-base leading-tight">Header &amp; Footer Editor</h3>
                            <p className="text-white/70 text-[10px] md:text-xs mt-0.5">Customize how your syllabus header and footer appear in the final document — rich formatting like Word</p>
                        </div>
                    </div>

                    <div className="p-5 md:p-8 flex flex-col gap-6 md:gap-8">
                        <div className="space-y-2">
                            <RichDocEditor
                                label="Header Content *"
                                value={headerContent}
                                onHeightChange={setHeaderEditorHeight}
                                onChange={(val) => {
                                    setHeaderContent(val);
                                }}
                            />
                            {!headerContent.replace(/<[^>]*>/g, '').trim() && (
                                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                                    <span>⚠</span> Header is required before you can generate the syllabus.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <RichDocEditor
                                label="Footer Content *"
                                value={footerContent}
                                onHeightChange={setFooterEditorHeight}
                                onChange={(val) => {
                                    setFooterContent(val);
                                }}
                            />
                            {!footerContent.replace(/<[^>]*>/g, '').trim() && (
                                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                                    <span>⚠</span> Footer is required before you can generate the syllabus.
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>

            <AnimatePresence>
                {showPreview && (() => {
                    // ─── Pull all step data from sessionStorage ───────────────────────
                    const sid = sessionId;
                    const s1 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step1_${sid}`) || '{}'); } catch { return {}; } })();
                    const s2 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step2_${sid}`) || '{}'); } catch { return {}; } })();
                    const s3 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step3_${sid}`) || '{}'); } catch { return {}; } })();
                    const s4 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step4_${sid}`) || '{}'); } catch { return {}; } })();
                    const s5 = (() => { try { return JSON.parse(sessionStorage.getItem(`syllabus_step5_${sid}`) || '{}'); } catch { return {}; } })();

                    // Step 1
                    const courseCode        = s1.course_code || '---';
                    const courseTitle       = s1.course_title || '---';
                    const courseCredit      = s1.course_credit ?? '---';
                    const courseDescription = s1.course_description || '';
                    const preRequisites     = s1.pre_requisites || 'None';
                    const coRequisites      = s1.co_requisites || 'None';

                    // Step 2
                    const plos       = s2.plos       || [];
                    const clos       = s2.clos       || [];
                    const iloMapping = s2.iloMapping || {};
                    const ploMapping = s2.ploMapping || {};
                    const iloCount   = 9;

                    // Step 3
                    const obtlData       = s3.obtlData       || [];
                    const references     = (s3.references     || []).filter((r: any) => r.text?.trim());
                    const otherRefs      = (s3.otherReferences || []).filter((r: any) => r.text?.trim());

                    // Step 4
                    const gradingComponents = s4.gradingComponents || [];
                    const requirements      = s4.requirements      || [];
                    const f2fLink           = s4.f2fLink            || '';

                    // Step 5
                    const classInfo    = s5.classInfo    || {};
                    const facultyInfo  = s5.facultyInfo  || {};
                    const rubrics      = s5.rubrics      || [];
                    const groupCriteria= s5.groupCriteria|| [];
                    const signatories  = s5.signatories  || [];

                    // ─── OBTL pagination (7 rows per page, same as Step3) ────────────
                    const ROWS_PER_PAGE = 7;
                    const paginatedObtl: any[][] = [];
                    for (let i = 0; i < obtlData.length; i += ROWS_PER_PAGE) {
                        paginatedObtl.push(obtlData.slice(i, i + ROWS_PER_PAGE));
                    }
                    if (paginatedObtl.length === 0) paginatedObtl.push([]);

                    // ─── Rubric pagination (5 rows per page) ─────────────────────────
                    const RUBRIC_PER_PAGE = 5;
                    const paginatedRubrics: any[][] = [];
                    for (let i = 0; i < rubrics.length; i += RUBRIC_PER_PAGE) {
                        paginatedRubrics.push(rubrics.slice(i, i + RUBRIC_PER_PAGE));
                    }
                    if (paginatedRubrics.length === 0) paginatedRubrics.push([]);

                    // ─── Shared sub-components ───────────────────────────────────────

                    // ─── Custom Header/Footer from editor — these are the ONLY header/footer on each page ──
                    // AutoHeightHF: renders header/footer with the same pixel height as the editor,
                    // so every page has a consistent, uniform header/footer band.
                    const AutoHeightHF: React.FC<{ html: string; className: string; editorPx: number }> = ({ html, className, editorPx }) => {
                        const ref = useRef<HTMLDivElement>(null);
                        return (
                            <div
                                ref={ref}
                                className={className}
                                style={{ position: 'relative', height: `${editorPx}px`, minHeight: `${editorPx}px`, overflow: 'hidden' }}
                                dangerouslySetInnerHTML={{ __html: html || '' }}
                            />
                        );
                    };

                    const CustomPageHeader = () => (
                        <AutoHeightHF html={headerContent} className="syllabus-custom-header" editorPx={headerEditorHeight} />
                    );

                    const CustomPageFooter = () => (
                        <AutoHeightHF html={footerContent} className="syllabus-custom-footer" editorPx={footerEditorHeight} />
                    );

                    const pageBase = "preview-container shadow-2xl font-serif text-black relative bg-white";

                    // ─── Page counter (incremented inline) ───────────────────────────
                    let _pageNum = 0;
                    const nextPage = () => { _pageNum += 1; return _pageNum; };

                    // ─── Page divider: shown between pages & before first page ───────
                    const PageDivider = ({
                        pageNum,
                        step,
                        stepNum,
                        title,
                        isFirst = false,
                    }: {
                        pageNum: number;
                        step: number;
                        stepNum?: string;
                        title: string;
                        isFirst?: boolean;
                    }) => (
                        <div className={`flex items-center gap-3 w-full max-w-[860px] mx-auto ${isFirst ? 'mb-3' : 'my-4'}`}>
                            {/* Left line */}
                            <div className="flex-1 h-px bg-transparent" />
                            {/* Badge */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-600/50 shadow-sm shrink-0">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    Step {step}{stepNum ? ` · ${stepNum}` : ''}
                                </span>
                                <span className="w-px h-3 bg-slate-600" />
                                <span className="text-white text-[10px] font-semibold truncate max-w-[200px]">{title}</span>
                                <span className="w-px h-3 bg-slate-600" />
                                <span className="text-[#fbbf24] text-[10px] font-black">Pg {pageNum}</span>
                            </div>
                            {/* Right line */}
                            <div className="flex-1 h-px bg-transparent" />
                        </div>
                    );

                    return (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
                        >
                            <style dangerouslySetInnerHTML={{ __html: `
                                .preview-container {
                                    width: 297mm;
                                    min-height: 210mm;
                                    margin: 0 auto;
                                    background: white;
                                    padding: 1rem;
                                    border-top: 3px solid #800000;
                                    border-bottom: 3px solid #800000;
                                }
                                .syllabus-table {
                                    width: 100%;
                                    border-collapse: collapse;
                                    table-layout: fixed;
                                    word-wrap: break-word;
                                }
                                .syllabus-table td, .syllabus-table th {
                                    border: 1px solid black;
                                    padding: 8px;
                                    vertical-align: top;
                                    overflow: hidden;
                                }
                                .label-cell {
                                    background-color: #fcfcfc;
                                    font-weight: bold;
                                    width: 15%;
                                    text-align: center;
                                    font-size: 10px;
                                    text-transform: uppercase;
                                }
                                .value-cell { font-size: 11px; }
                                .header-yellow {
                                    background-color: #d8d8d8;
                                    border: 1px solid black;
                                    font-weight: bold;
                                    text-align: center;
                                    text-transform: uppercase;
                                    padding: 10px;
                                }
                                /* ── Custom header/footer — user-designed, appears on every page ── */
                                .syllabus-custom-header {
                                    font-size: 11px;
                                    line-height: 1.5;
                                    margin-bottom: 8px;
                                    word-break: break-word;
                                    position: relative;
                                    display: block;
                                    overflow: hidden;
                                }
                                .syllabus-custom-header:not(:empty) {
                                    padding-bottom: 6px;
                                    border-bottom: 1.5px solid #aaa;
                                }
                                .syllabus-custom-footer {
                                    font-size: 11px;
                                    line-height: 1.5;
                                    margin-top: 8px;
                                    word-break: break-word;
                                    position: relative;
                                    display: block;
                                    overflow: hidden;
                                }
                                .syllabus-custom-footer:not(:empty) {
                                    padding-top: 6px;
                                    border-top: 1.5px solid #aaa;
                                }
                                /* Images in custom header/footer: position:absolute is respected
                                   because the container is position:relative */
                                .syllabus-custom-header img[data-hf-img],
                                .syllabus-custom-footer img[data-hf-img] {
                                    position: absolute;
                                    border-radius: 3px;
                                    border: none !important;
                                    outline: none !important;
                                    box-shadow: none !important;
                                    max-width: none;
                                    border: none !important;
                                    outline: none !important;
                                    box-shadow: none !important;
                                }
                                /* Pass-through font sizes written by applyFontSize (span style) */
                                .syllabus-custom-header span[style],
                                .syllabus-custom-footer span[style] {
                                    display: inline;
                                }
                                /* Links in preview header/footer */
                                .syllabus-custom-header a,
                                .syllabus-custom-footer a {
                                    color: #1a56db !important;
                                    text-decoration: underline !important;
                                }
                            `}} />

                            <motion.div
                                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                                className="bg-white w-full max-w-[98%] md:max-w-[95%] h-[95vh] md:h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            >
                                {/* Modal top bar */}
                                <div className="bg-[#800000] p-3 md:p-4 flex justify-between items-center text-white shrink-0">
                                    <div className="flex flex-col">
                                        <span className="font-bold flex items-center gap-2 text-xs md:text-base">
                                            <FileText size={20}/> FULL SYLLABUS PREVIEW (ALL STEPS)
                                        </span>
                                        <span className="text-white/60 text-[10px] mt-0.5 hidden md:block">Pages are labeled by step number — scroll down to navigate through all sections</span>
                                    </div>
                                    <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg">
                                        <X size={24}/>
                                    </button>
                                </div>

                                {/* Scrollable pages */}
                                <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-8 bg-slate-500 flex flex-col items-center">
                                <div className="w-full flex flex-col items-center">
                                <div className="origin-top transition-all scale-[0.25] sm:scale-[0.38] md:scale-[0.55] lg:scale-[0.72] xl:scale-[0.9] w-full flex flex-col items-center">

                                    {/* ══════════════════════════════════════════════
                                        PAGE 1 — STEP 1: Course Overview & Description
                                    ══════════════════════════════════════════════ */}
                                    <PageDivider isFirst pageNum={nextPage()} step={1} title="Course Overview & Description" />
                                    <div className={pageBase}>
                                        <CustomPageHeader />
                                        <div className="header-yellow mb-0">
                                            {courseName || 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY'} <br/>
                                            Outcomes-Based Course Syllabus
                                        </div>
                                        <table className="syllabus-table" style={{tableLayout:'fixed'}}>
                                            <colgroup>
                                                <col style={{width:'15%'}} />
                                                <col style={{width:'14%'}} />
                                                <col style={{width:'12%'}} />
                                                <col style={{width:'33%'}} />
                                                <col style={{width:'13%'}} />
                                                <col style={{width:'13%'}} />
                                            </colgroup>
                                            <tbody>
                                                <tr>
                                                    <td colSpan={6} style={{
                                                        border:'1px solid black',
                                                        fontWeight:'bold',
                                                        textAlign:'center',
                                                        textTransform:'uppercase',
                                                        padding:'5px 8px',
                                                        fontSize:'10px',
                                                        fontFamily:"'Arial Narrow', Arial, sans-serif",
                                                        letterSpacing:'0.5px',
                                                    }}>
                                                        Course Information
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell" style={{verticalAlign:'middle'}}>Course Code</td>
                                                    <td className="value-cell font-bold">{courseCode}</td>
                                                    <td className="label-cell" style={{verticalAlign:'middle'}}>Course Title</td>
                                                    <td className="value-cell font-bold">{courseTitle}</td>
                                                    <td className="label-cell" style={{verticalAlign:'middle'}}>Course Credit</td>
                                                    <td className="value-cell text-center">{courseCredit}</td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell" style={{verticalAlign:'middle'}}>Course Description</td>
                                                    <td colSpan={5} className="value-cell text-justify">
                                                        <div style={{fontFamily:"'Arial Narrow', Arial, sans-serif", fontSize:'10px'}}
                                                            dangerouslySetInnerHTML={{ __html: courseDescription || 'No description provided.' }}
                                                        />
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell" style={{verticalAlign:'middle'}}>Pre-Requisites</td>
                                                    <td colSpan={3} className="value-cell">{preRequisites}</td>
                                                    <td className="label-cell" style={{verticalAlign:'middle'}}>Co-Requisites</td>
                                                    <td className="value-cell">{coRequisites}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table className="syllabus-table -mt-px" style={{tableLayout:'fixed'}}>
                                            <colgroup>
                                                <col style={{width:'15%'}} />
                                                <col style={{width:'85%'}} />
                                            </colgroup>
                                            <tbody>
                                                <tr>
                                                    <td className="label-cell">VISION</td>
                                                    <td className="value-cell font-bold text-center">
                                                        PUP: The National Polytechnic University <br/>
                                                        (PUP: Pambansang Politeknikong Unibersidad)
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">MISSION</td>
                                                    <td className="value-cell text-justify">
                                                        Ensuring inclusive and equitable quality education and promoting lifelong learning opportunities through a re-engineered polytechnic university by committing to:
                                                        <ul className="list-disc ml-5 mt-1">
                                                            <li>provide democratized access to educational opportunities for the holistic development of individuals with global perspective</li>
                                                            <li>offer industry-oriented curricula that produce highly skilled professionals...</li>
                                                            <li>embed a culture of research and innovation</li>
                                                        </ul>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">QUALITY STATEMENT POLICY</td>
                                                    <td className="value-cell text-justify">
                                                        The Polytechnic University of the Philippines commits to provide inclusive and equitable quality education and promote lifelong learning opportunities... Toward this end, we, the members of the PUP Community, will vigorously and steadfastly endeavor to continuously improve the standard of university services...
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">INSTITUTIONAL LEARNING OUTCOMES (ILO)</td>
                                                    <td className="value-cell">
                                                        <ol className="list-decimal ml-5">
                                                            <li><strong>Creative and Critical Thinking</strong> - Graduates use their imaginative as well as rational thinking abilities...</li>
                                                            <li><strong>Effective Communication</strong> - Graduates are proficient in the four macro skills in communication...</li>
                                                            <li><strong>Strong Service Orientation</strong> - Graduates exemplify the potentialities of an efficient, well-rounded and responsible professional...</li>
                                                        </ol>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">COLLEGE / CAMPUS GOALS</td>
                                                    <td className="value-cell text-justify text-[7.5pt]">
                                                        <ol className="list-decimal ml-5 space-y-0.5">
                                                            <li>Innovation and continuous improvement; to build a diverse, transparent, inclusive workforce; and reduce the organization's environmental impact.</li>
                                                            <li>To offer curricula that are relevant and responsive to the changing needs of the industry and society; promote critical thinking, a sense of adventure, and an openness to adapt challenges of their future workplace.</li>
                                                            <li>To increase students' attention and focus, promote a meaningful learning experience, encourage higher levels of student performance, motivate students to practice higher-order thinking skills.</li>
                                                            <li>To prepare holistic approaches to inculcate appropriate values necessary to build a humane, disciplined, nationalist, and independent society.</li>
                                                            <li>To build a culture of trust, deliver honest feedback, foster open communication, delegate responsibilities and tasks, and support growth opportunities to empower faculty members and employees.</li>
                                                        </ol>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">PROGRAM GOALS</td>
                                                    <td className="value-cell text-justify text-[7.5pt]">
                                                        The Bachelor of Science in Information Technology (BSIT) program focuses on the study of computer utilization and software to plan, install, customize, operate, manage, administer and maintain information technology infrastructure. The program prepares students to become IT professionals with primary competencies in systems analysis and design, applications development, database administration, network administration, and systems implementation and maintenance.
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="label-cell">PROGRAM OBJECTIVES</td>
                                                    <td className="value-cell text-[7.5pt]">
                                                        <ol className="list-decimal ml-5 space-y-0.5">
                                                            <li>To introduce students to current technologies and tools while learning new methodologies that will lead to the development of better information systems.</li>
                                                            <li>To enable students to understand the different components of the information technology field, including hardware, software, communication, networking, research, peopleware and management skills.</li>
                                                            <li>To demonstrate awareness of how to methodically and practically approach a variety of technological and managerial issues to ultimately improve business strategies.</li>
                                                            <li>To inculcate to students the essential virtues and attitudes, as well as develop necessary knowledge and competency levels required of an IT professional.</li>
                                                            <li>To train students to systematically analyze and evaluate organizational systems and processes in order to recommend software solutions that properly address the organization's needs and goals.</li>
                                                        </ol>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <CustomPageFooter />
                                    </div>

                                    {/* ══════════════════════════════════════════════
                                        PAGE 2 — STEP 2: PLO/CLO Mapping Matrix
                                        (mirrors Step2.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    <PageDivider pageNum={nextPage()} step={2} title="PLO / CLO Mapping Matrix" />
                                    <div className={pageBase}>
                                        <CustomPageHeader />
                                        <hr className="border-t-2 border-black mb-4" />

                                        {/* ── PLO → ILO table (mirrors Step2 preview exactly) ── */}
                                        <table className="w-full border-collapse text-[8pt] mb-0" style={{tableLayout:'fixed', fontFamily:"'Arial Narrow', Arial, sans-serif"}}>
                                            <tbody>
                                                <tr>
                                                    <td
                                                        rowSpan={plos.length + 2}
                                                        className="border border-black text-center align-middle p-1 font-bold"
                                                        style={{width:'9%', fontSize:'7pt'}}
                                                    >
                                                        PROGRAM<br/>LEARNING<br/>OUTCOMES<br/>(PLO)
                                                    </td>
                                                    <td className="border border-black p-2 text-left align-top" style={{width:'48%', fontSize:'8pt', backgroundColor:'#d6d6d6', borderBottom:'none'}}>
                                                        <strong>Based on Commission on Higher Education Memorandum Reference</strong><br/>
                                                        <strong>CMOs: CMO No. 25 s. 2015</strong><br/><br/>
                                                        <strong>The graduates of the program have the ability to:</strong>
                                                    </td>
                                                    <td colSpan={iloCount} className="border border-black p-1 text-center font-bold" style={{fontSize:'8pt', backgroundColor:'#d6d6d6'}}>
                                                        Alignment to ILOs
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-black p-1" style={{backgroundColor:'#d6d6d6', borderTop:'none'}}></td>
                                                    {Array.from({ length: iloCount }, (_, i) => i + 1).map(n => (
                                                        <td key={n} className="border border-black text-center font-bold p-1" style={{width:'28px', fontSize:'8pt', backgroundColor:'#d6d6d6'}}>{n}</td>
                                                    ))}
                                                </tr>
                                                {plos.map((plo: any, idx: number) => (
                                                    <tr key={plo.id}>
                                                        <td className="border border-black p-1 align-top" style={{fontSize:'8pt'}}>
                                                            {idx + 1}.&nbsp;&nbsp;{plo.label}
                                                        </td>
                                                        {Array.from({ length: iloCount }, (_, i) => i + 1).map(n => (
                                                            <td key={n} className="border border-black text-center font-bold p-1" style={{fontSize:'9pt'}}>
                                                                {iloMapping[`${plo.id}-${n}`] ? '✓' : ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* ── CLO → PLO table (mirrors Step2 preview exactly) ── */}
                                        <table className="w-full border-collapse text-[8pt]" style={{tableLayout:'fixed', marginTop:'-1px', fontFamily:"'Arial Narrow', Arial, sans-serif"}}>
                                            <tbody>
                                                <tr>
                                                    <td
                                                        rowSpan={clos.length + 2}
                                                        className="border border-black text-center align-middle p-1 font-bold"
                                                        style={{width:'9%', fontSize:'7pt'}}
                                                    >
                                                        COURSE<br/>LEARNING<br/>OUTCOMES<br/>(CLOs)
                                                    </td>
                                                    <td className="border border-black p-2 text-left font-bold align-middle" style={{width:'48%', fontSize:'8pt', backgroundColor:'#d6d6d6', borderBottom:'none'}}>
                                                        At the end of this course, the students are expected to:
                                                    </td>
                                                    <td colSpan={plos.length} className="border border-black p-1 text-center font-bold" style={{fontSize:'8pt', backgroundColor:'#d6d6d6'}}>
                                                        Alignment to PLOs
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-black p-1" style={{backgroundColor:'#d6d6d6', borderTop:'none'}}></td>
                                                    {plos.map((_: any, i: number) => (
                                                        <td key={i} className="border border-black text-center font-bold p-1" style={{fontSize:'8pt', backgroundColor:'#d6d6d6'}}>{i + 1}</td>
                                                    ))}
                                                </tr>
                                                {clos.map((clo: any) => (
                                                    <tr key={clo.id}>
                                                        <td className="border border-black p-1 align-top" style={{fontSize:'8pt'}}>{clo.text}</td>
                                                        {plos.map((plo: any) => (
                                                            <td key={plo.id} className="border border-black text-center font-bold p-1" style={{fontSize:'8pt'}}>
                                                                {ploMapping[`${clo.id}-${plo.id}`] || ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <p className="text-[7pt] mt-2 italic">Legend: L-Learned, P-Practiced, O-Opportunity to Learn</p>
                                        <CustomPageFooter />
                                    </div>

                                    {/* ══════════════════════════════════════════════
                                        PAGES 3+ — STEP 3: OBTL Weekly Plan (paginated)
                                        (mirrors Step3.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    {paginatedObtl.map((pageRows, pageIdx) => (
                                        <React.Fragment key={pageIdx}>
                                        <PageDivider
                                            pageNum={nextPage()}
                                            step={3}
                                            stepNum={paginatedObtl.length > 1 ? `Part ${pageIdx + 1} of ${paginatedObtl.length}` : undefined}
                                            title="Instructional Plan (OBTL)"
                                        />
                                        <div className={pageBase}>
                                            <CustomPageHeader />
                                            <div className="w-full border border-black">
                                                <table className="w-full border-collapse text-[8pt]" style={{tableLayout:'fixed'}}>
                                                    <colgroup>
                                                        <col style={{width:'6%'}} />
                                                        <col style={{width:'18%'}} />
                                                        <col style={{width:'10%'}} />
                                                        <col style={{width:'15%'}} />
                                                        <col style={{width:'13%'}} />
                                                        <col style={{width:'13%'}} />
                                                        <col style={{width:'13%'}} />
                                                        <col style={{width:'12%'}} />
                                                    </colgroup>
                                                    {pageIdx === 0 && (
                                                        <thead>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Weeks (18 Weeks)</th>
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Learning Outcomes (DLOs)</th>
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Alignment to (CLOs)</th>
                                                                <th className="p-2 border-r border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Learning Content/Topics</th>
                                                                <th className="p-1 border-b border-r border-black font-bold text-center bg-[#ffe8e8]" colSpan={3}>Instructional Delivery Design</th>
                                                                <th className="p-2 border-l border-black font-bold text-center bg-[#ffe8e8]" rowSpan={3}>Assessment Tasks (TAs)</th>
                                                            </tr>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-1 border-r border-black font-bold text-center bg-[#e8f4ff]" rowSpan={2}>Face-to-Face</th>
                                                                <th className="p-0.5 border-b border-r border-black font-bold text-center bg-[#e8f4ff]" colSpan={2}>Flexible Learning and Teaching Activities (FLTAs)</th>
                                                            </tr>
                                                            <tr className="border-b border-black bg-slate-50">
                                                                <th className="p-1 border-r border-black font-bold text-center text-[7pt] bg-[#e8f4ff]">Synchronous</th>
                                                                <th className="p-1 border-r border-black font-bold text-center text-[7pt] bg-[#e8f4ff]">Asynchronous</th>
                                                            </tr>
                                                        </thead>
                                                    )}
                                                    <tbody className="divide-y divide-slate-100 align-top">
                                                        {pageRows.map((row: any) => (
                                                            <tr key={row.id} className="border-b border-black last:border-0 align-top">
                                                                {row.type === 'regular' ? (
                                                                    <>
                                                                        <td className="p-2 border-r border-black text-center font-bold">{row.weeks}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.dlo}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.clo}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.topics}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.deliveryFace}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.deliverySync}</td>
                                                                        <td className="p-2 border-r border-black whitespace-pre-wrap">{row.deliveryAsync}</td>
                                                                        <td className="p-2 whitespace-pre-wrap">{row.tasks}</td>
                                                                    </>
                                                                ) : (
                                                                    <td colSpan={8} className="p-3 bg-amber-50 text-center font-bold text-[9pt] border-b border-black">
                                                                        {row.topics}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* References — only on the last OBTL page */}
                                            {pageIdx === paginatedObtl.length - 1 && (
                                                <div className="w-full mt-3 text-[8pt]">
                                                    <table className="w-full border border-black border-collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td className="p-2 font-bold uppercase">
                                                                    REFERENCES FROM THE NINOY AQUINO LEARNING AND LIBRARY RESOURCES CENTER (NALLRC)<br/>
                                                                    OUTCOMES-BASED BOOK LISTINGS (CBBL)
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="p-2">
                                                                    {references.length > 0
                                                                        ? references.map((ref: any) => <p key={ref.id} className="mb-1">{ref.text}</p>)
                                                                        : <p className="italic text-slate-400">No references added.</p>}
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="p-2 font-bold uppercase">OTHER REFERENCES</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="p-2">
                                                                    {otherRefs.length > 0
                                                                        ? otherRefs.map((ref: any) => <p key={ref.id} className="mb-1">{ref.text}</p>)
                                                                        : <p className="italic text-slate-400">No other references added.</p>}
                                                                </td>
                                                            </tr>
                                                            <tr><td className="p-3 min-h-[40px]">&nbsp;</td></tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            <CustomPageFooter />
                                        </div>
                                        </React.Fragment>
                                    ))}

                                    {/* ══════════════════════════════════════════════
                                        STEP 4 PAGES — Classroom Policies & Grading
                                        (mirrors Step4.tsx preview pages exactly)
                                    ══════════════════════════════════════════════ */}

                                    {/* Step4 Page 1: Classroom Policies */}
                                    <PageDivider pageNum={nextPage()} step={4} stepNum="Page 1" title="Classroom Policies" />
                                    <div className={pageBase}>
                                        <CustomPageHeader />
                                        <div className="w-full bg-slate-100 border border-black p-1 text-center font-bold text-[10pt] uppercase mb-0">
                                            CLASSROOM POLICIES (to be filled out by the assigned faculty)
                                        </div>
                                        <table className="w-full border-collapse border border-black text-[8pt]">
                                            <thead>
                                                <tr>
                                                    <th className="border border-black p-2 bg-slate-50 uppercase w-1/2 font-bold text-center">FACE-TO-FACE DELIVERY</th>
                                                    <th className="border border-black p-2 bg-slate-50 uppercase w-1/2 font-bold text-center">FLEXIBLE TEACHING AND LEARNING ACTIVITIES (FLTAs)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="align-top text-justify">
                                                    <td className="border border-black p-3 space-y-2">
                                                        <p className="font-bold text-slate-800">General Classroom Guidelines:</p>
                                                        <p>1. Students shall attend set contact schedule ready with all the materials and outputs required to be read, discussed, and/or submitted. Students should have also read required texts at least once before its scheduled discussion.</p>
                                                        <p>2. <span className="font-bold underline uppercase">Plagiarism shall not be tolerated.</span> The following penalties will be strictly implemented to outputs proven to contain plagiarized words, phrases, clauses, sentences, paragraphs, or ideas: First offense – automatic failure in the output; Second offense – automatic failure in the output + letter from parent/s/guardian/s that acknowledges the offense; Third offense – automatic failure in the course.</p>
                                                        <p>3. Requirements shall be submitted on time. However, in special cases when students fail to submit requirements for some acceptable reasons, submissions will be subjected to deductions of no less than 0.25 per day.</p>
                                                        <p>4. Students who have any form of disability must inform the course instructor immediately so that alternative arrangements may be immediately considered.</p>
                                                        <p>5. All students are expected to read and strictly observe the PUP Student Code of Conduct.</p>
                                                        {f2fLink && <p className="text-blue-700 underline break-all mt-2 text-[7.5pt]">{f2fLink}</p>}
                                                        <p className="font-bold text-slate-800 italic pt-2">Guidelines for the face-to-face delivery:</p>
                                                        <p>1. Strictly observe the minimum health protocols set by the university.</p>
                                                        <p>2. Check your schedule on the class Facebook page before going to school.</p>
                                                        <p>3. Be mindful of your classmates and teacher's time. Be alert, constructive, and responsive.</p>
                                                    </td>
                                                    <td className="border border-black p-3 space-y-4">
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-[9pt] mb-2">Synchronous Sessions:</p>
                                                            <p>1. Check your device ahead of your scheduled synchronous meeting (camera, microphone, keyboard, speakers, etc.)</p>
                                                            <p>2. Attend the synchronous class on time.</p>
                                                            <p>3. Be ready to turn on your microphone and camera anytime.</p>
                                                            <p>4. Choose a comfortable space to attend the online class.</p>
                                                            <p>5. Click the 'raise hand' button and wait to be acknowledged by the teacher(s) before unmuting your microphone.</p>
                                                            <p>6. Do not abuse the chatbox.</p>
                                                            <p>7. Read the assigned materials before attending the class.</p>
                                                            <p>8. Be mindful of your classmates and teacher's time. Be alert, constructive, and responsive.</p>
                                                        </div>
                                                        <div className="pt-2 border-t border-slate-200">
                                                            <p className="font-bold text-slate-800 text-[9pt] mb-2">Asynchronous Sessions:</p>
                                                            <p>1. Study the sections and functions of the assigned learning management system (LMS) ahead of time.</p>
                                                            <p>2. Check the expected submission/turn in schedule at all times. For some timed activities, late submission may cause deductions to your grades. For group activities, discuss the best time and platform to discuss the assignment of tasks with your groupmates.</p>
                                                            <p>3. Ask for help from your teacher(s) and classmates when necessary. (Follow the rules on sending an effective email to your teacher. A separate discussion shall be allotted for this.)</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <CustomPageFooter />
                                    </div>

                                    {/* Step4 Page 2: Requirements & Grading */}
                                    <PageDivider pageNum={nextPage()} step={4} stepNum="Page 2" title="Requirements & Grading" />
                                    <div className={pageBase}>
                                        <CustomPageHeader />
                                        <div className="w-full bg-slate-100 border border-black p-1 text-center font-bold text-[10pt] uppercase mb-4">
                                            COURSE REQUIREMENTS & EVALUATION
                                        </div>
                                        <div className="grid grid-cols-5 border border-black min-h-[100mm]">
                                            <div className="col-span-3 border-r border-black p-4">
                                                <h3 className="font-bold text-[9pt] mb-3 uppercase underline">Course Requirements</h3>
                                                <ul className="list-disc ml-5 space-y-4 text-[8.5pt]">
                                                    {requirements.map((req: any, i: number) => (
                                                        <li key={i}>
                                                            <span className="font-bold">{req.text}</span>
                                                            {req.clo && <span className="ml-2 italic text-slate-500">({req.clo})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="col-span-2 p-4">
                                                <h3 className="font-bold text-[9pt] mb-3 uppercase underline">Grading System</h3>
                                                <div className="space-y-4">
                                                    {gradingComponents.map((comp: any) => (
                                                        <div key={comp.id} className="flex justify-between items-start text-[8.5pt] border-b border-dotted border-slate-300 pb-2">
                                                            <div>
                                                                <p className="font-bold">{comp.label}</p>
                                                                <p className="text-[7pt] text-slate-500">{comp.subItems?.map((s: any) => s.label).join(', ')}</p>
                                                            </div>
                                                            <p className="font-bold">{comp.percentage}%</p>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 flex justify-between font-black text-[10pt] border-t-2 border-black">
                                                        <span>TOTAL</span><span>100%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <CustomPageFooter />
                                    </div>

                                    {/* ══════════════════════════════════════════════
                                        STEP 5 PAGES — Rubrics, Group Grade, Signatories
                                        (mirrors Step5.tsx preview exactly)
                                    ══════════════════════════════════════════════ */}
                                    {paginatedRubrics.map((pageRubrics: any[], pageIdx: number) => (
                                        <React.Fragment key={pageIdx}>
                                        <PageDivider
                                            pageNum={nextPage()}
                                            step={5}
                                            stepNum={paginatedRubrics.length > 1 ? `Part ${pageIdx + 1} of ${paginatedRubrics.length}` : undefined}
                                            title="Rubrics, Group Grade & Signatories"
                                        />
                                        <div className={pageBase}>
                                            <CustomPageHeader />
                                            <hr className="border-black border mb-2"/>
                                            <div className="text-[8pt]">
                                                <p className="font-bold mb-1">
                                                    {pageIdx === 0 ? 'Part 1. ' : ''}Rubrics for Assessment (to be filled out by the assigned faculty)
                                                </p>
                                                <table className="w-full border border-black border-collapse mt-1">
                                                    <thead>
                                                        <tr>
                                                            <th rowSpan={2} className="border w-[20%] p-1">Skills</th>
                                                            <th className="border text-center p-1">4</th>
                                                            <th className="border text-center p-1">3</th>
                                                            <th className="border text-center p-1">2</th>
                                                            <th className="border text-center p-1">1</th>
                                                        </tr>
                                                        <tr>
                                                            <th className="border p-1">Advanced</th>
                                                            <th className="border p-1">Competent</th>
                                                            <th className="border p-1">Progressing</th>
                                                            <th className="border p-1">Beginning</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pageRubrics.map((r: any) => (
                                                            <tr key={r.id}>
                                                                <td className="border font-bold p-1">{r.skills}</td>
                                                                <td className="border p-1">{r.v4}</td>
                                                                <td className="border p-1">{r.v3}</td>
                                                                <td className="border p-1">{r.v2}</td>
                                                                <td className="border p-1">{r.v1}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {/* Group Grade, Class/Faculty Info, Signatories — only on first rubric page */}
                                                {pageIdx === 0 && (
                                                    <>
                                                        <p className="mt-2 font-bold">Part 2. Group grade</p>
                                                        <table className="w-full border border-black border-collapse">
                                                            <thead>
                                                                <tr>
                                                                    <th className="border p-1">Criteria</th>
                                                                    <th className="border text-center p-1">1</th>
                                                                    <th className="border text-center p-1">2</th>
                                                                    <th className="border text-center p-1">3</th>
                                                                    <th className="border text-center p-1">4</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {groupCriteria.map((g: any, i: number) => (
                                                                    <tr key={g.id}>
                                                                        <td className="border p-1">{i + 1}. {g.label} ({g.weight}%)</td>
                                                                        {[1,2,3,4].map(n => (
                                                                            <td key={n} className="border text-center p-1">{g.score === n ? '✔' : ''}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>

                                                        <table className="w-full border border-black border-collapse mt-2">
                                                            <thead>
                                                                <tr>
                                                                    <th className="border p-1">CLASS INFORMATION</th>
                                                                    <th className="border p-1">FACULTY INFORMATION</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td className="border p-2 text-[7.5pt]">
                                                                        Section: {classInfo.section}<br/>
                                                                        Time: {classInfo.time}<br/>
                                                                        Room: {classInfo.room}<br/>
                                                                        Semester: {classInfo.semester}
                                                                    </td>
                                                                    <td className="border p-2 text-[7.5pt]">
                                                                        Name of Faculty: {facultyInfo.name}<br/>
                                                                        Consultation Time: {facultyInfo.consultation}<br/>
                                                                        Office Tel. No./ Mobile Phone No.: {facultyInfo.contact}<br/>
                                                                        Institutional Email: {facultyInfo.email}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>

                                                        <table className="w-full border border-black border-collapse mt-2 text-center">
                                                            <tbody>
                                                                <tr>
                                                                    {signatories.map((s: any) => (
                                                                        <td key={s.id} className="border h-24 align-bottom p-2">
                                                                            {s.signature && <img src={s.signature} className="h-10 mx-auto" alt="signature"/>}
                                                                            <br/>
                                                                            <span className="font-bold uppercase text-[8pt]">{s.name || '______________________'}</span><br/>
                                                                            <span className="text-[7pt]">{s.title}</span><br/>
                                                                            <span className="text-[7pt] italic">{s.role}</span>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </>
                                                )}
                                            </div>
                                            <CustomPageFooter />
                                        </div>
                                        </React.Fragment>
                                    ))}

                                    {/* Bottom spacer */}
                                    <div className="h-8" />

                                </div>{/* end scale wrapper */}
                                </div>{/* end centering wrapper */}
                                </div>{/* end scrollable pages */}
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* STICKY FOOTER */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="max-w-7xl mx-auto flex justify-center sm:justify-end items-center">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            href={isEditMode && syllabusHash
                                ? route('syllabus.step5.edit', { hash: syllabusHash })
                                : "/syllabus-generator/step-5"}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 text-xs md:text-sm border border-slate-200 transition-all active:scale-95"
                        >
                            <ChevronLeft size={16} /> <span>Back</span>
                        </Link>

                        <button
                            onClick={handleGenerateSyllabus}
                            disabled={
                                checkedItems.length < checklistOptions.length ||
                                isGenerating ||
                                !headerContent.replace(/<[^>]*>/g, '').trim() ||
                                !footerContent.replace(/<[^>]*>/g, '').trim()
                            }
                            title={
                                !headerContent.replace(/<[^>]*>/g, '').trim()
                                    ? 'Header content is required'
                                    : !footerContent.replace(/<[^>]*>/g, '').trim()
                                    ? 'Footer content is required'
                                    : checkedItems.length < checklistOptions.length
                                    ? 'Please check all checklist items'
                                    : ''
                            }
                            className="flex-[2] sm:flex-none cursor-pointer flex items-center justify-center gap-1.5 px-4 sm:px-8 py-3 rounded-xl font-bold text-xs md:text-sm shadow-md bg-[#800000] text-white hover:bg-[#600000] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                    </svg>
                                    <span className="hidden sm:inline">{exportFormat === 'gdocs' ? 'Uploading...' : 'Generating...'}</span>
                                </>
                            ) : (
                                <>
                                    {exportFormat === 'gdocs'
                                        ? <><span>Open in</span> <span className="hidden sm:inline">Google</span> Docs <ChevronRight size={16} /></>
                                        : <>Finish <span className="hidden sm:inline">& Complete</span> <ChevronRight size={16} /></>
                                    }
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </footer>

            {/* Success Notification */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-8 z-[100] bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-2xl border-l-8 border-[#4B6333] flex items-center gap-4 max-w-sm"
                    >
                        <div className="bg-green-100 p-2 md:p-3 rounded-xl shrink-0">
                            <Download className="text-[#4B6333]" size={20} />
                        </div>
                        <div>
                            <h4 className="text-slate-900 font-black text-xs md:text-sm">
                                {exportFormat === 'gdocs' ? 'Opened in Google Docs' : 'Download Started'}
                            </h4>
                            <p className="text-slate-500 text-[10px] md:text-xs font-bold truncate max-w-[200px]">
                                {exportFormat === 'gdocs' ? 'Check your Google Drive — edit anytime.' : `Saved as ${fileName}.`}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Step6;