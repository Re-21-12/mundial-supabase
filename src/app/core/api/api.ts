import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseApiService, Request } from './interfaces/base-api-interface';

@Injectable({
  providedIn: 'root',
})
export class ApiService implements BaseApiService<any> {
  private readonly _httpClient = inject(HttpClient);
  private readonly _baseUrl = environment.dev;
  private readonly _jsonHeaders = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  post<T>(request: Request): Observable<T> {
    console.log(request.body);
    return this._httpClient
      .post<T>(`${this._baseUrl}${request.url}`, request.body, this._jsonHeaders)
      .pipe(catchError(() => of()));
  }

  put<T>(request: Request): Observable<T> {
    if (request.id === undefined) return of();
    return this._httpClient
      .put<T>(`${this._baseUrl}${request.url}/${request.id}`, request.body, this._jsonHeaders)
      .pipe(catchError(() => of()));
  }

  delete<T>(request: Request): Observable<boolean> {
    if (request.id === undefined) return of(false);
    return this._httpClient
      .delete<boolean>(`${this._baseUrl}${request.url}/${request.id}`, this._jsonHeaders)
      .pipe(catchError(() => of(false)));
  }

  getOne<T>(request: Request): Observable<T> {
    const url = request.id
      ? `${this._baseUrl}${request.url}/${request.id}`
      : `${this._baseUrl}${request.url}`;
    return this._httpClient.get<T>(url, this._jsonHeaders).pipe(catchError(() => of()));
  }

  getMany<T>(request: Request): Observable<T[]> {
    const url = `${this._baseUrl}${request.url}`;
    return this._httpClient.get<T[]>(url, this._jsonHeaders).pipe(catchError(() => of([])));
  }
}
