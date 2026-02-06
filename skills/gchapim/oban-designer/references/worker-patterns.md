# Worker Patterns Reference

## Email Delivery Worker

```elixir
defmodule MyApp.Workers.DeliverEmail do
  @moduledoc "Delivers transactional emails via the mailer."
  use Oban.Worker,
    queue: :mailers,
    max_attempts: 5,
    unique: [period: 300, keys: [:to, :template]]

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"to" => to, "template" => template} = args}) do
    subject = Map.get(args, "subject", default_subject(template))
    data = Map.get(args, "data", %{})

    email = MyApp.Emails.build(to, template, subject, data)

    case MyApp.Mailer.deliver(email) do
      {:ok, _meta} ->
        :ok

      {:error, %{status: status}} when status in 400..499 ->
        {:cancel, "permanent failure: #{status}"}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp default_subject("welcome"), do: "Welcome!"
  defp default_subject("reset_password"), do: "Reset your password"
  defp default_subject(template), do: "Notification: #{template}"
end
```

## Webhook Delivery Worker

```elixir
defmodule MyApp.Workers.DeliverWebhook do
  @moduledoc "Delivers webhook payloads to subscriber endpoints."
  use Oban.Worker,
    queue: :webhooks,
    max_attempts: 10

  require Logger

  @impl Oban.Worker
  def backoff(%Oban.Job{attempt: attempt}) do
    # 1s, 4s, 16s, 64s, 256s, 1024s, ...
    trunc(:math.pow(4, attempt))
  end

  @impl Oban.Worker
  def timeout(_job), do: :timer.seconds(30)

  @impl Oban.Worker
  def perform(%Oban.Job{args: args, attempt: attempt}) do
    %{"url" => url, "event" => event, "payload" => payload} = args
    headers = build_headers(args)

    case Req.post(url, json: payload, headers: headers, receive_timeout: 25_000) do
      {:ok, %{status: status}} when status in 200..299 ->
        :ok

      {:ok, %{status: 410}} ->
        Logger.info("Webhook endpoint gone: #{url}")
        {:cancel, "endpoint returned 410 Gone"}

      {:ok, %{status: status, body: body}} ->
        Logger.warning("Webhook failed: #{status} - #{inspect(body)}")
        {:error, "HTTP #{status}"}

      {:error, %Req.TransportError{reason: reason}} ->
        {:error, "transport: #{inspect(reason)}"}
    end
  end

  defp build_headers(%{"secret" => secret} = args) do
    payload = Jason.encode!(args["payload"])
    signature = :crypto.mac(:hmac, :sha256, secret, payload) |> Base.encode16(case: :lower)
    [{"x-webhook-signature", signature}, {"content-type", "application/json"}]
  end

  defp build_headers(_args) do
    [{"content-type", "application/json"}]
  end
end
```

## Cleanup/Pruning Worker

```elixir
defmodule MyApp.Workers.DailyCleanup do
  @moduledoc "Prunes stale records daily."
  use Oban.Worker,
    queue: :default,
    max_attempts: 3

  import Ecto.Query
  alias MyApp.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    cutoff = DateTime.utc_now() |> DateTime.add(-30, :day)

    # Delete expired tokens
    {token_count, _} =
      from(t in MyApp.Accounts.UserToken, where: t.inserted_at < ^cutoff)
      |> Repo.delete_all()

    # Delete old read notifications
    {notif_count, _} =
      from(n in MyApp.Notifications.Notification,
        where: n.read_at < ^cutoff
      )
      |> Repo.delete_all()

    Logger.info("Cleanup: deleted #{token_count} tokens, #{notif_count} notifications")
    :ok
  end
end
```

## Digest/Report Worker

```elixir
defmodule MyApp.Workers.WeeklyDigest do
  @moduledoc "Sends weekly digest email to users."
  use Oban.Worker,
    queue: :mailers,
    max_attempts: 3,
    unique: [period: :timer.hours(20), keys: [:user_id]]

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id}}) do
    user = MyApp.Accounts.get_user!(user_id)
    one_week_ago = DateTime.utc_now() |> DateTime.add(-7, :day)

    stats = %{
      new_items: MyApp.Items.count_since(user_id, one_week_ago),
      notifications: MyApp.Notifications.count_since(user_id, one_week_ago)
    }

    if stats.new_items > 0 or stats.notifications > 0 do
      MyApp.Mailer.deliver_digest(user, stats)
    else
      :ok  # Nothing to report
    end
  end
end
```

## Import/ETL Worker

```elixir
defmodule MyApp.Workers.ImportCSV do
  @moduledoc "Imports records from a CSV file."
  use Oban.Worker,
    queue: :default,
    max_attempts: 1  # Don't retry imports

  @impl Oban.Worker
  def timeout(_job), do: :timer.minutes(10)

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"file_path" => path, "tenant_id" => tenant_id}}) do
    path
    |> File.stream!()
    |> CSV.decode!(headers: true)
    |> Stream.chunk_every(500)
    |> Enum.each(fn batch ->
      entries = Enum.map(batch, &build_entry(&1, tenant_id))
      MyApp.Repo.insert_all(MyApp.Items.Item, entries,
        on_conflict: :replace_all,
        conflict_target: [:tenant_id, :external_id]
      )
    end)

    :ok
  end

  defp build_entry(row, tenant_id) do
    now = DateTime.utc_now()
    %{
      id: Ecto.UUID.generate(),
      external_id: row["id"],
      name: row["name"],
      tenant_id: tenant_id,
      inserted_at: now,
      updated_at: now
    }
  end
end
```

## Notification Dispatch Worker

```elixir
defmodule MyApp.Workers.DispatchNotification do
  @moduledoc "Routes notifications to the right channel (push, email, sms)."
  use Oban.Worker,
    queue: :default,
    max_attempts: 5,
    unique: [period: 60, keys: [:notification_id]]

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"notification_id" => id}}) do
    notification = MyApp.Notifications.get_notification!(id)
    preferences = MyApp.Accounts.get_notification_preferences(notification.user_id)

    results =
      preferences.channels
      |> Enum.map(&dispatch(notification, &1))
      |> Enum.filter(&match?({:error, _}, &1))

    case results do
      [] -> :ok
      errors -> {:error, "partial failure: #{inspect(errors)}"}
    end
  end

  defp dispatch(notification, :push), do: MyApp.Push.deliver(notification)
  defp dispatch(notification, :email), do: MyApp.Emails.deliver(notification)
  defp dispatch(notification, :sms), do: MyApp.SMS.deliver(notification)
end
```
