const QR_VERSION = 3;
const QR_SIZE = 29;
const QR_DATA_CODEWORDS = 55;
const QR_ECC_CODEWORDS = 15;
const QR_ECC_FORMAT = 1;

function utf8Bytes(text) {
  return new TextEncoder().encode(String(text ?? ""));
}

function appendBits(target, value, bitCount) {
  for (let shift = bitCount - 1; shift >= 0; shift -= 1) {
    target.push((value >>> shift) & 1);
  }
}

function toCodewords(bits) {
  const bytes = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value << 1) | (bits[offset + bit] ?? 0);
    }
    bytes.push(value);
  }
  return bytes;
}

function gfMultiply(left, right) {
  let a = left & 0xff;
  let b = right & 0xff;
  let product = 0;
  while (b > 0) {
    if (b & 1) {
      product ^= a;
    }
    a <<= 1;
    if (a & 0x100) {
      a ^= 0x11d;
    }
    b >>>= 1;
  }
  return product;
}

function reedSolomonGenerator(degree) {
  let result = [1];
  let factor = 1;
  for (let index = 0; index < degree; index += 1) {
    const next = new Array(result.length + 1).fill(0);
    for (let term = 0; term < result.length; term += 1) {
      next[term] ^= gfMultiply(result[term], factor);
      next[term + 1] ^= result[term];
    }
    result = next;
    factor = gfMultiply(factor, 2);
  }
  return result;
}

function reedSolomonRemainder(data, degree) {
  const generator = reedSolomonGenerator(degree);
  const remainder = new Array(degree).fill(0);
  for (const value of data) {
    const factor = value ^ remainder.shift();
    remainder.push(0);
    for (let index = 0; index < degree; index += 1) {
      remainder[index] ^= gfMultiply(generator[index], factor);
    }
  }
  return remainder;
}

function inviteQrCodewords(payload) {
  const data = utf8Bytes(payload);
  if (data.length > 53) {
    throw new Error("Invite code is too long for the built-in QR format.");
  }
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, data.length, 8);
  for (const value of data) {
    appendBits(bits, value, 8);
  }
  const capacityBits = QR_DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }
  const codewords = toCodewords(bits);
  for (let index = 0; codewords.length < QR_DATA_CODEWORDS; index += 1) {
    codewords.push(index % 2 === 0 ? 0xec : 0x11);
  }
  return [...codewords, ...reedSolomonRemainder(codewords, QR_ECC_CODEWORDS)];
}

function createMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function createReservation(size) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function markModule(matrix, reserved, row, column, value) {
  if (row < 0 || column < 0 || row >= matrix.length || column >= matrix.length) {
    return;
  }
  matrix[row][column] = Boolean(value);
  reserved[row][column] = true;
}

function placeFinder(matrix, reserved, row, column) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const targetRow = row + dy;
      const targetColumn = column + dx;
      if (targetRow < 0 || targetColumn < 0 || targetRow >= QR_SIZE || targetColumn >= QR_SIZE) {
        continue;
      }
      const dist = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      markModule(matrix, reserved, targetRow, targetColumn, dist !== 2 && dist !== 4);
    }
  }
}

function placeAlignment(matrix, reserved, centerRow, centerColumn) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      markModule(matrix, reserved, centerRow + dy, centerColumn + dx, dist !== 1);
    }
  }
}

function reserveFormat(matrix, reserved) {
  for (let offset = 0; offset <= 8; offset += 1) {
    if (offset !== 6) {
      markModule(matrix, reserved, 8, offset, false);
      markModule(matrix, reserved, offset, 8, false);
    }
  }
  for (let offset = 0; offset < 8; offset += 1) {
    markModule(matrix, reserved, QR_SIZE - 1 - offset, 8, false);
    if (offset !== 6) {
      markModule(matrix, reserved, 8, QR_SIZE - 1 - offset, false);
    }
  }
  markModule(matrix, reserved, QR_SIZE - 8, 8, true);
}

function placeFunctionPatterns(matrix, reserved) {
  placeFinder(matrix, reserved, 0, 0);
  placeFinder(matrix, reserved, 0, QR_SIZE - 7);
  placeFinder(matrix, reserved, QR_SIZE - 7, 0);
  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    markModule(matrix, reserved, 6, index, index % 2 === 0);
    markModule(matrix, reserved, index, 6, index % 2 === 0);
  }
  placeAlignment(matrix, reserved, 22, 22);
  reserveFormat(matrix, reserved);
}

function maskBit(row, column) {
  return (row + column) % 2 === 0;
}

function placeData(matrix, reserved, codewords) {
  const bits = [];
  for (const codeword of codewords) {
    appendBits(bits, codeword, 8);
  }
  let bitIndex = 0;
  let direction = -1;
  for (let column = QR_SIZE - 1; column > 0; column -= 2) {
    if (column === 6) {
      column -= 1;
    }
    for (let step = 0; step < QR_SIZE; step += 1) {
      const row = direction === -1 ? QR_SIZE - 1 - step : step;
      for (let dx = 0; dx < 2; dx += 1) {
        const currentColumn = column - dx;
        if (reserved[row][currentColumn]) {
          continue;
        }
        const bit = bits[bitIndex] ?? 0;
        bitIndex += 1;
        matrix[row][currentColumn] = Boolean(bit) !== maskBit(row, currentColumn);
      }
    }
    direction *= -1;
  }
}

function bchRemainder(value, polynomial, shift) {
  let current = value << shift;
  const polynomialBits = Math.floor(Math.log2(polynomial));
  while (Math.floor(Math.log2(current)) >= polynomialBits) {
    current ^= polynomial << (Math.floor(Math.log2(current)) - polynomialBits);
  }
  return current;
}

function formatBits(mask = 0) {
  const data = (QR_ECC_FORMAT << 3) | (mask & 0b111);
  const remainder = bchRemainder(data, 0x537, 10);
  return ((data << 10) | remainder) ^ 0x5412;
}

function placeFormatInformation(matrix, reserved, mask = 0) {
  const bits = formatBits(mask);
  const formatA = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const formatB = [
    [QR_SIZE - 1, 8],
    [QR_SIZE - 2, 8],
    [QR_SIZE - 3, 8],
    [QR_SIZE - 4, 8],
    [QR_SIZE - 5, 8],
    [QR_SIZE - 6, 8],
    [QR_SIZE - 7, 8],
    [8, QR_SIZE - 8],
    [8, QR_SIZE - 7],
    [8, QR_SIZE - 6],
    [8, QR_SIZE - 5],
    [8, QR_SIZE - 4],
    [8, QR_SIZE - 3],
    [8, QR_SIZE - 2],
    [8, QR_SIZE - 1],
  ];
  for (let index = 0; index < 15; index += 1) {
    const bit = ((bits >>> index) & 1) === 1;
    markModule(matrix, reserved, formatA[index][0], formatA[index][1], bit);
    markModule(matrix, reserved, formatB[index][0], formatB[index][1], bit);
  }
}

export function normalizeInviteQrPayload(value) {
  return String(value ?? "").trim();
}

export function inviteQrMatrix(payload) {
  const normalized = normalizeInviteQrPayload(payload);
  if (!normalized) {
    throw new Error("Invite code missing");
  }
  const matrix = createMatrix(QR_SIZE);
  const reserved = createReservation(QR_SIZE);
  placeFunctionPatterns(matrix, reserved);
  placeData(matrix, reserved, inviteQrCodewords(normalized));
  placeFormatInformation(matrix, reserved, 0);
  return matrix;
}

export function buildInviteQrSvgDataUrl(payload, options = {}) {
  const normalized = normalizeInviteQrPayload(payload);
  const matrix = inviteQrMatrix(normalized);
  const margin = Math.max(1, Number.parseInt(options.margin ?? 2, 10) || 2);
  const scale = Math.max(2, Number.parseInt(options.scale ?? 8, 10) || 8);
  const size = matrix.length + margin * 2;
  const rects = [];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      if (matrix[row][column]) {
        rects.push(
          `<rect x="${column + margin}" y="${row + margin}" width="1" height="1" fill="#111827" />`,
        );
      }
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * scale}" height="${size * scale}" role="img" aria-label="Invite code QR">` +
    `<rect width="${size}" height="${size}" fill="#f8fafc" />${rects.join("")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function decodeInviteQrDetector() {
  if (typeof window === "undefined") {
    return null;
  }
  if (typeof window.BarcodeDetector !== "function") {
    return null;
  }
  return new window.BarcodeDetector({ formats: ["qr_code"] });
}

export function inviteQrImportAvailability() {
  return {
    supported: Boolean(decodeInviteQrDetector()),
  };
}

export function detectedInviteQrPayload(results = []) {
  for (const entry of results) {
    const value = normalizeInviteQrPayload(entry?.rawValue ?? "");
    if (value) {
      return value;
    }
  }
  throw new Error("qr-import-empty");
}

async function imageBitmapFromFile(file) {
  if (typeof window.createImageBitmap === "function") {
    return window.createImageBitmap(file);
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not open image."));
    element.src = dataUrl;
  });
  return image;
}

export async function decodeInviteQrFile(file) {
  const detector = decodeInviteQrDetector();
  if (!detector) {
    throw new Error("qr-import-unavailable");
  }
  const bitmap = await imageBitmapFromFile(file);
  const results = await detector.detect(bitmap);
  return detectedInviteQrPayload(results);
}

export function canImportInviteQr() {
  return inviteQrImportAvailability().supported;
}
