import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createWorker, Worker } from 'tesseract.js';

@Component({
  selector: 'app-ocr',
  standalone: true,
  imports: [],
  templateUrl: './ocr.html',
  styleUrl: './ocr.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ocr {
  protected worker: Worker | null = null;
  protected recognizedText = signal('');
  protected progress = signal(0);
  protected isRecognizing = signal(false);

  constructor() {
    this.initializeTesseract();
  }

  async initializeTesseract() {
    this.worker = await createWorker('spa', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          this.progress.set(m.progress);
        }
      },
    });
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789.',
    });
  }

  async recognizeImage(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file || !this.worker) {
      return;
    }

    this.isRecognizing.set(true);
    this.recognizedText.set('');
    this.progress.set(0);

    const {
      data: { text },
    } = await this.worker.recognize(file);

    this.recognizedText.set(text);
    this.isRecognizing.set(false);
  }
}
