import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getAccessToken } from "../lib/supabaseClient";

const statusColor = {
  draft: "text-muted bg-white/5",
  queued: "text-pending bg-pending/10",
  sending: "text-pending bg-pending/10",
  completed: "text-sent bg-sent/10",
  failed: "text-failed bg-failed/10",
};

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState(null);

  const loadCampaigns = async () => {
    const token = await getAccessToken();
    const res = await fetch("/api/campaigns", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setCampaigns(await res.json());
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleDelete = async (e, campaign) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This permanently removes it and all its data. This cannot be undone.`,
    );
    if (!confirmed) return;

    const token = await getAccessToken();
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
    } else {
      alert("Failed to delete campaign.");
    }
  };

  return (
    <div className="flex">
      <Navbar />
      <main className="flex-1 px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">Campaigns</h1>
            <p className="text-muted text-sm">
              Every send you've sent or drafted.
            </p>
          </div>
          <Link
            to="/new"
            className="bg-accent hover:bg-accent/90 text-white font-medium text-sm rounded-md px-4 py-2 transition-colors"
          >
            + New campaign
          </Link>
        </div>

        {campaigns === null && <p className="text-muted text-sm">Loading…</p>}

        {campaigns?.length === 0 && (
          <div className="border border-dashed border-line rounded-xl p-10 text-center">
            <p className="text-muted text-sm">
              No campaigns yet. Compose your first send.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {campaigns?.map((c) => (
            <Link
              key={c.id}
              to={`/campaigns/${c.id}`}
              className="flex items-center justify-between border border-line bg-surface rounded-lg px-4 py-3 hover:border-accent/50 transition-colors"
            >
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-muted text-xs mt-0.5">{c.subject}</p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-md capitalize ${statusColor[c.status] || statusColor.draft}`}
              >
                {c.status}
              </span>
              <button
                onClick={(e) => handleDelete(e, c)}
                className="ml-3 text-xs text-muted hover:text-failed transition-colors"
              >
                Delete
              </button>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
