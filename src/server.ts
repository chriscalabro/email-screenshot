import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
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

app.post("/api/screenshot/bulk", upload.array("eml", 30), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const options = {
      width: Math.min(1200, Math.max(300, parseInt(req.body.width) || 600)),
      showHeader: req.body.showHeader === "true",
      showDate: req.body.showDate === "true",
      showPreview: req.body.showPreview === "true",
    };

    const results: { name: string; png: Buffer }[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
      try {
        const email = await parseEml(file.buffer);
        const html = buildFullHtml(email, options);
        const png = await captureScreenshot(html, options.width);
        const pngName = originalName.replace(/\.eml$/i, ".png");
        results.push({ name: pngName, png });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push({ name: originalName, error: message });
      }
    }

    if (results.length === 0) {
      res.status(500).json({
        error: "All files failed to process",
        details: errors,
      });
      return;
    }

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="email-screenshots.zip"',
    });

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(res);

    for (const result of results) {
      archive.append(result.png, { name: result.name });
    }

    if (errors.length > 0) {
      const errorText = errors
        .map((e) => `${e.name}: ${e.error}`)
        .join("\n");
      archive.append(errorText, { name: "_errors.txt" });
    }

    await archive.finalize();
  } catch (err) {
    console.error("Bulk screenshot failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate screenshots" });
    }
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
