# Phoenix Conventions Reference

## Project Structure

```
lib/
├── my_app/                    # Business logic (contexts)
│   ├── accounts/              # Context: Accounts
│   │   ├── user.ex            # Schema
│   │   └── user_token.ex      # Schema
│   ├── accounts.ex            # Context module (public API)
│   ├── billing/
│   │   ├── subscription.ex
│   │   └── invoice.ex
│   └── billing.ex
├── my_app_web/                # Web layer
│   ├── controllers/
│   │   ├── user_controller.ex
│   │   ├── user_json.ex       # JSON renderer (1.7+)
│   │   └── fallback_controller.ex
│   ├── plugs/
│   │   ├── api_key_auth.ex
│   │   └── set_tenant.ex
│   └── router.ex
├── my_app/application.ex
└── my_app/repo.ex
```

## Naming Conventions

| Entity         | Convention                  | Example                   |
| -------------- | --------------------------- | ------------------------- |
| Context module | Plural noun                 | `MyApp.Accounts`          |
| Schema module  | Singular noun under context | `MyApp.Accounts.User`     |
| Controller     | `<Resource>Controller`      | `MyAppWeb.UserController` |
| JSON renderer  | `<Resource>JSON`            | `MyAppWeb.UserJSON`       |
| View (pre-1.7) | `<Resource>View`            | `MyAppWeb.UserView`       |
| Migration      | `<action>_<table>`          | `create_users`            |
| Table name     | Plural snake_case           | `users`, `team_members`   |
| Field name     | snake_case                  | `first_name`, `tenant_id` |

## Context Module Pattern

```elixir
defmodule MyApp.Accounts do
  @moduledoc """
  The Accounts context. Manages users and authentication.
  """
  import Ecto.Query
  alias MyApp.Repo
  alias MyApp.Accounts.User

  def list_users(opts \\ []) do
    User
    |> apply_filters(opts)
    |> Repo.all()
  end

  def get_user!(id), do: Repo.get!(User, id)

  def get_user(id), do: Repo.get(User, id)

  def create_user(attrs) do
    %User{}
    |> User.create_changeset(attrs)
    |> Repo.insert()
  end

  def update_user(%User{} = user, attrs) do
    user
    |> User.update_changeset(attrs)
    |> Repo.update()
  end

  def delete_user(%User{} = user), do: Repo.delete(user)

  defp apply_filters(query, []), do: query
  defp apply_filters(query, [{:tenant_id, id} | rest]) do
    query |> where(tenant_id: ^id) |> apply_filters(rest)
  end
  defp apply_filters(query, [_ | rest]), do: apply_filters(query, rest)
end
```

## Controller Pattern

```elixir
defmodule MyAppWeb.UserController do
  use MyAppWeb, :controller
  alias MyApp.Accounts
  action_fallback MyAppWeb.FallbackController

  def index(conn, _params) do
    users = Accounts.list_users(tenant_id: conn.assigns.tenant_id)
    render(conn, :index, users: users)
  end

  def show(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    render(conn, :show, user: user)
  end

  def create(conn, %{"user" => params}) do
    with {:ok, user} <- Accounts.create_user(params) do
      conn |> put_status(:created) |> render(:show, user: user)
    end
  end

  def update(conn, %{"id" => id, "user" => params}) do
    user = Accounts.get_user!(id)
    with {:ok, user} <- Accounts.update_user(user, params) do
      render(conn, :show, user: user)
    end
  end

  def delete(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    with {:ok, _} <- Accounts.delete_user(user) do
      send_resp(conn, :no_content, "")
    end
  end
end
```

## FallbackController

```elixir
defmodule MyAppWeb.FallbackController do
  use MyAppWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: MyAppWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: MyAppWeb.ErrorJSON)
    |> render(:"404")
  end

  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: MyAppWeb.ErrorJSON)
    |> render(:"401")
  end
end
```

## ChangesetJSON

```elixir
defmodule MyAppWeb.ChangesetJSON do
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp translate_error({msg, opts}) do
    Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
      opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
    end)
  end
end
```

## Router Patterns

```elixir
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated do
    plug MyAppWeb.Plugs.BearerAuth
  end

  pipeline :tenant_scoped do
    plug MyAppWeb.Plugs.SetTenant
  end

  # Public endpoints
  scope "/api/v1", MyAppWeb do
    pipe_through :api
    post "/auth/token", AuthController, :create
  end

  # Authenticated + tenant-scoped
  scope "/api/v1", MyAppWeb do
    pipe_through [:api, :authenticated, :tenant_scoped]
    resources "/users", UserController, except: [:new, :edit]
  end
end
```

## Pagination Pattern

```elixir
def list_resources(opts) do
  page = Keyword.get(opts, :page, 1)
  per_page = Keyword.get(opts, :per_page, 20) |> min(100)

  Resource
  |> apply_filters(opts)
  |> order_by([r], desc: r.inserted_at)
  |> offset(^((page - 1) * per_page))
  |> limit(^per_page)
  |> Repo.all()
end
```
