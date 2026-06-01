import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { hasTranslation, normalizeLanguage, supportedLanguages, translate } from "./i18n.js";

test("language selection supports English and Korean", () => {
  assert.deepEqual(supportedLanguages, ["en", "ko"]);
  assert.equal(normalizeLanguage("ko"), "ko");
  assert.equal(normalizeLanguage("unknown"), "en");
  assert.equal(translate("en", "send"), "Send");
  assert.equal(translate("ko", "send"), "보내기");
  assert.equal(translate("ko", "retrySend"), "다시 보내기");
  assert.equal(translate("ko", "cancelSend"), "전송 취소");
});

test("visible app translation keys exist in both languages", () => {
  const sourceFiles = [new URL("./../index.html", import.meta.url), new URL("./main.js", import.meta.url)];
  const usedKeys = new Set();
  const patterns = [
    /data-i18n(?:-[a-z-]+)?="([^"]+)"/g,
    /\bt\("([^"]+)"\)/g,
    /formatTemplate\("([^"]+)"/g,
    /setChatDeliveryNoticeByKey\("([^"]+)"/g,
  ];

  for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(sourceFile, "utf8");
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        usedKeys.add(match[1]);
      }
    }
  }

  for (const language of supportedLanguages) {
    const missing = [...usedKeys].filter((key) => !hasTranslation(language, key)).sort();
    assert.deepEqual(missing, [], `${language} missing translations`);
  }
});
