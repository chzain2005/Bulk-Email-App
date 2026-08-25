import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getAccessToken } from "../lib/supabaseClient";

const emptyForm = {
  fullName: "",
  fromName: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
};

export default function Settings() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setForm((f) => ({
            ...f,
            fullName: data.full_name || "",
            fromName: data.from_name || "",
            smtpHost: data.smtp_host || "",
            smtpPort: data.smtp_port || 587,
            smtpUser: data.smtp_user || "",
          }));
        }
      }
    })();
  }, []);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus("Saving…");
    const token = await getAccessToken();
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "Saved." : "Something went wrong.");
  };

  return (
    <div className="flex">
      <Navbar />
      <main className="flex-1 px-8 py-10 max-w-xl">
        <h1 className="font-display text-2xl font-semibold mb-1">
          Sender settings
        </h1>
        <p className="text-muted text-sm mb-8">
          Connect your own email account (e.g. Gmail with an App Password) to
          send campaigns from.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Your name</label>
            <input
              value={form.fullName}
              onChange={update("fullName")}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              "From" display name
            </label>
            <input
              value={form.fromName}
              onChange={update("fromName")}
              className="input"
              placeholder="e.g. Acme Team"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-muted mb-1">SMTP host</label>
              <input
                value={form.smtpHost}
                onChange={update("smtpHost")}
                className="input"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Port</label>
              <input
                value={form.smtpPort}
                onChange={update("smtpPort")}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              SMTP username / email
            </label>
            <input
              value={form.smtpUser}
              onChange={update("smtpUser")}
              className="input"
              autoComplete="off"
              name="smtp-user-field"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              SMTP password / app password
            </label>
            <input
              type="password"
              value={form.smtpPass}
              onChange={update("smtpPass")}
              className="input"
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              name="smtp-pass-field"
            />
            <p className="text-xs text-muted mt-1">
              For Gmail: enable 2-Step Verification, then generate one at
              myaccount.google.com/apppasswords — don't use your normal Gmail
              password here.
            </p>
          </div>

          <button
            type="submit"
            className="bg-accent hover:bg-accent/90 text-white font-medium text-sm rounded-md px-4 py-2 transition-colors"
          >
            Save settings
          </button>
          {status && <p className="text-sm text-muted">{status}</p>}
        </form>
      </main>
    </div>
  );
}
