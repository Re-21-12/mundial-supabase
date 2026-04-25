
# Script simplificado: agrega editData/readonlyMode/ActivatedRoute a cada page .ts
# Funciona haciendo reemplazos de strings simples sin regex complejos

$pagesDir = "src\app\core\pages"

$pages = @(
  @{ Dir="audit-log";          Table="AUDIT_LOG";         PK="audit_log_id"         }
  @{ Dir="catalog";            Table="CATALOG";            PK="catalog_id"           }
  @{ Dir="invitation";         Table="INVITATION";         PK="invitation_id"        }
  @{ Dir="league";             Table="LEAGUE";             PK="league_id"            }
  @{ Dir="league-reward";      Table="LEAGUE_REWARD";      PK="league_reward_id"     }
  @{ Dir="match";              Table="MATCH";              PK="match_id"             }
  @{ Dir="match-period";       Table="MATCH_PERIOD";       PK="match_period_id"      }
  @{ Dir="permission";         Table="PERMISSION";         PK="permission_id"        }
  @{ Dir="prediction";         Table="PREDICTION";         PK="prediction_id"        }
  @{ Dir="role";               Table="ROLE";               PK="role_id"              }
  @{ Dir="role-permission";    Table="ROLE_PERMISSION";    PK="role_permission_id"   }
  @{ Dir="rules-league";       Table="RULES_LEAGUE";       PK="rules_league_id"      }
  @{ Dir="stadium";            Table="STADIUM";            PK="stadium_id"           }
  @{ Dir="teams";              Table="TEAM";               PK="team_id"              }
  @{ Dir="transaction";        Table="TRANSACTION";        PK="transaction_id"       }
  @{ Dir="user";               Table="USER";               PK="user_id"              }
  @{ Dir="user-league";        Table="USER_LEAGUE";        PK="user_league_id"       }
  @{ Dir="user-league-reward"; Table="USER_LEAGUE_REWARD"; PK="user_league_reward_id"}
  @{ Dir="user-session";       Table="USER_SESSION";       PK="user_session_id"      }
  @{ Dir="wallet";             Table="WALLET";             PK="wallet_id"            }
  @{ Dir="world-league";       Table="WORLD_LEAGUE";       PK="world_league_id"      }
)

foreach ($p in $pages) {
  $baseName = $p.Dir
  $tsFile   = "$pagesDir\$baseName\$baseName.ts"

  if (!(Test-Path $tsFile)) { Write-Host "❌ Not found: $tsFile"; continue }

  $c = [System.IO.File]::ReadAllText($tsFile)
  if ($c -match 'editData') { Write-Host "⏭️  Already done: $tsFile"; continue }

  # ── 1. Fix imports ─────────────────────────────────────────────────────────

  # Agregar OnInit al import de @angular/core si no está
  if ($c -notmatch 'OnInit') {
    $c = $c -replace "import \{ (Component, inject, model, signal, WritableSignal) \}", "import { `$1, OnInit }"
    # fallback genérico
    if ($c -notmatch 'OnInit') {
      $c = $c -replace "import \{ ([^}]+) \} from '@angular/core';", "import { `$1, OnInit } from '@angular/core';"
    }
  }

  # Agregar ActivatedRoute
  if ($c -notmatch 'ActivatedRoute') {
    # Si ya tiene import de @angular/router
    if ($c -match "from '@angular/router'") {
      $c = $c -replace "import \{ ([^}]+) \} from '@angular/router';", "import { `$1, ActivatedRoute } from '@angular/router';"
    } else {
      # Agregar nuevo import después del primer import de @angular/core
      $c = $c -replace "(from '@angular/core';)", "`$1`nimport { ActivatedRoute } from '@angular/router';"
    }
  }

  # ── 2. Agregar inject de _route y signals ─────────────────────────────────

  # Agregar private _route justo antes de "readonly dynamicService"
  $c = $c.Replace(
    "  readonly dynamicService = inject(DynamicService);",
    "  private readonly _route = inject(ActivatedRoute);`n  editData = signal<Record<string, any> | null>(null);`n  readonlyMode = signal<boolean>(false);`n  readonly dynamicService = inject(DynamicService);"
  )

  # ── 3. Agregar implements OnInit si no está ───────────────────────────────
  if ($c -notmatch 'implements OnInit') {
    # Busca "export class NombrePage {" o "export class Nombre {"
    $c = $c -replace '(export class \w+) \{', '`$1 implements OnInit {'
  }

  # ── 4. Reemplazar getData ─────────────────────────────────────────────────
  # Construir el nuevo getData
  $newGetData = @"

  getData = async () => {
    const id = this._route.snapshot.paramMap.get('id');
    const url = this._route.snapshot.url.map(s => s.path).join('/');
    const isDetail = url.endsWith('detail');
    const isEdit = url.endsWith('edit');

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

  # Buscar el bloque getData usando indexOf para evitar regex
  $start = $c.IndexOf("`n  getData = async () => {")
  if ($start -eq -1) { $start = $c.IndexOf("`r`n  getData = async () => {") }
  
  if ($start -ge 0) {
    # Encontrar el fin del bloque (la siguiente línea que es solo "  };")
    $end = $c.IndexOf("`n  };", $start + 10)
    if ($end -ge 0) {
      $end = $end + 5 # incluir "  };"
      $c = $c.Substring(0, $start) + $newGetData + $c.Substring($end)
    }
  }

  [System.IO.File]::WriteAllText($tsFile, $c, [System.Text.Encoding]::UTF8)
  Write-Host "✅ Updated: $tsFile"
}

Write-Host "`n🎉 Done!"
