
# Agrega id signal, setData, updateData y arregla submitData en todas las pages

$pagesDir = "src\app\core\pages"

$pages = @(
  @{ Dir="audit-log";          Table="AUDIT_LOG";         PK="audit_log_id";         DB="AUDIT_LOG"         }
  @{ Dir="catalog";            Table="CATALOG";            PK="catalog_id";           DB="CATALOG"           }
  @{ Dir="invitation";         Table="INVITATION";         PK="invitation_id";        DB="INVITATION"        }
  @{ Dir="league";             Table="LEAGUE";             PK="league_id";            DB="LEAGUE"            }
  @{ Dir="league-reward";      Table="LEAGUE_REWARD";      PK="league_reward_id";     DB="LEAGUE_REWARD"     }
  @{ Dir="match";              Table="MATCH";              PK="match_id";             DB="MATCH"             }
  @{ Dir="match-period";       Table="MATCH_PERIOD";       PK="match_period_id";      DB="MATCH_PERIOD"      }
  @{ Dir="permission";         Table="PERMISSION";         PK="permission_id";        DB="PERMISSION"        }
  @{ Dir="prediction";         Table="PREDICTION";         PK="prediction_id";        DB="PREDICTION"        }
  @{ Dir="role";               Table="ROLE";               PK="role_id";              DB="ROLE"              }
  @{ Dir="role-permission";    Table="ROLE_PERMISSION";    PK="role_permission_id";   DB="ROLE_PERMISSION"   }
  @{ Dir="rules-league";       Table="RULES_LEAGUE";       PK="rules_league_id";      DB="RULES_LEAGUE"      }
  @{ Dir="teams";              Table="TEAM";               PK="team_id";              DB="TEAM"              }
  @{ Dir="transaction";        Table="TRANSACTION";        PK="transaction_id";       DB="TRANSACTION"       }
  @{ Dir="user";               Table="USER";               PK="user_id";              DB="USER"              }
  @{ Dir="user-league";        Table="USER_LEAGUE";        PK="user_league_id";       DB="USER_LEAGUE"       }
  @{ Dir="user-league-reward"; Table="USER_LEAGUE_REWARD"; PK="user_league_reward_id";DB="USER_LEAGUE_REWARD"}
  @{ Dir="user-session";       Table="USER_SESSION";       PK="user_session_id";      DB="USER_SESSION"      }
  @{ Dir="wallet";             Table="WALLET";             PK="wallet_id";            DB="WALLET"            }
  @{ Dir="world-league";       Table="WORLD_LEAGUE";       PK="world_league_id";      DB="WORLD_LEAGUE"      }
)

foreach ($p in $pages) {
  $tsFile = "$pagesDir\$($p.Dir)\$($p.Dir).ts"
  if (!(Test-Path $tsFile)) { Write-Host "Not found: $tsFile"; continue }

  $c = [System.IO.File]::ReadAllText($tsFile)

  # ── 1. Agregar import de DynamicQueryFilter si no está ─────────────────────
  if ($c -notmatch 'DynamicQueryFilter') {
    $c = $c.Replace(
      "import { ActivatedRoute } from '@angular/router';",
      "import { ActivatedRoute } from '@angular/router';`nimport { DynamicQueryFilter } from '../../interfaces/dynamic-query-interface';"
    )
  }

  # ── 2. Agregar id signal justo antes de editData signal ────────────────────
  if ($c -notmatch 'id = signal') {
    $c = $c.Replace(
      "  editData = signal<Record<string, any> | null>(null);",
      "  id = signal<string | null>(null);`n  editData = signal<Record<string, any> | null>(null);"
    )
  }

  # ── 3. Agregar set del id en getData ──────────────────────────────────────
  if ($c -notmatch 'this\.id\.set\(id\)') {
    $c = $c.Replace(
      "    const id = this._route.snapshot.paramMap.get('id');`n    const url",
      "    const id = this._route.snapshot.paramMap.get('id');`n    if (id) { this.id.set(id); }`n    const url"
    )
  }

  # ── 4. Cambiar fetchData condicional para usar this.id() ──────────────────
  # Cambiar "if (id) {" por "if (this.id()) {" en el bloque de fetchData
  if ($c -notmatch 'if \(this\.id\(\)\)') {
    # Replace the filter section to use this.id()
    $c = $c.Replace(
      "        filters: { field: '$($p.PK)', value: id },",
      "        filters: { field: '$($p.PK)', value: this.id()! },"
    )
    $c = $c.Replace(
      "    if (id) {`n      response",
      "    if (this.id()) {`n      response"
    )
  }

  # ── 5. Reemplazar submitData simple por versión async con reset ────────────
  $oldSubmit = "  submitData = (`$event: string) => {`n    const parsedData = JSON.parse(`$event);`n    this.insertData(parsedData);`n  };"
  $newSubmit = "  submitData = async (`$event: string) => {`n    const parsedData = JSON.parse(`$event);`n    await this.setData(parsedData);`n    this.id.set(null);`n    await this.getData();`n  };"
  $c = $c.Replace($oldSubmit, $newSubmit)

  # ── 6. Reemplazar insertData por setData + insertData + updateData ─────────
  $oldInsert = "  insertData = async (data: Partial<Database['public']['Tables']['$($p.DB)']['Insert']>) => {`n    const response = await this.dynamicService.insertData('$($p.Table)', data);`n    return response;`n  };"
  $newInsert = "  setData = async (data: any) => {`n    if (this.id()) {`n      await this.updateData(data);`n    } else {`n      await this.insertData(data);`n    }`n  };`n`n  insertData = async (data: Partial<Database['public']['Tables']['$($p.DB)']['Insert']>) => {`n    const response = await this.dynamicService.insertData('$($p.Table)', data);`n    return response;`n  };`n`n  updateData = async (data: Partial<Database['public']['Tables']['$($p.DB)']['Update']>) => {`n    const response = await this.dynamicService.updateData('$($p.Table)', data, { field: '$($p.PK)', value: this.id()! });`n    return response;`n  };"
  $c = $c.Replace($oldInsert, $newInsert)

  [System.IO.File]::WriteAllText($tsFile, $c, [System.Text.Encoding]::UTF8)
  Write-Host "✅ $($p.Dir)"
}

Write-Host "`n🎉 Done!"
