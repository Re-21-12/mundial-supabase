import { Component, inject, input, OnInit, signal } from '@angular/core';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { SupabaseService } from '../../services/supabase-service';
import { SupabaseAuthService } from '../../services/supabase-auth-service';
import { ActivatedRoute } from '@angular/router';
const COMPONENTS = [DynamicForm];
@Component({
  selector: 'app-auth',
  imports: [COMPONENTS],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth implements OnInit {
  private readonly supabaseAuthService = inject(SupabaseAuthService);
  private readonly activatedRoute = inject(ActivatedRoute);

  id = signal<string | null>(null);
  signInMode = signal<string | null>(null);

  ngOnInit() {
    this.setId();
    this.getModeSignIn();
  }

  setId() {
    const id = this.activatedRoute.snapshot.params['id'];
    this.id.set(id);
  }
  getModeSignIn() {
    if (!!this.id()) this.signInMode.set('otp');
    else this.signInMode.set('password');
  }
  /*  URL Configuration page */
  submitData = ($event: string) => {
    const parsedData = JSON.parse($event);
    console.log('Data to submit:', $event);
    console.log('Data to submit:', parsedData);
    this.supabaseAuthService.client.auth.signInWithOtp({ email: parsedData.email });
  };

  fields = formFields['loginForm'].fields;
}
