import { useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluateRule,
  getKneeAngle,
  getHipAngle,
  getTorsoDeviation,
  toLandmarkArrayFromPoseDetector,
} from '../utils/poseCv';

function safeSpeak(text, lastSpeakRef, cooldownMs = 1800) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const now = Date.now();
  if (now - lastSpeakRef.current < cooldownMs) return;
  lastSpeakRef.current = now;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-CO';
    utter.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('audio feedback unavailable', e);
  }
}

function pickPrimaryRule(exerciseConfig) {
  const rules = exerciseConfig?.cv_tracking_logic?.validation_rules || [];
  const withThreshold = rules.find((r) => typeof r.threshold_angle === 'number');
  if (withThreshold) return withThreshold;
  return null;
}

export default function TrainingRealtimeCoach({ routine }) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [reps, setReps] = useState(0);
  const [liveFeedback, setLiveFeedback] = useState('Listo para iniciar análisis.');
  const [lastMetrics, setLastMetrics] = useState({ knee: null, hip: null, torso: null });
  const [fps, setFps] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef('up');
  const repStartRef = useRef(null);
  const repTimesRef = useRef([]);
  const lastSpeakRef = useRef(0);
  const lastFrameTsRef = useRef(0);

  const sequence = routine?.exercise_sequence || [];
  const selected = sequence[exerciseIndex] || null;
  const primaryRule = useMemo(() => pickPrimaryRule(selected), [selected]);

  const stop = () => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => () => stop(), []);

  const drawPose = (keypoints) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#84cc16';
    ctx.fillStyle = '#84cc16';
    keypoints.forEach((kp) => {
      if ((kp.score || 0) < 0.2) return;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const processFrame = async () => {
    if (!running || !videoRef.current || !detectorRef.current || !selected) return;
    try {
      const poses = await detectorRef.current.estimatePoses(videoRef.current, { maxPoses: 1, flipHorizontal: false });
      if (!poses?.length) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const keypoints = poses[0].keypoints || [];
      drawPose(keypoints);
      const landmarks = toLandmarkArrayFromPoseDetector(keypoints);
      const rules = selected.cv_tracking_logic?.validation_rules || [];
      const checks = rules.map((rule) => ({ rule, out: evaluateRule(landmarks, rule) }));
      const hasError = checks.some((c) => c.out.ok === false);

      const metrics = {
        knee: getKneeAngle(landmarks),
        hip: getHipAngle(landmarks),
        torso: getTorsoDeviation(landmarks),
      };
      setLastMetrics(metrics);

      if (hasError) {
        const msg =
          selected.cv_tracking_logic?.real_time_audio_feedback?.on_error_posture ||
          'Ajusta tu tecnica.';
        setLiveFeedback(msg);
        safeSpeak(msg, lastSpeakRef, 2200);
      }

      if (primaryRule) {
        const out = evaluateRule(landmarks, primaryRule);
        const threshold = Number(primaryRule.threshold_angle);
        const cmp = String(primaryRule.comparison || 'less_than').toLowerCase();
        const metric = out.metric;
        const buffer = 8;

        if (typeof metric === 'number' && Number.isFinite(metric)) {
          const bottomReached =
            cmp === 'less_than' ? metric < threshold : metric > threshold;
          const topReached =
            cmp === 'less_than' ? metric > threshold + buffer : metric < threshold - buffer;

          if (phaseRef.current === 'up' && bottomReached) {
            phaseRef.current = 'down';
            repStartRef.current = Date.now();
            const half = selected.cv_tracking_logic?.real_time_audio_feedback?.on_rep_half_way;
            if (half) {
              setLiveFeedback(half);
              safeSpeak(half, lastSpeakRef, 1500);
            }
          } else if (phaseRef.current === 'down' && topReached) {
            phaseRef.current = 'up';
            setReps((r) => r + 1);
            const now = Date.now();
            if (repStartRef.current) {
              const ms = now - repStartRef.current;
              repTimesRef.current = [...repTimesRef.current.slice(-5), ms];
              const avg =
                repTimesRef.current.reduce((s, v) => s + v, 0) / repTimesRef.current.length;
              if (ms > avg * 1.35) {
                const velo = selected.cv_tracking_logic?.real_time_audio_feedback?.on_velocity_loss;
                if (velo) {
                  setLiveFeedback(velo);
                  safeSpeak(velo, lastSpeakRef, 1800);
                }
              } else {
                setLiveFeedback(`Repeticion valida: ${reps + 1}`);
              }
            }
          }
        }
      }

      const nowTs = performance.now();
      if (lastFrameTsRef.current) {
        const diff = nowTs - lastFrameTsRef.current;
        if (diff > 0) setFps(Math.round(1000 / diff));
      }
      lastFrameTsRef.current = nowTs;
    } catch (e) {
      console.error(e);
      setError('Error en analisis de pose en tiempo real.');
    }
    rafRef.current = requestAnimationFrame(processFrame);
  };

  const start = async () => {
    if (!selected) return;
    setError('');
    setReps(0);
    phaseRef.current = 'up';
    repStartRef.current = null;
    repTimesRef.current = [];
    try {
      if (typeof window === 'undefined' || !('PoseDetector' in window)) {
        setError('Este navegador no soporta PoseDetector. Usa Chrome moderno.');
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = media;
      videoRef.current.srcObject = media;
      await videoRef.current.play();

      detectorRef.current = new window.PoseDetector({
        modelType: 'full',
        scoreThreshold: 0.4,
      });

      setRunning(true);
      rafRef.current = requestAnimationFrame(processFrame);
    } catch (e) {
      console.error(e);
      setError('No se pudo iniciar camara o detector.');
    }
  };

  return (
    <div className="mt-8 card">
      <h3 className="text-xl font-bold text-stone-900 mb-4">Coach Biomecanico en Tiempo Real</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="relative rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full max-h-[480px] object-cover" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          </div>
          <div className="mt-3 flex gap-2">
            {!running ? (
              <button className="btn-primary" onClick={start}>
                Iniciar Camara + CV
              </button>
            ) : (
              <button className="btn-logout" onClick={stop}>
                Detener
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="label">Ejercicio a monitorear</label>
          <select
            className="input"
            value={exerciseIndex}
            onChange={(e) => setExerciseIndex(Number(e.target.value))}
            disabled={running}
          >
            {sequence.map((ex, idx) => (
              <option key={`${ex.exercise_name}-${idx}`} value={idx}>
                {idx + 1}. {ex.exercise_name}
              </option>
            ))}
          </select>

          <div className="bg-stone-100 rounded-xl p-3">
            <p className="text-sm text-stone-600">Repeticiones validas</p>
            <p className="text-3xl font-bold text-stone-900">{reps}</p>
          </div>

          <div className="bg-stone-100 rounded-xl p-3 text-sm text-stone-700 space-y-1">
            <p>FPS: {fps || '-'}</p>
            <p>Knee angle: {lastMetrics.knee ? lastMetrics.knee.toFixed(1) : '-'}</p>
            <p>Hip angle: {lastMetrics.hip ? lastMetrics.hip.toFixed(1) : '-'}</p>
            <p>Torso dev: {lastMetrics.torso ? lastMetrics.torso.toFixed(1) : '-'}</p>
          </div>

          <div className="bg-lime-100 rounded-xl p-3 text-sm text-lime-900">
            {liveFeedback}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
