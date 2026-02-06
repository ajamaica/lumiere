# Testing Oban Workers Reference

## Test Configuration

### Manual Mode (recommended)

Jobs are inserted into the database but not executed. Assert enqueued jobs and run them manually.

```elixir
# config/test.exs
config :my_app, Oban, testing: :manual
```

### Inline Mode

Jobs execute synchronously in the inserting process. Simpler but can mask concurrency issues.

```elixir
# config/test.exs
config :my_app, Oban, testing: :inline
```

## Using Oban.Testing

```elixir
defmodule MyApp.Workers.SendEmailTest do
  use MyApp.DataCase, async: true
  use Oban.Testing, repo: MyApp.Repo

  alias MyApp.Workers.SendEmail
```

## Assert Job Enqueued

After code that enqueues a job, assert it was enqueued correctly:

```elixir
test "signup enqueues welcome email" do
  {:ok, user} = Accounts.register(%{email: "new@example.com", name: "New"})

  assert_enqueued(
    worker: SendEmail,
    args: %{user_id: user.id, template: "welcome"},
    queue: :mailers
  )
end

# With scheduled_at
test "schedules reminder for later" do
  {:ok, _} = Reminders.schedule(user, :weekly)

  assert_enqueued(
    worker: MyApp.Workers.Reminder,
    args: %{user_id: user.id},
    scheduled_at: {DateTime.utc_now(), delta: 5}  # Within 5 seconds
  )
end
```

## Refute Job Enqueued

```elixir
test "does not enqueue for unsubscribed user" do
  user = insert(:user, email_subscribed: false)
  Accounts.create_item(user, %{name: "test"})

  refute_enqueued(worker: SendEmail, args: %{user_id: user.id})
end
```

## Assert All Enqueued

Check multiple jobs at once:

```elixir
test "enqueues jobs for all team members" do
  team = insert(:team)
  members = insert_list(3, :user, team_id: team.id)

  Notifications.notify_team(team.id, "update")

  for member <- members do
    assert_enqueued(
      worker: MyApp.Workers.DispatchNotification,
      args: %{user_id: member.id}
    )
  end
end
```

## Execute Jobs with perform_job

Test worker logic directly without actually enqueuing:

```elixir
test "sends email successfully" do
  user = insert(:user)

  assert :ok =
    perform_job(SendEmail, %{
      "user_id" => user.id,
      "template" => "welcome"
    })
end

test "cancels on invalid address" do
  assert {:cancel, _reason} =
    perform_job(SendEmail, %{
      "to" => "invalid",
      "template" => "welcome"
    })
end

test "retries on temporary failure" do
  # Setup mock to return temporary error
  expect(MyApp.MailerMock, :deliver, fn _ -> {:error, :temporary} end)

  assert {:error, _} =
    perform_job(SendEmail, %{
      "to" => "user@example.com",
      "template" => "welcome"
    })
end
```

## Testing with Job Options

Pass job options (attempt, priority, etc.) to `perform_job`:

```elixir
test "cancels after too many attempts" do
  result = perform_job(SendEmail,
    %{"to" => "flaky@example.com", "template" => "welcome"},
    attempt: 5
  )

  assert {:cancel, _} = result
end
```

## Testing Uniqueness

```elixir
test "deduplicates sync jobs" do
  args = %{account_id: "acc_123"}

  {:ok, job1} = MyApp.Workers.SyncAccount.new(args) |> Oban.insert()
  {:ok, job2} = MyApp.Workers.SyncAccount.new(args) |> Oban.insert()

  # Same job returned (not a new one)
  assert job1.id == job2.id
end
```

## Testing Cron Workers

Cron workers are just regular workers. Test the `perform/1` function directly:

```elixir
test "daily cleanup removes expired tokens" do
  expired = insert(:user_token, inserted_at: days_ago(60))
  fresh = insert(:user_token, inserted_at: days_ago(1))

  assert :ok = perform_job(MyApp.Workers.DailyCleanup, %{})

  refute Repo.get(UserToken, expired.id)
  assert Repo.get(UserToken, fresh.id)
end
```

## Drain Queue (Manual Mode)

Process all pending jobs in tests:

```elixir
test "processes all pending emails" do
  for i <- 1..5 do
    %{user_id: "user_#{i}"}
    |> SendEmail.new()
    |> Oban.insert()
  end

  assert %{success: 5, failure: 0} = Oban.drain_queue(queue: :mailers)
end
```

## Testing with Ecto.Multi

```elixir
test "enqueues job within transaction" do
  assert {:ok, %{user: user, welcome_email: job}} =
    Ecto.Multi.new()
    |> Ecto.Multi.insert(:user, User.changeset(%User{}, valid_attrs()))
    |> Oban.insert(:welcome_email, fn %{user: user} ->
      SendEmail.new(%{user_id: user.id, template: "welcome"})
    end)
    |> Repo.transaction()

  assert job.worker == "MyApp.Workers.SendEmail"
  assert_enqueued(worker: SendEmail, args: %{user_id: user.id})
end
```

## Helper Functions

```elixir
# test/support/helpers.ex
defmodule MyApp.TestHelpers do
  def days_ago(n) do
    DateTime.utc_now() |> DateTime.add(-n, :day)
  end

  def hours_ago(n) do
    DateTime.utc_now() |> DateTime.add(-n, :hour)
  end
end
```
