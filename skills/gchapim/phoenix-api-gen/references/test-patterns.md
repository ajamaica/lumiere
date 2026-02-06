# Test Patterns Reference

## ConnCase Setup

```elixir
defmodule MyAppWeb.ConnCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      @endpoint MyAppWeb.Endpoint
      use MyAppWeb, :verified_routes
      import Plug.Conn
      import Phoenix.ConnTest
      import MyApp.Factory
    end
  end

  setup tags do
    MyApp.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end
end
```

## DataCase Setup

```elixir
defmodule MyApp.DataCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      alias MyApp.Repo
      import Ecto
      import Ecto.Changeset
      import Ecto.Query
      import MyApp.Factory
    end
  end

  setup tags do
    setup_sandbox(tags)
    :ok
  end

  def setup_sandbox(tags) do
    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(MyApp.Repo, shared: !tags[:async])
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
  end
end
```

## Factory Module (hand-rolled)

```elixir
defmodule MyApp.Factory do
  alias MyApp.Repo

  def build(:user) do
    %MyApp.Accounts.User{
      id: Ecto.UUID.generate(),
      email: "user-#{System.unique_integer([:positive])}@example.com",
      name: "Test User",
      role: :member,
      tenant_id: Ecto.UUID.generate()
    }
  end

  def build(:team) do
    %MyApp.Teams.Team{
      id: Ecto.UUID.generate(),
      name: "Team #{System.unique_integer([:positive])}",
      tenant_id: Ecto.UUID.generate()
    }
  end

  def build(factory, attrs) do
    factory |> build() |> struct!(attrs)
  end

  def insert(factory, attrs \\ []) do
    factory |> build(attrs) |> Repo.insert!()
  end

  def params_for(factory, attrs \\ []) do
    factory
    |> build(attrs)
    |> Map.from_struct()
    |> Map.drop([:__meta__, :id, :inserted_at, :updated_at])
  end
end
```

## Context Test Template

```elixir
defmodule MyApp.AccountsTest do
  use MyApp.DataCase, async: true

  alias MyApp.Accounts

  describe "create_user/1" do
    test "creates with valid attrs" do
      attrs = params_for(:user)
      assert {:ok, user} = Accounts.create_user(attrs)
      assert user.email == attrs.email
    end

    test "fails with missing required fields" do
      assert {:error, changeset} = Accounts.create_user(%{})
      assert %{email: ["can't be blank"]} = errors_on(changeset)
    end

    test "fails with duplicate email in same tenant" do
      user = insert(:user)
      attrs = params_for(:user, email: user.email, tenant_id: user.tenant_id)
      assert {:error, changeset} = Accounts.create_user(attrs)
      assert %{email: [_]} = errors_on(changeset)
    end
  end
end
```

## Controller Test Template

```elixir
defmodule MyAppWeb.UserControllerTest do
  use MyAppWeb.ConnCase, async: true

  setup %{conn: conn} do
    user = insert(:user)
    conn =
      conn
      |> put_req_header("accept", "application/json")
      |> put_req_header("authorization", "Bearer #{token_for(user)}")
      |> put_req_header("x-tenant-id", user.tenant_id)

    {:ok, conn: conn, user: user}
  end

  describe "GET /api/v1/users" do
    test "returns list", %{conn: conn} do
      conn = get(conn, ~p"/api/v1/users")
      assert %{"data" => [_ | _]} = json_response(conn, 200)
    end
  end

  describe "POST /api/v1/users" do
    test "201 with valid data", %{conn: conn, user: user} do
      params = params_for(:user, tenant_id: user.tenant_id)
      conn = post(conn, ~p"/api/v1/users", user: params)
      assert %{"data" => %{"id" => _}} = json_response(conn, 201)
    end

    test "422 with invalid data", %{conn: conn} do
      conn = post(conn, ~p"/api/v1/users", user: %{})
      assert %{"errors" => _} = json_response(conn, 422)
    end
  end

  describe "GET /api/v1/users/:id" do
    test "200 returns user", %{conn: conn, user: user} do
      conn = get(conn, ~p"/api/v1/users/#{user.id}")
      assert %{"data" => %{"id" => _}} = json_response(conn, 200)
    end
  end

  describe "PUT /api/v1/users/:id" do
    test "200 updates user", %{conn: conn, user: user} do
      conn = put(conn, ~p"/api/v1/users/#{user.id}", user: %{name: "Updated"})
      assert %{"data" => %{"name" => "Updated"}} = json_response(conn, 200)
    end
  end

  describe "DELETE /api/v1/users/:id" do
    test "204 deletes user", %{conn: conn, user: user} do
      conn = delete(conn, ~p"/api/v1/users/#{user.id}")
      assert response(conn, 204)
    end
  end
end
```

## Mox Setup

```elixir
# test/support/mocks.ex
Mox.defmock(MyApp.HTTPClientMock, for: MyApp.HTTPClient)

# config/test.exs
config :my_app, :http_client, MyApp.HTTPClientMock

# In test
import Mox

setup :verify_on_exit!

test "calls external service" do
  expect(MyApp.HTTPClientMock, :post, fn url, body ->
    assert url == "https://api.example.com/webhook"
    {:ok, %{status: 200}}
  end)

  assert :ok = MyApp.Webhooks.deliver(webhook)
end
```

## errors_on Helper

```elixir
# test/support/data_case.ex
def errors_on(changeset) do
  Ecto.Changeset.traverse_errors(changeset, fn {message, opts} ->
    Regex.replace(~r"%{(\w+)}", message, fn _, key ->
      opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
    end)
  end)
end
```
