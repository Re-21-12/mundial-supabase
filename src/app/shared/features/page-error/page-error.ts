import { ActivatedRoute } from '@angular/router';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { errorMessages, ErrorResponse } from '../../../core/utils/interceptors/error-interceptor';
@Component({
  selector: 'app-page-error',
  imports: [],
  templateUrl: './page-error.html',
  styleUrl: './page-error.css',
})
export class PageError implements OnInit {
  activatedRoute = inject(ActivatedRoute);
  ngOnInit(): void {
    this.setErrorCodeResponse();
  }
  setErrorCodeResponse() {
    if (this.activatedRoute.snapshot.params['errorCode']) {
      this.errorCode.set(this.activatedRoute.snapshot.params['errorCode']);
    }
  }
  errorCode = signal<number | null>(null);
  errorMessage = signal<string | null>(null);
  errorMessages = errorMessages;
}
