import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { applyStaticTranslations, hasTranslation, normalizeLanguage, supportedLanguages, translate } from "./i18n.js";

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
  assert.equal(translate("ko", "cancelSend"), "전송 취소");
  assert.equal(translate("ko", "peerOffline"), "상대가 오프라인입니다");
  assert.equal(translate("ko", "statusNeedPassphrase"), "연결 코드 필요");
  assert.equal(translate("ko", "boundaryDetails"), "개발자 점검");
  assert.equal(translate("ko", "mainBlockerSummary"), "네트워크는 직접 시작하기 전까지 꺼져 있습니다");
  assert.equal(translate("ko", "connectionGuideTitle"), "비공개 채팅방 시작");
  assert.equal(translate("ko", "closeSettings"), "설정 닫기");
  assert.equal(translate("ko", "roomSettings"), "초대 코드");
  assert.equal(translate("ko", "connectionChoiceCreate"), "내 코드 만들기");
  assert.equal(translate("ko", "connectionChoiceCreateText"), "상대 기기에 아직 코드가 없을 때 선택하세요.");
  assert.equal(translate("ko", "connectionChoiceEnter"), "받은 코드 붙여넣기");
  assert.equal(translate("ko", "connectionChoiceEnterText"), "상대 기기에서 이미 코드를 만들었을 때 선택하세요.");
  assert.equal(
    translate("ko", "connectionModalCopy"),
    "초대 코드를 만들거나 받은 코드를 붙여넣으세요. 이 기기에는 이 기기의 연결 정보만 저장됩니다.",
  );
  assert.equal(
    translate("ko", "connectionPendingHint"),
    "강조된 작업 하나만 진행하세요. 화면이 요청할 때 보이는 코드를 상대에게 보내면 됩니다.",
  );
  assert.equal(translate("ko", "phraseDoesNotMatch"), "일치하지 않음");
  assert.equal(translate("ko", "onionDeliveryStarting"), "메시지를 저장했습니다. 비공개 전송을 시도합니다.");
  assert.equal(translate("ko", "messageSavedPrivateDeliveryOff"), "메시지를 저장했습니다. 보내려면 비공개 전송을 켜세요.");
  assert.equal(translate("ko", "torBootstrap"), "비공개 경로 재시작 필요");
  assert.equal(translate("ko", "chatNoticeEndpointUpdated"), "상대 주소가 갱신되었습니다.");
  assert.equal(translate("ko", "replyReadyAfterReceive"), "새 메시지를 받았습니다. 준비되면 답장을 작성하세요.");
  assert.equal(translate("ko", "chatNoticeRefreshAddress"), "상대 주소를 갱신해야 합니다.");
  assert.equal(translate("ko", "chatNoticeVerificationMismatch"), "확인 문구가 다릅니다. 이 채팅방을 사용하지 마세요.");
  assert.equal(translate("ko", "roomStatusShortNoConnection"), "초대 필요");
  assert.equal(translate("ko", "roomStatusShortReady"), "대화 가능");
  assert.equal(translate("ko", "roomStatusShortReceiving"), "수신 중");
  assert.equal(translate("ko", "emptyConversationVerify"), "메시지를 쓰기 전에 두 기기의 확인 문구를 비교하세요.");
  assert.equal(translate("ko", "startReceiving"), "받기");
  assert.equal(translate("ko", "allowPrivateDelivery"), "보내기나 받기를 누를 때만 비공개 전송 허용");
  assert.equal(translate("ko", "privateDeliveryPermissionRequired"), "보내거나 받기 전에 비공개 전송을 허용하세요.");
  assert.equal(translate("ko", "enablePrivateDelivery"), "비공개 전송 켜기");
  assert.equal(
    translate("ko", "privateDeliveryNeedsMessage"),
    "비공개 전송을 시도하기 전에 이 기기의 연결 준비를 끝내고 메시지를 작성하세요.",
  );
  assert.equal(translate("ko", "refreshAddressFailed"), "상대 주소를 갱신하지 못했습니다. 채팅방 상태는 그대로 유지했습니다.");
  assert.equal(translate("ko", "chatNoticeReceiving"), "새 메시지를 기다리는 중입니다.");
  assert.equal(translate("ko", "receiveStarted"), "새 메시지를 기다리는 중입니다. 이 창을 열어 두세요.");
  assert.equal(translate("ko", "receiveNeedsReadyRoom"), "메시지를 받으려면 먼저 이 기기의 연결 준비를 끝내세요.");
  assert.equal(translate("ko", "receiveNeedsVerification"), "메시지를 받기 전에 확인 문구를 비교하세요.");
  assert.equal(translate("ko", "receiveStopPending"), "중지하는 중입니다. 완료되면 다시 메시지를 받을 수 있습니다.");
  assert.equal(translate("ko", "advancedOnionSetup"), "개발자용 경로 도구");
  assert.equal(translate("ko", "startTorBootstrap"), "비공개 경로 시작");
  assert.equal(translate("ko", "sendLatestOverOnion"), "대기 중인 메시지 전송");
  assert.equal(translate("ko", "recoveryRealOnion"), "비공개 전송을 완료하지 못했습니다. 비공개 경로가 준비된 뒤 다시 시도하세요.");
  assert.equal(translate("ko", "networkExecutionValue"), "네트워크 작업은 권한 체크와 버튼 클릭 전에는 실행되지 않습니다");
  assert.equal(translate("ko", "advancedFollowup"), "개발자 후속 상세");
  assert.equal(translate("ko", "openManualTools"), "전송 상세 열기");
  assert.equal(translate("ko", "manualProductionTools"), "전송 상세");
  assert.equal(translate("ko", "productionProfileLockedWarning"), "아직 프로필을 열지 않았습니다.");
  assert.equal(translate("ko", "messageEnvelopeNotExported"), "아직 메시지를 내보내지 않았습니다.");
  assert.equal(translate("ko", "profileA"), "내 익명 ID");
  assert.equal(translate("ko", "passphrase"), "연결 코드");
  assert.equal(translate("ko", "setupProfilesWaiting"), "이 채팅방을 준비하는 중");
  assert.equal(translate("ko", "messageSessionWaiting"), "이 채팅방에서 메시지를 보낼 수 있는지 확인하는 중");
  assert.equal(translate("en", "setupProfilesWaiting"), "Preparing this room");
  assert.equal(translate("en", "messageSessionWaiting"), "Checking this room can send messages");
  assert.equal(translate("ko", "userDeliveryNotReady"), "비공개 전송이 아직 준비되지 않았습니다.");
  assert.equal(
    translate("ko", "userMessageNumberSavedRefresh"),
    "{number} 메시지는 저장되어 있습니다. 주소를 갱신한 뒤 다시 보내거나 취소하세요.",
  );
  assert.equal(translate("ko", "userDeliveryCompletedNoDetails"), "비공개 상세 정보를 보여주지 않고 전송을 마쳤습니다.");
  assert.equal(translate("ko", "userDeliveryRunningExplicit"), "사용자가 누른 뒤 비공개 전송을 실행 중입니다.");
  assert.equal(translate("ko", "userDeliveryFailedKept"), "비공개 전송에 실패했습니다. 채팅방과 메시지는 그대로 유지했습니다.");
  assert.equal(translate("ko", "manualStateExported"), "내보냄");
  assert.equal(translate("unknown", "send"), "Send");
});

test("all UI translation keys used by the app exist in every supported language", () => {
  const sourceFiles = [
    new URL("./../index.html", import.meta.url),
    new URL("./main.js", import.meta.url),
  ];
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
    assert.deepEqual(missing, [], `${language} is missing UI translations`);
  }
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
  assert.equal(textNode.textContent, "비공개 채팅방 시작");
  assert.equal(placeholderNode.attrs.placeholder, "메시지 작성");
  assert.equal(ariaNode.attrs["aria-label"], "현재 앱 상태");
});
