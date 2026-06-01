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

interface UserRow {
  user_id: number;
  name: string;
  email: string;
}
interface RoleRow {
  role_id: number;
  name: string;
}
interface PermRow {
  permission_id: number;
  name: string;
  description: string;
}
interface RolePermRow {
  role_permission_id: number;
  role_id: number;
  permission_id: number;
}
interface UserRoleRow {
  user_role_id: number;
  user_id: number;
  role_id: number;
}
interface PermGroup {
  key: string;
  perms: (PermRow & { action: string })[];
}

@Component({
  selector: 'app-role-permission',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    CheckboxModule,
    TagModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: './role-permission.html',
  styleUrl: './role-permission.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePermissionPage implements OnInit {
  private readonly db = inject(SupabaseService);
  private readonly notif = inject(NotificationService);
  private readonly auth = inject(AuthFacade);

  readonly users = signal<UserRow[]>([]);
  readonly roles = signal<RoleRow[]>([]);
  readonly permissions = signal<PermRow[]>([]);
  readonly rolePerms = signal<RolePermRow[]>([]);
  readonly userRoles = signal<UserRoleRow[]>([]);

  readonly selectedUserId = signal<number | null>(null);
  readonly expandedRoles = signal<Set<number>>(new Set());
  readonly loadingInit = signal(true);
  readonly loadingUser = signal(false);
  readonly saving = signal<string | null>(null);

  // O(1) lookup: roleId → Set<permId>
  readonly rolePermSet = computed(() => {
    const map = new Map<number, Set<number>>();
    for (const rp of this.rolePerms()) {
      if (!map.has(rp.role_id)) map.set(rp.role_id, new Set());
      map.get(rp.role_id)!.add(rp.permission_id);
    }
    return map;
  });

  // O(1) lookup: roleId → userRoleId (only if user has role)
  readonly userRoleMap = computed(() => {
    const map = new Map<number, number>();
    for (const ur of this.userRoles()) map.set(ur.role_id, ur.user_role_id);
    return map;
  });

  // Permissions grouped by resource prefix (e.g. "audit_log")
  readonly permGroups = computed((): PermGroup[] => {
    const grouped = new Map<string, (PermRow & { action: string })[]>();
    for (const p of this.permissions()) {
      const [res, action] = p.name.split(':');
      if (!grouped.has(res)) grouped.set(res, []);
      grouped.get(res)!.push({ ...p, action: action ?? p.name });
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, perms]) => ({
        key,
        perms: perms.sort((a, b) => a.action.localeCompare(b.action)),
      }));
  });

  async ngOnInit(): Promise<void> {
    const [usersRes, rolesRes, permsRes, rolePermsRes] = await Promise.all([
      this.db.client
        .from('USER')
        .select('user_id, name, email')
        .eq('is_deleted', false)
        .order('name'),
      this.db.client.from('ROLE').select('role_id, name').eq('is_deleted', false).order('name'),
      this.db.client
        .from('PERMISSION')
        .select('permission_id, name, description')
        .eq('is_deleted', false)
        .order('name'),
      this.db.client
        .from('ROLE_PERMISSION')
        .select('role_permission_id, role_id, permission_id')
        .eq('is_deleted', false),
    ]);
    if (usersRes.data) this.users.set(usersRes.data as UserRow[]);
    if (rolesRes.data) this.roles.set(rolesRes.data as RoleRow[]);
    if (permsRes.data) this.permissions.set(permsRes.data as PermRow[]);
    if (rolePermsRes.data) this.rolePerms.set(rolePermsRes.data as RolePermRow[]);
    this.loadingInit.set(false);
  }

  async onUserChange(userId: number | null): Promise<void> {
    this.selectedUserId.set(userId);
    if (!userId) {
      this.userRoles.set([]);
      return;
    }
    this.loadingUser.set(true);
    const { data } = await this.db.client
      .from('USER_ROLE')
      .select('user_role_id, user_id, role_id')
      .eq('user_id', userId)
      .eq('is_deleted', false);
    if (data) this.userRoles.set(data as UserRoleRow[]);
    this.loadingUser.set(false);
  }

  userHasRole(roleId: number): boolean {
    return this.userRoleMap().has(roleId);
  }

  roleHasPerm(roleId: number, permId: number): boolean {
    return this.rolePermSet().get(roleId)?.has(permId) ?? false;
  }

  getRolePermCount(roleId: number): number {
    return this.rolePermSet().get(roleId)?.size ?? 0;
  }

  toggleExpand(roleId: number): void {
    this.expandedRoles.update((s) => {
      const n = new Set(s);
      if (n.has(roleId)) n.delete(roleId);
      else n.add(roleId);
      return n;
    });
  }

  isExpanded(roleId: number): boolean {
    return this.expandedRoles().has(roleId);
  }

  isSaving(key: string): boolean {
    return this.saving() === key;
  }

  async toggleUserRole(roleId: number, checked: boolean): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) return;
    const actorId = Number(this.auth.getInternalUserId()) || 1;
    const key = `ur-${roleId}`;
    this.saving.set(key);

    if (checked) {
      const { data, error } = await this.db.client
        .from('USER_ROLE')
        .insert({
          user_id: userId,
          role_id: roleId,
          created_by: actorId,
          created_at: new Date().toISOString(),
          is_deleted: false,
        })
        .select('user_role_id, user_id, role_id')
        .single();

      if (!error && data) {
        this.userRoles.update((list) => [...list, data as UserRoleRow]);
        this.notif.notify('success', 'Rol asignado', '');
      } else {
        this.notif.notify('error', 'Error', 'No se pudo asignar el rol.');
      }
    } else {
      const userRoleId = this.userRoleMap().get(roleId);
      if (userRoleId) {
        const { error } = await this.db.client
          .from('USER_ROLE')
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: actorId })
          .eq('user_role_id', userRoleId);

        if (!error) {
          this.userRoles.update((list) => list.filter((ur) => ur.user_role_id !== userRoleId));
          this.notif.notify('success', 'Rol removido', '');
        } else {
          this.notif.notify('error', 'Error', 'No se pudo remover el rol.');
        }
      }
    }
    this.saving.set(null);
  }

  async toggleRolePerm(roleId: number, permId: number, checked: boolean): Promise<void> {
    const actorId = Number(this.auth.getInternalUserId()) || 1;
    const key = `rp-${roleId}-${permId}`;
    this.saving.set(key);

    if (checked) {
      const { data, error } = await this.db.client
        .from('ROLE_PERMISSION')
        .insert({
          role_id: roleId,
          permission_id: permId,
          created_by: actorId,
          created_at: new Date().toISOString(),
          is_deleted: false,
        })
        .select('role_permission_id, role_id, permission_id')
        .single();

      if (!error && data) {
        this.rolePerms.update((list) => [...list, data as RolePermRow]);
      } else {
        this.notif.notify('error', 'Error', 'No se pudo asignar el permiso.');
      }
    } else {
      const rp = this.rolePerms().find((r) => r.role_id === roleId && r.permission_id === permId);
      if (rp) {
        const { error } = await this.db.client
          .from('ROLE_PERMISSION')
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: actorId })
          .eq('role_permission_id', rp.role_permission_id);

        if (!error) {
          this.rolePerms.update((list) =>
            list.filter((r) => r.role_permission_id !== rp.role_permission_id),
          );
        } else {
          this.notif.notify('error', 'Error', 'No se pudo remover el permiso.');
        }
      }
    }
    this.saving.set(null);
  }

  userOptions() {
    return this.users().map((u) => ({
      label: `${u.name} · ${u.email}`,
      value: u.user_id,
    }));
  }
}
