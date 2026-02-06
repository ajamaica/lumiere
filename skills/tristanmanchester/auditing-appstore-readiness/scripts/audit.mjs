#!/usr/bin/env node
/**
 * App Store readiness audit (static, mostly read-only)
 *
 * Usage:
 *   node audit.mjs --repo . --format md
 *   node audit.mjs --repo apps/mobile --format md --json audit.json
 *
 * Exit codes:
 *   0 = PASS (no FAIL/WARN)
 *   1 = FAIL (>=1 FAIL)
 *   2 = WARN (no FAIL, >=1 WARN)
 *   3 = tool error
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const NOW = new Date().toISOString();

function failAndExit(message) {
  console.error(message);
  process.exit(3);
}

function parseArgs(argv) {
  const args = { repo: ".", format: "md", json: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i] ?? args.repo;
    else if (a === "--format") args.format = argv[++i] ?? args.format;
    else if (a === "--json") args.json = argv[++i] ?? null;
    else if (a === "-h" || a === "--help") {
      console.log(`Usage:
  node audit.mjs --repo <path> [--format md|json] [--json <path>]

Notes:
  --format controls stdout format (default: md).
  --json writes a JSON report to disk (in addition to stdout).`);
      process.exit(0);
    } else {
      // Unknown arg; ignore to keep CLI permissive.
    }
  }
  return args;
}

function pathExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function readJson(p) {
  return JSON.parse(readText(p));
}

function binOnPath(bin) {
  const sep = process.platform === "win32" ? ";" : ":";
  const exts = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];
  const dirs = (process.env.PATH || "").split(sep).filter(Boolean);
  for (const d of dirs) {
    for (const ext of exts) {
      const candidate = path.join(d, process.platform === "win32" ? `${bin}${ext}` : bin);
      if (pathExists(candidate)) return candidate;
    }
  }
  return null;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });
  return res;
}

function runShell(command, opts = {}) {
  // Use the platform shell for convenience; keep output bounded.
  const shell = process.platform === "win32" ? "cmd.exe" : (process.env.SHELL || "/bin/bash");
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];
  return run(shell, args, opts);
}

function git(repo, args) {
  const res = run("git", ["-C", repo, ...args]);
  if (res.error) return { ok: false, code: 127, stdout: "", stderr: String(res.error) };
  return { ok: res.status === 0, code: res.status ?? 1, stdout: res.stdout || "", stderr: res.stderr || "" };
}

function safeRel(repo, p) {
  try {
    return path.relative(repo, p) || ".";
  } catch {
    return p;
  }
}

function normaliseSlashes(p) {
  return p.replaceAll("\\", "/");
}

function chooseBestPath(paths, { preferContains = [], avoidContains = [] } = {}) {
  if (!paths.length) return null;
  const scored = paths.map((p) => {
    const norm = normaliseSlashes(p);
    let score = 0;
    for (const s of preferContains) if (norm.includes(s)) score += 10;
    for (const s of avoidContains) if (norm.includes(s)) score -= 20;
    // Prefer shallower paths (less depth).
    score -= norm.split("/").length;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].p;
}

function extractPlistString(xml, key) {
  const re = new RegExp(`<key>\\s*${escapeRegExp(key)}\\s*</key>\\s*<string>([^<]*)</string>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return decodeXml(m[1].trim());
}

function extractPlistBool(xml, key) {
  const reTrue = new RegExp(`<key>\\s*${escapeRegExp(key)}\\s*</key>\\s*<true\\s*/>`, "i");
  const reFalse = new RegExp(`<key>\\s*${escapeRegExp(key)}\\s*</key>\\s*<false\\s*/>`, "i");
  if (reTrue.test(xml)) return true;
  if (reFalse.test(xml)) return false;
  return null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXml(s) {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function parsePlistBestEffort(filePath) {
  // Strategy 1: plutil -> json
  const plutil = binOnPath("plutil");
  if (plutil) {
    const res = run(plutil, ["-convert", "json", "-o", "-", filePath]);
    if (res.status === 0 && res.stdout) {
      try {
        return { ok: true, data: JSON.parse(res.stdout), parser: "plutil" };
      } catch {
        // fallthrough
      }
    }
  }

  // Strategy 2: python3 plistlib -> json
  const py = binOnPath("python3") || binOnPath("python");
  if (py) {
    const code = [
      "import json, plistlib, sys",
      "with open(sys.argv[1], 'rb') as f:",
      "  obj = plistlib.load(f)",
      "print(json.dumps(obj))",
    ].join("\n");
    const res = run(py, ["-c", code, filePath]);
    if (res.status === 0 && res.stdout) {
      try {
        return { ok: true, data: JSON.parse(res.stdout), parser: "python-plistlib" };
      } catch {
        // fallthrough
      }
    }
  }

  // Strategy 3: regex for common keys (XML plists only)
  try {
    const xml = readText(filePath);
    const data = {};
    const keys = [
      "CFBundleIdentifier",
      "CFBundleShortVersionString",
      "CFBundleVersion",
      "CFBundleDisplayName",
      "CFBundleName",
      "UILaunchStoryboardName",
      "NSUserTrackingUsageDescription",
      "NSCameraUsageDescription",
      "NSMicrophoneUsageDescription",
      "NSPhotoLibraryUsageDescription",
      "NSPhotoLibraryAddUsageDescription",
      "NSLocationWhenInUseUsageDescription",
      "NSLocationAlwaysAndWhenInUseUsageDescription",
      "NSContactsUsageDescription",
      "NSBluetoothAlwaysUsageDescription",
      "NSFaceIDUsageDescription",
      "NSSpeechRecognitionUsageDescription",
      "NSMotionUsageDescription",
      "NSCalendarsUsageDescription",
      "NSRemindersUsageDescription",
    ];
    for (const k of keys) {
      const v = extractPlistString(xml, k);
      if (v != null) data[k] = v;
    }

    // ATS broad exemption: NSAllowsArbitraryLoads inside NSAppTransportSecurity dict.
    data.__NSAllowsArbitraryLoads = /<key>\s*NSAppTransportSecurity\s*<\/key>[\s\S]*?<key>\s*NSAllowsArbitraryLoads\s*<\/key>\s*<true\s*\/>/.test(xml);

    return { ok: true, data, parser: "regex-xml" };
  } catch {
    return { ok: false, data: null, parser: "none" };
  }
}

function readPackageJson(repo) {
  const p = path.join(repo, "package.json");
  if (!isFile(p)) return null;
  try {
    return { path: p, data: readJson(p) };
  } catch {
    return { path: p, data: null };
  }
}

function readAppJson(repo) {
  const p = path.join(repo, "app.json");
  if (!isFile(p)) return null;
  try {
    return { path: p, data: readJson(p) };
  } catch {
    return { path: p, data: null };
  }
}

function listFiles(repo, gitOk) {
  if (gitOk) {
    const res = git(repo, ["ls-files"]);
    if (res.ok) {
      return res.stdout.split(/\r?\n/).filter(Boolean).map((rel) => path.join(repo, rel));
    }
  }
  // Fallback: shallow walk (avoid node_modules/Pods)
  const out = [];
  const IGNORE_DIRS = new Set([".git", "node_modules", "Pods", "build", "DerivedData"]);
  function walk(dir, depth) {
    if (depth > 6) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name)) continue;
        walk(p, depth + 1);
      } else if (e.isFile()) {
        out.push(p);
      }
    }
  }
  walk(repo, 0);
  return out;
}

function detectProject(repo, pkg, appJson, files) {
  const hasIosDir = isDir(path.join(repo, "ios"));
  const xcodeproj = files.filter((f) => f.endsWith(".xcodeproj")).map((f) => normaliseSlashes(safeRel(repo, f)));
  const xcworkspace = files.filter((f) => f.endsWith(".xcworkspace")).map((f) => normaliseSlashes(safeRel(repo, f)));

  const pkgStr = pkg?.data ? JSON.stringify(pkg.data) : "";
  const hasExpo = /"expo"\s*:/.test(pkgStr) || /expo/.test(pkgStr) || (appJson?.data && Object.prototype.hasOwnProperty.call(appJson.data, "expo"));
  const hasReactNative = /"react-native"\s*:/.test(pkgStr) || /react-native/.test(pkgStr);

  let flavour = "unknown";
  if (hasExpo) flavour = "expo";
  else if (hasReactNative && hasIosDir) flavour = "react-native";
  else if (xcodeproj.length || xcworkspace.length) flavour = "native-ios";

  // Choose iOS container (xcode project/workspace)
  const projectPaths = [...xcworkspace, ...xcodeproj];
  const bestProject = chooseBestPath(projectPaths, { preferContains: ["/ios/"], avoidContains: ["/Pods/"] });

  return {
    flavour,
    hasIosDir,
    xcodeproj,
    xcworkspace,
    bestProject,
  };
}

function detectInfoPlist(repo, files) {
  const candidates = files
    .filter((f) => f.endsWith("Info.plist"))
    .map((f) => normaliseSlashes(safeRel(repo, f)))
    .filter((rel) => !rel.includes("/Pods/") && !rel.includes("/node_modules/") && !rel.includes("/build/") && !rel.includes("/DerivedData/"));

  const best = chooseBestPath(candidates, {
    preferContains: ["/ios/"],
    avoidContains: ["/Tests/", "/UITests/", "/Example/", "/Examples/"],
  });

  return { candidates, best };
}

function detectEntitlements(repo, files) {
  const candidates = files
    .filter((f) => f.endsWith(".entitlements"))
    .map((f) => normaliseSlashes(safeRel(repo, f)))
    .filter((rel) => !rel.includes("/Pods/") && !rel.includes("/node_modules/"));
  const best = chooseBestPath(candidates, { preferContains: ["/ios/"], avoidContains: ["/Pods/"] });
  return { candidates, best };
}

function detectPrivacyManifest(repo, files) {
  const candidates = files
    .filter((f) => f.endsWith("PrivacyInfo.xcprivacy"))
    .map((f) => normaliseSlashes(safeRel(repo, f)))
    .filter((rel) => !rel.includes("/Pods/") && !rel.includes("/node_modules/") && !rel.includes("/build/") && !rel.includes("/DerivedData/"));
  const best = chooseBestPath(candidates, { preferContains: ["/ios/"], avoidContains: [] });
  return { candidates, best };
}

function detectAppIcon(repo, files) {
  const candidates = files
    .filter((f) => f.endsWith("AppIcon.appiconset/Contents.json"))
    .map((f) => normaliseSlashes(safeRel(repo, f)))
    .filter((rel) => !rel.includes("/Pods/") && !rel.includes("/node_modules/"));
  const best = chooseBestPath(candidates, { preferContains: ["/ios/"], avoidContains: [] });
  return { candidates, best };
}

function detectLaunchScreen(repo, files) {
  const candidates = files
    .filter((f) => /LaunchScreen\.(storyboard|xib)$/.test(f))
    .map((f) => normaliseSlashes(safeRel(repo, f)))
    .filter((rel) => !rel.includes("/Pods/") && !rel.includes("/node_modules/"));
  const best = chooseBestPath(candidates, { preferContains: ["/ios/"], avoidContains: [] });
  return { candidates, best };
}

function detectPrivacyPolicyArtifact(repo, files) {
  const patterns = [
    /^PRIVACY\.md$/i,
    /^PRIVACY_POLICY\.md$/i,
    /privacy.*policy/i,
  ];
  const rels = files.map((f) => normaliseSlashes(safeRel(repo, f)));
  for (const re of patterns) {
    const hit = rels.find((r) => re.test(path.basename(r)) || re.test(r));
    if (hit) return hit;
  }
  // Fall back: README contains "privacy policy"
  const readmes = rels.filter((r) => /^README(\..*)?$/i.test(path.basename(r)));
  for (const r of readmes) {
    try {
      const t = readText(path.join(repo, r));
      if (/privacy policy/i.test(t)) return r;
    } catch { /* ignore */ }
  }
  return null;
}

function detectSecrets(repo, files, gitOk) {
  const rels = files.map((f) => normaliseSlashes(safeRel(repo, f)));
  const badExt = [
    ".p12",
    ".p8",
    ".mobileprovision",
    ".keystore",
    ".jks",
    ".pem",
    ".cer",
    ".der",
  ];
  const bad = rels.filter((r) => badExt.some((ext) => r.toLowerCase().endsWith(ext)));
  const envFiles = rels.filter((r) => /(^|\/)\.env(\.|$)/i.test(r));
  const sshKeys = rels.filter((r) => /id_rsa|id_ed25519/i.test(path.basename(r)));

  // Also check git-ignored secrets that are still tracked (common pitfall).
  let gitIgnoredTracked = [];
  if (gitOk) {
    const res = git(repo, ["check-ignore", "-v", ...bad]);
    if (res.ok && res.stdout) {
      gitIgnoredTracked = res.stdout.split(/\r?\n/).filter(Boolean).map((l) => l.trim());
    }
  }

  return { bad, envFiles, sshKeys, gitIgnoredTracked };
}

function inferRequiredUsageStrings({ flavour, pkg, appJson, files }) {
  const required = new Map(); // key -> reasons
  const add = (key, reason) => {
    const arr = required.get(key) || [];
    arr.push(reason);
    required.set(key, arr);
  };

  const depBlob = pkg?.data ? JSON.stringify({ dependencies: pkg.data.dependencies, devDependencies: pkg.data.devDependencies }) : "";
  const fileBlob = files.length ? files.map((f) => normaliseSlashes(f)).join("\n") : "";

  const match = (re) => re.test(depBlob);

  // Expo/RN dependency signals
  if (match(/expo-camera|react-native-camera|vision-camera/i)) add("NSCameraUsageDescription", "camera dependency present");
  if (match(/expo-av|expo-audio|react-native-audio|react-native-voice|react-native-sound/i)) add("NSMicrophoneUsageDescription", "audio/mic dependency present");
  if (match(/expo-media-library|react-native-image-picker|react-native-photo/i)) {
    add("NSPhotoLibraryUsageDescription", "photo/media dependency present");
    add("NSPhotoLibraryAddUsageDescription", "photo/media dependency present");
  }
  if (match(/expo-location|@react-native-community\/geolocation|react-native-geolocation-service/i)) add("NSLocationWhenInUseUsageDescription", "location dependency present");
  if (match(/expo-contacts|react-native-contacts/i)) add("NSContactsUsageDescription", "contacts dependency present");
  if (match(/expo-tracking-transparency|react-native-tracking-transparency/i)) add("NSUserTrackingUsageDescription", "tracking transparency dependency present");
  if (match(/firebase|fb(ad)?sdk|appsflyer|adjust|branch/i)) add("NSUserTrackingUsageDescription", "attribution/analytics SDK present (verify tracking)");

  // Native code signals (best-effort grep via filenames only; avoids reading all code).
  // If the repo is native iOS and has these framework references, usage strings are likely required.
  if (flavour === "native-ios") {
    if (/CLLocationManager/.test(fileBlob)) add("NSLocationWhenInUseUsageDescription", "CLLocationManager symbol appears in repo paths");
    if (/AVCapture/.test(fileBlob)) add("NSCameraUsageDescription", "AVCapture symbol appears in repo paths");
  }

  // Expo config can also encode permissions explicitly; surface as info only.
  if (flavour === "expo" && appJson?.data) {
    const infoPlist = appJson.data?.expo?.ios?.infoPlist;
    if (infoPlist && typeof infoPlist === "object") {
      for (const k of Object.keys(infoPlist)) {
        if (/^NS[A-Z].*UsageDescription$/.test(k)) add(k, "present in expo.ios.infoPlist (config)");
      }
    }
  }

  return required;
}

function checkNonEmptyString(val) {
  if (typeof val !== "string") return false;
  const t = val.trim();
  if (!t) return false;
  if (/^todo\b|^tbd\b|^fixme\b/i.test(t)) return false;
  return t.length >= 6; // heuristic
}

function runAudit(repo) {
  const checks = [];

  const gitInside = git(repo, ["rev-parse", "--is-inside-work-tree"]);
  const gitOk = gitInside.ok && gitInside.stdout.trim() === "true";

  const files = listFiles(repo, gitOk);

  const pkg = readPackageJson(repo);
  const appJson = readAppJson(repo);

  const project = detectProject(repo, pkg, appJson, files);

  // Repo hygiene
  if (gitOk) {
    const st = git(repo, ["status", "--porcelain"]);
    const dirty = st.ok && st.stdout.trim().length > 0;
    checks.push({
      id: "git-clean",
      status: dirty ? "WARN" : "PASS",
      title: "Git working tree is clean",
      evidence: dirty ? st.stdout.split(/\r?\n/).slice(0, 20).join("\n") : "clean",
      remediation: dirty ? "Commit/stash changes before cutting a release build." : null,
    });

    const sha = git(repo, ["rev-parse", "--short", "HEAD"]);
    const branch = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const tag = git(repo, ["describe", "--tags", "--abbrev=0"]);
    checks.push({
      id: "git-snapshot",
      status: "INFO",
      title: "Git snapshot",
      evidence: `branch=${branch.ok ? branch.stdout.trim() : "?"} sha=${sha.ok ? sha.stdout.trim() : "?"} latestTag=${tag.ok ? tag.stdout.trim() : "none"}`,
      remediation: null,
    });
  } else {
    checks.push({
      id: "git-repo",
      status: "WARN",
      title: "Repository is not a git worktree (or git unavailable)",
      evidence: gitInside.stderr.trim() || "not a git repo",
      remediation: "Use git tags/branches to track the exact build submitted to App Store Connect.",
    });
  }

  // Secrets scan
  const secrets = detectSecrets(repo, files, gitOk);
  if (secrets.bad.length || secrets.sshKeys.length) {
    checks.push({
      id: "secrets-artifacts",
      status: "FAIL",
      title: "Potential secret/signing artifacts tracked in repo",
      evidence: [...secrets.bad, ...secrets.sshKeys].slice(0, 50).join("\n"),
      remediation: "Remove these files from the repo history and rotate any compromised credentials. Use keychain/CI secrets instead.",
    });
  } else if (secrets.envFiles.length) {
    checks.push({
      id: "secrets-env",
      status: "WARN",
      title: "Possible .env files tracked in repo",
      evidence: secrets.envFiles.slice(0, 50).join("\n"),
      remediation: "Ensure .env files contain no secrets, or remove from git and document a template (.env.example).",
    });
  } else {
    checks.push({
      id: "secrets-scan",
      status: "PASS",
      title: "No obvious secret/signing files detected in tracked files",
      evidence: "checked common secret extensions (.p12/.p8/.mobileprovision/.pem/.keystore) and .env patterns",
      remediation: null,
    });
  }

  // Detect Info.plist
  const info = detectInfoPlist(repo, files);
  let infoPlist = null;
  if (info.best) {
    const abs = path.join(repo, info.best);
    const parsed = parsePlistBestEffort(abs);
    if (parsed.ok) infoPlist = { path: info.best, parsed };
  }

  if (!infoPlist) {
    checks.push({
      id: "info-plist",
      status: project.flavour === "expo" ? "WARN" : "FAIL",
      title: "Info.plist found and parseable",
      evidence: info.candidates.slice(0, 20).join("\n") || "no Info.plist candidates found",
      remediation: project.flavour === "expo"
        ? "Expo managed projects may not have ios/ committed. Ensure iOS config (bundle id, version/build, permissions) is defined in app.json/app.config and validated via EAS/Xcode."
        : "Ensure the iOS target has an Info.plist in the repo, and that the audit tool can access it.",
    });
  } else {
    const d = infoPlist.parsed.data || {};
    const bundleId = d.CFBundleIdentifier || null;
    const version = d.CFBundleShortVersionString || null;
    const build = d.CFBundleVersion || null;

    checks.push({
      id: "bundle-id",
      status: bundleId ? "PASS" : "FAIL",
      title: "Bundle identifier is present",
      evidence: bundleId ? `${infoPlist.path}: CFBundleIdentifier=${bundleId}` : `${infoPlist.path}: CFBundleIdentifier missing`,
      remediation: bundleId ? null : "Set PRODUCT_BUNDLE_IDENTIFIER in Xcode build settings (and/or CFBundleIdentifier in Info.plist).",
    });

    checks.push({
      id: "version-build",
      status: version && build ? "PASS" : "FAIL",
      title: "Version and build number are present",
      evidence: `${infoPlist.path}: CFBundleShortVersionString=${version ?? "missing"}; CFBundleVersion=${build ?? "missing"}`,
      remediation: version && build ? null : "Set CFBundleShortVersionString (marketing version) and CFBundleVersion (build number).",
    });

    const ats = d.__NSAllowsArbitraryLoads === true;
    checks.push({
      id: "ats",
      status: ats ? "WARN" : "PASS",
      title: "No broad App Transport Security exemption",
      evidence: ats ? `${infoPlist.path}: NSAllowsArbitraryLoads=true` : "NSAllowsArbitraryLoads not detected (best-effort)",
      remediation: ats ? "Remove NSAllowsArbitraryLoads or scope to NSExceptionDomains with justification." : null,
    });

    const launch = d.UILaunchStoryboardName || null;
    if (launch) {
      checks.push({
        id: "launch-storyboard-key",
        status: "INFO",
        title: "Launch screen storyboard configured",
        evidence: `${infoPlist.path}: UILaunchStoryboardName=${launch}`,
        remediation: null,
      });
    }
  }

  // App icon
  const icon = detectAppIcon(repo, files);
  if (!icon.best) {
    // Expo may use app.json icon
    const expoIconPath = project.flavour === "expo" ? (appJson?.data?.expo?.ios?.icon || appJson?.data?.expo?.icon || null) : null;
    if (expoIconPath) {
      const abs = path.join(repo, expoIconPath);
      checks.push({
        id: "app-icon",
        status: isFile(abs) ? "PASS" : "FAIL",
        title: "App icon configured",
        evidence: `expo icon=${expoIconPath} (${isFile(abs) ? "exists" : "missing file"})`,
        remediation: isFile(abs) ? null : "Fix expo icon path or add the referenced icon file.",
      });
    } else {
      checks.push({
        id: "app-icon",
        status: "FAIL",
        title: "App icon present (AppIcon.appiconset or Expo icon)",
        evidence: icon.candidates.slice(0, 10).join("\n") || "no AppIcon.appiconset/Contents.json found",
        remediation: "Ensure the iOS project includes an AppIcon asset with an iOS-marketing 1024×1024 icon, or configure expo.icon/expo.ios.icon.",
      });
    }
  } else {
    const abs = path.join(repo, icon.best);
    let ok = false;
    let detail = "";
    try {
      const j = readJson(abs);
      const images = Array.isArray(j.images) ? j.images : [];
      ok = images.some((im) => im.idiom === "ios-marketing" && im.size === "1024x1024");
      detail = ok ? "found ios-marketing 1024×1024" : "missing ios-marketing 1024×1024 entry";
    } catch (e) {
      detail = `failed to parse JSON: ${String(e)}`;
    }
    checks.push({
      id: "app-icon",
      status: ok ? "PASS" : "FAIL",
      title: "App Store icon (ios-marketing 1024×1024) present",
      evidence: `${icon.best}: ${detail}`,
      remediation: ok ? null : "Update AppIcon.appiconset/Contents.json to include an ios-marketing 1024×1024 icon.",
    });
  }

  // Launch screen
  const launchScreen = detectLaunchScreen(repo, files);
  if (launchScreen.best) {
    checks.push({
      id: "launch-screen",
      status: "PASS",
      title: "Launch screen storyboard/xib present",
      evidence: launchScreen.best,
      remediation: null,
    });
  } else {
    // If Info.plist had UILaunchStoryboardName we already emitted INFO; still warn if file missing.
    checks.push({
      id: "launch-screen",
      status: "WARN",
      title: "Launch screen storyboard/xib present",
      evidence: "No LaunchScreen.storyboard or LaunchScreen.xib found in tracked files",
      remediation: "Ensure a launch screen exists and is referenced (UILaunchStoryboardName).",
    });
  }

  // Privacy manifest
  const privacy = detectPrivacyManifest(repo, files);
  if (privacy.best) {
    checks.push({
      id: "privacy-manifest",
      status: "PASS",
      title: "Privacy manifest (PrivacyInfo.xcprivacy) present",
      evidence: privacy.best,
      remediation: null,
    });
  } else {
    checks.push({
      id: "privacy-manifest",
      status: "WARN",
      title: "Privacy manifest (PrivacyInfo.xcprivacy) present",
      evidence: "No PrivacyInfo.xcprivacy found in tracked files",
      remediation: "Add an app-level PrivacyInfo.xcprivacy if required (and review Xcode’s Privacy Report for third-party SDK manifests and required reason APIs).",
    });
  }

  // Permission usage strings (best-effort inference)
  const requiredStrings = inferRequiredUsageStrings({ flavour: project.flavour, pkg, appJson, files: files.map((f) => normaliseSlashes(safeRel(repo, f))) });
  const missing = [];
  const present = [];
  if (requiredStrings.size) {
    if (infoPlist?.parsed?.data) {
      const d = infoPlist.parsed.data;
      for (const [key, reasons] of requiredStrings.entries()) {
        const val = d[key];
        if (checkNonEmptyString(val)) present.push({ key, reasons, val });
        else missing.push({ key, reasons, val });
      }
    } else if (project.flavour === "expo" && appJson?.data?.expo?.ios?.infoPlist) {
      const d = appJson.data.expo.ios.infoPlist;
      for (const [key, reasons] of requiredStrings.entries()) {
        const val = d[key];
        if (checkNonEmptyString(val)) present.push({ key, reasons, val });
        else missing.push({ key, reasons, val });
      }
    } else {
      // Can't evaluate; emit warning.
      missing.push(...Array.from(requiredStrings.keys()).map((k) => ({ key: k, reasons: requiredStrings.get(k) || [], val: null })));
    }
  }

  if (requiredStrings.size === 0) {
    checks.push({
      id: "permission-strings",
      status: "INFO",
      title: "Permission usage strings (inferred) — none detected",
      evidence: "No strong signals for camera/location/tracking/etc in dependencies (best-effort).",
      remediation: null,
    });
  } else if (missing.length) {
    checks.push({
      id: "permission-strings",
      status: infoPlist ? "FAIL" : "WARN",
      title: "Permission usage strings present for inferred capabilities",
      evidence: missing.slice(0, 20).map((m) => `${m.key} (because: ${m.reasons.join("; ")})`).join("\n"),
      remediation: "Add the missing NS…UsageDescription keys with human-readable explanations (see references/permissions-map.md).",
    });
  } else {
    checks.push({
      id: "permission-strings",
      status: "PASS",
      title: "Permission usage strings present for inferred capabilities",
      evidence: present.slice(0, 20).map((m) => `${m.key}="${String(m.val).trim()}"`).join("\n"),
      remediation: null,
    });
  }

  // Expo config basics
  if (project.flavour === "expo") {
    const expo = appJson?.data?.expo;
    if (!expo) {
      checks.push({
        id: "expo-config",
        status: "WARN",
        title: "Expo config (app.json) parseable",
        evidence: appJson?.path ? `${appJson.path} failed to parse or missing expo key` : "app.json missing; config may be app.config.js/ts",
        remediation: "Ensure the resolved Expo config contains ios.bundleIdentifier, version, and buildNumber. Consider running `npx expo config --type public`.",
      });
    } else {
      const bundle = expo.ios?.bundleIdentifier;
      const version = expo.version;
      const build = expo.ios?.buildNumber;
      const problems = [];
      if (!bundle) problems.push("expo.ios.bundleIdentifier missing");
      if (!version) problems.push("expo.version missing");
      if (!build) problems.push("expo.ios.buildNumber missing");
      checks.push({
        id: "expo-config",
        status: problems.length ? "FAIL" : "PASS",
        title: "Expo iOS publishing config present",
        evidence: problems.length ? problems.join("; ") : `bundleIdentifier=${bundle}; version=${version}; buildNumber=${build}`,
        remediation: problems.length ? "Fill in the missing Expo config fields required for iOS publishing." : null,
      });
    }
  }

  // Store listing: privacy policy artefact
  const pp = detectPrivacyPolicyArtifact(repo, files);
  checks.push({
    id: "privacy-policy",
    status: pp ? "PASS" : "WARN",
    title: "Privacy policy URL or document present in repo",
    evidence: pp ? `Found: ${pp}` : "No obvious PRIVACY.md or 'privacy policy' reference found",
    remediation: pp ? null : "Ensure you have a public Privacy Policy URL for App Store Connect, and that it matches actual data practices.",
  });

  // Entitlements presence (informational)
  const ent = detectEntitlements(repo, files);
  if (ent.best) {
    checks.push({
      id: "entitlements",
      status: "INFO",
      title: "Entitlements file detected",
      evidence: ent.best,
      remediation: "Verify enabled capabilities match entitlements and App Store Connect settings (Push/iCloud/Associated Domains/etc.).",
    });
  } else {
    checks.push({
      id: "entitlements",
      status: "INFO",
      title: "No entitlements file detected",
      evidence: "Not necessarily a problem (some apps have no special entitlements).",
      remediation: null,
    });
  }

  // Summarise project type
  checks.push({
    id: "project-detect",
    status: "INFO",
    title: "Detected project flavour",
    evidence: `flavour=${project.flavour}; iosDir=${project.hasIosDir}; project=${project.bestProject ?? "n/a"}`,
    remediation: null,
  });

  // Compute verdict
  const hasFail = checks.some((c) => c.status === "FAIL");
  const hasWarn = checks.some((c) => c.status === "WARN");
  const verdict = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

  // Key identifiers (best-effort)
  const bundleId = infoPlist?.parsed?.data?.CFBundleIdentifier || (appJson?.data?.expo?.ios?.bundleIdentifier ?? null);
  const version = infoPlist?.parsed?.data?.CFBundleShortVersionString || (appJson?.data?.expo?.version ?? null);
  const build = infoPlist?.parsed?.data?.CFBundleVersion || (appJson?.data?.expo?.ios?.buildNumber ?? null);

  const meta = {
    timestamp: NOW,
    repo: path.resolve(repo),
    platform: process.platform,
    flavour: project.flavour,
    bundleId,
    version,
    build,
    infoPlist: infoPlist?.path ?? null,
    privacyManifest: privacy.best ?? null,
    appIcon: icon.best ?? null,
    launchScreen: launchScreen.best ?? null,
  };

  return { verdict, meta, checks };
}

function formatMarkdown(report) {
  const { verdict, meta, checks } = report;
  const byStatus = (s) => checks.filter((c) => c.status === s);

  const fails = byStatus("FAIL");
  const warns = byStatus("WARN");
  const infos = byStatus("INFO");
  const passes = byStatus("PASS");

  const lines = [];
  lines.push(`# App Store Readiness Audit`);
  lines.push(``);
  lines.push(`- **Verdict:** ${verdict}`);
  lines.push(`- **Flavour:** ${meta.flavour}`);
  lines.push(`- **Repo:** ${meta.repo}`);
  if (meta.bundleId) lines.push(`- **Bundle id:** ${meta.bundleId}`);
  if (meta.version || meta.build) lines.push(`- **Version/build:** ${meta.version ?? "?"} / ${meta.build ?? "?"}`);
  lines.push(`- **Timestamp:** ${meta.timestamp}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- FAIL: ${fails.length}`);
  lines.push(`- WARN: ${warns.length}`);
  lines.push(`- PASS: ${passes.length}`);
  lines.push(`- INFO: ${infos.length}`);
  lines.push(``);

  function renderList(items, heading) {
    if (!items.length) return;
    lines.push(`## ${heading}`);
    for (const c of items) {
      lines.push(`### [${c.status}] ${c.id} — ${c.title}`);
      if (c.evidence) {
        lines.push(`**Evidence:**`);
        lines.push("```");
        lines.push(String(c.evidence).trimEnd());
        lines.push("```");
      }
      if (c.remediation) {
        lines.push(`**Remediation:** ${c.remediation}`);
      }
      lines.push("");
    }
  }

  renderList(fails, "Failures (must fix before submitting)");
  renderList(warns, "Warnings (risk areas / likely review questions)");

  // Keep PASS/INFO concise to avoid noisy output.
  if (passes.length) {
    lines.push(`## Passes (selected)`);
    for (const c of passes.slice(0, 8)) lines.push(`- [PASS] ${c.id} — ${c.title}`);
    if (passes.length > 8) lines.push(`- …and ${passes.length - 8} more passes`);
    lines.push("");
  }

  if (infos.length) {
    lines.push(`## Info`);
    for (const c of infos) lines.push(`- [INFO] ${c.id}: ${c.evidence}`);
    lines.push("");
  }

  lines.push(`## Publish checklist (manual + build)`);
  lines.push(`- [ ] Release build succeeds (simulator + device/archive)`);
  lines.push(`- [ ] Version/build bumped and matches release notes`);
  lines.push(`- [ ] Privacy manifest present and Xcode privacy report reviewed`);
  lines.push(`- [ ] Permission prompts have clear usage descriptions`);
  lines.push(`- [ ] Privacy Policy URL live and matches behaviour`);
  lines.push(`- [ ] App Store Connect screenshots/metadata ready`);
  lines.push(`- [ ] Export compliance (encryption) answers verified`);
  lines.push(``);

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  const repo = path.resolve(args.repo);

  if (!isDir(repo)) failAndExit(`Repo path does not exist or is not a directory: ${repo}`);

  let report;
  try {
    report = runAudit(repo);
  } catch (e) {
    failAndExit(`Audit failed: ${String(e)}`);
  }

  const out = args.format === "json" ? JSON.stringify(report, null, 2) : formatMarkdown(report);
  process.stdout.write(out + (out.endsWith("\n") ? "" : "\n"));

  if (args.json) {
    try {
      fs.writeFileSync(path.resolve(repo, args.json), JSON.stringify(report, null, 2), "utf8");
    } catch (e) {
      console.error(`Failed to write JSON report to ${args.json}: ${String(e)}`);
    }
  }

  const hasFail = report.checks.some((c) => c.status === "FAIL");
  const hasWarn = report.checks.some((c) => c.status === "WARN");
  process.exit(hasFail ? 1 : hasWarn ? 2 : 0);
}

main();
