import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { parseEml, buildFullHtml } from "./eml-parser.js";
import { initBrowser, closeBrowser, captureScreenshot } from "./screenshot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.originalname.endsWith(".eml") ||
      file.mimetype === "message/rfc822"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .eml files are accepted"));
    }
  },
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/screenshot", upload.single("eml"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const options = {
      width: Math.min(1200, Math.max(300, parseInt(req.body.width) || 600)),
      showHeader: req.body.showHeader === "true",
      showDate: req.body.showDate === "true",
      showPreview: req.body.showPreview === "true",
    };

    const email = await parseEml(req.file.buffer);
    const html = buildFullHtml(email, options);
    const png = await captureScreenshot(html, options.width);

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="screenshot.png"`,
    });
    res.send(png);
  } catch (err) {
    console.error("Screenshot failed:", err);
    res.status(500).json({ error: "Failed to generate screenshot" });
  }
});

const PORT = process.env.PORT || 3000;

async function main() {
  await initBrowser();
  console.log("Chromium browser launched");

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

main();
