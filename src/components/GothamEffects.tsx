import "../styles/gotham-effects.css";

const rainDrops = Array.from({ length: 80 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${-20 - Math.random() * 80}px`,
  height: `${36 + Math.random() * 72}px`,
  opacity: `${0.16 + Math.random() * 0.34}`,
  animationDelay: `${Math.random() * -6}s`,
  animationDuration: `${0.85 + Math.random() * 1.35}s`,
  filter: `blur(${Math.random() * 0.7}px)`,
  "--drift": `${-28 - Math.random() * 52}px`,
}));

export function GothamEffects() {
  return (
    <>
      <div className="rain">
        {rainDrops.map((drop, index) => (
          <span
            key={index}
            style={drop}
          />
        ))}
      </div>

      <div className="scanlines" />
    </>
  );
}
