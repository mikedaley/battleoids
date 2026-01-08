// Text Input Handler for player name entry

export class TextInputHandler {
  private text: string = '';
  private active: boolean = false;
  private cursorVisible: boolean = true;
  private cursorTimer: number = 0;
  private cursorBlinkInterval: number = 0.5; // seconds
  private submitPressed: boolean = false;
  private cancelPressed: boolean = false;
  private minLength: number = 3;
  private maxLength: number = 20;

  private keydownListener: (e: KeyboardEvent) => void;

  constructor() {
    this.keydownListener = this.handleKeyDown.bind(this);
  }

  activate(): void {
    if (this.active) return;

    this.active = true;
    this.text = '';
    this.cursorVisible = true;
    this.cursorTimer = 0;
    this.submitPressed = false;
    this.cancelPressed = false;

    window.addEventListener('keydown', this.keydownListener);
  }

  deactivate(): void {
    if (!this.active) return;

    this.active = false;
    window.removeEventListener('keydown', this.keydownListener);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.active) return;

    // Prevent default for keys we handle
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Backspace' ||
        (e.key.length === 1 && /^[A-Za-z0-9 ]$/.test(e.key))) {
      e.preventDefault();
    }

    if (e.key === 'Enter') {
      this.submitPressed = true;
    } else if (e.key === 'Escape') {
      this.cancelPressed = true;
    } else if (e.key === 'Backspace') {
      if (this.text.length > 0) {
        this.text = this.text.slice(0, -1);
      }
    } else if (e.key.length === 1 && /^[A-Za-z0-9 ]$/.test(e.key)) {
      // Only allow alphanumeric and space
      if (this.text.length < this.maxLength) {
        this.text += e.key.toUpperCase();
      }
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    // Blink cursor
    this.cursorTimer += dt;
    if (this.cursorTimer >= this.cursorBlinkInterval) {
      this.cursorVisible = !this.cursorVisible;
      this.cursorTimer = 0;
    }
  }

  getText(): string {
    return this.text.trim();
  }

  setText(text: string): void {
    this.text = text.substring(0, this.maxLength);
  }

  getCursorVisible(): boolean {
    return this.cursorVisible;
  }

  isValid(): boolean {
    const trimmed = this.text.trim();
    return trimmed.length >= this.minLength && trimmed.length <= this.maxLength;
  }

  consumeSubmit(): boolean {
    const pressed = this.submitPressed;
    this.submitPressed = false;
    return pressed;
  }

  consumeCancel(): boolean {
    const pressed = this.cancelPressed;
    this.cancelPressed = false;
    return pressed;
  }

  getError(): string | null {
    const trimmed = this.text.trim();
    if (trimmed.length === 0) {
      return null; // No error if empty
    }
    if (trimmed.length < this.minLength) {
      return `Name must be at least ${this.minLength} characters`;
    }
    return null;
  }

  isActive(): boolean {
    return this.active;
  }
}
