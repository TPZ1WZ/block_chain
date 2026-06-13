require("dotenv").config();

const cors = require("cors");
const express = require("express");
const multer = require("multer");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.IPFS_MAX_FILE_SIZE || 10 * 1024 * 1024),
  },
});

const PORT = Number(process.env.IPFS_SERVER_PORT || 8787);
const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

app.use(
  cors({
    origin: process.env.IPFS_CORS_ORIGIN || "http://localhost:5173",
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/ipfs/upload", upload.single("file"), async (req, res) => {
  try {
    const jwt = process.env.PINATA_JWT;

    if (!jwt) {
      return res.status(500).json({
        error: "PINATA_JWT is not configured on the upload server",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    const metadataName = req.body.name || req.file.originalname || "opentask-file";
    const file = new Blob([req.file.buffer], {
      type: req.file.mimetype || "application/octet-stream",
    });
    const form = new FormData();

    form.append("file", file, req.file.originalname || "upload");
    form.append("pinataMetadata", JSON.stringify({ name: metadataName }));
    form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const pinataRes = await fetch(PINATA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: form,
    });

    const payload = await pinataRes.json().catch(() => ({}));

    if (!pinataRes.ok) {
      return res.status(pinataRes.status).json({
        error: payload.error || payload.message || "Pinata upload failed",
        details: payload,
      });
    }

    const cid = payload.IpfsHash;

    return res.json({
      cid,
      uri: `ipfs://${cid}`,
      gatewayUrl: `${process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs"}/${cid}`,
      pinSize: payload.PinSize,
      timestamp: payload.Timestamp,
      isDuplicate: payload.isDuplicate,
    });
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File is too large" });
    }

    console.error("IPFS upload failed:", error);
    return res.status(500).json({ error: "IPFS upload failed" });
  }
});

app.listen(PORT, () => {
  console.log(`IPFS upload server listening on http://localhost:${PORT}`);
});
