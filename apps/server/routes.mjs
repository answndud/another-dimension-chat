import { sign } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { consumeInviteCode, createInviteCode, inviteCodeHash, invitePayloadDigest, purgeInviteCodes, revokeInviteCode, validateDaemonInvite } from "./invite-code.mjs";
import { errorBody, errorStatus } from "./errors.mjs";
import { corsHeaders, hasJsonContentType, json, mimeTypeFor, readBody, readBodyBuffer, safeFile, securityHeaders } from "./http.mjs";

export function createRelayRequestHandler(context) {
  const {
    allowedCorsOrigins,
    bindHost,
    blobDir,
    blobUsage,
    capabilityPath,
    capabilityState,
    capabilityValid,
    consumeRateLimit,
    distDir,
    hasLocalAccess,
    hasRelayCapability,
    inboxUrlFor,
    isLoopbackHost,
    localAccessCapability,
    normalizedPublicUrl,
    originFor,
    persist,
    persistInviteCodes,
    port,
    purge,
    purgeBlobs,
    relayReceiptKey,
    relayReceiptSigningKeyFile,
    requestTimeoutMs,
    retiredInboxPrefixes,
    rotateInboxCapability,
    routeState,
    serveStatic,
    storeId,
    tlsCertFile,
    tlsKeyFile,
  } = context;
  const {
    MAX_BLOB_BYTES,
    MAX_BLOB_CHUNK_BYTES,
    MAX_BLOB_RECORDS,
    MAX_BLOB_STORE_BYTES,
    MAX_BLOB_TTL_MS,
    MAX_ENVELOPE_BYTES,
    MAX_INBOX_ITEMS,
    MAX_INVITE_CODE_BODY_BYTES,
    MAX_INVITE_CODE_RECORDS,
    MAX_LOCAL_READS_PER_WINDOW,
    MAX_POSTS_PER_WINDOW,
  } = context.limits;

  return async function handleRequest(req, res) {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${bindHost}:${port}`}`);
    const isApi = requestUrl.pathname.startsWith("/api/");
    const headers = corsHeaders(req, allowedCorsOrigins, { api: isApi, hsts: Boolean(tlsKeyFile || normalizedPublicUrl.startsWith("https://")) });
    if (isApi && req.headers.origin && !allowedCorsOrigins.has(req.headers.origin)) {
      json(res, 403, { error: "origin_not_allowed" }, headers);
      return;
    }
    if (req.method === "OPTIONS") {
      if (!isApi || !req.headers.origin || allowedCorsOrigins.has(req.headers.origin)) { res.writeHead(204, headers); res.end(); }
      else json(res, 403, { error: "origin_not_allowed" }, headers);
      return;
    }

    if (requestUrl.pathname === "/api/v1/health" && req.method === "GET") {
      json(res, 200, { ok: true, protocol: 1 }, headers);
      return;
    }
    if (requestUrl.pathname === "/api/v1/info" && req.method === "GET") {
      if (!consumeRateLimit(req, "local-info", 30)) { json(res, 429, { error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!capabilityValid(localAccessCapability) || !hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { error: "local_access_required" }, headers);
        return;
      }
      const publicOrigin = originFor(bindHost);
      const blobStoreUsage = await blobUsage();
      json(res, 200, {
        protocol: 1,
        protocolVersions: [1],
        inboxUrl: inboxUrlFor(bindHost),
        publicOrigin,
        externalSecure: publicOrigin.startsWith("https://"),
        listenerTls: Boolean(tlsKeyFile && tlsCertFile),
        serveStatic,
        highRiskAllowed: false,
        highRiskTransport: "disabled",
        supportedTransports: ["loopback", "direct-https-low-risk"],
        transportMode: publicOrigin.startsWith("https://") ? "direct-https-low-risk" : "local-or-http-low-risk",
        networkScope: isLoopbackHost(bindHost) ? "loopback" : "non-loopback",
        maxEnvelopeBytes: MAX_ENVELOPE_BYTES,
        maxTextBytes: 64 * 1024,
        maxAttachmentBytes: 32 * 1024 * 1024,
        blobStoreBytes: blobStoreUsage.bytes,
        blobStoreRecords: blobStoreUsage.records,
        maxBlobStoreBytes: MAX_BLOB_STORE_BYTES,
        maxBlobRecords: MAX_BLOB_RECORDS,
        relayReceiptPublicKey: relayReceiptKey.publicKeyHex,
        relayReceiptPublicKeyFingerprint: relayReceiptKey.publicKeyFingerprint,
        relayReceiptKeyId: relayReceiptKey.publicKeyFingerprint,
        relayReceiptKeySource: relayReceiptSigningKeyFile ? "external-configured" : "generated-development",
      }, headers);
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes" && req.method === "POST") {
      if (!consumeRateLimit(req, "invite-code-create", 5)) { json(res, 429, { created: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!capabilityValid(localAccessCapability) || !hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { created: false, error: "local_access_required" }, headers);
        return;
      }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, MAX_INVITE_CODE_BODY_BYTES, requestTimeoutMs));
        const created = createInviteCode({ invite: body?.invite, expectedRelayOrigin: originFor(bindHost), ttlMs: body?.ttlMs });
        if (routeState.inviteCodes.length >= MAX_INVITE_CODE_RECORDS) routeState.inviteCodes = purgeInviteCodes(routeState.inviteCodes).slice(-MAX_INVITE_CODE_RECORDS + 1);
        routeState.inviteCodes.push(created.record);
        try { await persistInviteCodes(); } catch (error) { routeState.inviteCodes = routeState.inviteCodes.filter((record) => record !== created.record); throw error; }
        // The clear-text code is returned exactly once. It is never persisted or logged.
        json(res, 201, { created: true, code: created.code, expiresAt: created.record.expiresAt, inviteDigest: created.record.inviteDigest }, headers);
      } catch (error) {
        json(res, errorStatus(error), errorBody(error, { created: false }), headers);
      }
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes/public" && req.method === "POST") {
      if (!consumeRateLimit(req, "public-invite-code-create", 10)) { json(res, 429, { created: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, MAX_INVITE_CODE_BODY_BYTES, requestTimeoutMs));
        validateDaemonInvite(body?.invite, originFor(bindHost));
        const created = createInviteCode({ invite: body.invite, expectedRelayOrigin: originFor(bindHost) });
        if (routeState.inviteCodes.length >= MAX_INVITE_CODE_RECORDS) routeState.inviteCodes = purgeInviteCodes(routeState.inviteCodes).slice(-MAX_INVITE_CODE_RECORDS + 1);
        routeState.inviteCodes.push(created.record);
        try { await persistInviteCodes(); } catch (error) { routeState.inviteCodes = routeState.inviteCodes.filter((record) => record !== created.record); throw error; }
        json(res, 201, { created: true, code: created.code, expiresAt: created.record.expiresAt, inviteDigest: created.record.inviteDigest }, headers);
      } catch (error) {
        json(res, errorStatus(error), errorBody(error, { created: false }), headers);
      }
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes/consume" && req.method === "POST") {
      if (!consumeRateLimit(req, "invite-code-consume", 20)) { json(res, 429, { consumed: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, 8 * 1024, requestTimeoutMs));
        const before = routeState.inviteCodes.slice();
        const result = consumeInviteCode(routeState.inviteCodes, body?.code);
        if (!result.ok) { json(res, 404, { consumed: false, error: result.reason }, headers); return; }
        try { await persistInviteCodes(); } catch (error) { routeState.inviteCodes = before; throw error; }
        const receiptBody = `ADRECEIPT1.${relayReceiptKey.publicKeyFingerprint}.${Buffer.from(originFor(bindHost), "utf8").toString("hex")}.${inviteCodeHash(body?.code)}.${invitePayloadDigest(result.record.invite)}.${Math.floor(Date.now() / 1000)}`;
        const receipt = `${receiptBody}.${sign(null, Buffer.from(receiptBody), relayReceiptKey.privateKey).toString("hex")}`;
        json(res, 200, { consumed: true, invite: result.record.invite, inviteDigest: result.record.inviteDigest, receipt }, headers);
      } catch (error) {
        json(res, errorStatus(error), errorBody(error, { consumed: false }), headers);
      }
      return;
    }

    if (requestUrl.pathname === "/api/v1/invite-codes/revoke" && req.method === "POST") {
      if (!consumeRateLimit(req, "invite-code-revoke", 20)) { json(res, 429, { revoked: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, 8 * 1024, requestTimeoutMs));
        const before = routeState.inviteCodes.slice();
        const result = revokeInviteCode(routeState.inviteCodes, body?.code);
        if (!result.ok) { json(res, 404, { revoked: false, error: result.reason }, headers); return; }
        try { await persistInviteCodes(); } catch (error) { routeState.inviteCodes = before; throw error; }
        json(res, 200, { revoked: true }, headers);
      } catch (error) {
        json(res, errorStatus(error), errorBody(error, { revoked: false }), headers);
      }
      return;
    }

    const inboxPrefix = capabilityPath(capabilityState.inbox.token);
    if (requestUrl.pathname === "/api/v1/inbox/rotate" && req.method === "POST") {
      if (!consumeRateLimit(req, "local-rotate", 10)) { json(res, 429, { rotated: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      if (!capabilityValid(localAccessCapability) || !hasLocalAccess(req, localAccessCapability)) {
        json(res, 403, { rotated: false, error: "local_access_required" }, headers);
        return;
      }
      await rotateInboxCapability();
      json(res, 200, { rotated: true, inboxUrl: inboxUrlFor(bindHost) }, headers);
      return;
    }
    if (retiredInboxPrefixes.has(requestUrl.pathname.replace(/\/ack$/, ""))) {
      json(res, 410, req.method === "GET" ? { error: "capability_expired" } : { accepted: false, error: "capability_expired" }, headers);
      return;
    }
    const blobMatch = requestUrl.pathname.match(/^\/api\/v1\/blobs\/([A-Za-z0-9_-]{32,128})$/);
    if (blobMatch && ["POST", "GET", "DELETE"].includes(req.method)) {
      if (!capabilityValid(capabilityState.inbox) || !hasRelayCapability(req, capabilityState.inbox)) {
        json(res, 403, { error: "relay_capability_required" }, headers);
        return;
      }
      await purgeBlobs();
      const blobId = blobMatch[1];
      const blobFile = join(blobDir, `${blobId}.blob`);
      const metaFile = join(blobDir, `${blobId}.meta.json`);
      if (req.method === "GET") {
        try {
          const meta = JSON.parse(await readFile(metaFile, "utf8"));
          if (meta.expiresAt <= Date.now()) throw new Error("expired");
          const requestedOffset = Number(req.headers["x-ad-blob-offset"] || 0);
          const requestedLength = Number(req.headers["x-ad-blob-length"] || 0);
          if (![requestedOffset, requestedLength].every(Number.isSafeInteger) || requestedOffset < 0 || requestedLength < 0 || requestedLength > MAX_BLOB_CHUNK_BYTES) throw new Error("invalid_blob_range");
          const handle = await open(blobFile, "r");
          try {
            const size = (await handle.stat()).size;
            if (requestedOffset > size) throw new Error("invalid_blob_range");
            const length = requestedLength ? Math.min(requestedLength, size - requestedOffset) : size;
            if (!requestedLength && length > MAX_BLOB_BYTES) throw new Error("blob_too_large");
            const body = Buffer.alloc(length);
            if (length) await handle.read(body, 0, length, requestedOffset);
            res.writeHead(200, { ...headers, "cache-control": "no-store", "content-type": "application/octet-stream", "content-length": body.length, "x-ad-blob-offset": String(requestedOffset), "x-ad-blob-total": String(size), "x-ad-blob-complete": String(meta.complete) });
            res.end(body);
          } finally { await handle.close(); }
        } catch { json(res, 404, { error: "blob_not_found" }, headers); }
        return;
      }
      if (req.method === "DELETE") {
        await unlink(blobFile).catch(() => {});
        await unlink(metaFile).catch(() => {});
        json(res, 200, { deleted: true }, headers);
        return;
      }
      try {
        const offset = Number(req.headers["x-ad-blob-offset"] || 0);
        const total = Number(req.headers["x-ad-blob-total"] || 0);
        const requestedTtl = Number(req.headers["x-ad-blob-ttl-ms"] || MAX_BLOB_TTL_MS);
        if (![offset, total, requestedTtl].every(Number.isSafeInteger) || offset < 0 || total <= 0 || total > MAX_BLOB_BYTES || offset > total || requestedTtl <= 0) throw new Error("invalid_blob_metadata");
        const body = await readBodyBuffer(req, MAX_BLOB_CHUNK_BYTES, requestTimeoutMs);
        if (offset + body.length > total) throw new Error("blob_chunk_out_of_bounds");
        let meta = null;
        try { meta = JSON.parse(await readFile(metaFile, "utf8")); } catch { /* first chunk */ }
        const existingMeta = Boolean(meta);
        if (meta && (meta.total !== total || meta.expiresAt <= Date.now())) throw new Error("blob_metadata_mismatch");
        if (!meta) {
          if (offset !== 0) throw new Error("blob_offset_mismatch");
          const usage = await blobUsage(blobId);
          if (usage.records >= MAX_BLOB_RECORDS || usage.bytes + total > MAX_BLOB_STORE_BYTES) throw new Error("blob_quota_exceeded");
          meta = { version: 1, total, received: 0, complete: false, expiresAt: Date.now() + Math.min(requestedTtl, MAX_BLOB_TTL_MS) };
        }
        const handle = await open(blobFile, existingMeta ? "r+" : "w");
        try {
          const current = (await handle.stat()).size;
          if (current !== offset) throw new Error("blob_offset_mismatch");
          await handle.write(body, 0, body.length, offset);
        } finally { await handle.close(); }
        meta.received = offset + body.length;
        meta.complete = meta.received === meta.total;
        await writeFile(metaFile, `${JSON.stringify(meta)}\n`, { mode: 0o600 });
        json(res, meta.complete ? 201 : 202, { accepted: true, complete: meta.complete, received: meta.received, total: meta.total, expiresAt: meta.expiresAt, blobUrl: `/api/v1/blobs/${blobId}` }, headers);
      } catch (error) {
        json(res, errorStatus(error), errorBody(error, { accepted: false }), headers);
      }
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "GET") {
      if (!capabilityValid(capabilityState.inbox)) { json(res, 410, { error: "capability_expired" }, headers); return; }
      if (!consumeRateLimit(req, "inbox-read", MAX_LOCAL_READS_PER_WINDOW)) { json(res, 429, { error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      const readAuthorized = (capabilityValid(localAccessCapability) && hasLocalAccess(req, localAccessCapability)) || hasRelayCapability(req, capabilityState.inbox);
      if (!readAuthorized) {
        json(res, 403, { error: "local_access_required" }, headers);
        return;
      }
      purge();
      json(res, 200, { protocol: 1, items: routeState.inbox }, headers);
      return;
    }
    if (requestUrl.pathname === inboxPrefix && req.method === "POST") {
      if (!capabilityValid(capabilityState.inbox)) { json(res, 410, { accepted: false, error: "capability_expired" }, headers); return; }
      if (!consumeRateLimit(req, "inbox-post", MAX_POSTS_PER_WINDOW)) { json(res, 429, { accepted: false, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, MAX_ENVELOPE_BYTES + 4096, requestTimeoutMs));
        const envelope = String(body?.envelope || "").trim();
        if (!/^ADENV1\./.test(envelope) || Buffer.byteLength(envelope) > MAX_ENVELOPE_BYTES) throw new Error("invalid_envelope");
        const id = storeId(envelope);
        if (!routeState.inbox.some((item) => item.id === id)) {
          if (routeState.inbox.length >= MAX_INBOX_ITEMS) {
            json(res, 429, { accepted: false, error: "queue_full" }, { ...headers, "retry-after": "60" });
            return;
          }
          const previousInbox = routeState.inbox.slice();
          routeState.inbox.push({ id, envelope, receivedAt: Date.now() });
          routeState.inbox = routeState.inbox.slice(-MAX_INBOX_ITEMS);
          try { await persist(); } catch (error) { routeState.inbox = previousInbox; throw error; }
        }
        json(res, 202, { accepted: true, id }, headers);
      } catch (error) {
        json(res, errorStatus(error), errorBody(error, { accepted: false }), headers);
      }
      return;
    }
    if (requestUrl.pathname === `${inboxPrefix}/ack` && req.method === "POST") {
      if (!capabilityValid(capabilityState.inbox)) { json(res, 410, { acknowledged: 0, error: "capability_expired" }, headers); return; }
      if (!consumeRateLimit(req, "inbox-ack", MAX_LOCAL_READS_PER_WINDOW)) { json(res, 429, { acknowledged: 0, error: "rate_limited" }, { ...headers, "retry-after": "60" }); return; }
      const ackAuthorized = (capabilityValid(localAccessCapability) && hasLocalAccess(req, localAccessCapability)) || hasRelayCapability(req, capabilityState.inbox);
      if (!ackAuthorized) {
        json(res, 403, { acknowledged: 0, error: "local_access_required" }, headers);
        return;
      }
      try {
        if (!hasJsonContentType(req)) throw new Error("content_type_not_allowed");
        const body = JSON.parse(await readBody(req, 32 * 1024, requestTimeoutMs));
        if (!Array.isArray(body?.ids) || body.ids.length > MAX_INBOX_ITEMS) throw new Error("too_many_ids");
        const ids = new Set(body.ids.map(String));
        const previousInbox = routeState.inbox;
        const previousLength = routeState.inbox.length;
        routeState.inbox = routeState.inbox.filter((item) => !ids.has(item.id));
        try { await persist(); } catch (error) { routeState.inbox = previousInbox; throw error; }
        json(res, 200, { acknowledged: previousLength - routeState.inbox.length }, headers);
      } catch (error) { json(res, errorStatus(error), errorBody(error, { acknowledged: 0 }), headers); }
      return;
    }

    // TM-02: the relay must not become an implicit browser-code distribution boundary.
    if (!serveStatic) { json(res, 404, { error: "relay_only" }, headers); return; }
    if (req.method !== "GET") { json(res, 405, { error: "method_not_allowed" }, headers); return; }
    const file = safeFile(distDir, requestUrl.pathname);
    try {
      const target = file && await readFile(file).then(() => file).catch(() => null);
      const fallback = target || safeFile(distDir, "/");
      if (!fallback) { json(res, 500, { error: "web_dist_unavailable" }); return; }
      res.writeHead(200, { ...securityHeaders({ hsts: Boolean(tlsKeyFile || normalizedPublicUrl.startsWith("https://")) }), "content-type": mimeTypeFor(fallback) });
      createReadStream(fallback).pipe(res);
    } catch { json(res, 500, { error: "web_dist_unavailable" }); }
  };
}
