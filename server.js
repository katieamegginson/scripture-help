const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { buildRecommendationSet } = require("./engine");

loadEnvFile(path.join(__dirname, ".env"));

function readEnv(name, fallback = "") {
  const rawValue = process.env[name];

  if (typeof rawValue !== "string") {
    return fallback;
  }

  return rawValue.trim().replace(/^['"]|['"]$/g, "");
}

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = readEnv("HOST", "0.0.0.0");
const BIBLE_API_KEY = readEnv("BIBLE_API_KEY");
const BIBLE_ID = readEnv("BIBLE_ID");
const BIBLE_VERSION_LABEL = readEnv("BIBLE_VERSION_LABEL", "NIV");
const BIBLE_API_BASE_URL = readEnv("BIBLE_API_BASE_URL", "https://rest.api.bible");
let booksIndexPromise = null;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const STATIC_FILES = new Set([
  "/",
  "/index.html",
  "/styles.css",
  "/topics.js",
  "/engine.js",
  "/app.js",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

function serveStatic(requestPath, response) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;

  if (!STATIC_FILES.has(normalizedPath)) {
    sendText(response, 404, "Not found");
    return;
  }

  const filePath = path.join(__dirname, normalizedPath);
  const extension = path.extname(filePath);
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(response, 500, "Unable to read file");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeType,
      "Cache-Control": normalizedPath === "/sw.js" ? "no-cache" : "public, max-age=300",
    });
    response.end(data);
  });
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeBookName(value) {
  return value.toLowerCase().replace(/[.\s]+/g, " ").trim();
}

function addBookAlias(index, key, bookId) {
  if (!key) {
    return;
  }

  index.set(normalizeBookName(key), bookId);
}

async function getBooksIndex() {
  if (booksIndexPromise) {
    return booksIndexPromise;
  }

  booksIndexPromise = (async () => {
    const response = await fetch(`${BIBLE_API_BASE_URL}/v1/bibles/${BIBLE_ID}/books`, {
      headers: {
        "api-key": BIBLE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Books lookup failed with status ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    const books = Array.isArray(payload.data) ? payload.data : [];
    const index = new Map();

    books.forEach((book) => {
      addBookAlias(index, book.id, book.id);
      addBookAlias(index, book.abbreviation, book.id);
      addBookAlias(index, book.name, book.id);
      addBookAlias(index, book.nameLong, book.id);

      if (book.nameLong === "Psalms") {
        addBookAlias(index, "Psalm", book.id);
      }
    });

    addBookAlias(index, "Song of Solomon", "SNG");
    addBookAlias(index, "Song of Songs", "SNG");

    return index;
  })();

  return booksIndexPromise;
}

async function referenceToVerseId(reference) {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);

  if (!match) {
    throw new Error(`Unsupported reference format: ${reference}`);
  }

  const [, bookName, chapter, startVerse, endChapter, endVerse] = match;
  const booksIndex = await getBooksIndex();
  const bookId = booksIndex.get(normalizeBookName(bookName));

  if (!bookId) {
    throw new Error(`Unknown book in reference: ${reference}`);
  }

  const startId = `${bookId}.${chapter}.${startVerse}`;

  if (!endVerse) {
    return startId;
  }

  const rangeChapter = endChapter || chapter;
  const endId = `${bookId}.${rangeChapter}.${endVerse}`;
  return `${startId}-${endId}`;
}

async function fetchVerseText(reference) {
  if (!BIBLE_API_KEY || !BIBLE_ID) {
    return { text: "", sourceMode: "reference-only" };
  }

  const verseId = await referenceToVerseId(reference);
  const url = `${BIBLE_API_BASE_URL}/v1/bibles/${BIBLE_ID}/verses/${verseId}?include-chapter-numbers=false&include-verse-numbers=false`;
  const response = await fetch(url, {
    headers: {
      "api-key": BIBLE_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Search failed with status ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const data = payload && payload.data ? payload.data : {};

  if (data.content) {
    return {
      text: stripHtml(data.content),
      sourceMode: "niv-live",
    };
  }

  if (Array.isArray(data.verses) && data.verses[0] && data.verses[0].text) {
    return {
      text: data.verses[0].text.trim(),
      sourceMode: "niv-live",
    };
  }

  return { text: "", sourceMode: "reference-only" };
}

async function handleRecommendation(request, response) {
  try {
    const body = await readJsonBody(request);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      sendJson(response, 400, { error: "Prompt is required." });
      return;
    }

    const insight = buildRecommendationSet(prompt);
    const verseErrors = [];
    const verses = await Promise.all(
      insight.recommendations.map(async (item) => {
        try {
          const liveVerse = await fetchVerseText(item.reference);
          return {
            ...item,
            text: liveVerse.text,
            sourceMode: liveVerse.sourceMode,
          };
        } catch (error) {
          verseErrors.push(`${item.reference}: ${error.message}`);
          return {
            ...item,
            text: "",
            sourceMode: "reference-only",
          };
        }
      }),
    );

    sendJson(response, 200, {
      id: randomUUID(),
      prompt,
      createdAt: new Date().toISOString(),
      themes: insight.topics.map((topic) => topic.label),
      verses,
      bibleVersion: BIBLE_VERSION_LABEL,
      sourceConfigured: Boolean(BIBLE_API_KEY && BIBLE_ID),
      warning:
        verseErrors.length > 0
          ? `Live Bible lookup failed for one or more verses. ${verseErrors[0]}`
          : "",
    });
  } catch (error) {
    sendJson(response, 500, { error: `Unable to build recommendation. ${error.message}` });
  }
}

async function handleStatus(response) {
  const configured = Boolean(BIBLE_API_KEY && BIBLE_ID);

  if (!configured) {
    sendJson(response, 200, {
      ok: true,
      configured: false,
      bibleVersion: BIBLE_VERSION_LABEL,
      accessVerified: false,
      message: "Server is running in reference-only mode until BIBLE_API_KEY and BIBLE_ID are set.",
    });
    return;
  }

  try {
    const apiResponse = await fetch(`${BIBLE_API_BASE_URL}/v1/bibles/${BIBLE_ID}`, {
      headers: {
        "api-key": BIBLE_API_KEY,
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      sendJson(response, 200, {
        ok: true,
        configured: true,
        bibleVersion: BIBLE_VERSION_LABEL,
        accessVerified: false,
        message: `Server has credentials, but Bible access failed with status ${apiResponse.status}. ${errorText}`,
      });
      return;
    }

    const payload = await apiResponse.json();
    const bibleName = payload && payload.data && payload.data.name ? payload.data.name : BIBLE_VERSION_LABEL;

    sendJson(response, 200, {
      ok: true,
      configured: true,
      bibleVersion: BIBLE_VERSION_LABEL,
      accessVerified: true,
      message: `${BIBLE_VERSION_LABEL} is configured on the server and Bible access is verified for ${bibleName}.`,
    });
  } catch (error) {
    sendJson(response, 200, {
      ok: true,
      configured: true,
      bibleVersion: BIBLE_VERSION_LABEL,
      accessVerified: false,
      message: `Server has credentials, but could not verify Bible access. ${error.message}`,
    });
  }
}

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/status") {
      handleStatus(response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/recommend") {
      handleRecommendation(request, response);
      return;
    }

    if (request.method === "GET") {
      serveStatic(url.pathname, response);
      return;
    }

    sendText(response, 405, "Method not allowed");
  });
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`Scripture Help running at http://localhost:${PORT}`);
    console.log(`Listening on ${HOST}:${PORT} for local network access`);
  });
}

module.exports = {
  createServer,
};
