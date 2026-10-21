'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Volume2,
  Eye,
  ZoomIn,
  CheckCircle2,
  PaintBucket,
  ArrowUpRight,
  MousePointer,
  RotateCcw,
  Sparkles,
  Check,
  Circle,
  Move,
} from 'lucide-react';
import type { StudioConfigPage, InteractiveItem } from './types';

interface Props {
  page: StudioConfigPage;
  pageNumber: number;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const PAINT_PALETTE = [
  '#ef4444', // Rouge
  '#f97316', // Orange
  '#facc15', // Jaune
  '#22c55e', // Vert
  '#06b6d4', // Cyan
  '#3b82f6', // Bleu
  '#8b5cf6', // Violet
  '#ec4899', // Rose
  '#78350f', // Marron
  '#ffffff', // Blanc / Effacer
];

export default function LivePreviewModal({
  page,
  pageNumber,
  onClose,
  onToast,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioInstancesRef = useRef<Record<string, HTMLAudioElement>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [revealedItems, setRevealedItems] = useState<Record<string, boolean>>({});
  const [zoomModalSrc, setZoomModalSrc] = useState<string | null>(null);
  const [videoModalSrc, setVideoModalSrc] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(3 / 4);

  // Student tools state
  const [studentTool, setStudentTool] = useState<'pointer' | 'paint' | 'arrow' | 'circle'>('pointer');
  const [activePaintColor, setActivePaintColor] = useState<string>('#3b82f6');
  const [coloredRegions, setColoredRegions] = useState<Record<string, string>>({});
  const [coloredDrawings, setColoredDrawings] = useState<Record<string, string>>({});
  const [drawingEvaluations, setDrawingEvaluations] = useState<Record<string, 'correct' | 'incorrect' | 'missing'>>({});

  // Student Arrows state
  const [studentArrows, setStudentArrows] = useState<
    Array<{ id: string; startX: number; startY: number; endX: number; endY: number }>
  >([]);
  const [arrowDraft, setArrowDraft] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [arrowFeedback, setArrowFeedback] = useState<
    Record<string, { status: 'correct' | 'incorrect'; expected?: InteractiveItem }>
  >({});
  const [missingArrows, setMissingArrows] = useState<InteractiveItem[]>([]);
  const isDraggingArrowRef = useRef<boolean>(false);
  const arrowDragStartRef = useRef<[number, number] | null>(null);

  // Choice Zones state
  // Single choice: questionId -> selected item ID (evaluated immediately)
  const [singleChoiceSelections, setSingleChoiceSelections] = useState<Record<string, string>>({});
  // Multiple choice: questionId -> array of selected item IDs
  const [multiChoiceSelections, setMultiChoiceSelections] = useState<Record<string, string[]>>({});
  // Multiple choice evaluated state: questionId -> boolean
  const [multiChoiceEvaluated, setMultiChoiceEvaluated] = useState<Record<string, boolean>>({});

  // Circle Exercise state: questionId -> selected option item ID (immediate evaluation)
  const [circleSelections, setCircleSelections] = useState<Record<string, string>>({});

  // Drag-and-Drop state
  const [dragPlacements, setDragPlacements] = useState<
    Record<string, { x: number; y: number; isPlaced: boolean; targetId?: string }>
  >({});
  const [dragErrorIds, setDragErrorIds] = useState<Record<string, boolean>>({});
  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{
    id: string;
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Render canvas from page cache or offscreen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const offscreen = document.getElementById('studio-main-cv') as HTMLCanvasElement | null;
    if (offscreen && offscreen.width > 0) {
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      setAspectRatio(offscreen.width / offscreen.height);
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(offscreen, 0, 0);
    }

    // Autoplay audios
    page.items
      .filter((it) => it.type === 'audio' && it.autoplay && it.fileUrl)
      .forEach((it) => {
        try {
          const a = new Audio(it.fileUrl);
          audioInstancesRef.current[it.id] = a;
          a.play().catch(() => {});
        } catch {}
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomModalSrc) setZoomModalSrc(null);
        else if (videoModalSrc) setVideoModalSrc(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      Object.values(audioInstancesRef.current).forEach((a) => {
        try {
          a.pause();
        } catch {}
      });
    };
  }, [page, onClose, zoomModalSrc, videoModalSrc]);

  const speakText = (text?: string, lang?: string, rate?: number) => {
    if (!text) {
      onToast('Aucun texte à lire configuré.');
      return;
    }
    const cleanText = text.trim();
    if (!cleanText) return;

    // Stop existing audio and speech
    if (typeof window !== 'undefined') {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      Object.values(audioInstancesRef.current).forEach((a) => a.pause());
      setPlayingAudioId(null);
    }

    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(cleanText);
    const targetLang = (hasArabic || lang === 'ar-SA' || (lang && lang.startsWith('ar'))) ? 'ar-SA' : (lang || 'fr-FR');

    const speakWebSpeech = () => {
      if (!('speechSynthesis' in window)) {
        onToast('Synthèse vocale indisponible dans votre navigateur.');
        return;
      }
      try {
        window.speechSynthesis.cancel();
        if (typeof window.speechSynthesis.resume === 'function') {
          window.speechSynthesis.resume();
        }
        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = targetLang;
        u.rate = rate || 0.9;
        if ('getVoices' in window.speechSynthesis) {
          const voices = window.speechSynthesis.getVoices();
          if (hasArabic || targetLang.startsWith('ar')) {
            const arVoice = voices.find(
              (v) =>
                v.lang?.startsWith('ar') ||
                v.name?.toLowerCase().includes('arabic') ||
                v.name?.includes('عرب') ||
                v.name?.includes('Hoda') ||
                v.name?.includes('Naayf') ||
                v.name?.includes('Laila') ||
                v.name?.includes('Tarik')
            );
            if (arVoice) u.voice = arVoice;
          } else if (targetLang) {
            const exactVoice = voices.find(
              (v) => v.lang && v.lang.replace('_', '-').toLowerCase() === targetLang.toLowerCase()
            );
            const prefixVoice = voices.find(
              (v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase())
            );
            const matchVoice = exactVoice || prefixVoice;
            if (matchVoice) u.voice = matchVoice;
          }
        }
        window.speechSynthesis.speak(u);
      } catch {
        onToast('Erreur de synthèse vocale.');
      }
    };

    // For Arabic text: use high-quality Arabic TTS via local /api/tts endpoint
    if (hasArabic || targetLang.startsWith('ar')) {
      const chunks: string[] = [];
      let rem = cleanText;
      while (rem.length > 0) {
        if (rem.length <= 180) {
          chunks.push(rem);
          break;
        }
        let splitIdx = rem.lastIndexOf(' ', 180);
        if (splitIdx <= 0) splitIdx = 180;
        chunks.push(rem.slice(0, splitIdx).trim());
        rem = rem.slice(splitIdx).trim();
      }

      let chunkIdx = 0;
      const playNext = () => {
        if (chunkIdx >= chunks.length) return;
        const textChunk = chunks[chunkIdx++];
        const audio = new Audio(`/api/tts?tl=ar&text=${encodeURIComponent(textChunk)}`);
        audioInstancesRef.current['__tts_stream__'] = audio;
        audio.onended = () => playNext();
        audio.onerror = () => speakWebSpeech();
        audio.play().catch(() => speakWebSpeech());
      };

      playNext();
      return;
    }

    speakWebSpeech();
  };

  const toggleAudio = (it: InteractiveItem) => {
    if (!it.fileUrl) {
      onToast('Aucun fichier audio configuré.');
      return;
    }
    let a = audioInstancesRef.current[it.id];
    if (!a) {
      a = new Audio(it.fileUrl);
      audioInstancesRef.current[it.id] = a;
      a.onended = () => setPlayingAudioId(null);
    }

    if (playingAudioId === it.id) {
      a.pause();
      setPlayingAudioId(null);
    } else {
      Object.values(audioInstancesRef.current).forEach((aud) => aud.pause());
      a.play().catch(() => {});
      setPlayingAudioId(it.id);
    }
  };

  const handleZoom = (it: InteractiveItem) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width * it.w;
    const ch = canvas.height * it.h;
    const zoomLevel = it.level || 2.5;

    const zCanvas = document.createElement('canvas');
    zCanvas.width = cw * zoomLevel;
    zCanvas.height = ch * zoomLevel;
    const zCtx = zCanvas.getContext('2d');
    if (zCtx) {
      zCtx.drawImage(
        canvas,
        canvas.width * it.x,
        canvas.height * it.y,
        cw,
        ch,
        0,
        0,
        zCanvas.width,
        zCanvas.height
      );
      setZoomModalSrc(zCanvas.toDataURL());
    }
  };

  // Helper for coordinates relative to page stage (0..1)
  const getStageRelativePos = (e: React.PointerEvent<HTMLDivElement>): [number, number] => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return [x, y];
  };

  // Student Arrow Pointer Handlers
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (studentTool !== 'arrow') return;
    if (e.button !== 0) return;
    const pos = getStageRelativePos(e);
    isDraggingArrowRef.current = true;
    arrowDragStartRef.current = pos;
    setArrowDraft({ startX: pos[0], startY: pos[1], endX: pos[0], endY: pos[1] });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingArrowRef.current || !arrowDragStartRef.current) return;
    const pos = getStageRelativePos(e);
    setArrowDraft({
      startX: arrowDragStartRef.current[0],
      startY: arrowDragStartRef.current[1],
      endX: pos[0],
      endY: pos[1],
    });
  };

  const handleStagePointerUp = () => {
    if (!isDraggingArrowRef.current || !arrowDragStartRef.current || !arrowDraft) return;
    isDraggingArrowRef.current = false;
    arrowDragStartRef.current = null;

    const dist = Math.hypot(
      arrowDraft.endX - arrowDraft.startX,
      arrowDraft.endY - arrowDraft.startY
    );
    if (dist >= 0.02) {
      // Clear previous feedback when student changes or adds an arrow
      setArrowFeedback({});
      setMissingArrows([]);
      const newArrow = {
        id: `student_arrow_${Date.now()}_${Math.random()}`,
        startX: arrowDraft.startX,
        startY: arrowDraft.startY,
        endX: arrowDraft.endX,
        endY: arrowDraft.endY,
      };
      setStudentArrows((prev) => [...prev, newArrow]);
    }
    setArrowDraft(null);
  };

  // Reset exercise states
  const handleReset = () => {
    setColoredRegions({});
    setColoredDrawings({});
    setDrawingEvaluations({});
    setStudentArrows([]);
    setArrowFeedback({});
    setMissingArrows([]);
    setSingleChoiceSelections({});
    setMultiChoiceSelections({});
    setMultiChoiceEvaluated({});
    setCircleSelections({});
    setDragPlacements({});
    setDragErrorIds({});
    setRevealedItems({});
    onToast('Exercices réinitialisés.');
  };

  // Global Correction Action ("Corriger")
  const handleCorrect = () => {
    let ok = 0;
    let total = 0;

    // 1. Text blanks
    const blankInputs = document.querySelectorAll<HTMLInputElement>('input[data-blank-answer]');
    blankInputs.forEach((inp) => {
      total++;
      const ans = inp.dataset.blankAnswer || '';
      const cs = inp.dataset.blankCs === 'true';
      const userVal = inp.value.trim();
      const good = cs ? userVal === ans : userVal.toLowerCase() === ans.toLowerCase();
      if (good && ans !== '') ok++;
      inp.style.borderColor = good ? '#22c55e' : '#ef4444';
      inp.style.borderStyle = 'solid';
    });

    // 2. Checkboxes
    const checkInputs = document.querySelectorAll<HTMLInputElement>('input[data-check-correct]');
    checkInputs.forEach((chk) => {
      total++;
      const shouldBeChecked = chk.dataset.checkCorrect === 'true';
      const good = chk.checked === shouldBeChecked;
      if (good) ok++;
      chk.style.outline = `2px solid ${good ? '#22c55e' : '#ef4444'}`;
    });

    // 3. Arrow Exercises
    const expectedArrows = page.items.filter(
      (it) => it.type === 'arrow' && it.startX !== undefined && it.endX !== undefined
    );

    if (expectedArrows.length > 0) {
      total += expectedArrows.length;
      const newFeedback: Record<
        string,
        { status: 'correct' | 'incorrect'; expected?: InteractiveItem }
      > = {};
      const matchedExpectedIds = new Set<string>();
      const assignedStudentIds = new Set<string>();

      // 1. Collect all candidate matches within strict configured tolerance
      interface ArrowCandidate {
        student: { id: string; startX: number; startY: number; endX: number; endY: number };
        expected: InteractiveItem;
        dist: number;
      }
      const candidates: ArrowCandidate[] = [];

      studentArrows.forEach((sa) => {
        expectedArrows.forEach((ea) => {
          const tol = Number(ea.tolerance) > 0 ? Number(ea.tolerance) : 0.06;

          // Standard direction
          const dStart = Math.hypot(sa.startX - ea.startX!, sa.startY - ea.startY!);
          const dEnd = Math.hypot(sa.endX - ea.endX!, sa.endY - ea.endY!);
          const isDirect = dStart <= tol && dEnd <= tol;

          // Swapped direction if bidirectional
          let isReverse = false;
          let dStartRev = 0;
          let dEndRev = 0;
          if (ea.bidirectional) {
            dStartRev = Math.hypot(sa.startX - ea.endX!, sa.startY - ea.endY!);
            dEndRev = Math.hypot(sa.endX - ea.startX!, sa.endY - ea.startY!);
            isReverse = dStartRev <= tol && dEndRev <= tol;
          }

          if (isDirect || isReverse) {
            const dist = isDirect && isReverse
              ? Math.min(dStart + dEnd, dStartRev + dEndRev)
              : isDirect
              ? dStart + dEnd
              : dStartRev + dEndRev;
            candidates.push({ student: sa, expected: ea, dist });
          }
        });
      });

      // Sort candidate matches by distance ascending for optimal pairing
      candidates.sort((a, b) => a.dist - b.dist);

      candidates.forEach(({ student: sa, expected: ea }) => {
        if (assignedStudentIds.has(sa.id) || matchedExpectedIds.has(ea.id)) return;
        assignedStudentIds.add(sa.id);
        matchedExpectedIds.add(ea.id);
        newFeedback[sa.id] = { status: 'correct', expected: ea };
        ok++;
      });

      // 2. Any student arrow NOT matched within tolerance is strictly incorrect
      const attemptedExpectedIds = new Set<string>(matchedExpectedIds);
      studentArrows.forEach((sa) => {
        if (assignedStudentIds.has(sa.id)) return;

        // Pair with closest unmatched expected arrow for correction feedback
        let closestExpected: InteractiveItem | undefined = undefined;
        let minD = Infinity;
        expectedArrows.forEach((ea) => {
          if (attemptedExpectedIds.has(ea.id)) return;
          const d = Math.hypot(sa.startX - ea.startX!, sa.startY - ea.startY!);
          if (d < minD) {
            minD = d;
            closestExpected = ea;
          }
        });

        if (closestExpected) {
          attemptedExpectedIds.add((closestExpected as InteractiveItem).id);
        }
        newFeedback[sa.id] = { status: 'incorrect', expected: closestExpected };
      });

      // 3. Expected arrows not completed are marked as missing
      const missing = expectedArrows.filter((ea) => !attemptedExpectedIds.has(ea.id));
      setArrowFeedback(newFeedback);
      setMissingArrows(missing);
    }

    // 4. Interactive Choice Zones (Multiple-choice questions)
    const multiQuestions = Array.from(
      new Set(
        page.items
          .filter((it) => it.type === 'choice' && it.selectionMode === 'multiple')
          .map((it) => it.questionId || 'Q1')
      )
    );

    const evaluatedModes: Record<string, boolean> = {};
    multiQuestions.forEach((qId) => {
      total++;
      evaluatedModes[qId] = true;
      const qItems = page.items.filter(
        (it) => it.type === 'choice' && (it.questionId || 'Q1') === qId
      );
      const correctItemIds = qItems.filter((it) => it.isCorrect).map((it) => it.id);
      const studentSelected = multiChoiceSelections[qId] || [];

      // Fully correct: student selection contains every correct option and NO incorrect options
      const hasAllCorrect = correctItemIds.every((id) => studentSelected.includes(id));
      const hasNoIncorrect = studentSelected.every((id) => correctItemIds.includes(id));
      if (hasAllCorrect && hasNoIncorrect && correctItemIds.length > 0) {
        ok++;
      }
    });
    setMultiChoiceEvaluated((prev) => ({ ...prev, ...evaluatedModes }));

    // 5. Single-choice questions total
    const singleQuestions = Array.from(
      new Set(
        page.items
          .filter((it) => it.type === 'choice' && it.selectionMode !== 'multiple')
          .map((it) => it.questionId || 'Q1')
      )
    );
    singleQuestions.forEach((qId) => {
      total++;
      const selectedId = singleChoiceSelections[qId];
      if (selectedId) {
        const item = page.items.find((it) => it.id === selectedId);
        if (item && item.isCorrect) ok++;
      }
    });

    // 6. Color the Correct Drawings evaluation
    const colorCorrectItems = page.items.filter((it) => it.type === 'colorCorrect');
    if (colorCorrectItems.length > 0) {
      const drawingGroups: Record<string, InteractiveItem[]> = {};
      colorCorrectItems.forEach((it) => {
        const dId = it.drawingId || it.id;
        drawingGroups[dId] = drawingGroups[dId] || [];
        drawingGroups[dId].push(it);
      });

      const dEval: Record<string, 'correct' | 'incorrect' | 'missing'> = {};
      Object.keys(drawingGroups).forEach((dId) => {
        total++;
        const group = drawingGroups[dId];
        const isExpectedCorrect = group.some((it) => it.isCorrect);
        const isColored = !!coloredDrawings[dId] || group.some((it) => !!coloredRegions[it.id]);

        if (isColored && isExpectedCorrect) {
          dEval[dId] = 'correct';
          ok++;
        } else if (isColored && !isExpectedCorrect) {
          dEval[dId] = 'incorrect';
        } else if (!isColored && isExpectedCorrect) {
          dEval[dId] = 'missing';
        }
      });
      setDrawingEvaluations(dEval);
    }

    // 7. Circle Exercise questions
    const circleQuestions = Array.from(
      new Set(
        page.items
          .filter((it) => it.type === 'circleExercise')
          .map((it) => it.questionId || 'Q1')
      )
    );
    circleQuestions.forEach((qId) => {
      total++;
      const selectedId = circleSelections[qId];
      if (selectedId) {
        const item = page.items.find((it) => it.id === selectedId);
        if (item && item.isCorrect) ok++;
      }
    });

    // 8. Drag and Drop Exercise questions
    const dragItems = page.items.filter(
      (it) => it.type === 'dragDrop' && it.dragDropMode === 'drag'
    );
    if (dragItems.length > 0) {
      dragItems.forEach((di) => {
        total++;
        if (dragPlacements[di.id]?.isPlaced) {
          ok++;
        }
      });
    }

    onToast(
      total > 0
        ? `Résultat de l'exercice : ${ok} / ${total} réponse(s) correcte(s)`
        : 'Aucun exercice configuré sur cette page.'
    );
  };

  const clipPolygon = (pts?: [number, number][]) => {
    if (!pts || pts.length < 3) return undefined;
    return `polygon(${pts.map((q) => `${q[0]}% ${q[1]}%`).join(',')})`;
  };

  // Choice zone selection handlers
  const handleChoiceClick = (it: InteractiveItem) => {
    const qId = it.questionId || 'Q1';

    if (it.selectionMode === 'multiple') {
      // Multiple-choice: toggle selection neutrally; reset evaluation feedback so stale results clear
      setMultiChoiceEvaluated((prev) => ({ ...prev, [qId]: false }));
      setMultiChoiceSelections((prev) => {
        const current = prev[qId] || [];
        const next = current.includes(it.id)
          ? current.filter((id) => id !== it.id)
          : [...current, it.id];
        return { ...prev, [qId]: next };
      });
    } else {
      // Single-choice: immediate evaluation! Replaces previous selection
      setSingleChoiceSelections((prev) => ({ ...prev, [qId]: it.id }));
    }
  };

  // Circle zone selection handler
  const handleCircleClick = (it: InteractiveItem) => {
    if (studentTool !== 'circle') return;
    const qId = it.questionId || 'Q1';
    setCircleSelections((prev) => ({ ...prev, [qId]: it.id }));

    if (it.isCorrect) {
      onToast('Bonne réponse ! ⭐');
    } else {
      onToast('Réponse incorrecte. Essayez encore !');
    }
  };

  // Paint region fill handler
  const handlePaintRegionClick = (it: InteractiveItem) => {
    if (studentTool !== 'paint') return;
    const regKey = it.regionId || it.id;
    setColoredRegions((prev) => ({
      ...prev,
      [regKey]: activePaintColor,
    }));
  };

  // Drag-and-Drop Pointer Handlers
  const handleDragItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    it: InteractiveItem
  ) => {
    if (studentTool === 'arrow') return;
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const curPlacement = dragPlacements[it.id];
    const curX = curPlacement ? curPlacement.x : it.x;
    const curY = curPlacement ? curPlacement.y : it.y;

    dragStartRef.current = {
      id: it.id,
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: curX,
      startY: curY,
    };
    setActiveDraggingId(it.id);
    setDragErrorIds((prev) => ({ ...prev, [it.id]: false }));
  };

  const handleDragItemPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    it: InteractiveItem
  ) => {
    if (!dragStartRef.current || dragStartRef.current.id !== it.id) return;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const dx = (e.clientX - dragStartRef.current.pointerX) / stageRect.width;
    const dy = (e.clientY - dragStartRef.current.pointerY) / stageRect.height;

    setDragPlacements((prev) => ({
      ...prev,
      [it.id]: {
        x: dragStartRef.current!.startX + dx,
        y: dragStartRef.current!.startY + dy,
        isPlaced: false,
      },
    }));
  };

  const handleDragItemPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    it: InteractiveItem
  ) => {
    if (!dragStartRef.current || dragStartRef.current.id !== it.id) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const curPlacement = dragPlacements[it.id];
    const finalX = curPlacement ? curPlacement.x : it.x;
    const finalY = curPlacement ? curPlacement.y : it.y;

    dragStartRef.current = null;
    setActiveDraggingId(null);

    // Hit-test drop targets on page
    const centerX = finalX + it.w / 2;
    const centerY = finalY + it.h / 2;

    const dropZones = page.items.filter(
      (item) => item.type === 'dragDrop' && item.dragDropMode === 'drop'
    );
    let hitTarget: InteractiveItem | null = null;

    dropZones.forEach((dz) => {
      if (
        centerX >= dz.x &&
        centerX <= dz.x + dz.w &&
        centerY >= dz.y &&
        centerY <= dz.y + dz.h
      ) {
        hitTarget = dz;
      }
    });

    if (hitTarget) {
      const acceptedId = (hitTarget as InteractiveItem).targetDragId;
      if (acceptedId && acceptedId === it.dragId) {
        // Correct match! Snap into drop target
        setDragPlacements((prev) => ({
          ...prev,
          [it.id]: {
            x: (hitTarget as InteractiveItem).x,
            y: (hitTarget as InteractiveItem).y,
            isPlaced: true,
            targetId: (hitTarget as InteractiveItem).id,
          },
        }));
        onToast('Élément bien placé ! ⭐');
        return;
      } else {
        // Wrong target
        setDragErrorIds((prev) => ({ ...prev, [it.id]: true }));
        onToast('Mauvais emplacement. Essayez encore !');
      }
    } else {
      // Outside any drop target
      setDragErrorIds((prev) => ({ ...prev, [it.id]: true }));
    }

    // Reset back to original coords
    setDragPlacements((prev) => ({
      ...prev,
      [it.id]: {
        x: it.x,
        y: it.y,
        isPlaced: false,
      },
    }));

    setTimeout(() => {
      setDragErrorIds((prev) => ({ ...prev, [it.id]: false }));
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 select-none"
    >
      {/* Top Header & Student Exercise Toolbar */}
      <div className="absolute top-3 left-0 right-0 flex items-center justify-between px-4 sm:px-6 z-30">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Aperçu élève · Page {pageNumber}
          </span>
        </div>

        {/* Floating Student Tools */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-sm">
          {/* Pointer tool */}
          <button
            type="button"
            onClick={() => setStudentTool('pointer')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              studentTool === 'pointer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800',
            ].join(' ')}
            title="Curseur interactif / Sélection"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Naviguer</span>
          </button>

          {/* Paint Bucket tool */}
          <button
            type="button"
            onClick={() => setStudentTool('paint')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              studentTool === 'paint'
                ? 'bg-pink-600 text-white shadow-sm ring-2 ring-pink-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800',
            ].join(' ')}
            title="Pot de peinture : colorier les zones fermées"
          >
            <PaintBucket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pot de peinture</span>
          </button>

          {/* Arrow Drawing tool */}
          <button
            type="button"
            onClick={() => setStudentTool('arrow')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              studentTool === 'arrow'
                ? 'bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800',
            ].join(' ')}
            title="Tracer les flèches"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flèches</span>
          </button>

          {/* Circle Exercise tool */}
          <button
            type="button"
            onClick={() => setStudentTool('circle')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              studentTool === 'circle'
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800',
            ].join(' ')}
            title="Entourer la zone"
          >
            <Circle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Entourer</span>
          </button>

          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Global Corriger Button */}
          <button
            type="button"
            onClick={handleCorrect}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 active:scale-95 transition"
            title="Valider l'ensemble des exercices de la page"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Corriger</span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Réinitialiser l'exercice"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs sm:text-sm font-semibold transition active:scale-95"
        >
          <X className="w-4 h-4" />
          <span>Fermer</span>
        </button>
      </div>

      {/* Floating Paint Palette Bar when Paint Bucket is active */}
      {studentTool === 'paint' && (
        <div className="absolute top-16 z-30 flex items-center gap-2 bg-slate-900/95 border border-pink-500/40 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5 mr-1">
            <PaintBucket className="w-4 h-4" />
            <span>Palette :</span>
          </span>
          <div className="flex items-center gap-1.5">
            {PAINT_PALETTE.map((c) => {
              const isSelected = activePaintColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActivePaintColor(c)}
                  className={[
                    'w-6 h-6 rounded-full transition-transform border border-black/30 flex items-center justify-center',
                    isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md' : 'hover:scale-110',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                  title={c === '#ffffff' ? 'Blanc / Effacer' : c}
                >
                  {isSelected && (
                    <Check
                      className="w-3 h-3 drop-shadow"
                      style={{ color: c === '#ffffff' || c === '#facc15' ? '#0f172a' : '#ffffff' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Page Stage */}
      <div
        ref={stageRef}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        className={[
          'relative shadow-2xl rounded-lg overflow-hidden bg-white mt-12 max-h-[80vh] touch-none',
          studentTool === 'arrow' ? 'cursor-crosshair' : studentTool === 'paint' ? 'cursor-cell' : 'cursor-default',
        ].join(' ')}
        style={{ width: `min(94vw, calc(80vh * ${aspectRatio}))` }}
      >
        <canvas ref={canvasRef} className="block w-full bg-white select-none pointer-events-none" />

        {/* Live Interactivity Overlay */}
        <div className="absolute inset-0">
          {page.items.map((it) => {
            const col = it.color || '#6366f1';
            const left = `${it.x * 100}%`;
            const top = `${it.y * 100}%`;
            const width = `${it.w * 100}%`;
            const height = `${it.h * 100}%`;

            // 1. Highlight
            if (it.type === 'highlight') {
              return (
                <div
                  key={it.id}
                  title={it.note || ''}
                  className="absolute cursor-help transition-opacity hover:opacity-90 rounded-sm"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: col,
                    opacity: 0.38,
                    mixBlendMode: 'multiply',
                  }}
                />
              );
            }

            // 2. Lasso
            if (it.type === 'lasso') {
              return (
                <div
                  key={it.id}
                  onClick={() => it.read && speakText(it.text, it.lang, 1)}
                  className={[
                    'absolute transition-opacity',
                    it.read ? 'cursor-pointer hover:opacity-80' : '',
                  ].join(' ')}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: `${col}66`,
                    clipPath: clipPolygon(it.pts),
                  }}
                  title={it.read ? 'Cliquer pour écouter' : ''}
                />
              );
            }

            // 3. TTS
            if (it.type === 'tts') {
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => speakText(it.text, it.lang, it.rate)}
                  title="Écouter le texte"
                  className="absolute flex items-center justify-center rounded-lg border text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: `${col}33`,
                    borderColor: col,
                    color: '#ffffff',
                  }}
                >
                  <Volume2 className="w-4 h-4 text-sky-400 drop-shadow" />
                </button>
              );
            }

            // 4. Audio
            if (it.type === 'audio') {
              const isPlaying = playingAudioId === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggleAudio(it)}
                  title={it.label || 'Lecture audio'}
                  className="absolute flex items-center justify-center rounded-lg border text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: `${col}33`,
                    borderColor: col,
                    color: '#ffffff',
                  }}
                >
                  <Play
                    className={[
                      'w-4 h-4 text-pink-400 transition-transform',
                      isPlaying ? 'animate-pulse' : '',
                    ].join(' ')}
                  />
                </button>
              );
            }

            // 5. Video
            if (it.type === 'video') {
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    const src = it.fileUrl || it.url;
                    if (!src) onToast('Aucune vidéo configurée.');
                    else setVideoModalSrc(src);
                  }}
                  title={it.title || 'Vidéo'}
                  className="absolute flex items-center justify-center rounded-lg border text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: `${col}33`,
                    borderColor: col,
                    color: '#ffffff',
                  }}
                >
                  <span className="text-sm">🎬</span>
                </button>
              );
            }

            // 6. Zoom
            if (it.type === 'zoom') {
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => handleZoom(it)}
                  title={it.title || 'Zoom HD'}
                  className="absolute flex items-center justify-center rounded-lg border text-sm transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: `${col}33`,
                    borderColor: col,
                    color: '#ffffff',
                  }}
                >
                  <ZoomIn className="w-4 h-4 text-emerald-400 drop-shadow" />
                </button>
              );
            }

            // 7. Blank input
            if (it.type === 'blank') {
              return (
                <div
                  key={it.id}
                  className="absolute flex items-center"
                  style={{ left, top, width, height }}
                >
                  <input
                    type="text"
                    data-blank-answer={it.answer || ''}
                    data-blank-cs={it.cs ? 'true' : 'false'}
                    placeholder={it.hint || '…'}
                    className="w-full h-full text-xs font-semibold px-1 rounded border-2 border-dashed bg-amber-50 text-slate-900 border-amber-400 focus:outline-none transition-colors"
                  />
                </div>
              );
            }

            // 8. Reveal
            if (it.type === 'reveal') {
              const isOpen = !!revealedItems[it.id];
              return (
                <div
                  key={it.id}
                  onClick={() =>
                    setRevealedItems((prev) => ({ ...prev, [it.id]: !prev[it.id] }))
                  }
                  className="absolute cursor-pointer rounded flex items-center justify-center text-xs font-bold transition-all select-none p-1 shadow-sm"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: isOpen ? '#ffffff' : col,
                    color: isOpen ? '#0f172a' : '#ffffff',
                    border: isOpen ? `2px solid ${col}` : 'none',
                  }}
                >
                  {isOpen ? it.content || '(vide)' : '?'}
                </div>
              );
            }

            // 9. Checkbox
            if (it.type === 'check') {
              return (
                <div
                  key={it.id}
                  className="absolute flex items-center"
                  style={{ left, top, width, height }}
                >
                  <input
                    type="checkbox"
                    data-check-correct={it.correct ? 'true' : 'false'}
                    className="w-full h-full accent-teal-500 cursor-pointer rounded"
                  />
                  {it.label && (
                    <span className="absolute left-[115%] whitespace-nowrap text-xs font-medium text-slate-800 drop-shadow-sm pointer-events-none">
                      {it.label}
                    </span>
                  )}
                </div>
              );
            }

            // 10. Button Corriger
            if (it.type === 'button') {
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={handleCorrect}
                  className="absolute rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center transition active:scale-95 hover:brightness-110"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: col,
                  }}
                >
                  {it.label || 'Corriger'}
                </button>
              );
            }

            // 11. Feature 1: Coloriage libre (Free Coloring with distinct enclosed regions)
            if (it.type === 'freeColoring') {
              const isPaintActive = studentTool === 'paint';
              const hasRegions = it.regions && it.regions.length > 0;
              const filledColor = coloredRegions[it.id];
              const hasMask = !!it.silhouetteMaskDataUrl;

              return (
                <div
                  key={it.id}
                  className="absolute transition-all duration-300"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    border: isPaintActive && !hasMask && (!it.outerPolygonPoints || it.outerPolygonPoints.length < 3) ? '1.5px dashed #ec489955' : undefined,
                  }}
                >
                  {hasRegions ? (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-auto"
                      style={{ mixBlendMode: 'multiply' }}
                    >
                      {it.regions!.map((reg) => {
                        const regKey = `${it.id}_${reg.id}`;
                        const col = coloredRegions[regKey];
                        return (
                          <path
                            key={reg.id}
                            d={reg.pathD}
                            fill={col || 'transparent'}
                            stroke={isPaintActive ? 'rgba(236, 72, 153, 0.25)' : 'none'}
                            strokeWidth="0.8"
                            className={isPaintActive ? 'cursor-cell hover:opacity-80 transition-colors' : 'pointer-events-none'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPaintActive) {
                                setColoredRegions((prev) => ({ ...prev, [regKey]: activePaintColor }));
                              }
                            }}
                          >
                            <title>{isPaintActive ? `${reg.label || 'Zone'} : cliquer pour colorier` : ''}</title>
                          </path>
                        );
                      })}
                    </svg>
                  ) : (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPaintActive) {
                          setColoredRegions((prev) => ({ ...prev, [it.id]: activePaintColor }));
                        }
                      }}
                      className={[
                        'absolute inset-0 transition-all duration-300',
                        isPaintActive ? 'cursor-cell hover:opacity-90' : 'pointer-events-none',
                      ].join(' ')}
                      style={{
                        backgroundColor: filledColor || (isPaintActive ? 'rgba(236, 72, 153, 0.12)' : 'transparent'),
                        WebkitMaskImage: hasMask ? `url(${it.silhouetteMaskDataUrl})` : undefined,
                        maskImage: hasMask ? `url(${it.silhouetteMaskDataUrl})` : undefined,
                        WebkitMaskSize: hasMask ? '100% 100%' : undefined,
                        maskSize: hasMask ? '100% 100%' : undefined,
                        WebkitMaskRepeat: hasMask ? 'no-repeat' : undefined,
                        maskRepeat: hasMask ? 'no-repeat' : undefined,
                        clipPath: hasMask ? undefined : (it.outerPolygonPoints && it.outerPolygonPoints.length >= 3
                          ? `polygon(${it.outerPolygonPoints.map((p) => `${p[0]}% ${p[1]}%`).join(', ')})`
                          : undefined),
                        mixBlendMode: 'multiply',
                        opacity: filledColor ? 0.88 : 1,
                      }}
                    />
                  )}
                </div>
              );
            }

            // 12. Feature 2: Colorier les bons dessins (Color the Correct Drawings)
            if (it.type === 'colorCorrect') {
              const dId = it.drawingId || it.id;
              const filledColor = coloredDrawings[dId] || coloredRegions[it.id];
              const status = drawingEvaluations[dId];
              const isPaintActive = studentTool === 'paint';
              const hasMask = !!it.silhouetteMaskDataUrl;
              const hasOuterPoly = !hasMask && it.outerPolygonPoints && it.outerPolygonPoints.length >= 3;
              const clipPathVal = hasOuterPoly
                ? `polygon(${it.outerPolygonPoints!.map((p) => `${p[0]}% ${p[1]}%`).join(', ')})`
                : undefined;

              let border = isPaintActive && !hasOuterPoly && !hasMask ? '2px dashed #8b5cf688' : undefined;
              let anim = '';
              let badge: React.ReactNode = null;

              if (status === 'correct') {
                border = '2.5px solid #22c55e';
                anim = 'shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse';
              } else if (status === 'incorrect') {
                border = '2.5px solid #ef4444';
                anim = 'shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-bounce';
              } else if (status === 'missing') {
                border = '2.5px dashed #22c55e';
                anim = 'animate-pulse';
                badge = (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none z-10">
                    À colorier
                  </span>
                );
              }

              return (
                <div
                  key={it.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPaintActive) {
                      if (!hasMask && (!it.outerPolygonPoints || it.outerPolygonPoints.length < 3)) {
                        onToast('Masque de contour manquant pour ce dessin.');
                        return;
                      }
                      setDrawingEvaluations({});
                      setColoredDrawings((prev) => ({ ...prev, [dId]: activePaintColor }));
                      setColoredRegions((prev) => ({ ...prev, [it.id]: activePaintColor }));
                    }
                  }}
                  className={[
                    'absolute transition-all duration-300',
                    anim,
                    isPaintActive ? 'cursor-cell hover:opacity-90' : 'pointer-events-none',
                  ].join(' ')}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    border,
                    borderRadius: '8px',
                  }}
                  title={isPaintActive ? `Dessin ${dId} : cliquer pour colorier` : ''}
                >
                  {badge}

                  {/* Masked Fill Layer respecting actual outer contour */}
                  <div
                    className="absolute inset-0 transition-all duration-300 pointer-events-none"
                    style={{
                      backgroundColor: filledColor || (isPaintActive ? 'rgba(139, 92, 246, 0.12)' : 'transparent'),
                      WebkitMaskImage: hasMask ? `url(${it.silhouetteMaskDataUrl})` : undefined,
                      maskImage: hasMask ? `url(${it.silhouetteMaskDataUrl})` : undefined,
                      WebkitMaskSize: hasMask ? '100% 100%' : undefined,
                      maskSize: hasMask ? '100% 100%' : undefined,
                      WebkitMaskRepeat: hasMask ? 'no-repeat' : undefined,
                      maskRepeat: hasMask ? 'no-repeat' : undefined,
                      clipPath: clipPathVal,
                      mixBlendMode: 'multiply',
                      opacity: filledColor ? 0.88 : 1,
                    }}
                  />

                  {/* Outer contour SVG stroke when active */}
                  {it.outerContourSvg && isPaintActive && (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <path
                        d={it.outerContourSvg}
                        fill="none"
                        stroke="rgba(139, 92, 246, 0.45)"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                    </svg>
                  )}
                </div>
              );
            }

            // 13. Legacy Paint Bucket Region
            if (it.type === 'paint') {
              const regKey = it.regionId || it.id;
              const filledColor = coloredRegions[regKey];
              const isPaintActive = studentTool === 'paint';

              return (
                <div
                  key={it.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePaintRegionClick(it);
                  }}
                  className={[
                    'absolute transition-all duration-300',
                    isPaintActive ? 'cursor-cell hover:ring-2 hover:ring-pink-400/80 hover:opacity-90' : 'pointer-events-none',
                  ].join(' ')}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: filledColor ? filledColor : (isPaintActive ? 'rgba(236, 72, 153, 0.12)' : 'transparent'),
                    border: !it.pts && isPaintActive ? '2px dashed #ec489988' : undefined,
                    clipPath: it.pts ? clipPolygon(it.pts) : undefined,
                    opacity: filledColor ? 0.75 : 1,
                  }}
                  title={isPaintActive ? `Cliquer pour remplir ${it.label || 'cette zone'}` : ''}
                />
              );
            }

            // 14. Feature 3: Interactive Choice Zones
            if (it.type === 'choice') {
              const qId = it.questionId || 'Q1';
              const isSingle = it.selectionMode !== 'multiple';
              const isSelected = isSingle
                ? singleChoiceSelections[qId] === it.id
                : (multiChoiceSelections[qId] || []).includes(it.id);

              const isEvaluated = isSingle ? isSelected : !!multiChoiceEvaluated[qId];

              // Styling calculation based on requirements:
              // Translucent overlay preserving printed text readability!
              let bg = 'rgba(255, 255, 255, 0.01)';
              let border = '2px dashed rgba(99, 102, 241, 0.25)';
              let iconFeedback: React.ReactNode = null;
              let animClass = '';

              if (isSelected && !isEvaluated) {
                // Neutral visual highlight for multiple choice before verification (NO icon, only blue tint)
                bg = 'rgba(59, 130, 246, 0.22)';
                border = '2px solid #3b82f6';
              } else if (isEvaluated) {
                if (isSelected && it.isCorrect) {
                  // Correct answer: green with success animation
                  bg = 'rgba(34, 197, 94, 0.35)';
                  border = '2px solid #22c55e';
                  animClass = 'animate-pulse';
                  iconFeedback = (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                      ✓
                    </span>
                  );
                } else if (isSelected && !it.isCorrect) {
                  // Incorrect answer: red with error animation
                  bg = 'rgba(239, 68, 68, 0.35)';
                  border = '2px solid #ef4444';
                  animClass = 'animate-bounce';
                  iconFeedback = (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                      ✕
                    </span>
                  );
                } else if (!isSelected && it.isCorrect && !isSingle) {
                  // Unselected correct answer in multi-choice: revealed to help student understand what was missing!
                  bg = 'rgba(34, 197, 94, 0.15)';
                  border = '2px dashed #22c55e';
                  iconFeedback = (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                      ✕
                    </span>
                  );
                }
              }

              return (
                <div
                  key={it.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoiceClick(it);
                  }}
                  className={[
                    'absolute cursor-pointer rounded-lg transition-all duration-200 flex items-center justify-between px-2',
                    animClass,
                  ].join(' ')}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: bg,
                    border,
                  }}
                  title={`Option ${it.label || ''} (${qId})`}
                >
                  <span className="text-[11px] font-bold text-slate-800 drop-shadow-sm select-none">
                    {it.label}
                  </span>
                  {/* External badge positioned to the left outside the choice zone */}
                  {iconFeedback && (
                    <div className="absolute right-[calc(100%+6px)] top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                      {iconFeedback}
                    </div>
                  )}
                </div>
              );
            }

            // 15. Feature: Entourer la zone (Circle Exercise)
            if (it.type === 'circleExercise') {
              const qId = it.questionId || 'Q1';
              const isSelected = circleSelections[qId] === it.id;
              const isCircleActive = studentTool === 'circle';

              return (
                <div
                  key={it.id}
                  onClick={(e) => {
                    if (!isCircleActive) return;
                    e.stopPropagation();
                    handleCircleClick(it);
                  }}
                  className={[
                    'absolute transition-all duration-200 flex items-center justify-center',
                    isCircleActive ? 'cursor-pointer' : 'pointer-events-none',
                    isSelected && it.isCorrect ? 'animate-pulse' : '',
                    isSelected && !it.isCorrect ? 'animate-bounce' : '',
                  ].join(' ')}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    borderRadius: '9999px',
                    backgroundColor: isCircleActive && !isSelected ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                    border: isCircleActive && !isSelected ? '1.5px dashed rgba(168, 85, 247, 0.5)' : undefined,
                  }}
                  title={isCircleActive ? `Entourer cette option (${it.label || qId})` : ''}
                >
                  {/* Separate Visual Overlay: Circle / Oval Ellipse Ring */}
                  {isSelected && (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none transition-all drop-shadow"
                    >
                      <ellipse
                        cx="50"
                        cy="50"
                        rx="47"
                        ry="44"
                        fill="none"
                        stroke={it.isCorrect ? '#22c55e' : '#ef4444'}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}

                  {/* Immediate Feedback Badge */}
                  {isSelected && (
                    <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 z-20 pointer-events-none">
                      {it.isCorrect ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                          ✕
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // 11. Drag and Drop Exercise (Glisser-Déposer)
            if (it.type === 'dragDrop') {
              if (it.dragDropMode === 'drop') {
                const isTargetFilled = Object.values(dragPlacements).some(
                  (pl) => pl.targetId === it.id && pl.isPlaced
                );
                return (
                  <div
                    key={it.id}
                    className={[
                      'absolute flex items-center justify-center rounded-lg transition-all',
                      isTargetFilled
                        ? 'border-2 border-emerald-500 bg-emerald-500/15'
                        : 'border-2 border-dashed border-sky-400/60 bg-sky-500/10',
                    ].join(' ')}
                    style={{
                      left,
                      top,
                      width,
                      height,
                      zIndex: 6,
                    }}
                    title={`Zone cible : ${it.dropId || 'Cible'}`}
                  >
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/60 text-[10px] font-semibold text-sky-200 pointer-events-none">
                      <Move className="w-2.5 h-2.5" />
                      <span>{it.dropId || 'Cible'}</span>
                    </div>
                  </div>
                );
              }

              // Draggable item
              const placement = dragPlacements[it.id];
              const curX = placement ? placement.x : it.x;
              const curY = placement ? placement.y : it.y;
              const isPlaced = placement?.isPlaced;
              const isDragging = activeDraggingId === it.id;
              const hasError = !!dragErrorIds[it.id];
              const padNorm = (it.maskPadding ?? 2) / 1000;

              return (
                <React.Fragment key={it.id}>
                  {/* Cleaned background mask patch to cover original element underneath */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${(it.x - padNorm) * 100}%`,
                      top: `${(it.y - padNorm) * 100}%`,
                      width: `${(it.w + 2 * padNorm) * 100}%`,
                      height: `${(it.h + 2 * padNorm) * 100}%`,
                      backgroundColor: it.maskColor || '#ffffff',
                      zIndex: 5,
                    }}
                  />

                  {/* Movable draggable screenshot element */}
                  <div
                    onPointerDown={(e) => handleDragItemPointerDown(e, it)}
                    onPointerMove={(e) => handleDragItemPointerMove(e, it)}
                    onPointerUp={(e) => handleDragItemPointerUp(e, it)}
                    onPointerCancel={(e) => handleDragItemPointerUp(e, it)}
                    className={[
                      'absolute touch-none select-none transition-shadow',
                      isDragging
                        ? 'cursor-grabbing shadow-2xl scale-105'
                        : 'cursor-grab shadow-md hover:shadow-lg',
                      hasError ? 'animate-bounce ring-2 ring-rose-500' : '',
                      isPlaced ? 'ring-2 ring-emerald-500' : '',
                    ].join(' ')}
                    style={{
                      left: `${curX * 100}%`,
                      top: `${curY * 100}%`,
                      width,
                      height,
                      zIndex: isDragging ? 50 : 15,
                    }}
                    title={`Glisser : ${it.dragId || 'Élément'}`}
                  >
                    {it.dragImageDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.dragImageDataUrl}
                        alt={it.dragId || 'Élément à glisser'}
                        className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full border border-dashed border-blue-400 bg-blue-100/50 flex items-center justify-center text-xs text-blue-700">
                        {it.dragId || 'Élément'}
                      </div>
                    )}

                    {/* Placed checkmark badge */}
                    {isPlaced && (
                      <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 z-20 pointer-events-none">
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                          ✓
                        </span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            }

            return null;
          })}

          {/* Feature 2: Student Arrows & Correction Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <marker id="student-arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="#0284c7" />
              </marker>
              <marker id="student-arrowhead-correct" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="#22c55e" />
              </marker>
              <marker id="student-arrowhead-incorrect" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="#ef4444" />
              </marker>
              <marker id="expected-arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="#3b82f6" />
              </marker>
              <marker id="missing-arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="#eab308" />
              </marker>
            </defs>

            {/* Rendered Student Arrows */}
            {studentArrows.map((sa) => {
              const fb = arrowFeedback[sa.id];
              const isCorrect = fb?.status === 'correct';
              const isIncorrect = fb?.status === 'incorrect';

              const strokeColor = isCorrect ? '#22c55e' : isIncorrect ? '#ef4444' : '#0284c7';
              const marker = isCorrect
                ? 'url(#student-arrowhead-correct)'
                : isIncorrect
                ? 'url(#student-arrowhead-incorrect)'
                : 'url(#student-arrowhead)';

              const x1 = `${sa.startX * 100}%`;
              const y1 = `${sa.startY * 100}%`;
              const x2 = `${sa.endX * 100}%`;
              const y2 = `${sa.endY * 100}%`;

              return (
                <g key={sa.id} className={isCorrect ? 'animate-pulse' : isIncorrect ? 'animate-pulse' : ''}>
                  {/* Arrow line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={isCorrect || isIncorrect ? '2' : '1.8'}
                    markerEnd={marker}
                    strokeLinecap="round"
                  />
                  {/* Start / end anchors */}
                  <circle cx={x1} cy={y1} r="2.5" fill={strokeColor} stroke="#ffffff" strokeWidth="1" />

                  {/* Feedback Badge near arrow */}
                  {isCorrect && (
                    <text
                      x={`${((sa.startX + sa.endX) / 2) * 100}%`}
                      y={`${((sa.startY + sa.endY) / 2) * 100 - 2}%`}
                      fill="#16a34a"
                      fontWeight="bold"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      ✓
                    </text>
                  )}
                  {isIncorrect && (
                    <text
                      x={`${((sa.startX + sa.endX) / 2) * 100}%`}
                      y={`${((sa.startY + sa.endY) / 2) * 100 - 2}%`}
                      fill="#dc2626"
                      fontWeight="bold"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      ✗
                    </text>
                  )}
                </g>
              );
            })}

            {/* Revealed Expected Arrows when student answer is incorrect */}
            {Object.entries(arrowFeedback).map(([sId, fb]) => {
              if (fb.status !== 'incorrect' || !fb.expected) return null;
              const ea = fb.expected;
              return (
                <g key={`revealed_expected_${sId}`}>
                  <line
                    x1={`${ea.startX! * 100}%`}
                    y1={`${ea.startY! * 100}%`}
                    x2={`${ea.endX! * 100}%`}
                    y2={`${ea.endY! * 100}%`}
                    stroke="#3b82f6"
                    strokeWidth="1.6"
                    strokeDasharray="4,3"
                    markerEnd="url(#expected-arrowhead)"
                  />
                  <circle cx={`${ea.startX! * 100}%`} cy={`${ea.startY! * 100}%`} r="2.5" fill="#3b82f6" />
                </g>
              );
            })}

            {/* Revealed Missing Arrows */}
            {missingArrows.map((ma) => (
              <g key={`missing_${ma.id}`}>
                <line
                  x1={`${ma.startX! * 100}%`}
                  y1={`${ma.startY! * 100}%`}
                  x2={`${ma.endX! * 100}%`}
                  y2={`${ma.endY! * 100}%`}
                  stroke="#eab308"
                  strokeWidth="1.8"
                  strokeDasharray="4,3"
                  markerEnd="url(#missing-arrowhead)"
                />
                <circle cx={`${ma.startX! * 100}%`} cy={`${ma.startY! * 100}%`} r="2.5" fill="#eab308" />
                <text
                  x={`${((ma.startX! + ma.endX!) / 2) * 100}%`}
                  y={`${((ma.startY! + ma.endY!) / 2) * 100 - 2}%`}
                  fill="#ca8a04"
                  fontWeight="bold"
                  fontSize="9"
                  textAnchor="middle"
                >
                  Manquante
                </text>
              </g>
            ))}

            {/* Student Arrow Draft while dragging */}
            {arrowDraft && (
              <g>
                <line
                  x1={`${arrowDraft.startX * 100}%`}
                  y1={`${arrowDraft.startY * 100}%`}
                  x2={`${arrowDraft.endX * 100}%`}
                  y2={`${arrowDraft.endY * 100}%`}
                  stroke="#0284c7"
                  strokeWidth="1.8"
                  strokeDasharray="4,4"
                  markerEnd="url(#student-arrowhead)"
                />
                <circle cx={`${arrowDraft.startX * 100}%`} cy={`${arrowDraft.startY * 100}%`} r="2.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Submodal for Zoom Image */}
      {zoomModalSrc && (
        <div
          onClick={() => setZoomModalSrc(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomModalSrc}
            alt="Zoom HD"
            className="max-w-[90vw] max-height-[85vh] rounded-2xl shadow-2xl border border-white/20"
          />
        </div>
      )}

      {/* Submodal for Video Playback */}
      {videoModalSrc && (
        <div
          onClick={() => setVideoModalSrc(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <video
              src={videoModalSrc}
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl bg-black border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
