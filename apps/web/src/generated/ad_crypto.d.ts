/* tslint:disable */
/* eslint-disable */

export class NoiseFinishExport {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly message: Uint8Array;
    readonly remoteStatic: Uint8Array;
}

export class NoiseHandshakeExport {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly ephemeralPrivate: Uint8Array;
    readonly message: Uint8Array;
}

export class NoiseKeypairExport {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly prekeyBundle: string;
    readonly privateKey: Uint8Array;
    readonly publicKey: Uint8Array;
}

export function noise_generate_keypair(): NoiseKeypairExport;

export function noise_handshake_finish(transcript: string, static_private: Uint8Array, static_public: Uint8Array, ephemeral_private: Uint8Array, reply_message: Uint8Array): NoiseFinishExport;

export function noise_handshake_init(transcript: string, static_private: Uint8Array, static_public: Uint8Array): NoiseHandshakeExport;

export function noise_handshake_reply(transcript: string, static_private: Uint8Array, static_public: Uint8Array, init_message: Uint8Array): NoiseHandshakeExport;

export function noise_initiator_decrypt(transcript: string, static_private: Uint8Array, static_public: Uint8Array, ephemeral_private: Uint8Array, reply_message: Uint8Array, nonce: number, ciphertext: Uint8Array): Uint8Array;

export function noise_initiator_encrypt(transcript: string, static_private: Uint8Array, static_public: Uint8Array, ephemeral_private: Uint8Array, reply_message: Uint8Array, nonce: number, plaintext: Uint8Array): Uint8Array;

export function noise_responder_decrypt(transcript: string, static_private: Uint8Array, static_public: Uint8Array, init_message: Uint8Array, ephemeral_private: Uint8Array, finish_message: Uint8Array, nonce: number, ciphertext: Uint8Array): Uint8Array;

export function noise_responder_encrypt(transcript: string, static_private: Uint8Array, static_public: Uint8Array, init_message: Uint8Array, ephemeral_private: Uint8Array, finish_message: Uint8Array, nonce: number, plaintext: Uint8Array): Uint8Array;

export function noise_safety_material(transcript: string): string;

export function noise_validate_finish(transcript: string, static_private: Uint8Array, static_public: Uint8Array, init_message: Uint8Array, ephemeral_private: Uint8Array, finish_message: Uint8Array): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_noisefinishexport_free: (a: number, b: number) => void;
    readonly __wbg_noisekeypairexport_free: (a: number, b: number) => void;
    readonly noise_generate_keypair: (a: number) => void;
    readonly noise_handshake_finish: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
    readonly noise_handshake_init: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly noise_handshake_reply: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly noise_initiator_decrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => void;
    readonly noise_initiator_encrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number) => void;
    readonly noise_responder_decrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => void;
    readonly noise_responder_encrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => void;
    readonly noise_safety_material: (a: number, b: number, c: number) => void;
    readonly noise_validate_finish: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
    readonly noisefinishexport_message: (a: number, b: number) => void;
    readonly noisefinishexport_remoteStatic: (a: number, b: number) => void;
    readonly noisekeypairexport_prekeyBundle: (a: number, b: number) => void;
    readonly noisekeypairexport_privateKey: (a: number, b: number) => void;
    readonly noisekeypairexport_publicKey: (a: number, b: number) => void;
    readonly noisehandshakeexport_ephemeralPrivate: (a: number, b: number) => void;
    readonly noisehandshakeexport_message: (a: number, b: number) => void;
    readonly __wbg_noisehandshakeexport_free: (a: number, b: number) => void;
    readonly __wbindgen_export: (a: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
