import { BrowserMultiFormatReader } from '@zxing/library';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, QrCode, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ScanState = 'ready' | 'valid' | 'already-scanned' | 'invalid' | 'camera-error';
type ScanResult = { bookingReference?: string; customerName?: string; paymentStatus?: string; scannedTicketCount?: number; ticketCategories?: string[]; slot?: { startsAt: string; endsAt: string }; scannedAt?: string };

type ApiResponse = { success: boolean; data?: ScanResult; error?: { code?: string; message?: string } };

function playTone(kind: 'success' | 'alarm') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.type = 'sine';
  oscillator.frequency.value = kind === 'success' ? 880 : 180;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'success' ? 0.28 : 0.55));
  oscillator.start();
  oscillator.stop(context.currentTime + (kind === 'success' ? 0.3 : 0.58));
}

function formatTime(value?: string) {
  if (!value) return 'Unknown time';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ValidatorApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanLock = useRef(false);
  const [state, setState] = useState<ScanState>('ready');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [message, setMessage] = useState('Point the camera at a guest QR ticket.');
  const [manualValue, setManualValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  async function verify(qrHash: string) {
    if (scanLock.current || !qrHash.trim()) return;
    scanLock.current = true;
    try {
      const response = await fetch('/api/v1/tickets/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qrHash: qrHash.trim() }) });
      const payload = await response.json() as ApiResponse;
      if (payload.success && payload.data) {
        setResult(payload.data);
        setState('valid');
        setMessage('Entry approved. Welcome to the dungeon.');
        playTone('success');
      } else if (payload.error?.code === 'TICKET_ALREADY_SCANNED') {
        setResult(null);
        setState('already-scanned');
        setMessage(payload.error.message ?? 'This ticket has already been scanned.');
        playTone('alarm');
      } else {
        setResult(null);
        setState('invalid');
        setMessage('Ticket unpaid or expired.');
        playTone('alarm');
      }
    } catch {
      setState('invalid');
      setResult(null);
      setMessage('Unable to reach the ticket service.');
      playTone('alarm');
    } finally {
      window.setTimeout(() => { scanLock.current = false; }, 1400);
    }
  }

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    if (!videoRef.current) return;
    reader.decodeFromVideoDevice(null, videoRef.current, (decoded) => {
      if (decoded) void verify(decoded.getText());
    }).then(() => setCameraActive(true)).catch(() => {
      setState('camera-error');
      setMessage('Camera access is unavailable. Use the manual ticket field below.');
    });
    return () => {
      reader.reset();
      readerRef.current = null;
    };
  }, []);

  function resetScanner() {
    setState('ready');
    setResult(null);
    setMessage('Point the camera at a guest QR ticket.');
    setManualValue('');
    scanLock.current = false;
  }

  const isGreen = state === 'valid';
  const isRed = state === 'already-scanned' || state === 'invalid';
  return (
    <main className={`validator-shell ${isGreen ? 'validator-valid' : isRed ? 'validator-invalid' : ''}`}>
      <header className="validator-header">
        <a className="validator-back" href="/"><ArrowLeft size={16} /> Soma Dungeon</a>
        <span className="validator-status"><span className={`status-dot ${cameraActive ? 'status-live' : ''}`} /> Gate 01 / Staff mode</span>
      </header>
      <section className="validator-content">
        <div className="validator-intro"><p className="validator-kicker">Entrance control</p><h1>Ticket validator</h1><p>{message}</p></div>
        <div className="scanner-frame">
          <video ref={videoRef} muted playsInline className="scanner-video" />
          <div className="scanner-corners" />
          <div className="scanner-line" />
          <div className="scanner-badge"><QrCode size={16} /> Scan QR</div>
        </div>
        <div className="validator-result" aria-live="polite">
          {state === 'valid' && result && <div className="result-card result-card-valid"><CheckCircle2 size={42} /><div><p className="result-label">VALID / ENTRY APPROVED</p><h2>{result.customerName}</h2><p>{result.ticketCategories?.join(' · ').toUpperCase()} · {result.scannedTicketCount} TICKET{result.scannedTicketCount === 1 ? '' : 'S'}</p><strong>{result.slot ? formatTime(result.slot.startsAt) : 'Timeslot confirmed'}</strong></div></div>}
          {state === 'already-scanned' && <div className="result-card result-card-invalid"><AlertTriangle size={42} /><div><p className="result-label">ALREADY SCANNED</p><h2>Do not admit</h2><p>{message}</p><strong>Previous scan time shown above</strong></div></div>}
          {state === 'invalid' && <div className="result-card result-card-invalid"><AlertTriangle size={42} /><div><p className="result-label">INVALID / EXPIRED</p><h2>Ticket unpaid or expired</h2><p>Ask the guest to return to the booking desk.</p></div></div>}
          {state === 'camera-error' && <div className="result-card result-card-neutral"><Camera size={32} /><div><p className="result-label">CAMERA UNAVAILABLE</p><h2>Use manual verification</h2><p>Camera permission is required for live scanning.</p></div></div>}
        </div>
        <div className="validator-actions"><button className="validator-reset" onClick={resetScanner}><RotateCcw size={16} /> Ready for next guest</button><div className="manual-verify"><input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Paste QR payload" aria-label="Paste QR payload" /><button onClick={() => void verify(manualValue)}>Verify</button></div></div>
        <div className="validator-note"><ShieldCheck size={16} /> QR payloads are hashed and verified against confirmed bookings.</div>
      </section>
    </main>
  );
}

declare global {
  interface Window { webkitAudioContext?: typeof AudioContext; }
}
