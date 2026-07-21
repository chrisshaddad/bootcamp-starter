# Applying the `property-manager` Keycloak login theme

This is a **Keycloakify 11** project that produces the custom **`property-manager`** login theme
used by the `prorentallb` realm (the "Property Manager" branded sign-in page). It is **already
built and live on prod** (`fm-keycloak`, Keycloak 26); this guide is how to build it and apply it
in any Keycloak from scratch.

- **Theme name (what you select in Keycloak):** `property-manager` (set in `vite.config.ts`)
- **Scope:** login theme only (`accountThemeImplementation: "none"`)
- **Source:** `src/login/` (`KcPage.tsx`, `Template.tsx`, `theme.css`, `i18n.ts`)
- Only the **source** is committed. The `node_modules/`, `dist/`, and `dist_keycloak/` (the built
  jars) are gitignored build outputs — you produce them with the build step below.

---

## 1. Build the theme jar

```bash
cd keycloak-theme
npm install                     # first time only (Node 18+ / 20+)
npm run build-keycloak-theme
```

This emits two jars in `dist_keycloak/`:

| Jar | Use for |
|-----|---------|
| `keycloak-theme-for-kc-all-other-versions.jar` | **Keycloak 26 (prod) and any modern KC** — use this one |
| `keycloak-theme-for-kc-22-to-25.jar` | only Keycloak 22–25 |

> ⚠️ Prod runs Keycloak 26.6.3 → always deploy the **`all-other-versions`** jar. Picking the
> `22-to-25` jar on KC26 silently fails to load the theme.

---

## 2. Deploy the jar to Keycloak

### Prod (Docker Compose — how it's actually wired today)
`fm-keycloak` loads providers from a mounted `keycloak-providers/` dir via an **additive**
`docker-compose.override.yml` (in `/opt/forward-mena/` on the VPS):

```yaml
# docker-compose.override.yml  (additive — touches nothing else in the stack)
services:
  keycloak:
    volumes:
      - ./keycloak-providers:/opt/keycloak/providers
```

Deploy / update the theme:
```bash
# from the compose dir (/opt/forward-mena on the VPS)
mkdir -p keycloak-providers
cp <path>/keycloak-theme/dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar keycloak-providers/
docker compose up -d keycloak      # recreate so KC loads the provider on boot
```
Keycloak 26 (Quarkus) discovers provider jars in `/opt/keycloak/providers/` and runs its
augmentation on startup — no separate `kc.sh build` step is needed for the `start` command used here.

### Any other Keycloak (bare install / different container)
Copy the jar into the server's providers dir and restart:
```bash
cp keycloak-theme-for-kc-all-other-versions.jar $KEYCLOAK_HOME/providers/
# containerized: docker cp … <kc-container>:/opt/keycloak/providers/ && docker restart <kc-container>
$KEYCLOAK_HOME/bin/kc.sh build       # only if your setup uses the explicit build step
# then restart Keycloak
```

---

## 3. Apply it in the Keycloak admin settings

1. Open the **admin console** → top-left realm switcher → select realm **`prorentallb`**
   (prod: `https://prorentallb.cloud/keycloack/admin`).
2. Left nav → **Realm settings** → **Themes** tab.
3. **Login theme** → choose **`property-manager`** from the dropdown.
   *(If it's not in the list, the jar didn't load — re-check step 2 and that KC was restarted.)*
4. Click **Save**.

That's it — realm-wide. (You can also set it per-client under Clients → `prorentallb-web` → not
needed here since it's the realm default.)

Equivalent via the Admin REST API (if you script it):
```
PUT /admin/realms/prorentallb   { "loginTheme": "property-manager" }
```

---

## 4. Verify

Open the app's **Sign in** (it redirects to `…/keycloack/realms/prorentallb/protocol/openid-connect/auth…`)
and confirm the Property Manager branding renders.

> Testing the authorize URL **directly** in a browser needs a PKCE `code_challenge` (the
> `prorentallb-web` client enforces PKCE) and `prompt=login`. Easiest is just to click "Sign in"
> from the app.

---

## 5. Rollback

Set **Login theme** back to `keycloak` (the default) in Realm settings → Themes → Save. To remove
the provider entirely: delete the jar from `keycloak-providers/`, delete the override's volume line,
and `docker compose up -d keycloak`.

---

## Gotchas (learned building this)

- **KC26 = the `all-other-versions` jar**, not `22-to-25`.
- The realm has **i18n OFF**, so the login page is **English-only** regardless of `kc_locale`.
- PatternFly reskin traps handled in `src/login/theme.css`: the `.pf-c-input-group` white background
  and the `#kc-info-wrapper` `#F0F0F0` band — if you restyle, watch those two.
- After any provider-jar change, the **KC container must be recreated/restarted** to pick it up.
