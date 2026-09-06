import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AnimatedWave } from "./components/AnimatedWave";
import { CinematicField } from "./components/CinematicField";
import { ParticlePassage } from "./components/ParticlePassage";
import { useSolarisMotion } from "./hooks/useSolarisMotion";
import "./styles/experience.css";

type AudioRig = { context: AudioContext; oscillator: OscillatorNode; gain: GainNode; analyser: AnalyserNode };
const modes = [
  { name: "PRISM", accent: "#f4eee4", rgb: "244, 238, 228", descriptor: "luz mineral", frequency: 196 },
  { name: "SOL", accent: "#edc291", rgb: "237, 194, 145", descriptor: "calor em movimento", frequency: 164 },
  { name: "VIOLET", accent: "#cbc5e6", rgb: "203, 197, 230", descriptor: "profundidade e silêncio", frequency: 220 },
  { name: "MOSS", accent: "#c3d0af", rgb: "195, 208, 175", descriptor: "um ritmo orgânico", frequency: 146 },
];
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-7-7 7 7-7 7"} stroke="currentColor" strokeWidth="1.3" /></svg>;
}

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const studio = useRef<HTMLElement>(null);
  const about = useRef<HTMLDialogElement>(null);
  const audio = useRef<AudioRig | null>(null);
  const pendingAudio = useRef<AudioContext | null>(null);
  const audioGeneration = useRef(0);
  const startingAudio = useRef(false);
  const [modeIndex, setModeIndex] = useState(0);
  const [intensity, setIntensity] = useState(62);
  const [audioOn, setAudioOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioMessage, setAudioMessage] = useState("");
  const [immersive, setImmersive] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [wavePaused, setWavePaused] = useState(false);
  const mode = modes[modeIndex];
  useSolarisMotion(root);

  const stopAudio = useCallback(() => {
    audioGeneration.current += 1;
    startingAudio.current = false;
    if (pendingAudio.current) { void pendingAudio.current.close(); pendingAudio.current = null; }
    const rig = audio.current;
    audio.current = null;
    if (rig) {
      rig.gain.gain.cancelScheduledValues(rig.context.currentTime);
      rig.gain.gain.setValueAtTime(rig.gain.gain.value, rig.context.currentTime);
      rig.gain.gain.linearRampToValueAtTime(0, rig.context.currentTime + 0.25);
      rig.oscillator.onended = () => { void rig.context.close(); };
      rig.oscillator.stop(rig.context.currentTime + 0.3);
    }
    setAudioOn(false); setAudioLevel(0);
  }, []);

  async function toggleSound() {
    if (audioOn) { stopAudio(); return; }
    if (startingAudio.current) return;
    const AudioConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioConstructor) { setAudioMessage("O som não está disponível neste navegador."); return; }
    startingAudio.current = true;
    const generation = ++audioGeneration.current;
    let context: AudioContext | undefined;
    try {
      context = new AudioConstructor();
      pendingAudio.current = context;
      await context.resume();
      if (generation !== audioGeneration.current) return;
      pendingAudio.current = null;
      const oscillator = context.createOscillator(), gain = context.createGain(), analyser = context.createAnalyser();
      analyser.fftSize = 128;
      oscillator.type = "sine"; oscillator.frequency.value = mode.frequency; gain.gain.value = 0;
      oscillator.connect(gain); gain.connect(analyser).connect(context.destination); oscillator.start();
      gain.gain.linearRampToValueAtTime(0.04, context.currentTime + 0.9);
      audio.current = { context, oscillator, gain, analyser };
      setAudioOn(true); setAudioMessage("");
    } catch {
      if (generation === audioGeneration.current) {
        if (context) void context.close();
        pendingAudio.current = null;
        setAudioMessage("Não foi possível iniciar o som. Tente novamente.");
      }
    } finally {
      if (generation === audioGeneration.current) startingAudio.current = false;
    }
  }

  useEffect(() => {
    const rig = audio.current;
    if (rig) rig.oscillator.frequency.setTargetAtTime(mode.frequency, rig.context.currentTime, 0.15);
  }, [mode.frequency]);
  useEffect(() => {
    if (!audioOn) return;
    let frame = 0;
    const values = new Uint8Array(64);
    function sample() {
      const rig = audio.current;
      if (!rig) return;
      rig.analyser.getByteFrequencyData(values);
      setAudioLevel(values.reduce((sum, value) => sum + value, 0) / values.length / 255);
      frame = requestAnimationFrame(sample);
    }
    sample();
    return () => cancelAnimationFrame(frame);
  }, [audioOn]);
  useEffect(() => () => stopAudio(), [stopAudio]);
  useEffect(() => {
    const sync = () => setImmersive(document.fullscreenElement === studio.current);
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setImmersive(false); };
    document.addEventListener("fullscreenchange", sync); window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("fullscreenchange", sync); window.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => {
    if (!immersive) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [immersive]);

  async function toggleImmersive() {
    if (document.fullscreenElement) { await document.exitFullscreen(); setImmersive(false); return; }
    if (immersive) { setImmersive(false); return; }
    setImmersive(true);
    try { await studio.current?.requestFullscreen(); } catch { /* The fixed studio is the fullscreen fallback. */ }
  }
  function handleStudioKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === " ") { event.preventDefault(); setPulse(value => value + 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); setModeIndex(value => (value + 1) % modes.length); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setModeIndex(value => (value + modes.length - 1) % modes.length); }
  }

  return <div ref={root} className="solaris-experience" style={{ "--accent": mode.accent, "--accent-rgb": mode.rgb } as CSSProperties}>
    <a className="skip-link" href="#instrumento">Ir para o instrumento</a>
    <header className="experience-header">
      <a className="experience-logo" href="#inicio" aria-label="Solaris, início"><span className="experience-mark" aria-hidden="true"><i /><i /><i /></span>solaris</a>
      <nav aria-label="Navegação principal"><a href="#passage">A travessia</a><a href="#instrumento">Seu universo</a></nav>
      <button className={`sound-toggle ${audioOn ? "is-on" : ""}`} type="button" aria-pressed={audioOn} onClick={() => void toggleSound()}><span className="sound-bars" aria-hidden="true"><i /><i /><i /><i /></span>{audioOn ? "Desativar som" : "Ativar som"}</button>
    </header>

    <main>
      <section className="opening-scene" id="inicio" aria-labelledby="opening-title">
        <div className="opening-art" aria-hidden="true"><AnimatedWave src={`${import.meta.env.BASE_URL}images/solaris-sculpture.webp`} paused={wavePaused} /></div>
        <div className="opening-title"><h1 id="opening-title" aria-label="O invisível, em movimento.">O invisível,<br /><em>em movimento.</em></h1><p>Entre o seu gesto e a luz,<br />um mundo encontra forma.</p></div>
        <a className="opening-invitation" href="#passage"><span>Comece a travessia</span><span className="invitation-arrow"><Arrow /></span></a>
        <div className="opening-foot"><span>Passe pela onda. Deixe um rastro.</span><button type="button" aria-pressed={wavePaused} onClick={() => setWavePaused(value => !value)}>{wavePaused ? "Retomar onda" : "Pausar onda"}</button><span>Role devagar. Não há pressa.</span></div>
      </section>

      <section className="threshold" aria-label="Convite à experiência"><p>Você se move.<br /><span>A matéria responde.</span></p><div><span className="threshold-line" aria-hidden="true" /><p>Três formas. A mesma matéria.<br />A próxima mudança começa com você.</p></div></section>
      <ParticlePassage accent={mode.accent} intensity={intensity / 100} audioLevel={audioLevel} />

      <section ref={studio} className={`studio ${immersive ? "is-immersive" : ""}`} id="instrumento" aria-labelledby="instrument-title">
        <div className="studio-heading"><h2 id="instrument-title">Agora, <em>é seu.</em></h2><p>Escolha uma forma. Mude a atmosfera.<br />Veja até onde um gesto pode levar.</p></div>
        <div className="studio-layout">
          <div className="studio-stage" tabIndex={0} aria-label="Área interativa: espaço dispersa as partículas; setas alteram a paleta" onKeyDown={handleStudioKeys}>
            <div className="studio-scene-label"><span>Composição / {mode.name}</span><span>{mode.descriptor}</span></div>
            <CinematicField mode={mode} intensity={intensity / 100} audioLevel={audioLevel} pulseKey={pulse} />
            <button className="studio-expand" type="button" aria-pressed={immersive} onClick={() => void toggleImmersive()}>{immersive ? "Sair da tela cheia" : "Expandir experiência"}<Arrow diagonal /></button>
          </div>
          <div className="studio-tools">
            <div className="studio-control"><span className="studio-control-label">Atmosfera</span><div className="palette-options" role="group" aria-label="Escolha uma paleta">{modes.map((item, i) => <button type="button" key={item.name} aria-pressed={modeIndex === i} onClick={() => setModeIndex(i)}><i style={{ background: item.accent }} />{item.name}</button>)}</div></div>
            <label className="studio-control energy-control"><span className="studio-control-label">Intensidade <output>{intensity}%</output></span><input type="range" min="20" max="100" value={intensity} aria-label="Intensidade" onChange={event => setIntensity(Number(event.target.value))} /></label>
            <button className="scatter-action" type="button" onClick={() => setPulse(value => value + 1)}>Dispersar a matéria<Arrow /></button>
            <p className="studio-hint">Mova para explorar.<br />Toque para dispersar.</p>
          </div>
        </div>
        <p className="audio-status" role="status">{audioMessage}</p>
      </section>

      <section className="closing-scene" aria-labelledby="closing-title"><div className="closing-art" aria-hidden="true" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/solaris-sculpture.webp)` }} /><p>O movimento termina.<br />A sensação fica.</p><h2 id="closing-title">Até o próximo <em>gesto.</em></h2><a href="#inicio">Voltar ao começo<Arrow diagonal /></a></section>
    </main>
    <footer className="experience-footer"><a className="experience-logo" href="#inicio">solaris</a><span>Um estudo de luz, matéria e presença.</span><button type="button" onClick={() => about.current?.showModal()}>Sobre o experimento</button><span>2026</span></footer>
    <dialog className="about-dialog" ref={about} aria-labelledby="about-title"><form method="dialog"><button type="submit" aria-label="Fechar apresentação">Fechar</button></form><h2 id="about-title">Um espaço<br />para <em>perceber.</em></h2><p>Solaris é um experimento visual. A onda da abertura ganha movimento com a sua presença. Na travessia e no instrumento, a matéria muda de forma em tempo real.</p><p>Explore com o mouse, o toque ou o teclado. O som é opcional. Você pode pausar o movimento e guardar uma imagem da travessia.</p><span>Sem conta. Sem coleta de gestos. Só este instante.</span></dialog>
  </div>;
}
