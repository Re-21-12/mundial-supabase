import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const chunkFailedMessage = /Loading chunk [\d]+ failed/;

    if (chunkFailedMessage.test(error.message)) {
      // Caso común: Error de carga de módulos (como el que tuviste al inicio)
      window.location.reload();
    }

    console.error('Error detectado:', error);
    // Aquí podrías llamar a un servicio de logging
  }
}
