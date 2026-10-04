import { describe, it, expect } from 'bun:test';
import {
  EscposBuilder,
  ESCPOS_COMMANDS,
  LoopbackPrinterDriver,
} from '../../packages/hardware/src/index';

describe('@culinaryos/hardware ESC/POS Driver & Builder', () => {
  it('initializes ESC/POS buffer with ESC @ (0x1b, 0x40)', () => {
    const builder = new EscposBuilder();
    const bytes = builder.build();
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it('correctly appends text and lines', () => {
    const builder = new EscposBuilder();
    builder.line('CULINARYOS EDGE');
    const bytes = builder.build();
    const str = new TextDecoder().decode(bytes);
    expect(str).toContain('CULINARYOS EDGE\n');
  });

  it('encodes alignment and size modifiers', () => {
    const builder = new EscposBuilder();
    builder
      .align('center')
      .size('double-both')
      .line('RUSH ORDER')
      .size('normal')
      .align('left');

    const bytes = builder.build();
    // Check for align center (0x1b, 0x61, 0x01)
    let hasCenter = false;
    let hasDouble = false;
    for (let i = 0; i < bytes.length - 2; i++) {
      if (bytes[i] === 0x1b && bytes[i + 1] === 0x61 && bytes[i + 2] === 0x01) {
        hasCenter = true;
      }
      if (bytes[i] === 0x1b && bytes[i + 1] === 0x21 && bytes[i + 2] === 0x30) {
        hasDouble = true;
      }
    }
    expect(hasCenter).toBe(true);
    expect(hasDouble).toBe(true);
  });

  it('encodes cash drawer kick pulse on Pin 2 and Pin 5', () => {
    const builderPin2 = new EscposBuilder();
    builderPin2.cashDrawerKick(2);
    const bytes2 = builderPin2.build();

    let hasKick2 = false;
    for (let i = 0; i < bytes2.length - 4; i++) {
      if (
        bytes2[i] === 0x1b &&
        bytes2[i + 1] === 0x70 &&
        bytes2[i + 2] === 0x00 &&
        bytes2[i + 3] === 0x19 &&
        bytes2[i + 4] === 0xfa
      ) {
        hasKick2 = true;
      }
    }
    expect(hasKick2).toBe(true);

    const builderPin5 = new EscposBuilder();
    builderPin5.cashDrawerKick(5);
    const bytes5 = builderPin5.build();

    let hasKick5 = false;
    for (let i = 0; i < bytes5.length - 4; i++) {
      if (
        bytes5[i] === 0x1b &&
        bytes5[i + 1] === 0x70 &&
        bytes5[i + 2] === 0x01 &&
        bytes5[i + 3] === 0x19 &&
        bytes5[i + 4] === 0xfa
      ) {
        hasKick5 = true;
      }
    }
    expect(hasKick5).toBe(true);
  });

  it('formats two-column lines with proper padding', () => {
    const builder = new EscposBuilder();
    builder.line('RECEIPT').twoColumn('Burger', '$15.00', 30);
    const bytes = builder.build();
    const str = new TextDecoder().decode(bytes);
    expect(str).toContain('Burger');
    expect(str).toContain('$15.00');
    const rawLine = str.split('\n').find((l) => l.includes('Burger'));
    expect(rawLine?.length).toBe(30);
  });

  it('prints via LoopbackPrinterDriver and captures print jobs and drawer kicks', async () => {
    const printer = new LoopbackPrinterDriver('Test Virtual Printer');
    const status = await printer.status();
    expect(status.connected).toBe(true);
    expect(status.paperStatus).toBe('ok');

    const builder = new EscposBuilder();
    builder.line('Test Print Job').cut();
    const success = await printer.printRaw(builder.build());
    expect(success).toBe(true);
    expect(printer.getJobCount()).toBe(1);

    const kicked = await printer.kickDrawer(2);
    expect(kicked).toBe(true);
    expect(printer.getDrawerKickCount()).toBe(1);
    expect(printer.getJobCount()).toBe(2);
  });
});
