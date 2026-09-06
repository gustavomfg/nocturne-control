import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CinematicField } from "./CinematicField";
import "../styles/particle-passage.css";

const chapters = [
  { name: "Origem", slug: "origem", title: "O primeiro", line: "instante.", text: "Role devagar. Veja a luz ganhar forma." },
  { name: "Ruptura", slug: "ruptura", title: "Deixe tudo", line: "se desfazer.", text: "O que parecia estável encontra outro caminho." },
  { name: "Reencontro", slug: "reencontro", title: "Outra forma", line: "de existir.", text: "A mesma matéria. Um novo movimento." },
];

type Props = { accent: string; intensity: number; audioLevel: number };

export function ParticlePassage({ accent, intensity, audioLevel }: Props) {
  const root = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [heldProgress, setHeldProgress] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [saveStatus, setSaveStatus] = useState("");
  const effectiveProgress = paused ? heldProgress : progress;
  const chapter = Math.min(chapters.length - 1, Math.floor(effectiveProgress * chapters.length));
  const currentChapter = chapters[chapter];

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = root.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      setProgress(Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height - window.innerHeight))));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  function goTo(index: number) {
    const element = root.current;
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(0, element.offsetHeight - window.innerHeight);
    // Choosing a chapter explicitly leaves the held frame.
    setPaused(false);
    window.scrollTo({
      top: top + distance * ((index + 0.4) / chapters.length),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function togglePaused() {
    if (!paused) setHeldProgress(progress);
    setPaused(value => !value);
  }

  function saveFrame() {
    const canvas = root.current?.querySelector("canvas");
    if (!canvas?.dataset.ready) {
      setSaveStatus("A cena ainda não está pronta. Tente novamente em instantes.");
      return;
    }
    try {
      const link = document.createElement("a");
      link.download = `solaris-${currentChapter.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setSaveStatus("Imagem salva. Confira seus downloads.");
    } catch {
      setSaveStatus("Não foi possível salvar a imagem. Tente novamente.");
    }
  }

  return (
    <section
      className={`particle-passage particle-passage--${currentChapter.slug}${paused ? " is-paused" : ""}`}
      ref={root}
      id="passage"
      aria-label="A travessia: origem, ruptura e reencontro"
      style={{ "--passage-progress": effectiveProgress } as CSSProperties}
    >
      <div className="passage-stage">
        <div className="passage-topline">
          <span>A travessia</span>
          <span>{paused ? "Cena congelada" : "Role para transformar"}</span>
        </div>
        <div className="passage-art" aria-hidden="true">
          <CinematicField
            mode={{ accent }}
            intensity={intensity}
            audioLevel={audioLevel}
            pulseKey={pulse}
            controls={false}
            progression={effectiveProgress * 2}
            frozen={paused}
          />
        </div>
        <div className="passage-copy">
          {chapters.map((item, index) => (
            <div className={`passage-beat${chapter === index ? " is-current" : ""}`} key={item.slug} aria-hidden={chapter !== index}>
              <h2>{item.title}{" "}<br /><em>{item.line}</em></h2>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        <div className="passage-bottom">
          <nav className="passage-chapters" aria-label="Capítulos da travessia">
            {chapters.map((item, index) => (
              <button type="button" key={item.slug} onClick={() => goTo(index)} aria-current={chapter === index ? "step" : undefined}>
                <span className="passage-chapter-dot" aria-hidden="true" />{item.name}
              </button>
            ))}
          </nav>
          <div className="passage-actions" role="group" aria-label="Controles da cena">
            <button type="button" onClick={() => setPulse(value => value + 1)} disabled={paused}>Dispersar</button>
            <button type="button" onClick={togglePaused} aria-pressed={paused}>{paused ? "Retomar cena" : "Congelar cena"}</button>
            <button type="button" onClick={saveFrame}>Salvar imagem</button>
          </div>
        </div>
        <p className="passage-save-status" role="status">{saveStatus}</p>
        <div className="passage-track" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
