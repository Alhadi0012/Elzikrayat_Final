/** Loading indicator. `full` centres it in the page for whole-page loads. */
export default function Spinner({ full = false, label = "Loading..." }) {
  return (
    <div className={full ? "spinner-wrap" : ""}>
      <div className="spinner" role="status" aria-label={label} />
    </div>
  );
}
