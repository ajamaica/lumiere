# Setting Up Microsoft API Access

To use the `todo` CLI, you need to register an application in Microsoft Azure.

## Step 1: Register an Application

1. Sign in to the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Microsoft Entra ID** (formerly Azure Active Directory)
3. Click **Add** → **App registration**

## Step 2: Configure the Application

Fill in the registration form:

| Field                       | Value                                                                    |
| --------------------------- | ------------------------------------------------------------------------ |
| **Name**                    | `todo-cli` (or any name you prefer)                                      |
| **Supported account types** | Accounts in any organizational directory and personal Microsoft accounts |
| **Redirect URI**            | Platform: `Web`, URI: `https://localhost/login/authorized`               |

Click **Register**.

## Step 3: Note Your Client ID

After registration, you'll see the **Application (client) ID** on the overview page. Copy this value.

## Step 4: Create a Client Secret

1. In the left menu, click **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "todo-cli") and choose an expiration
4. Click **Add**
5. **Important:** Copy the secret **Value** immediately (not the Secret ID). It won't be visible again.

## Step 5: Configure todo

Create the config file:

```bash
mkdir -p ~/.config/microsoft-todo-cli
```

Add your credentials to `~/.config/microsoft-todo-cli/keys.yml`:

```yaml
client_id: "your-application-client-id"
client_secret: "your-client-secret-value"
```

## Step 6: First Run

Run any command to trigger OAuth login:

```bash
todo lists
```

A browser window will open for Microsoft authentication. After logging in, you're ready to use the CLI.

## Troubleshooting

**"AADSTS50011: The redirect URI specified in the request does not match"**

- Ensure the redirect URI is exactly `https://localhost/login/authorized`
- Check that platform is set to `Web`

**Token expired**

- Delete `~/.config/microsoft-todo-cli/token.json` and run any command to re-authenticate
