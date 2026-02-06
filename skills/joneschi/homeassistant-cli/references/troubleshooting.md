# Troubleshooting

## Connection Issues

### Cannot connect to Home Assistant

**Symptoms:**

```
Error: Could not connect to Home Assistant
```

**Solutions:**

1. **Check server URL:**

   ```bash
   echo $HASS_SERVER
   # Should output something like: https://homeassistant.local:8123
   ```

2. **Verify Home Assistant is running:**

   ```bash
   curl $HASS_SERVER/api/
   # Should return: {"message": "API running."}
   ```

3. **Check token:**

   ```bash
   echo $HASS_TOKEN
   # Should output your long-lived token
   ```

4. **Test with explicit parameters:**
   ```bash
   hass-cli --server https://homeassistant.local:8123 --token YOUR_TOKEN info
   ```

### SSL Certificate Errors

**Symptoms:**

```
SSL: CERTIFICATE_VERIFY_FAILED
```

**Solutions:**

1. **For self-signed certificates:**

   ```bash
   hass-cli --insecure info
   ```

2. **Provide certificate:**
   ```bash
   hass-cli --cert /path/to/cert.pem info
   ```

## Authentication Issues

### Token Expired

**Symptoms:**

```
401 Unauthorized
```

**Solution:**
Generate a new long-lived token in Home Assistant profile and update `HASS_TOKEN`.

### Invalid Token Format

**Symptoms:**

```
Invalid authentication
```

**Solution:**
Ensure token is copied correctly without extra spaces or line breaks.

## Entity Not Found

**Symptoms:**

```
Entity not found: light.xyz
```

**Solutions:**

1. **List all entities to find correct ID:**

   ```bash
   hass-cli state list | grep light
   ```

2. **Check spelling and domain:**
   - Entity IDs use underscores: `light.living_room` not `light.living-room`
   - Format is: `domain.object_id`

## Service Call Fails

**Symptoms:**

```
Service not found
```

**Solutions:**

1. **List available services:**

   ```bash
   hass-cli service list
   ```

2. **Check service format:**
   - Correct: `light.turn_on`
   - Wrong: `turn_on.light`

3. **Verify arguments format:**

   ```bash
   # Correct
   hass-cli service call light.turn_on --arguments entity_id=light.room

   # Also correct (for complex args)
   hass-cli service call light.turn_on --arguments '{"entity_id": "light.room", "brightness": 200}'
   ```

## Timeout Issues

**Symptoms:**

```
Timeout waiting for response
```

**Solutions:**

1. **Increase timeout:**

   ```bash
   hass-cli --timeout 30 state list
   ```

2. **Check network latency:**
   ```bash
   ping homeassistant.local
   ```

## Output Format Issues

### JSON Parsing Fails

Use proper JSON tools:

```bash
# Good
hass-cli -o json state get light.room | jq '.state'

# Bad (may fail)
hass-cli state get light.room | grep state
```

## Getting Help

1. **Check command help:**

   ```bash
   hass-cli --help
   hass-cli state --help
   hass-cli service --help
   ```

2. **Enable debug mode:**

   ```bash
   hass-cli --debug state list
   ```

3. **Check Home Assistant logs:**
   Look for API errors in Home Assistant's system logs.

## Common Gotchas

- **Case sensitivity**: Entity IDs are case-sensitive
- **Underscores vs hyphens**: Entity IDs use underscores, not hyphens
- **Domain prefix required**: Always use `domain.entity` format
- **String vs number**: Brightness is a number (0-255), not a string
