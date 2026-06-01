import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyInvitationsComponent } from '../../../../shared/components/my-invitations/my-invitations.component';

@Component({
  selector: 'app-invitaciones',
  standalone: true,
  imports: [CommonModule, MyInvitationsComponent],
  templateUrl: './invitaciones.html',
  styleUrls: ['./invitaciones.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitacionesPage {}
