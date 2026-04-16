import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createWorker, Worker } from 'tesseract.js';
import { CameraComponent } from '../camera/camera';

@Component({
  selector: 'app-ocr',
  standalone: true,
  imports: [CameraComponent],
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

  async onImageCaptured(imageData: { base64: string | null; formData: FormData | null }) {
    if (!imageData.base64 || !this.worker) {
      return;
    }

    this.isRecognizing.set(true);
    this.recognizedText.set('');
    this.progress.set(0);

    const {
      data: { text },
    } = await this.worker.recognize(imageData.base64);

    this.recognizedText.set(text);
    this.isRecognizing.set(false);
  }
}
