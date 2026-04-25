
# Script para agregar modo edición y modo consulta (detail) a todas las páginas
# Ejecutar desde: c:\Users\victo\Mundial

$pagesDir = "src\app\core\pages"

# Páginas a procesar: [carpeta, tableName, pkField, formKey]
$pages = @(
  @{ Dir="audit-log";         Page="AuditLogPage";          Table="AUDIT_LOG";          PK="audit_log_id";          Form="auditLogForm";          Selector="app-audit-log"       }
  @{ Dir="catalog";           Page="CatalogPage";           Table="CATALOG";             PK="catalog_id";            Form="catalogForm";           Selector="app-catalog"         }
  @{ Dir="invitation";        Page="InvitationPage";        Table="INVITATION";          PK="invitation_id";         Form="invitationForm";        Selector="app-invitation"      }
  @{ Dir="league";            Page="LeaguePage";            Table="LEAGUE";              PK="league_id";             Form="leagueForm";            Selector="app-league"          }
  @{ Dir="league-reward";     Page="LeagueRewardPage";      Table="LEAGUE_REWARD";       PK="league_reward_id";      Form="leagueRewardForm";      Selector="app-league-reward"   }
  @{ Dir="match";             Page="MatchPage";             Table="MATCH";               PK="match_id";              Form="matchForm";             Selector="app-match"           }
  @{ Dir="match-period";      Page="MatchPeriodPage";       Table="MATCH_PERIOD";        PK="match_period_id";       Form="matchPeriodForm";       Selector="app-match-period"    }
  @{ Dir="permission";        Page="PermissionPage";        Table="PERMISSION";          PK="permission_id";         Form="permissionForm";        Selector="app-permission"      }
  @{ Dir="prediction";        Page="PredictionPage";        Table="PREDICTION";          PK="prediction_id";         Form="predictionForm";        Selector="app-prediction"      }
  @{ Dir="role";              Page="RolePage";              Table="ROLE";                PK="role_id";               Form="roleForm";              Selector="app-role"            }
  @{ Dir="role-permission";   Page="RolePermissionPage";    Table="ROLE_PERMISSION";     PK="role_permission_id";    Form="rolePermissionForm";    Selector="app-role-permission" }
  @{ Dir="rules-league";      Page="RulesLeaguePage";       Table="RULES_LEAGUE";        PK="rules_league_id";       Form="rulesLeagueForm";       Selector="app-rules-league"    }
  @{ Dir="stadium";           Page="Stadium";               Table="STADIUM";             PK="stadium_id";            Form="stadiumForm";           Selector="app-stadium"         }
  @{ Dir="teams";             Page="Teams";                 Table="TEAM";                PK="team_id";               Form="teamForm";              Selector="app-teams"           }
  @{ Dir="transaction";       Page="TransactionPage";       Table="TRANSACTION";         PK="transaction_id";        Form="transactionForm";       Selector="app-transaction"     }
  @{ Dir="user";              Page="UserPage";              Table="USER";                PK="user_id";               Form="userForm";              Selector="app-user"            }
  @{ Dir="user-league";       Page="UserLeaguePage";        Table="USER_LEAGUE";         PK="user_league_id";        Form="userLeagueForm";        Selector="app-user-league"     }
  @{ Dir="user-league-reward";Page="UserLeagueRewardPage";  Table="USER_LEAGUE_REWARD";  PK="user_league_reward_id"; Form="userLeagueRewardForm";  Selector="app-user-league-reward"}
  @{ Dir="user-session";      Page="UserSessionPage";       Table="USER_SESSION";        PK="user_session_id";       Form="userSessionForm";       Selector="app-user-session"    }
  @{ Dir="wallet";            Page="WalletPage";            Table="WALLET";              PK="wallet_id";             Form="walletForm";            Selector="app-wallet"          }
  @{ Dir="world-league";      Page="WorldLeaguePage";       Table="WORLD_LEAGUE";        PK="world_league_id";       Form="worldLeagueForm";       Selector="app-world-league"    }
)

foreach ($p in $pages) {
  $dirPath = "$pagesDir\$($p.Dir)"
  $baseName = $p.Dir
  
  # ─── 1. Actualizar .routes.ts ─────────────────────────────────────────────
  $routesFile = "$dirPath\$baseName.routes.ts"
  if (Test-Path $routesFile) {
    $routesContent = Get-Content $routesFile -Raw
    # Solo agrega :id/detail si no existe ya
    if ($routesContent -notmatch ':id/detail') {
      # Insertar antes del cierre de la constante "];""
      $detailRoute = @"
  {
    path: ':id/detail',
    loadComponent: () => import('./$baseName').then((m) => m.$($p.Page)),
  },
];"@
      $routesContent = $routesContent -replace '\];', $detailRoute
      Set-Content $routesFile $routesContent -NoNewline
      Write-Host "✅ routes updated: $routesFile"
    } else {
      Write-Host "⏭️  routes already has detail: $routesFile"
    }
  }

  # ─── 2. Actualizar .ts ────────────────────────────────────────────────────
  $tsFile = "$dirPath\$baseName.ts"
  if (Test-Path $tsFile) {
    $tsContent = Get-Content $tsFile -Raw

    # Solo procesa si aún no tiene editData
    if ($tsContent -notmatch 'editData') {
      
      # 2a. Agregar OnInit si no existe
      if ($tsContent -notmatch 'OnInit') {
        $tsContent = $tsContent -replace '(import \{ Component[^}]+)\}', '$1, OnInit }'
      }

      # 2b. Agregar ActivatedRoute si no existe
      if ($tsContent -notmatch 'ActivatedRoute') {
        $tsContent = $tsContent -replace "(import \{ [^}]+ \} from '@angular/router';)", "import { ActivatedRoute } from '@angular/router';"
        # Si no había import de router, agregar después de las otras importaciones angulares
        if ($tsContent -notmatch 'ActivatedRoute') {
          $tsContent = $tsContent -replace "(import \{[^}]+\} from '@angular/core';)", "`$1`nimport { ActivatedRoute } from '@angular/router';"
        }
      }

      # 2c. Agregar inject de ActivatedRoute en la clase
      $tsContent = $tsContent -replace '(export class [^\{]+\{)', "`$1`n  private readonly _route = inject(ActivatedRoute);"

      # 2d. Agregar signals editData y readonlyMode después de 'fields = ...'
      $tsContent = $tsContent -replace "(fields = formFields\['[^']+'\]\.fields;)", "`$1`n  editData = signal<Record<string, any> | null>(null);`n  readonlyMode = signal<boolean>(false);"

      # 2e. Reemplazar getData simple por la versión con soporte edit/detail
      $oldGetData = @"
  getData = async \(\) => \{
    const response = await this\.dynamicService\.fetchData\(\{
      table: '$($p.Table)',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '\*',
    \}\);

    if \(response instanceof PostgrestError\) \{
      console\.error\('Error fetching [^']+:', response\);
    \} else \{
      this\.tableProps\.update\(\(props\) => \(\{ \.\.\.props, data: response \}\)\);
    \}

    return response;
  \};
"@
      
      $newGetData = @"
  getData = async () => {
    const id = this._route.snapshot.paramMap.get('id');
    const url = this._route.snapshot.url.map(s => s.path).join('/');
    const isDetail = url.endsWith('/detail');
    const isEdit = url.endsWith('/edit');

    let response;
    if (id) {
      response = await this.dynamicService.fetchData({
        table: '$($p.Table)',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: '$($p.PK)', value: id },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: '$($p.Table)',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching $($p.Table.ToLower()):', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
      if ((isEdit || isDetail) && Array.isArray(response) && response.length > 0) {
        this.editData.set(response[0] as Record<string, any>);
      }
      if (isDetail) this.readonlyMode.set(true);
    }

    return response;
  };
"@
      $tsContent = [regex]::Replace($tsContent, $oldGetData, $newGetData, [System.Text.RegularExpressions.RegexOptions]::Singleline)

      # 2f. Agregar implements OnInit si no existe
      if ($tsContent -notmatch 'implements OnInit') {
        $tsContent = $tsContent -replace "(export class \w+)", "`$1 implements OnInit"
      }

      # 2g. Agregar ngOnInit si no existe
      if ($tsContent -notmatch 'ngOnInit') {
        $tsContent = $tsContent -replace "(private readonly _route = inject\(ActivatedRoute\);)", "`$1`n`n  ngOnInit() {`n    this.getData();`n  }"
      }

      Set-Content $tsFile $tsContent -NoNewline
      Write-Host "✅ ts updated: $tsFile"
    } else {
      Write-Host "⏭️  ts already updated: $tsFile"
    }
  }

  # ─── 3. Actualizar .html ──────────────────────────────────────────────────
  $htmlFile = "$dirPath\$baseName.html"
  if (Test-Path $htmlFile) {
    $htmlContent = Get-Content $htmlFile -Raw
    
    # Reemplaza solo el app-dynamic-form sin los nuevos bindings
    $oldForm = '<app-dynamic-form [fields]="fields" (data)="submitData($event)"></app-dynamic-form>'
    $newForm = '<app-dynamic-form [fields]="fields" [initialData]="editData()" [readonlyMode]="readonlyMode()" (data)="submitData($event)"></app-dynamic-form>'
    
    if ($htmlContent -notmatch 'initialData') {
      $htmlContent = $htmlContent.Replace($oldForm, $newForm)
      Set-Content $htmlFile $htmlContent -NoNewline
      Write-Host "✅ html updated: $htmlFile"
    } else {
      Write-Host "⏭️  html already has initialData: $htmlFile"
    }
  }
}

Write-Host "`n🎉 Done! All pages updated with edit/detail mode."
