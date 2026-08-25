import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase, getAccessToken } from "../lib/supabaseClient";

const dot = {
  queued: "bg-muted",
  sending: "bg-pending animate-pulse",
  sent: "bg-sent",
  failed: "bg-failed",
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [logs, setLogs] = useState([]);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    subject: "",
    messageTemplate: "",
  });
  const [saveStatus, setSaveStatus] = useState("");

  const loadCampaign = useCallback(async () => {
    const token = await getAccessToken();
    const res = await fetch(`/api/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setCampaign(data);
      setLogs(data.logs || []);
      setEditForm({
        name: data.name,
        subject: data.subject,
        messageTemplate: data.message_template,
      });
    }
  }, [id]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    const channel = supabase
      .channel(`email_logs_${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "email_logs" },
        (payload) => {
          // Filtering here in JS instead of server-side — combining a
          // server-side filter with RLS can silently drop events, so we
          // listen to all updates and discard ones for other campaigns.
          if (payload.new.campaign_id !== id) return;
          setLogs((prev) =>
            prev.map((l) =>
              l.recipient_id === payload.new.recipient_id
                ? { ...l, status: payload.new.status }
                : l,
            ),
          );
        },
      )
      .subscribe((status) => {
        console.log("Realtime channel status:", status);
      });

    return () => supabase.removeChannel(channel);
  }, [id]);

  const handleSend = async () => {
    setSending(true);
    const token = await getAccessToken();
    await fetch(`/api/send/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSending(false);
    loadCampaign();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This permanently removes the campaign, all recipients, logs, and attachments. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    const token = await getAccessToken();
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      navigate("/");
    } else {
      setDeleting(false);
      alert("Failed to delete campaign.");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaveStatus("Saving…");
    const token = await getAccessToken();
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setSaveStatus("Saved.");
      setEditing(false);
      loadCampaign();
    } else {
      setSaveStatus("Failed to save.");
    }
  };

  const counts = logs.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  if (!campaign) {
    return (
      <div className="flex">
        <Navbar />
        <main className="flex-1 px-8 py-10 text-muted text-sm">Loading…</main>
      </div>
    );
  }

  const canEdit = campaign.status === "draft";

  return (
    <div className="flex">
      <Navbar />
      <main className="flex-1 px-8 py-10 max-w-3xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {campaign.name}
            </h1>
            <p className="text-muted text-sm mt-1">{campaign.subject}</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing((v) => !v)}
                className="bg-white/5 hover:bg-white/10 text-paper font-medium text-sm rounded-md px-4 py-2.5 transition-colors"
              >
                {editing ? "Cancel edit" : "Edit"}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-failed/10 hover:bg-failed/20 disabled:opacity-50 text-failed font-medium text-sm rounded-md px-4 py-2.5 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || campaign.status === "sending"}
              className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium text-sm rounded-md px-5 py-2.5 transition-colors"
            >
              {campaign.status === "sending" ? "Sending…" : "Send campaign"}
            </button>
          </div>
        </div>

        {editing && canEdit && (
          <form
            onSubmit={handleSaveEdit}
            className="mb-8 border border-line rounded-lg p-5 bg-surface space-y-4"
          >
            <div>
              <label className="block text-sm text-muted mb-1">
                Campaign name
              </label>
              <input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Subject</label>
              <input
                value={editForm.subject}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, subject: e.target.value }))
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Message</label>
              <textarea
                rows={8}
                value={editForm.messageTemplate}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    messageTemplate: e.target.value,
                  }))
                }
                className="input font-mono text-sm leading-relaxed"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-accent hover:bg-accent/90 text-white font-medium text-sm rounded-md px-4 py-2 transition-colors"
              >
                Save changes
              </button>
              {saveStatus && <p className="text-sm text-muted">{saveStatus}</p>}
            </div>
          </form>
        )}

        <div className="flex gap-3 mb-6 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-white/5 text-muted">
            queued {counts.queued || 0}
          </span>
          <span className="px-2 py-1 rounded bg-pending/10 text-pending">
            sending {counts.sending || 0}
          </span>
          <span className="px-2 py-1 rounded bg-sent/10 text-sent">
            sent {counts.sent || 0}
          </span>
          <span className="px-2 py-1 rounded bg-failed/10 text-failed">
            failed {counts.failed || 0}
          </span>
        </div>

        <div className="border border-line rounded-lg overflow-hidden">
          <div className="max-h-[28rem] overflow-y-auto font-mono text-xs divide-y divide-line">
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 bg-surface"
              >
                <span
                  className={`w-2 h-2 rounded-full ${dot[log.status] || dot.queued}`}
                />
                <span className="flex-1 text-paper">
                  {log.recipients?.email}
                </span>
                <span className="text-muted">{log.recipients?.name}</span>
                <span className="uppercase text-muted w-16 text-right">
                  {log.status}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="px-4 py-6 text-muted text-center">
                No recipients imported yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
