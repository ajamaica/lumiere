---
name: configuration
description: configuration structure, reading config values starting new project
---

# Configuration

Gowok configured by `config.yaml` file.
This file is auto-loaded while the project runs.
It designed to be as intuitive as possible.

In this page, you will see the configuration structure and
how to read all values.

## Structure

- `web`
  - `enabled` (bool, default: false) - It will make HTTP server start or not.
  - `host` (string) - Address that will be used for HTTP server listener. Example: `localhost:8080`, `:8080`.
  - `log`
    - `enabled` (bool, default: false) - It will make HTTP log show or not.
  - `cors`
    - `enabled` (bool, default: false) - It will make CORS middleware enabled or not.
    - `allow_origins` (string) - List of allowed origins. Format: address1,address2,address3. Example: `example.com,sub.example.com`.
    - `allow_methods` (string) - List of allowed methods. Format: method1,method2,method3. Example: `GET,POST,PUT,DELETE`.
    - `allow_headers` (string) - List of allowed headers. Format: headerKey1,headerKey2. Example: `Authorization,X-API-Key`.
  - `pprof`
    - `enabled` (bool, default: false) - It will make PProf interface accessible or not.
    - `prefix` (string) - Path that Pprof interface can accessed. Example: `/system/`.
- `grpc`
  - `enabled` (bool, default: false) - It will make GRPC start or not.
  - `host` (string) - Address that will be used for GRPC server listener. Example: `localhost:50051`,`:50051`.

- `net`
  - `enabled` (bool, default: false) - It will make GRPC start or not.
  - `type` (string) - Type of net listener, you can choose one of `tcp` or `unix`.
  - `address` (string) - Address that will be used for net listener. Example: `localhost:5431`,`:5431`,`/tmp/my.sock`.
- `security`
  - `secret` (string) - Random secret used for encrypt or hash actions, like JWT creation, password hash salt, etc.
- `sql`
  - $name (string) - Any text will used for connection name.
    - `enabled` (bool, default: false) - It will make this SQL connection active or not.
    - `driver` (string) - Define driver that used to interact to SQL server.
    - `dsn` (string) - Connection string that used to connect to SQL server. This format depends on driver used.
- `others`
  - $key (string) : $value (string)

## Reading

To read configuration values, you can use this:

```go
fmt.Println(
    gowok.Config,
)
```

This shows object of configuration that serialized into `gowok.Config` struct.

If you want something raw, use this:

```go
fmt.Println(
    gowok.Config.Map(),
)
```

This shows configuration as `map[string]any`,
flexible way that allow you to make custom configuration.
