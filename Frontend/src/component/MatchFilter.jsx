import { useEffect, useRef, useState } from "react";
import "../styles/MatchFilter.css";

export default function MatchFilter({ selectedBatch = "all", onChange, batchLabel }) {
  if (typeof onChange !== "function") return null;

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const resolvedBatchLabel = batchLabel || "2022-2026";
  const isAllSelected = selectedBatch === "all";
  const isMyBatchSelected = selectedBatch === "my-batch";

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="match-filter-wrapper" ref={ref}>
      <button
        type="button"
        className="filter-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        Filter
        <span className={`chevron ${open ? "open" : ""}`}>{"\u25BE"}</span>
      </button>

      {open && (
        <div className="filter-dropdown">
          <div
            className={`filter-option ${isAllSelected ? "active" : ""}`}
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
          >
            <span className="dot blue" />
            All
          </div>

          <div
            className={`filter-option ${isMyBatchSelected ? "active" : ""}`}
            onClick={() => {
              onChange("my-batch");
              setOpen(false);
            }}
          >
            <span className="dot purple" />
            My Batch <span className="muted">({resolvedBatchLabel})</span>
          </div>
        </div>
      )}
    </div>
  );
}
