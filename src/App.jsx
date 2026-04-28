import { useState, useEffect, useRef } from 'react';

const STAGES = [
  { duration: 2*60,  label: 'Just Start',      emoji: '🌱', xp: 10,  color: '#7C9EE8', msg: "2 minutes! You showed up. That's everything." },
  { duration: 5*60,  label: 'Getting Settled',  emoji: '🔥', xp: 25,  color: '#7EC8A0', msg: "5 minutes in. You're building something real." },
  { duration: 8*60,  label: 'Finding Flow',     emoji: '⚡', xp: 40,  color: '#F0C060', msg: "8 minutes! You're in it now. Seriously impressive." },
  { duration: 15*60, label: 'In The Zone',      emoji: '🚀', xp: 75,  color: '#E07ACA', msg: "15 minutes! Most people never get here. You did." },
  { duration: 30*60, label: 'The Deep Work',    emoji: '🏆', xp: 150, color: '#FF8C6B', msg: "ONE FULL HOUR. You are absolutely unstoppable." },
];
const TOTAL_XP = STAGES.reduce((s, st) => s + st.xp, 0);
const STAGE_MINS = [2, 5, 8, 15, 30];

function fmt(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function playTone(ctx, big = false) {
  if (!ctx) return;
  const freqs = big ? [523, 659, 784, 1047] : [523, 659, 784];
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = f;
    const t = ctx.currentTime + i * 0.13;
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.start(t); o.stop(t + 0.5);
  });
}

function Confetti({ big }) {
  const [pts, setPts] = useState([]);
  useEffect(() => {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6BCD','#C77DFF'];
    setPts(Array.from({ length: big ? 120 : 60 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth, y: -20,
      color: colors[i % colors.length],
      dx: (Math.random() - 0.5) * 220,
      dy: 160 + Math.random() * 200,
    })));
    const t = setTimeout(() => setPts([]), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      {pts.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: p.x, top: p.y, width: 8, height: 8,
          borderRadius: '50%', background: p.color, pointerEvents: 'none',
          animation: 'particle-fall 1.3s ease-out forwards',
          '--dx': p.dx + 'px', '--dy': p.dy + 'px',
        }} />
      ))}
    </>
  );
}

function Toggle({ on, onToggle, label, sub }) {
  return (
    <div className="toggle-row">
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div className={`toggle ${on ? 'on' : 'off'}`} onClick={onToggle}>
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen]       = useState('home');
  const [stageIdx, setStageIdx]   = useState(0);
  const [timeLeft, setTimeLeft]   = useState(STAGES[0].duration);
  const [xp, setXp]               = useState(0);
  const [confetti, setConfetti]   = useState(false);
  const [bigWin, setBigWin]       = useState(false);
  const [task, setTask]           = useState('');
  const [soundOn, setSoundOn]     = useState(true);
  const [vibrateOn, setVibrateOn] = useState(true);
  const [notifOK, setNotifOK]     = useState(false);
  const [settings, setSettings]   = useState(false);
  const intervalRef = useRef(null);
  const audioRef    = useRef(null);
  const swRef       = useRef(null);

  const stage     = STAGES[stageIdx];
  const prog      = 1 - timeLeft / stage.duration;
  const totalProg = (STAGES.slice(0, stageIdx).reduce((s, st) => s + st.duration, 0)
                    + (stage.duration - timeLeft)) / 3600;
  const circ      = 2 * Math.PI * 90;

  useEffect(() => {
    audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(r => { swRef.current = r; });
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setNotifOK(true);
    }
  }, []);

  async function askNotifPermission() {
    if (typeof Notification === 'undefined') return false;
    const p = await Notification.requestPermission();
    setNotifOK(p === 'granted');
    return p === 'granted';
  }

  function fireAlert(title, body) {
    if (soundOn)   playTone(audioRef.current, stageIdx === STAGES.length - 1);
    if (vibrateOn && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
    if (notifOK && swRef.current?.active) {
      swRef.current.active.postMessage({ type: 'STAGE_COMPLETE', title, body, vibrate: vibrateOn });
    }
  }

  useEffect(() => {
    if (screen !== 'running') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setXp(prev => {
            const next = prev + stage.xp;
            return next;
          });
          setConfetti(true);
          setTimeout(() => setConfetti(false), 1500);
          if (stageIdx === STAGES.length - 1) {
            setBigWin(true);
            fireAlert('🏆 ONE FULL HOUR!', 'You are absolutely unstoppable.');
            setScreen('done');
          } else {
            fireAlert(`${stage.emoji} Stage Complete!`, stage.msg);
            setScreen('checkin');
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [screen, stageIdx, soundOn, vibrateOn, notifOK]);

  async function handleStart() {
    if (audioRef.current?.state === 'suspended') audioRef.current.resume();
    if (!notifOK) await askNotifPermission();
    setScreen('running');
  }

  function continueNext() {
    const n = stageIdx + 1;
    setStageIdx(n);
    setTimeLeft(STAGES[n].duration);
    setScreen('running');
  }

  function stopEarly() {
    clearInterval(intervalRef.current);
    setScreen('done');
  }

  function reset() {
    setScreen('home'); setStageIdx(0);
    setTimeLeft(STAGES[0].duration); setXp(0);
    setBigWin(false); setTask('');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {confetti && <Confetti big={bigWin} />}

      {/* Settings sheet */}
      {settings && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
                      display:'flex', alignItems:'flex-end', zIndex:100 }}
             onClick={() => setSettings(false)}>
          <div style={{ background:'#1a1030', width:'100%',
                        borderRadius:'24px 24px 0 0', padding:'28px 24px 40px' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ width:40, height:4, background:'rgba(255,255,255,0.2)',
                          borderRadius:2, margin:'0 auto 24px' }} />
            <h3 style={{ fontSize:20, fontWeight:700, marginBottom:16 }}>Notification Settings</h3>
            <Toggle on={soundOn}   onToggle={() => setSoundOn(v => !v)}
                    label="🔊 Sound"             sub="Chime when each stage ends" />
            <Toggle on={vibrateOn} onToggle={() => setVibrateOn(v => !v)}
                    label="📳 Vibration"         sub="Vibrate on stage completion" />
            <Toggle on={notifOK}   onToggle={askNotifPermission}
                    label="🔔 Push Notifications" sub="Alerts when app is in background" />
            <button className="btn-primary" style={{ marginTop:24 }}
                    onClick={() => setSettings(false)}>Done</button>
          </div>
        </div>
      )}

      {/* Settings button */}
      <button onClick={() => setSettings(true)}
              style={{ position:'fixed', top:16, right:16, zIndex:10,
                       background:'rgba(255,255,255,0.08)',
                       border:'1px solid rgba(255,255,255,0.12)',
                       borderRadius:12, padding:'8px 14px',
                       color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:18 }}>⚙️</button>

      {/* HOME */}
      {screen === 'home' && (
        <div style={{ textAlign:'center', maxWidth:440, width:'100%',
                      animation:'bounce-in 0.5s ease' }}>
          <div style={{ fontSize:56, animation:'float 3s ease-in-out infinite' }}>⚡</div>
          <h1 style={{ fontSize:36, fontWeight:800, margin:'8px 0',
                       background:'linear-gradient(135deg,#7C9EE8,#C77DFF)',
                       WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Momentum
          </h1>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:16, marginBottom:28 }}>
            Just 2 minutes. That's all we're asking.
          </p>
          <input type="text" placeholder="What are you working on? (optional)"
                 value={task} onChange={e => setTask(e.target.value)}
                 style={{ marginBottom:20 }} />
          <div style={{ display:'flex', justifyContent:'center', gap:8,
                        marginBottom:28, flexWrap:'wrap' }}>
            {STAGES.map((s, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.06)', borderRadius:10,
                                    padding:'8px 12px', fontSize:12,
                                    color:'rgba(255,255,255,0.5)',
                                    border:'1px solid rgba(255,255,255,0.08)' }}>
                {s.emoji} {STAGE_MINS[i]}m
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleStart}
                  style={{ fontSize:20, padding:'18px' }}>
            Start Momentum 🚀
          </button>
          <p style={{ marginTop:14, color:'rgba(255,255,255,0.3)', fontSize:12 }}>
            You can stop anytime. No guilt. Just progress.
          </p>
        </div>
      )}

      {/* RUNNING */}
      {screen === 'running' && (
        <div style={{ textAlign:'center', maxWidth:420, width:'100%' }}>
          <div style={{ display:'flex', justifyContent:'center', gap:6,
                        marginBottom:24, flexWrap:'wrap' }}>
            {STAGES.map((s, i) => (
              <div key={i} style={{
                borderRadius:20, padding:'5px 12px', fontSize:11, fontWeight:600,
                background: i < stageIdx ? 'rgba(124,158,232,0.3)'
                           : i === stageIdx ? stage.color : 'rgba(255,255,255,0.06)',
                color: i === stageIdx ? '#fff'
                     : i < stageIdx ? 'rgba(124,158,232,0.9)' : 'rgba(255,255,255,0.3)',
                border: i === stageIdx ? `1px solid ${stage.color}` : '1px solid transparent',
              }}>
                {i < stageIdx ? '✓' : s.emoji} {STAGE_MINS[i]}m
              </div>
            ))}
          </div>

          <div style={{ position:'relative', display:'inline-block', marginBottom:20 }}>
            <div style={{ position:'absolute', inset:-8, borderRadius:'50%',
                          border:`2px solid ${stage.color}`,
                          animation:'pulse-ring 2s ease-out infinite' }} />
            <svg width={220} height={220} viewBox="0 0 220 220">
              <circle cx={110} cy={110} r={90} fill="none"
                      stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
              <circle cx={110} cy={110} r={90} fill="none"
                      stroke={stage.color} strokeWidth={10}
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - prog)}
                      strokeLinecap="round" transform="rotate(-90 110 110)"
                      style={{ transition:'stroke-dashoffset 0.9s linear' }} />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex',
                          flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:44, fontWeight:800 }}>{fmt(timeLeft)}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>
                {stage.label}
              </div>
            </div>
          </div>

          {task && (
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:12 }}>
              Working on: <span style={{ color:'rgba(255,255,255,0.7)' }}>{task}</span>
            </p>
          )}

          <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:20 }}>
            <span style={{ background:'rgba(255,255,255,0.08)', borderRadius:20,
                           padding:'6px 14px', fontSize:13, fontWeight:600 }}>⭐ {xp} XP</span>
            <span style={{ background:'rgba(255,255,255,0.08)', borderRadius:20,
                           padding:'6px 14px', fontSize:13, fontWeight:600 }}>
              📊 {Math.round(totalProg * 100)}%
            </span>
          </div>

          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, marginBottom:20 }}>
            {timeLeft > stage.duration * 0.7 ? "You started. That's the hardest part. ✨"
           : timeLeft > stage.duration * 0.4 ? "Stay with it. You're doing great. 💪"
           :                                    "Almost there! Finish line in sight! 🔥"}
          </p>
          <button className="btn-stop" onClick={stopEarly}>I need to stop for now</button>
        </div>
      )}

      {/* CHECK-IN */}
      {screen === 'checkin' && (
        <div style={{ textAlign:'center', maxWidth:440, width:'100%',
                      animation:'bounce-in 0.4s ease' }}>
          <div style={{ fontSize:64, marginBottom:8 }}>{stage.emoji}</div>
          <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>
            {stage.label} — Done!
          </h2>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:16, marginBottom:12 }}>
            {stage.msg}
          </p>
          <div style={{ display:'inline-block',
                        background:`${stage.color}22`,
                        border:`1px solid ${stage.color}66`,
                        borderRadius:16, padding:'10px 24px',
                        marginBottom:28, fontSize:18, fontWeight:700 }}>
            +{stage.xp} XP ⭐
          </div>
          <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:20,
                        padding:20, marginBottom:24,
                        border:'1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.4)', fontSize:12 }}>
              NEXT STAGE
            </p>
            <p style={{ margin:0, fontWeight:700, fontSize:17 }}>
              {STAGES[stageIdx+1]?.emoji} {STAGE_MINS[stageIdx+1]} more minutes
              — {STAGES[stageIdx+1]?.label}
            </p>
          </div>
          <button className="btn-primary" onClick={continueNext}>Keep Going! ⚡</button>
          <button className="btn-stop"    onClick={stopEarly}>I'll stop here — and that's okay</button>
        </div>
      )}

      {/* DONE */}
      {screen === 'done' && (
        <div style={{ textAlign:'center', maxWidth:460, width:'100%',
                      animation:'bounce-in 0.5s ease' }}>
          {bigWin ? (
            <>
              <div style={{ fontSize:72, animation:'float 2s ease-in-out infinite' }}>🏆</div>
              <h2 style={{ fontSize:32, fontWeight:900, margin:'12px 0 8px',
                           background:'linear-gradient(135deg,#FFD700,#FF8C6B)',
                           WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                ONE FULL HOUR!
              </h2>
              <p style={{ color:'rgba(255,255,255,0.65)', fontSize:16, marginBottom:12 }}>
                You are absolutely unstoppable. That's not nothing. That's everything.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize:64 }}>🌟</div>
              <h2 style={{ fontSize:30, fontWeight:800, margin:'12px 0 8px' }}>You showed up!</h2>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:16, marginBottom:12 }}>
                Every minute counts. You did something real today.
              </p>
            </>
          )}

          {task && (
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:12 }}>
              Session: <span style={{ color:'rgba(255,255,255,0.7)' }}>{task}</span>
            </p>
          )}

          <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:20,
                        padding:20, margin:'16px 0 24px',
                        border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:10 }}>
              SESSION SUMMARY
            </div>
            <div style={{ display:'flex', justifyContent:'center',
                          flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {STAGES.map((s, i) => (
                <div key={i} style={{
                  borderRadius:12, padding:'6px 12px', fontSize:12,
                  background: i < stageIdx || bigWin ? `${s.color}33` : 'rgba(255,255,255,0.04)',
                  color:      i < stageIdx || bigWin ? s.color : 'rgba(255,255,255,0.2)',
                }}>
                  {i < stageIdx || bigWin ? '✓' : '○'} {s.emoji} +{i < stageIdx || bigWin ? s.xp : 0} XP
                </div>
              ))}
            </div>
            <div style={{ fontSize:28, fontWeight:800 }}>⭐ {xp} / {TOTAL_XP} XP</div>
          </div>

          <button className="btn-primary" onClick={reset}>Start a New Session 🚀</button>
        </div>
      )}
    </div>
  );
}
