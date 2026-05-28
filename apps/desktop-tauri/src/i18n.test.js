import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLanguage, supportedLanguages, translate } from "./i18n.js";

test("normalizeLanguage accepts supported languages and falls back to English", () => {
  assert.deepEqual(supportedLanguages, ["en", "ko"]);
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("ko"), "ko");
  assert.equal(normalizeLanguage("fr"), "en");
  assert.equal(normalizeLanguage(undefined), "en");
});

test("translate resolves Korean and English chat labels", () => {
  assert.equal(translate("en", "send"), "Send");
  assert.equal(translate("ko", "send"), "보내기");
  assert.equal(translate("ko", "retrySend"), "다시 보내기");
  assert.equal(translate("ko", "peerOffline"), "상대 오프라인");
  assert.equal(translate("ko", "statusNeedPassphrase"), "암호 필요");
  assert.equal(translate("unknown", "send"), "Send");
});
