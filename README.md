# Attribute-based access control with Curity and OPA

[![Quality](https://img.shields.io/badge/quality-demo-red)](https://curity.io/resources/code-examples/status/)
[![Availability](https://img.shields.io/badge/availability-source-blue)](https://curity.io/resources/code-examples/status/)

Access is granted not by *who the user is* but by *what is true about the
user right now*. The Curity Identity Server issues an access token carrying attributes
about the user (`department` and `clearance`), set by a claims script in Curity
at token issuance. The API never looks the user up and never decides anything itself: it
verifies the token, hands the claims to Open Policy Agent (OPA), and does what
the policy says. Two endpoints are also restricted to certain hours, so the
same user can get different answers at 10:00 and at 22:00.

Every API call in the web app shows the whole decision trace (token
verification, the exact input sent to OPA, and OPA's answer), not just the
outcome.

```
                 ┌──────────────────────┐
  Browser ──────▶│ Curity Identity      │  claims script abac-attributes
  (webapp :5173) │ Server (token issuer)│  sets {department, clearance}
      │          └──────────────────────┘
      │  access token (JWT with department + clearance)
      ▼
  Protected API :3002 ── verify signature (issuer JWKS)
                      └─ POST /v1/data/authz/allow ──▶ OPA :8181 (authz.rego + data.json)
```

## What's in the repo

| Path | What it is |
|---|---|
| `config.xml` | Curity configuration to merge into an existing server: scope, claims, claims script, client, authenticator |
| `.env.example` | The issuer URL, shared by the API and the web app |
| `api/` | Node/Express API that verifies the JWT and asks OPA for a decision |
| `opa/policies/` | The Rego policy (`authz.rego`) and the endpoint requirements (`data.json`) |
| `docker-compose.yaml` | Runs OPA with the policies mounted |
| `webapp/` | Vue single-page app: login, token claims, decision trace |

## Prerequisites

- **Curity Identity Server**, running and licensed, with admin access. The
  instructions below assume it listens on `https://localhost:8443`.
- **Node.js 20.6** or later.
- **Docker** with Docker Compose, for OPA.
- Ports **3002**, **5173** and **8181** free on the machine.

## Setup

### 1. Check that `config.xml` matches the Curity server

`config.xml` is merged into an existing configuration. It refers to a few
things a standard Curity installation (the Basic Setup wizard) already has:

| In `config.xml` | Meaning | If different |
|---|---|---|
| `token-service` | id of the OAuth (token service) profile | change the `<id>` of the second `<profile>` |
| `authentication-service` | id of the authentication profile | change the `<id>` of the first `<profile>` |
| `default` | the claims mapper the token service uses | change the `<claims-mapper><id>` |
| `default-datasource` | a data source; Required, but not used | change `<script-claims-provider><data-source>` to any existing data source |

The token service must also have an **anonymous endpoint**. In a standard
installation it is `/oauth/v2/oauth-anonymous`, which makes the issuer
`https://localhost:8443/oauth/v2/oauth-anonymous`. It is found in the admin UI
under **Token Service → Endpoints** (the endpoint of type `oauth-anonymous`).

Everything the demo adds is prefixed `abac-`, plus the `clearance` scope and
the `clearance` and `department` claims.

### 2. Set the issuer

The API and the web app read the issuer from one `.env` file at the root of
the repo:

```bash
cp .env.example .env    # then set ISSUER if the issuer differs
```

### 3. Start OPA

```bash
docker compose up -d
```

Check it: `curl http://localhost:8181/v1/data/endpoints` should return the
four endpoints from `opa/policies/data.json`.

### 4. Load the configuration into Curity

**Admin UI:** open **Changes → Upload**, choose `config.xml`, select **Merge**,
then commit.

**Or the CLI (`idsh`)** on the server:

```
$IDSVR_HOME/bin/idsh
configure
load merge /path/to/config.xml
commit
exit
```

### 5. Start the protected API

The API fetches the token signing keys from `<issuer>/jwks`:

```bash
cd api
npm install
npm start
```

It listens on port 3002. The API does not verify Curity's TLS certificate when
it fetches the keys, so a self-signed certificate (the default after
installation) works as is.

### 6. Start the web app

```bash
cd webapp
npm install
npm start
```

Open **http://localhost:5173**. It must be exactly this URL: it is the
client's registered redirect URI and the API's allowed CORS origin.

If Curity uses a self-signed certificate, first open
`https://localhost:8443/oauth/v2/oauth-anonymous/.well-known/openid-configuration`
in the same browser and accept the certificate. Otherwise the login fails
silently.

## Walkthrough

1. The landing page shows three status pills: OPA should be green, the issuer
   should show the Curity host.
2. **Log in.** The client uses Curity's Username authenticator: type a username
   and continue, no password. Use one of:

   | User | Department | Clearance |
   |---|---|---|
   | `alice` | security | top-secret |
   | `charlie` | engineering | confidential |
   | `bob` | marketing | internal |

3. **Attributes on the access token** shows `department` and `clearance`.
   Curity's claims script set them during token issuance; the web app never
   asked for them.
4. **Call the protected API.** Each endpoint lists what it needs, read live
   from the policy OPA has loaded:

   | Endpoint | Required clearance | Hours (UTC) |
   |---|---|---|
   | `/api/public` | public | any |
   | `/api/internal` | internal | any |
   | `/api/confidential` | confidential | 07:00–21:00 |
   | `/api/top-secret` | top-secret | 09:00–17:00 |

   Clearances rank `public` < `internal` < `confidential` < `top-secret`.
   Inside the permitted hours, `bob` gets `/api/public` and `/api/internal`,
   `charlie` also `/api/confidential`, and `alice` everything.
5. **Decision trace.** For each call the API reports what it did, in order:
   verified the JWT (header and payload shown), sent the policy input to OPA
   (the exact JSON), and got `allow = true` or `allow = false`. A refused call
   returns 403 with the same trace.
6. Log out and log in as another user to compare. The client forces a fresh
   login each time.

OPA evaluates the hours in **UTC** (the container's clock). The "open now"
label in the web app uses the browser's local time, so away from UTC the two
can disagree near the boundaries.

## How it works

**Token issuance (Curity).** The client `abac-demo` requests the `clearance`
scope. That scope carries the `clearance` and `department` claims, whose
values come from the `abac-attributes` claims provider, a script claims
provider that runs the JavaScript procedure of the same name in `config.xml`.
The script looks up the username in a table and returns `department` and
`clearance`. The claims mapper puts both claims on
the access token, which is issued as a JWT so the API can read it without
calling Curity.

**The API (`api/`).** `middleware/jwt.ts` verifies the token signature against
the issuer's JWKS. `middleware/opa.ts` sends `{claims, path, method}` to OPA
and returns 403 unless OPA answers `allow = true`. The route handlers contain
no access rules at all.

**The policy (`opa/policies/`).** `data.json` says what each endpoint requires;
`authz.rego` allows a request when the user's clearance ranks at least as high
as the endpoint's and, if the endpoint has `restricted_hours`, the current hour
is inside them.

## Changing the demo

- **Users and attributes:** edit the `users` table in the script, either in
  the admin UI (**System → Procedures → Claims Provider**, `abac-attributes`)
  or in `config.xml` before loading it. New attributes reach the token on the
  next login.
- **Who may see what:** edit `opa/policies/data.json` or `authz.rego`, then
  `docker compose restart opa`. The API and web app pick up the change without
  a restart, which is the point: access rules live in policy, not code.

## Not for production

This is a local demo. The user attributes are hard-coded in a script, the
Username authenticator asks for no password, the API skips TLS certificate
verification when it fetches the signing keys, and the API allows CORS only from
`http://localhost:5173`.
