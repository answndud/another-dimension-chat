use another_dimension_crypto::{
    derive_production_safety_material,
    production::{
        create_noise_xx_handshake_finish_export, create_noise_xx_handshake_init_export,
        create_noise_xx_handshake_reply_export, create_noise_xx_stateless_initiator_transport,
        create_noise_xx_stateless_responder_transport, generate_noise_static_keypair,
        validate_noise_xx_handshake_finish_message, NoiseStaticKeypair,
    },
    CryptoError,
};
use wasm_bindgen::prelude::*;

fn redacted_error(_: CryptoError) -> JsValue {
    JsValue::from_str("Noise operation failed. Discard the input and retry the handshake.")
}

fn keypair(private_key: &[u8], public_key: &[u8]) -> Result<NoiseStaticKeypair, JsValue> {
    NoiseStaticKeypair::from_private_public_bytes(private_key.to_vec(), public_key.to_vec())
        .map_err(redacted_error)
}

#[wasm_bindgen]
pub struct NoiseKeypairExport {
    private_key: Vec<u8>,
    public_key: Vec<u8>,
    prekey_bundle: String,
}

#[wasm_bindgen]
impl NoiseKeypairExport {
    #[wasm_bindgen(getter, js_name = privateKey)]
    pub fn private_key(&self) -> Vec<u8> {
        self.private_key.clone()
    }

    #[wasm_bindgen(getter, js_name = publicKey)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter, js_name = prekeyBundle)]
    pub fn prekey_bundle(&self) -> String {
        self.prekey_bundle.clone()
    }
}

#[wasm_bindgen]
pub struct NoiseHandshakeExport {
    message: Vec<u8>,
    ephemeral_private: Vec<u8>,
}

#[wasm_bindgen]
impl NoiseHandshakeExport {
    #[wasm_bindgen(getter)]
    pub fn message(&self) -> Vec<u8> {
        self.message.clone()
    }

    #[wasm_bindgen(getter, js_name = ephemeralPrivate)]
    pub fn ephemeral_private(&self) -> Vec<u8> {
        self.ephemeral_private.clone()
    }
}

#[wasm_bindgen]
pub struct NoiseFinishExport {
    message: Vec<u8>,
    remote_static: Vec<u8>,
}

#[wasm_bindgen]
impl NoiseFinishExport {
    #[wasm_bindgen(getter)]
    pub fn message(&self) -> Vec<u8> {
        self.message.clone()
    }

    #[wasm_bindgen(getter, js_name = remoteStatic)]
    pub fn remote_static(&self) -> Vec<u8> {
        self.remote_static.clone()
    }
}

#[wasm_bindgen]
pub fn noise_generate_keypair() -> Result<NoiseKeypairExport, JsValue> {
    let pair = generate_noise_static_keypair().map_err(redacted_error)?;
    let bundle = pair.prekey_bundle().map_err(redacted_error)?.encode();
    Ok(NoiseKeypairExport {
        private_key: pair.encrypted_storage_private_bytes().to_vec(),
        public_key: pair.public_key().to_vec(),
        prekey_bundle: bundle,
    })
}

#[wasm_bindgen]
pub fn noise_safety_material(transcript: &str) -> String {
    let material = derive_production_safety_material(transcript);
    format!("{} · {}", material.number, material.phrase)
}

#[wasm_bindgen]
pub fn noise_handshake_init(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
) -> Result<NoiseHandshakeExport, JsValue> {
    let result = create_noise_xx_handshake_init_export(
        transcript,
        &keypair(static_private, static_public)?,
    )
    .map_err(redacted_error)?;
    Ok(NoiseHandshakeExport {
        message: result.message,
        ephemeral_private: result.initiator_ephemeral_private,
    })
}

#[wasm_bindgen]
pub fn noise_handshake_reply(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    init_message: &[u8],
) -> Result<NoiseHandshakeExport, JsValue> {
    let result = create_noise_xx_handshake_reply_export(
        transcript,
        &keypair(static_private, static_public)?,
        init_message,
    )
    .map_err(redacted_error)?;
    Ok(NoiseHandshakeExport {
        message: result.message,
        ephemeral_private: result.responder_ephemeral_private,
    })
}

#[wasm_bindgen]
pub fn noise_handshake_finish(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    ephemeral_private: &[u8],
    reply_message: &[u8],
) -> Result<NoiseFinishExport, JsValue> {
    let result = create_noise_xx_handshake_finish_export(
        transcript,
        &keypair(static_private, static_public)?,
        ephemeral_private,
        reply_message,
    )
    .map_err(redacted_error)?;
    Ok(NoiseFinishExport {
        message: result.message,
        remote_static: result.initiator_remote_static,
    })
}

#[wasm_bindgen]
pub fn noise_validate_finish(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    init_message: &[u8],
    ephemeral_private: &[u8],
    finish_message: &[u8],
) -> Result<Vec<u8>, JsValue> {
    validate_noise_xx_handshake_finish_message(
        transcript,
        &keypair(static_private, static_public)?,
        init_message,
        ephemeral_private,
        finish_message,
    )
    .map(|result| result.responder_remote_static)
    .map_err(redacted_error)
}

#[wasm_bindgen]
pub fn noise_initiator_encrypt(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    ephemeral_private: &[u8],
    reply_message: &[u8],
    nonce: u32,
    plaintext: &[u8],
) -> Result<Vec<u8>, JsValue> {
    create_noise_xx_stateless_initiator_transport(
        transcript,
        &keypair(static_private, static_public)?,
        ephemeral_private,
        reply_message,
    )
    .and_then(|transport| transport.encrypt_with_nonce(u64::from(nonce), plaintext))
    .map(|result| result.ciphertext)
    .map_err(redacted_error)
}

#[wasm_bindgen]
pub fn noise_initiator_decrypt(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    ephemeral_private: &[u8],
    reply_message: &[u8],
    nonce: u32,
    ciphertext: &[u8],
) -> Result<Vec<u8>, JsValue> {
    create_noise_xx_stateless_initiator_transport(
        transcript,
        &keypair(static_private, static_public)?,
        ephemeral_private,
        reply_message,
    )
    .and_then(|transport| transport.decrypt_with_nonce(u64::from(nonce), ciphertext))
    .map(|result| result.plaintext)
    .map_err(redacted_error)
}

#[allow(clippy::too_many_arguments)]
#[wasm_bindgen]
pub fn noise_responder_encrypt(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    init_message: &[u8],
    ephemeral_private: &[u8],
    finish_message: &[u8],
    nonce: u32,
    plaintext: &[u8],
) -> Result<Vec<u8>, JsValue> {
    create_noise_xx_stateless_responder_transport(
        transcript,
        &keypair(static_private, static_public)?,
        init_message,
        ephemeral_private,
        finish_message,
    )
    .and_then(|transport| transport.encrypt_with_nonce(u64::from(nonce), plaintext))
    .map(|result| result.ciphertext)
    .map_err(redacted_error)
}

#[allow(clippy::too_many_arguments)]
#[wasm_bindgen]
pub fn noise_responder_decrypt(
    transcript: &str,
    static_private: &[u8],
    static_public: &[u8],
    init_message: &[u8],
    ephemeral_private: &[u8],
    finish_message: &[u8],
    nonce: u32,
    ciphertext: &[u8],
) -> Result<Vec<u8>, JsValue> {
    create_noise_xx_stateless_responder_transport(
        transcript,
        &keypair(static_private, static_public)?,
        init_message,
        ephemeral_private,
        finish_message,
    )
    .and_then(|transport| transport.decrypt_with_nonce(u64::from(nonce), ciphertext))
    .map(|result| result.plaintext)
    .map_err(redacted_error)
}
