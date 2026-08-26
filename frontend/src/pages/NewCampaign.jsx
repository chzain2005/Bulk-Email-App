import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getAccessToken } from "../lib/supabaseClient";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const quillModules = {
  toolbar: [
    [{ font: [] }, { size: [] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    ["blockquote", "link", "image"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

export default function NewCampaign() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Dear {name},\n\n");
  const [excelFile, setExcelFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [status, setStatus] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setStatus("Creating campaign…");
    const token = await getAccessToken();

    // 1. create the campaign
    const createRes = await fetch("/api/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, subject, messageTemplate: message }),
    });
    if (!createRes.ok) return setStatus("Failed to create campaign.");
    const campaign = await createRes.json();

    // 2. upload recipients excel
    if (excelFile) {
      setStatus("Importing recipients…");
      const fd = new FormData();
      fd.append("file", excelFile);
      const upRes = await fetch(`/api/upload/recipients/${campaign.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (upRes.ok) setImportSummary(await upRes.json());
    }

    // 3. upload any attachments (documents, images, video, etc)
    for (const file of attachments) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/upload/attachment/${campaign.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
    }

    setStatus("Ready.");
    navigate(`/campaigns/${campaign.id}`);
  };

  return (
    <div className="flex">
      <Navbar />
      <main className="flex-1 px-8 py-10 max-w-2xl">
        <h1 className="font-display text-2xl font-semibold mb-1">
          Compose campaign
        </h1>
        <p className="text-muted text-sm mb-8">
          Use <code className="text-accent">{"{name}"}</code>,{" "}
          <code className="text-accent">{"{email}"}</code>, or any other column
          header from your sheet as a placeholder.
        </p>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm text-muted mb-1">
              Campaign name (internal)
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="August product update"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="Hi {name}, quick update"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Message</label>
            <div className="quill-dark">
              <ReactQuill
                theme="snow"
                value={message}
                onChange={setMessage}
                modules={quillModules}
                placeholder="Dear {name},"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">
              Recipients — Excel file (<code>name</code>, <code>email</code>{" "}
              columns, plus any extras)
            </label>
            <input
              type="file"
              required
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setExcelFile(e.target.files[0])}
              className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-accent/15 file:text-accent file:text-sm file:font-medium"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">
              Attachments (optional — documents, images, video)
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setAttachments(Array.from(e.target.files))}
              className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-white/5 file:text-paper file:text-sm file:font-medium"
            />
          </div>

          <button
            type="submit"
            className="bg-accent hover:bg-accent/90 text-white font-medium text-sm rounded-md px-5 py-2.5 transition-colors"
          >
            Create campaign
          </button>

          {status && <p className="text-sm text-muted">{status}</p>}
          {importSummary && (
            <p className="text-sm text-sent">
              Imported {importSummary.imported} recipients
              {importSummary.skipped > 0 &&
                ` · skipped ${importSummary.skipped} invalid rows`}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
