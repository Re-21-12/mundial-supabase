import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { PostgrestError } from '@supabase/supabase-js';

import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { DynamicForm } from '../../../../shared/features/dynamic-form/dynamic-form';
import { FieldBase } from '../../../../shared/features/dynamic-form/interfaces/field-props';
import { ConfirmDeleteModalComponent } from '../../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { Database } from '../../../../types/database.types';
import { DynamicQueryFilter } from '../../../interfaces/dynamic-query-interface';
import { DynamicService } from '../../../services/dynamic-service';
import { SupabaseService } from '../../../services/supabase-service';
import { WalletService } from '../wallet/wallet.service';
import { DynamicTableService } from '../../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DynamicTable } from '../../../../shared/features/dynamic-table/dynamic-table';
import { Overlay } from '../../../../shared/layouts/overlay/overlay';
import { formFields } from '../../../../shared/features/dynamic-form/utils/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { NotificationService } from '../../../../shared/services/notification-service';
import { AdminUser, UserAdminService } from './user-admin.service';
type Panel = 'none' | 'create' | 'reset';

@Component({
  selector: 'app-user-admin',
  imports: [FormsModule],
  templateUrl: './user-admin.html',
  styleUrl: './user-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAdminPage implements OnInit {
  private readonly svc = inject(UserAdminService);
  private readonly authFacade = inject(AuthFacade);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly panel = signal<Panel>('none');
  protected readonly working = signal(false);
  protected readonly errorMsg = signal('');
  protected readonly successMsg = signal('');
  protected readonly selectedUser = signal<AdminUser | null>(null);

  // Create form
  protected createEmail = '';
  protected createPassword = '';
  protected createName = '';
  protected createLogin = '';

  // Reset form
  protected resetPassword = '';

  private get myId(): number {
    return Number(this.authFacade.getInternalUserId());
  }

  async ngOnInit() {
    await this.loadUsers();
  }

  private async loadUsers() {
    this.isLoading.set(true);
    const list = await this.svc.listUsers();
    // Fetch open session count for each user
    const withSessions = await Promise.all(
      list.map(async (u) => ({
        ...u,
        openSessions: await this.svc.getOpenSessionCount(u.user_id),
      })),
    );
    this.users.set(withSessions);
    this.isLoading.set(false);
  }

  protected openCreate() {
    this.createEmail = '';
    this.createPassword = '';
    this.createName = '';
    this.createLogin = '';
    this.errorMsg.set('');
    this.successMsg.set('');
    this.panel.set('create');
  }

  protected openReset(user: AdminUser) {
    this.selectedUser.set(user);
    this.resetPassword = '';
    this.errorMsg.set('');
    this.successMsg.set('');
    this.panel.set('reset');
  }

  protected closePanel() {
    this.panel.set('none');
    this.selectedUser.set(null);
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  protected async submitCreate() {
    if (!this.createEmail || !this.createPassword || !this.createName || !this.createLogin) {
      this.errorMsg.set('Todos los campos son obligatorios.');
      return;
    }
    this.working.set(true);
    this.errorMsg.set('');
    const { error } = await this.svc.createUser(
      this.createEmail,
      this.createPassword,
      this.createName,
      this.createLogin,
      this.myId,
    );
    this.working.set(false);
    if (error) {
      this.errorMsg.set(error);
      return;
    }
    this.successMsg.set(`Usuario ${this.createEmail} creado correctamente.`);
    await this.loadUsers();
    setTimeout(() => this.closePanel(), 1800);
  }

  protected async submitReset() {
    const user = this.selectedUser();
    if (!user || !this.resetPassword) {
      this.errorMsg.set('Ingresa la nueva contraseña.');
      return;
    }
    if (this.resetPassword.length < 6) {
      this.errorMsg.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    this.working.set(true);
    this.errorMsg.set('');
    const { error } = await this.svc.resetPassword(user, this.resetPassword, this.myId);
    this.working.set(false);
    if (error) {
      this.errorMsg.set(error);
      return;
    }
    this.successMsg.set('Contraseña actualizada correctamente.');
    setTimeout(() => this.closePanel(), 1800);
  }

  protected async confirmDelete(user: AdminUser) {
    if ((user.openSessions ?? 0) > 0) {
      const proceed = window.confirm(
        `⚠️ Este usuario tiene ${user.openSessions} sesión(es) activa(s).\n¿Deseas eliminarlo de todas formas?`,
      );
      if (!proceed) return;
    } else {
      const proceed = window.confirm(`¿Eliminar permanentemente a "${user.name}" (${user.email})?`);
      if (!proceed) return;
    }

    this.working.set(true);
    const { error } = await this.svc.deleteUser(user, this.myId);
    this.working.set(false);
    if (error) {
      alert(`Error al eliminar: ${error}`);
      return;
    }
    await this.loadUsers();
  }
}
