import "../styles/components/StatsCard.css";

const StatsCard = ({ label, value, note }) => {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <h3>{value}</h3>
      <p>{note}</p>
    </article>
  );
};

export default StatsCard;
