/**
 * Standard ESC/POS Command Byte Sequences
 * Compliant with Epson TM-m30 / TM-T20 / TM-U220 and Star TSP143IV / SP742 (in ESC/POS mode).
 */
export const ESCPOS_COMMANDS = {
  /** Initialize printer: ESC @ */
  INIT: new Uint8Array([0x1b, 0x40]),

  /** Text justification */
  ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]),

  /** Font emphasis (bold) */
  BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]),

  /** Character size modes: ESC ! n */
  NORMAL_SIZE: new Uint8Array([0x1b, 0x21, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([0x1b, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([0x1b, 0x21, 0x20]),
  DOUBLE_SIZE: new Uint8Array([0x1b, 0x21, 0x30]),

  /** Paper cutting: GS V B n (Feed and partial/full cut) */
  FEED_AND_CUT: new Uint8Array([0x1d, 0x56, 0x42, 0x00]),

  /**
   * Cash drawer kick: ESC p m t1 t2
   * Standard 24V pulse via printer RJ11/RJ12 DK port.
   * Pin 2: m = 0, t1 = 25 (50ms pulse), t2 = 250 (500ms dwell)
   * Pin 5: m = 1, t1 = 25, t2 = 250
   */
  DRAWER_KICK_PIN2: new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]),
  DRAWER_KICK_PIN5: new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0xfa]),
} as const;

export type TextAlignment = 'left' | 'center' | 'right';

/**
 * Fluent builder for generating deterministic ESC/POS binary buffers.
 */
export class EscposBuilder {
  private chunks: Uint8Array[] = [];

  constructor() {
    this.append(ESCPOS_COMMANDS.INIT);
  }

  private append(data: Uint8Array): this {
    this.chunks.push(data);
    return this;
  }

  /**
   * Appends arbitrary ASCII / UTF-8 text string to the buffer.
   */
  text(str: string): this {
    const encoder = new TextEncoder();
    this.append(encoder.encode(str));
    return this;
  }

  /**
   * Appends text followed by a newline (LF: 0x0a).
   */
  line(str: string = ''): this {
    this.text(str);
    this.append(new Uint8Array([0x0a]));
    return this;
  }

  /**
   * Feeds n blank lines.
   */
  feed(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.append(new Uint8Array([0x0a]));
    }
    return this;
  }

  /**
   * Sets text alignment (left, center, right).
   */
  align(alignment: TextAlignment): this {
    switch (alignment) {
      case 'center':
        this.append(ESCPOS_COMMANDS.ALIGN_CENTER);
        break;
      case 'right':
        this.append(ESCPOS_COMMANDS.ALIGN_RIGHT);
        break;
      case 'left':
      default:
        this.append(ESCPOS_COMMANDS.ALIGN_LEFT);
        break;
    }
    return this;
  }

  /**
   * Toggles bold text weight.
   */
  bold(enable: boolean = true): this {
    this.append(enable ? ESCPOS_COMMANDS.BOLD_ON : ESCPOS_COMMANDS.BOLD_OFF);
    return this;
  }

  /**
   * Sets double height/width for header prominence.
   */
  size(size: 'normal' | 'double-height' | 'double-width' | 'double-both'): this {
    switch (size) {
      case 'double-both':
        this.append(ESCPOS_COMMANDS.DOUBLE_SIZE);
        break;
      case 'double-height':
        this.append(ESCPOS_COMMANDS.DOUBLE_HEIGHT);
        break;
      case 'double-width':
        this.append(ESCPOS_COMMANDS.DOUBLE_WIDTH);
        break;
      case 'normal':
      default:
        this.append(ESCPOS_COMMANDS.NORMAL_SIZE);
        break;
    }
    return this;
  }

  /**
   * Prints a horizontal dividing line across receipt width (default 42 characters).
   */
  divider(char: string = '-', width: number = 42): this {
    this.line(char.repeat(width));
    return this;
  }

  /**
   * Formats a two-column row with left text and right aligned text (e.g. item name and price).
   */
  twoColumn(left: string, right: string, totalWidth: number = 42): this {
    const leftLen = left.length;
    const rightLen = right.length;
    if (leftLen + rightLen >= totalWidth) {
      // If combined length exceeds width, truncate left or wrap
      const truncatedLeft = left.slice(0, Math.max(0, totalWidth - rightLen - 1));
      const spaces = ' '.repeat(Math.max(1, totalWidth - truncatedLeft.length - rightLen));
      this.line(`${truncatedLeft}${spaces}${right}`);
    } else {
      const spaces = ' '.repeat(totalWidth - leftLen - rightLen);
      this.line(`${left}${spaces}${right}`);
    }
    return this;
  }

  /**
   * Emits cash drawer kick sequence (24V pulse through DK port).
   */
  cashDrawerKick(pin: 2 | 5 = 2): this {
    this.append(pin === 5 ? ESCPOS_COMMANDS.DRAWER_KICK_PIN5 : ESCPOS_COMMANDS.DRAWER_KICK_PIN2);
    return this;
  }

  /**
   * Feeds paper and executes cut.
   */
  cut(): this {
    this.append(ESCPOS_COMMANDS.FEED_AND_CUT);
    return this;
  }

  /**
   * Compiles all chunks into a single contiguous Uint8Array.
   */
  build(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.length;
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
