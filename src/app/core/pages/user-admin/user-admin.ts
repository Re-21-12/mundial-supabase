import {
  ChangeDetectionStrategy, Component, inject, OnInit, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminUser, UserAdminService } from '../../services/user-admin.service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';

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
      this.createEmail, this.createPassword, this.createName, this.createLogin, this.myId,
    );
    this.working.set(false);
    if (error) { this.errorMsg.set(error); return; }
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
    if (error) { this.errorMsg.set(error); return; }
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
    if (error) { alert(`Error al eliminar: ${error}`); return; }
    await this.loadUsers();
  }
}
