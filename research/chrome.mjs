// Finds the Google Chrome already installed on this computer (set CHROME_PATH to use a different one).
import fs from "node:fs";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export const CHROME = CANDIDATES.find((p) => p && fs.existsSync(p));
if (!CHROME) throw new Error("Google Chrome was not found. Install it, or set CHROME_PATH to its location.");
