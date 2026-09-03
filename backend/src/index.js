import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import campaignsRoutes from "./routes/campaigns.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import sendRoutes from "./routes/send.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import aiRoutes from "./routes/ai.routes.js";

dotenv.config();

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) =>
    res.json({ ok: true, service: "bulk-email-backend" }),
);
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/campaigns", campaignsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/send", sendRoutes);
app.use("/api/settings", settingsRoutes);
app.use('/api', aiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`Backend running on http://localhost:${PORT}`),
);