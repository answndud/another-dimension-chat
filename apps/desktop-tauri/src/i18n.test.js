import assert from "node:assert/strict";
import test from "node:test";
import { applyStaticTranslations, normalizeLanguage, supportedLanguages, translate } from "./i18n.js";

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
  assert.equal(translate("ko", "peerOffline"), "상대가 오프라인");
  assert.equal(translate("ko", "statusNeedPassphrase"), "암호 필요");
  assert.equal(translate("ko", "boundaryDetails"), "상세 경계 정보");
  assert.equal(translate("ko", "connectionGuideTitle"), "처음 연결하는 순서");
  assert.equal(translate("ko", "networkExecutionValue"), "네트워크 작업은 권한 체크와 버튼 클릭 전에는 실행되지 않습니다");
  assert.equal(translate("unknown", "send"), "Send");
});

test("applyStaticTranslations updates text and attributes", () => {
  const nodes = [];
  const root = {
    documentElement: { lang: "en" },
    querySelectorAll(selector) {
      return nodes.filter((node) => node.selector === selector);
    },
  };
  const textNode = { selector: "[data-i18n]", dataset: { i18n: "connectionGuideTitle" }, textContent: "" };
  const placeholderNode = {
    selector: "[data-i18n-placeholder]",
    dataset: { i18nPlaceholder: "writeMessage" },
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const ariaNode = {
    selector: "[data-i18n-aria-label]",
    dataset: { i18nAriaLabel: "currentAppState" },
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  nodes.push(textNode, placeholderNode, ariaNode);

  applyStaticTranslations(root, "ko");

  assert.equal(root.documentElement.lang, "ko");
  assert.equal(textNode.textContent, "처음 연결하는 순서");
  assert.equal(placeholderNode.attrs.placeholder, "메시지 작성");
  assert.equal(ariaNode.attrs["aria-label"], "현재 앱 상태");
});
