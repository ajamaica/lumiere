---
name: phoenix-api-gen
description: Generate a full Phoenix JSON API from an OpenAPI spec or natural language description. Creates contexts, Ecto schemas, migrations, controllers, JSON views/renderers, router entries, ExUnit tests with factories, auth plugs, and tenant scoping. Use when building a new Phoenix REST API, adding CRUD endpoints, scaffolding resources, or converting an OpenAPI YAML into a Phoenix project.
---

# Phoenix API Generator

## Workflow

### From OpenAPI YAML

1. Parse the OpenAPI spec — extract paths, schemas, request/response bodies.
2. Map each schema to an Ecto schema + migration.
3. Map each path to a controller action; group by resource context.
4. Generate auth plugs from `securitySchemes`.
5. Generate ExUnit tests covering happy path + validation errors.

### From Natural Language

1. Extract resources, fields, types, and relationships from the description.
2. Infer context boundaries (group related resources).
3. Generate schemas, migrations, controllers, views, router, and tests.
4. Ask the user to confirm before writing files.

## File Generation Order

1. Migrations (timestamps prefix: `YYYYMMDDHHMMSS`)
2. Ecto schemas + changesets
3. Context modules (CRUD functions)
4. Controllers + FallbackController
5. JSON renderers (Phoenix 1.7+ `*JSON` modules, or `*View` for older)
6. Router scope + pipelines
7. Auth plugs
8. Tests + factories

## Phoenix Conventions

See [references/phoenix-conventions.md](references/phoenix-conventions.md) for project structure, naming, context patterns.

Key rules:

- One context per bounded domain (e.g., `Accounts`, `Billing`, `Notifications`).
- Context is the public API — controllers never call Repo directly.
- Schemas live under contexts: `MyApp.Accounts.User`.
- Controllers delegate to contexts; return `{:ok, resource}` or `{:error, changeset}`.
- Use `FallbackController` with `action_fallback/1` to handle error tuples.

## Ecto Patterns

See [references/ecto-patterns.md](references/ecto-patterns.md) for schema, changeset, migration details.

Key rules:

- Always use `timestamps(type: :utc_datetime_usec)`.
- Binary IDs: `@primary_key {:id, :binary_id, autogenerate: true}` + `@foreign_key_type :binary_id`.
- Separate `create_changeset/2` and `update_changeset/2` when create/update fields differ.
- Validate required fields, formats, and constraints in changesets — not in controllers.

## Multi-Tenancy

Add `tenant_id :binary_id` to every tenant-scoped table. Pattern:

```elixir
# In context
def list_resources(tenant_id) do
  Resource
  |> where(tenant_id: ^tenant_id)
  |> Repo.all()
end

# In plug — extract tenant from conn and assign
defmodule MyAppWeb.Plugs.SetTenant do
  import Plug.Conn
  def init(opts), do: opts
  def call(conn, _opts) do
    tenant_id = get_req_header(conn, "x-tenant-id") |> List.first()
    assign(conn, :tenant_id, tenant_id)
  end
end
```

Always add a composite index on `[:tenant_id, <resource_id or lookup field>]`.

## Auth Plugs

### API Key

```elixir
defmodule MyAppWeb.Plugs.ApiKeyAuth do
  import Plug.Conn
  def init(opts), do: opts
  def call(conn, _opts) do
    with [key] <- get_req_header(conn, "x-api-key"),
         {:ok, account} <- Accounts.authenticate_api_key(key) do
      assign(conn, :current_account, account)
    else
      _ -> conn |> send_resp(401, "Unauthorized") |> halt()
    end
  end
end
```

### Bearer Token

```elixir
defmodule MyAppWeb.Plugs.BearerAuth do
  import Plug.Conn
  def init(opts), do: opts
  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- MyApp.Token.verify(token) do
      assign(conn, :current_user, claims)
    else
      _ -> conn |> send_resp(401, "Unauthorized") |> halt()
    end
  end
end
```

## Router Structure

```elixir
scope "/api/v1", MyAppWeb do
  pipe_through [:api, :authenticated]

  resources "/users", UserController, except: [:new, :edit]
  resources "/teams", TeamController, except: [:new, :edit] do
    resources "/members", MemberController, only: [:index, :create, :delete]
  end
end
```

## Test Generation

See [references/test-patterns.md](references/test-patterns.md) for ExUnit, Mox, factory patterns.

Key rules:

- Use `async: true` on all tests that don't share state.
- Use `Ecto.Adapters.SQL.Sandbox` for DB isolation.
- Factory module using `ex_machina` or hand-rolled `build/1`, `insert/1`.
- Test contexts and controllers separately.
- For controllers: test status codes, response body shape, and error cases.
- Mock external services with `Mox` — define behaviours, set expectations in test.

### Controller Test Template

```elixir
defmodule MyAppWeb.UserControllerTest do
  use MyAppWeb.ConnCase, async: true

  import MyApp.Factory

  setup %{conn: conn} do
    user = insert(:user)
    conn = put_req_header(conn, "authorization", "Bearer #{token_for(user)}")
    {:ok, conn: conn, user: user}
  end

  describe "index" do
    test "lists users", %{conn: conn} do
      conn = get(conn, ~p"/api/v1/users")
      assert %{"data" => users} = json_response(conn, 200)
      assert is_list(users)
    end
  end

  describe "create" do
    test "returns 201 with valid params", %{conn: conn} do
      params = params_for(:user)
      conn = post(conn, ~p"/api/v1/users", user: params)
      assert %{"data" => %{"id" => _}} = json_response(conn, 201)
    end

    test "returns 422 with invalid params", %{conn: conn} do
      conn = post(conn, ~p"/api/v1/users", user: %{})
      assert json_response(conn, 422)["errors"] != %{}
    end
  end
end
```

## JSON Renderer (Phoenix 1.7+)

```elixir
defmodule MyAppWeb.UserJSON do
  def index(%{users: users}), do: %{data: for(u <- users, do: data(u))}
  def show(%{user: user}), do: %{data: data(user)}

  defp data(user) do
    %{
      id: user.id,
      email: user.email,
      inserted_at: user.inserted_at
    }
  end
end
```

## Checklist Before Writing

- [ ] Migrations use `timestamps(type: :utc_datetime_usec)`
- [ ] Binary IDs configured if project uses UUIDs
- [ ] Tenant scoping applied where needed
- [ ] Auth plug wired in router pipeline
- [ ] FallbackController handles `{:error, changeset}` and `{:error, :not_found}`
- [ ] Tests cover 200, 201, 404, 422 status codes
- [ ] Factory defined for each schema
