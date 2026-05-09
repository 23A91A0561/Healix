import "../styles/components/Loader.css";

const Loader = ({
  variant = "spinner",
  count = 3,
}) => {
  if (variant === "skeleton-cards") {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: count }).map((_, index) => (
          <article className="skeleton-card" key={`skeleton-${index}`}>
            <div className="skeleton-line long" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-chip" />
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="loader-wrap">
      <div className="loader-spinner" />
    </div>
  );
};

export default Loader;
