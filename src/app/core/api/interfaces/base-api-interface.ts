import { Observable } from 'rxjs';

export interface Request {
  url: string;
  body?: any;
  id?: number;
}
export interface BaseApiService<T> {
  getOne<T>(request: Request): Observable<T>;
  getMany<T>(request: Request): Observable<T[]>;

  post<T>(request: Request): Observable<T>;

  put<T>(request: Request): Observable<T>;

  delete<T>(request: Request): Observable<boolean>;
}
