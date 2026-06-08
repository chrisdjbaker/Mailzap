import { SenderLine } from "./senderLine";
import { useSenders } from "../providers/sendersContext";
import { useMemo, useState } from "react";
import SenderLineSkeleton from "./senderLineSkeleton";
import LoadingBar from "./loadingBar";
import { useSelectedSenders } from "../providers/selectedSendersContext";
import { formatBytes } from "../../_shared/utils/utils";

type SortKey = "count" | "size" | "name";

export const SendersContainer = () => {
  const { senders, loading } = useSenders();
  const { selectedSenders, setSelectedSenders } = useSelectedSenders();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("count");

  const visibleSenders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? senders.filter(
          (s) =>
            s.email.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query),
        )
      : senders;

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "size") return b.size - a.size;
      return b.count - a.count;
    });
  }, [senders, search, sortKey]);

  const allVisibleSelected =
    visibleSenders.length > 0 &&
    visibleSenders.every((s) => s.email in selectedSenders);

  const toggleSelectAll = () => {
    setSelectedSenders((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        for (const s of visibleSenders) delete next[s.email];
      } else {
        for (const s of visibleSenders) next[s.email] = s.count;
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div id="senders">
        <LoadingBar />
        {Array.from({ length: 7 }).map((_, i) => (
          <SenderLineSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="senders-controls">
        <input
          type="text"
          className="sender-search"
          placeholder="Search senders…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search senders"
        />
        <select
          className="sender-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort senders"
        >
          <option value="count">Most emails</option>
          <option value="size">Largest size</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      <div className="senders-selectall">
        <label>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
          />
          Select all{search ? " matching" : ""} ({visibleSenders.length})
        </label>
      </div>

      <div id="senders">
        {visibleSenders.map((sender) => (
          <SenderLine
            key={sender.email}
            senderName={sender.name}
            senderEmail={sender.email}
            senderCount={sender.count}
            senderSize={formatBytes(sender.size)}
          />
        ))}
      </div>
    </>
  );
};
