import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const HOST = process.env.UNLOCK_SERVER_HOST || "127.0.0.1";
const PORT = Number(process.env.UNLOCK_SERVER_PORT || 8787);
const QPDF_BIN = process.env.QPDF_PATH || "qpdf";
const MAX_BODY_BYTES = Number(process.env.UNLOCK_SERVER_MAX_BODY_BYTES || 80 * 1024 * 1024);

const sendJson = (res, statusCode, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(payload);
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    let byteLength = 0;

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      byteLength += Buffer.byteLength(chunk);
      if (byteLength > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });

const runQpdfDecrypt = (inputPath, outputPath, password) =>
  new Promise((resolve, reject) => {
    const args = [`--password=${password}`, "--decrypt", inputPath, outputPath];
    const child = spawn(QPDF_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const error = new Error(stderr || stdout || `qpdf exited with code ${code}`);
      error.code = code;
      reject(error);
    });
  });

const isLikelyPasswordError = (message) => {
  const lowered = (message || "").toLowerCase();
  return lowered.includes("invalid password") || lowered.includes("incorrect password");
};

const unlockWithQpdf = async ({ pdfBase64, password }) => {
  const inputBytes = Buffer.from(pdfBase64, "base64");
  if (!inputBytes.length) {
    throw new Error("Invalid PDF payload");
  }

  const tempDir = path.join(os.tmpdir(), `pdf-toolkit-unlock-${randomUUID()}`);
  const inputPath = path.join(tempDir, "input.pdf");
  const outputPath = path.join(tempDir, "output.pdf");

  await fs.mkdir(tempDir, { recursive: true });

  try {
    await fs.writeFile(inputPath, inputBytes);
    await runQpdfDecrypt(inputPath, outputPath, password);
    const unlockedBytes = await fs.readFile(outputPath);
    return unlockedBytes.toString("base64");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: "Bad request" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, qpdf: QPDF_BIN });
    return;
  }

  if (req.method !== "POST" || req.url !== "/unlock") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const pdfBase64 = typeof body?.pdfBase64 === "string" ? body.pdfBase64 : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!pdfBase64 || !password) {
      sendJson(res, 400, { error: "pdfBase64 and password are required" });
      return;
    }

    const unlockedBase64 = await unlockWithQpdf({ pdfBase64, password });
    sendJson(res, 200, { pdfBase64: unlockedBase64, method: "qpdf" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected unlock error";

    if (message === "Payload too large") {
      sendJson(res, 413, { error: message });
      return;
    }

    if (isLikelyPasswordError(message)) {
      sendJson(res, 401, { error: "Invalid password" });
      return;
    }

    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[qpdf-unlock-server] listening on http://${HOST}:${PORT}`);
  console.log(`[qpdf-unlock-server] using qpdf binary: ${QPDF_BIN}`);
});
