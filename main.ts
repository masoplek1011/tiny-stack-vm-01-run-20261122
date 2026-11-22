import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const IN = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
function run(p: Uint8Array, inp: Uint8Array): [Uint8Array, number] {
  const n = p.length, D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, st = 0;
  const end = (e: number): [Uint8Array, number] => [out.subarray(0, ol), e];
  for (;;) {
    if (st === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = p[pc];
    st++;
    switch (op) {
      case 0x00: return end(0);
      case 0x01:
        if (pc + 1 >= n) return end(9);
        if (sp === 256) return end(3);
        D[sp++] = (p[pc + 1] << 24) >> 24; pc += 2; break;
      case 0x02:
        if (pc + 4 >= n) return end(9);
        if (sp === 256) return end(3);
        D[sp++] = p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24); pc += 5; break;
      case 0x03:
        if (sp < 1) return end(2);
        sp--; pc++; break;
      case 0x04:
        if (sp < 1) return end(2);
        if (sp === 256) return end(3);
        D[sp] = D[sp - 1]; sp++; pc++; break;
      case 0x05:
        if (sp < 2) return end(2);
        { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; }
        pc++; break;
      case 0x06:
        if (sp < 2) return end(2);
        if (sp === 256) return end(3);
        D[sp] = D[sp - 2]; sp++; pc++; break;
      case 0x07:
        if (sp < 3) return end(2);
        { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; }
        pc++; break;
      case 0x17:
        if (sp < 1) return end(2);
        D[sp - 1] = -D[sp - 1] | 0; pc++; break;
      case 0x1b:
        if (sp < 1) return end(2);
        D[sp - 1] = ~D[sp - 1]; pc++; break;
      case 0x30: case 0x31: case 0x32: {
        if (pc + 2 >= n) return end(9);
        const rel = ((p[pc + 1] | (p[pc + 2] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) {
          if (sp < 1) return end(2);
          const v = D[--sp];
          take = op === 0x31 ? v === 0 : v !== 0;
        }
        pc = take ? pc + 3 + rel : pc + 3;
        break;
      }
      case 0x33:
        if (pc + 2 >= n) return end(9);
        if (cp === 64) return end(7);
        C[cp++] = pc + 3; pc = p[pc + 1] | (p[pc + 2] << 8); break;
      case 0x34:
        if (cp === 0) return end(8);
        pc = C[--cp]; break;
      case 0x40: {
        if (sp < 1) return end(2);
        const a = D[sp - 1];
        if (a < 0 || a > 255) return end(6);
        D[sp - 1] = M[a]; pc++; break;
      }
      case 0x41: {
        if (sp < 2) return end(2);
        const a = D[sp - 1];
        if (a < 0 || a > 255) return end(6);
        M[a] = D[sp - 2]; sp -= 2; pc++; break;
      }
      case 0x50: {
        if (sp < 1) return end(2);
        const s = String(D[--sp]);
        if (ol + s.length > 65536) return end(11);
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        pc++; break;
      }
      case 0x51:
        if (sp < 1) return end(2);
        if (ol >= 65536) return end(11);
        out[ol++] = D[--sp] & 255; pc++; break;
      case 0x52:
        if (sp === 256) return end(3);
        D[sp++] = ip < inp.length ? inp[ip++] : -1; pc++; break;
      case 0x53:
        if (sp < 1) return end(2);
        return end(D[--sp] & 255);
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
      case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
      case 0x1e: case 0x20: case 0x21: case 0x22: {
        if (sp < 2) return end(2);
        const b = D[sp - 1], a = D[sp - 2];
        let r: number;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return end(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) {
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp--; D[sp - 1] = r; pc++;
        break;
      }
      default: return end(5);
    }
  }
}
for (const id of readdirSync(IN).sort()) {
  let p: Buffer, inp: Buffer;
  try { p = readFileSync(join(IN, id, 'program.bin')); } catch { p = Buffer.alloc(0); }
  try { inp = readFileSync(join(IN, id, 'input.bin')); } catch { inp = Buffer.alloc(0); }
  const [o, e] = run(p, inp);
  mkdirSync(join(OUT, id), { recursive: true });
  writeFileSync(join(OUT, id, 'stdout.bin'), o);
  writeFileSync(join(OUT, id, 'exit.txt'), String(e) + '\n');
}
