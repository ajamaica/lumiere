---
name: sql
description: connect to multiple SQL servers with different connection types
---

# SQL

Database management system that officially supported by Go's standard library.
To use this in Gowok, you need to do configuration (read [ this page ](/guide/configuration.html#structure)).

In Gowok, you can connect to multiple SQL servers with different connection types.
Every connection will identified by name.
Connection name can be anything, as long as it easy to remember.

Example scenario with multiple SQL connections:

- name: master, driver: mariadb
- name: transaction, driver: postgres

## Driver Setup

After configure SQL inside configuration file, you need to install the driver.
It's easy, just import it.

```go
// choose one or some as you want
import _ "github.com/go-sql-driver/mysql"
import _ "github.com/lib/pq"
import _ "github.com/mattn/go-sqlite3"
```

Then run this command:

```bash
go mod tidy
```

Now, you ready to use SQL in your project.

## Get Connection

SQL operations done by the connection.
To get it, you can do this way:

```go
import "github.com/gowok/gowok"

gowok.SQL.Conn()


// or with name
gowok.SQL.Conn("master")
gowok.SQL.Conn("transactions")
```

- If you get connection without define the name or
  you get unknown connection, Gowok will give you connection named `default`.
- If it doesn't exist, Gowok will give you `some.Some[sql.DB]{}` (empty nil safety).

Since getting SQL connection gives you `some.Some`, you need to unwrap value by [ nil safety way ](/guide/some.html#some).

Example:

```go
var result int
err := gowok.SQL.Conn("master").OrPanic().QueryRow("SELECT 1").Scan(&result)
if err != nil {
    fmt.Println(err)
    return
}
fmt.Println(result)
```

You agree if it is easy, right? 😎
