import { Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Profile } from '../interfaces/profile-interface';
import { Database } from '../../types/database.types';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  // private supabase: SupabaseClient<Database>;
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  get client() {
    return this.supabase;
  }
}
