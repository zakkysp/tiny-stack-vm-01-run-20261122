// Tiny stack VM: runs every /input/<id>/program.bin on its input.bin and
// writes /output/<id>/stdout.bin + exit.txt, per generator/subject/ISA.md.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

for (const id of readdirSync(I).sort()) {
  const p = readFileSync(join(I, id, 'program.bin'));
  const inp = readFileSync(join(I, id, 'input.bin'));
  const L = p.length;
  const st = new Int32Array(257);
  const cs = new Int32Array(64);
  const mem = new Int32Array(256);
  const out = [];
  let pc = 0, sp = 0, csp = 0, ip = 0, steps = 0, exit = 0, done = false;
  let a, b, o, s;
  const T = (c, e) => { if (c) { exit = e; done = true; return 1; } return 0; };
  while (!done) {
    if (steps >= 1000000) { exit = 10; break; }
    if (pc < 0 || pc >= L) { exit = 9; break; }
    const op = p[pc];
    switch (op) {
      case 0x00: exit = 0; done = true; break;
      case 0x01:
        if (T(pc + 1 >= L, 9)) break;
        if (T(sp > 255, 3)) break;
        st[sp++] = (p[pc + 1] << 24) >> 24;
        pc += 2; break;
      case 0x02:
        if (T(pc + 4 >= L, 9)) break;
        if (T(sp > 255, 3)) break;
        st[sp++] = p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24);
        pc += 5; break;
      case 0x03:
        if (T(sp < 1, 2)) break;
        sp--; pc++; break;
      case 0x04:
        if (T(sp < 1, 2)) break;
        if (T(sp > 255, 3)) break;
        st[sp] = st[sp - 1]; sp++; pc++; break;
      case 0x05:
        if (T(sp < 2, 2)) break;
        a = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = a; pc++; break;
      case 0x06:
        if (T(sp < 2, 2)) break;
        if (T(sp > 255, 3)) break;
        st[sp] = st[sp - 2]; sp++; pc++; break;
      case 0x07:
        if (T(sp < 3, 2)) break;
        a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; pc++; break;
      case 0x10:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = (st[sp - 1] + b) | 0; pc++; break;
      case 0x11:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = (st[sp - 1] - b) | 0; pc++; break;
      case 0x12:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = Math.imul(st[sp - 1], b); pc++; break;
      case 0x13:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; a = st[sp - 1];
        if (T(!b, 4)) break;
        st[sp - 1] = (a / b) | 0; pc++; break;
      case 0x14:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; a = st[sp - 1];
        if (T(!b, 4)) break;
        st[sp - 1] = a % b; pc++; break;
      case 0x15:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; a = st[sp - 1];
        if (T(!b, 4)) break;
        st[sp - 1] = ((a >>> 0) / (b >>> 0)) | 0; pc++; break;
      case 0x16:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; a = st[sp - 1];
        if (T(!b, 4)) break;
        st[sp - 1] = ((a >>> 0) % (b >>> 0)) | 0; pc++; break;
      case 0x17:
        if (T(sp < 1, 2)) break;
        st[sp - 1] = (-st[sp - 1]) | 0; pc++; break;
      case 0x18:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] &= b; pc++; break;
      case 0x19:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] |= b; pc++; break;
      case 0x1a:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] ^= b; pc++; break;
      case 0x1b:
        if (T(sp < 1, 2)) break;
        st[sp - 1] = ~st[sp - 1]; pc++; break;
      case 0x1c:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] <<= b & 31; pc++; break;
      case 0x1d:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] >>= b & 31; pc++; break;
      case 0x1e:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = (st[sp - 1] >>> (b & 31)) | 0; pc++; break;
      case 0x20:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = st[sp - 1] === b ? 1 : 0; pc++; break;
      case 0x21:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = st[sp - 1] < b ? 1 : 0; pc++; break;
      case 0x22:
        if (T(sp < 2, 2)) break;
        b = st[--sp]; st[sp - 1] = (st[sp - 1] >>> 0) < (b >>> 0) ? 1 : 0; pc++; break;
      case 0x30:
        if (T(pc + 2 >= L, 9)) break;
        o = p[pc + 1] | (p[pc + 2] << 8);
        pc = pc + 3 + (o >= 32768 ? o - 65536 : o); break;
      case 0x31:
        if (T(pc + 2 >= L, 9)) break;
        if (T(sp < 1, 2)) break;
        o = p[pc + 1] | (p[pc + 2] << 8);
        if (o >= 32768) o -= 65536;
        pc = st[--sp] === 0 ? pc + 3 + o : pc + 3; break;
      case 0x32:
        if (T(pc + 2 >= L, 9)) break;
        if (T(sp < 1, 2)) break;
        o = p[pc + 1] | (p[pc + 2] << 8);
        if (o >= 32768) o -= 65536;
        pc = st[--sp] !== 0 ? pc + 3 + o : pc + 3; break;
      case 0x33:
        if (T(pc + 2 >= L, 9)) break;
        if (T(csp > 63, 7)) break;
        cs[csp++] = pc + 3;
        pc = p[pc + 1] | (p[pc + 2] << 8); break;
      case 0x34:
        if (T(!csp, 8)) break;
        pc = cs[--csp]; break;
      case 0x40:
        if (T(sp < 1, 2)) break;
        a = st[sp - 1];
        if (T(a < 0 || a > 255, 6)) break;
        st[sp - 1] = mem[a]; pc++; break;
      case 0x41:
        if (T(sp < 2, 2)) break;
        a = st[--sp]; b = st[--sp];
        if (T(a < 0 || a > 255, 6)) break;
        mem[a] = b; pc++; break;
      case 0x50:
        if (T(sp < 1, 2)) break;
        s = String(st[--sp]);
        if (T(out.length + s.length > 65536, 11)) break;
        for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
        pc++; break;
      case 0x51:
        if (T(sp < 1, 2)) break;
        if (T(out.length + 1 > 65536, 11)) break;
        out.push(st[--sp] & 255); pc++; break;
      case 0x52:
        if (T(sp > 255, 3)) break;
        st[sp++] = ip < inp.length ? inp[ip++] : -1; pc++; break;
      case 0x53:
        if (T(sp < 1, 2)) break;
        exit = st[--sp] & 255; done = true; break;
      default: exit = 5; done = true; break;
    }
    if (!done) steps++;
  }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), Buffer.from(out));
  writeFileSync(join(O, id, 'exit.txt'), String(exit));
}
