import {
  AfterViewInit,
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  signal,
  WritableSignal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JsonPipe, NgClass } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { createWorker, TesseractWorker } from 'tesseract.js';

export interface FormField {
  key: string;
  label: string;
}

@Component({
  selector: 'app-camera',
  standalone: true,
  templateUrl: './camera.html',
  styleUrls: ['./camera.css'],
  imports: [NgClass, ButtonModule, DialogModule, MessageModule, ProgressSpinnerModule, JsonPipe],
})
export class CameraComponent implements AfterViewInit, OnDestroy {
  @Input() field: FormField | null = null;
  @Input() form: FormGroup | null = null;
  @Output() imageCaptured = new EventEmitter<string | null>();

  private readonly WIDTH = 640;
  private readonly HEIGHT = 480;

  // State signals
  cameraActive: WritableSignal<boolean> = signal(false);
  cameraVisible: WritableSignal<boolean> = signal(true);
  isCaptured: WritableSignal<boolean> = signal(false);
  isProcessingOCR: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  captures: WritableSignal<string[]> = signal([]);
  currentBase64Image: WritableSignal<string | null> = signal(null);
  enlargedImageVisible: WritableSignal<boolean> = signal(false);
  enlargedImageSrc: WritableSignal<string | null> = signal(null);
  ocrResult: WritableSignal<string | null> = signal(null);

  private stream: MediaStream | null = null;
  @ViewChild('video', { static: false }) video?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false })
  canvas?: ElementRef<HTMLCanvasElement>;

  currentWidth = 400;
  currentHeight = 300;
  private readonly FIXED_WIDTH = 400;
  private readonly FIXED_HEIGHT = 300;

  private worker: TesseractWorker | null = null;

  constructor(private http: HttpClient) {
    this.setupResizeListener();
    this.initializeOcr();
  }

  private setupResizeListener() {
    const handleResize = () => this.updateFixedDimensions();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  }

  private async initializeOcr() {
    try {
      this.worker = await createWorker('eng');
    } catch (err) {
      console.error('Failed to initialize OCR worker:', err);
      this.error.set('No se pudo inicializar el servicio de OCR.');
    }
  }

  private updateFixedDimensions() {
    if (window.innerWidth < 480) {
      this.currentWidth = Math.min(320, window.innerWidth - 40);
      this.currentHeight = (this.currentWidth * 3) / 4;
    } else {
      this.currentWidth = this.FIXED_WIDTH;
      this.currentHeight = this.FIXED_HEIGHT;
    }
  }

  async ngAfterViewInit() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!devices.some((device) => device.kind === 'videoinput')) {
          throw new Error('No camera found.');
        }
      }
    } catch (err) {
      console.warn('Camera access check failed:', err);
    }
  }

  async ngOnDestroy() {
    this.stopCamera();
    await this.worker?.terminate();
  }

  async activateCamera() {
    if (this.cameraActive()) return;

    this.cameraActive.set(true);
    this.cameraVisible.set(true);
    this.isCaptured.set(false);
    this.currentBase64Image.set(null);
    this.ocrResult.set(null);

    try {
      await this.setupDevices();
    } catch (err) {
      this.handleCameraError(err);
    }
  }

  deactivateCamera() {
    this.stopCamera();
    this.cameraActive.set(false);
    this.cameraVisible.set(false);
    this.isCaptured.set(false);
  }

  private handleCameraError(err: unknown) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error('Camera error:', message);
    this.error.set(`No se pudo acceder a la cámara: ${message}`);
    this.cameraActive.set(false);
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video?.nativeElement) {
      this.video.nativeElement.srcObject = null;
    }
  }

  async setupDevices() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API not supported in this browser.');
    }

    this.stopCamera();
    this.updateFixedDimensions();

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const videoConstraints: MediaStreamConstraints['video'] = {
      width: { ideal: this.WIDTH, max: 1280 },
      height: { ideal: this.HEIGHT, max: 960 },
      facingMode: isMobile ? 'environment' : 'user',
    };

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
    });

    if (this.video?.nativeElement) {
      this.video.nativeElement.srcObject = this.stream;
      await this.video.nativeElement.play();

      if (this.canvas?.nativeElement) {
        this.canvas.nativeElement.width = this.currentWidth;
        this.canvas.nativeElement.height = this.currentHeight;
      }
      this.error.set(null);
    } else {
      throw new Error('Video element not found.');
    }
  }

  capture() {
    if (!this.video?.nativeElement || !this.canvas?.nativeElement) return;

    this.drawImageToCanvas(this.video.nativeElement);
    const base64Image = this.canvas.nativeElement.toDataURL('image/jpeg', 0.8);

    this.addCapture(base64Image);
    this.setCurrentImage(base64Image);

    this.isCaptured.set(true);
    this.deactivateCamera();
  }

  private addCapture(base64Image: string) {
    this.captures.update((currentCaptures) => {
      const newCaptures = [base64Image, ...currentCaptures];
      if (newCaptures.length > 3) {
        return newCaptures.slice(0, 3);
      }
      return newCaptures;
    });
  }

  private setCurrentImage(base64Image: string | null) {
    this.currentBase64Image.set(base64Image);
    this.imageCaptured.emit(base64Image);
    this.ocrResult.set(null);
  }

  removeCurrent() {
    this.setCurrentImage(null);
    this.isCaptured.set(false);
    this.cameraVisible.set(true);
  }

  setPhoto(idx: number) {
    const currentCaptures = this.captures();
    if (idx < 0 || idx >= currentCaptures.length) return;

    const selectedImage = currentCaptures[idx];
    this.setCurrentImage(selectedImage);

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      this.drawImageToCanvas(img);
      this.isCaptured.set(true);
    };
  }

  drawImageToCanvas(image: HTMLImageElement | HTMLVideoElement) {
    const context = this.canvas?.nativeElement?.getContext('2d');
    if (!context || !this.canvas?.nativeElement) return;

    context.clearRect(0, 0, this.currentWidth, this.currentHeight);
    context.fillStyle = '#000000';
    context.fillRect(0, 0, this.currentWidth, this.currentHeight);

    const imageWidth = image instanceof HTMLVideoElement ? image.videoWidth : image.width;
    const imageHeight = image instanceof HTMLVideoElement ? image.videoHeight : image.height;

    const scale = Math.min(this.currentWidth / imageWidth, this.currentHeight / imageHeight);
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;
    const offsetX = (this.currentWidth - scaledWidth) / 2;
    const offsetY = (this.currentHeight - scaledHeight) / 2;

    context.drawImage(
      image,
      0,
      0,
      imageWidth,
      imageHeight,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight,
    );
  }

  getPureBase64(): string | null {
    const base64 = this.currentBase64Image();
    return base64 ? base64.split(',')[1] : null;
  }

  async getImageBlob(): Promise<Blob | null> {
    const base64 = this.currentBase64Image();
    if (!base64) return null;
    try {
      const res = await fetch(base64);
      return await res.blob();
    } catch {
      return null;
    }
  }

  showEnlargedImage(src: string) {
    this.enlargedImageSrc.set(src);
    this.enlargedImageVisible.set(true);
  }

  hideEnlargedImage() {
    this.enlargedImageSrc.set(null);
    this.enlargedImageVisible.set(false);
  }

  handleThumbnailClick(src: string, index: number) {
    this.setPhoto(index);
    this.showEnlargedImage(src);
  }

  async performOCR() {
    const base64 = this.currentBase64Image();
    if (!base64 || !this.worker) {
      this.ocrResult.set('El servicio de OCR no está disponible.');
      return;
    }

    this.isProcessingOCR.set(true);
    this.ocrResult.set(null);

    try {
      const {
        data: { text },
      } = await this.worker.recognize(base64);
      this.ocrResult.set(text || 'No se encontró texto.');
    } catch (error) {
      console.error('OCR Error:', error);
      this.ocrResult.set('Error durante el reconocimiento de texto. Inténtelo de nuevo.');
    } finally {
      this.isProcessingOCR.set(false);
    }
  }
}
