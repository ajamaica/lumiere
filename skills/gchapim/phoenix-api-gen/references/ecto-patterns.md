# Ecto Patterns Reference

## Schema Template

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "users" do
    field :email, :string
    field :name, :string
    field :role, Ecto.Enum, values: [:admin, :member, :viewer], default: :member
    field :metadata, :map, default: %{}
    field :tenant_id, :binary_id

    has_many :posts, MyApp.Content.Post
    belongs_to :team, MyApp.Teams.Team

    timestamps()
  end

  @required_fields ~w(email name tenant_id)a
  @optional_fields ~w(role metadata)a

  def create_changeset(user, attrs) do
    user
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+\.[^\s]+$/)
    |> unique_constraint(:email)
    |> unique_constraint([:tenant_id, :email])
  end

  def update_changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :role, :metadata])
    |> validate_required([:name])
  end
end
```

## Migration Template

```elixir
defmodule MyApp.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :name, :string, null: false
      add :role, :string, null: false, default: "member"
      add :metadata, :map, default: %{}
      add :tenant_id, :binary_id, null: false

      add :team_id, references(:teams, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:users, [:tenant_id, :email])
    create index(:users, [:tenant_id])
    create index(:users, [:team_id])
  end
end
```

## Changeset Patterns

### Conditional Validation

```elixir
def changeset(struct, attrs) do
  struct
  |> cast(attrs, [:type, :config])
  |> validate_required([:type])
  |> then(fn cs ->
    case get_field(cs, :type) do
      :webhook -> validate_required(cs, [:config])
      _ -> cs
    end
  end)
end
```

### Password Hashing

```elixir
def registration_changeset(user, attrs) do
  user
  |> cast(attrs, [:email, :password])
  |> validate_required([:email, :password])
  |> validate_length(:password, min: 12)
  |> hash_password()
end

defp hash_password(changeset) do
  case get_change(changeset, :password) do
    nil -> changeset
    password -> put_change(changeset, :password_hash, Bcrypt.hash_pwd_salt(password))
  end
end
```

### Embedded Schema for JSONB

```elixir
defmodule MyApp.Accounts.UserPreferences do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  embedded_schema do
    field :theme, :string, default: "light"
    field :notifications_enabled, :boolean, default: true
    field :locale, :string, default: "en"
  end

  def changeset(prefs, attrs) do
    prefs
    |> cast(attrs, [:theme, :notifications_enabled, :locale])
    |> validate_inclusion(:theme, ["light", "dark"])
  end
end

# In parent schema:
embeds_one :preferences, MyApp.Accounts.UserPreferences, on_replace: :update
```

## Query Patterns

### Composable Queries

```elixir
defmodule MyApp.Accounts.UserQuery do
  import Ecto.Query

  def base, do: from(u in MyApp.Accounts.User, as: :user)

  def by_tenant(query, tenant_id) do
    where(query, [user: u], u.tenant_id == ^tenant_id)
  end

  def by_role(query, role) do
    where(query, [user: u], u.role == ^role)
  end

  def with_team(query) do
    preload(query, [:team])
  end

  def ordered(query) do
    order_by(query, [user: u], desc: u.inserted_at)
  end
end
```

### Multi for Transactional Operations

```elixir
def create_team_with_owner(attrs, user) do
  Ecto.Multi.new()
  |> Ecto.Multi.insert(:team, Team.changeset(%Team{}, attrs))
  |> Ecto.Multi.insert(:membership, fn %{team: team} ->
    Membership.changeset(%Membership{}, %{
      team_id: team.id,
      user_id: user.id,
      role: :owner
    })
  end)
  |> Repo.transaction()
end
```

## Common Ecto Types

| Elixir/Ecto          | PostgreSQL    | Notes                         |
| -------------------- | ------------- | ----------------------------- |
| `:string`            | `varchar`     | General text                  |
| `:text`              | `text`        | Long text                     |
| `:integer`           | `integer`     | 32-bit                        |
| `:bigint`            | `bigint`      | 64-bit (use for external IDs) |
| `:float`             | `float`       | Avoid for money               |
| `:decimal`           | `numeric`     | Use for money                 |
| `:boolean`           | `boolean`     |                               |
| `:map`               | `jsonb`       | Schemaless JSON               |
| `:binary_id`         | `uuid`        | UUIDs                         |
| `{:array, :string}`  | `varchar[]`   | Arrays                        |
| `:utc_datetime_usec` | `timestamptz` | Always use for timestamps     |
| `Ecto.Enum`          | `varchar`     | App-level enum validation     |
