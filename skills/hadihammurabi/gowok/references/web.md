---
name: web
description: HTTP server, router
---

# Web

Interface to do web server activities, most of all are routing.
This page will cover how to routing with all possible use cases.

## Preparations

1. You need to create a function that follow `gowok.ConfigureFunc`.

```go
func ConfigureRoute() {
    // TODO: routes goes here
}
```

2. Register this func into `project.Configures`.

```go
func main() {
    gowok.
        Configures(ConfigureRoute).
        Run()
}
```

## Basic

All route can registered by this way.

```go
gowok.Web.HandleFunc(method, path, http.HandlerFunc)
```

Example:

```go
gowok.Web.HandleFunc("GET", "/", func(w http.ResponseWriter, r *http.Request) {
    // TODO: your logics goes here
})
```

## Helpers

For most HTTP request methods (GET, POST, PUT, and so on),
supported by router helpers.
By doing this way, your code will shorter and straight forward.
Most important, this will look like something familiar.

### Get

```go
gowok.Web.Get(path, http.HandlerFunc)
```

### Post

```go
gowok.Web.Post(path, http.HandlerFunc)
```

### Put

```go
gowok.Web.Put(path, http.HandlerFunc)
```

### Patch

```go
gowok.Web.Patch(path, http.HandlerFunc)
```

### Delete

```go
gowok.Web.Delete(path, http.HandlerFunc)
```

## Group

If you have any group of route, this feature will useful.
A route group is collection of routes with same prefix.
So, you no need to write same thing any more.

To create a group you can do this.

```go
groupName := gowok.Web.Group(prefix)
```

Example:

```go
products := gowok.Web.Group("/products")
products.Get("", func(w http.ResponseWriter, r *http.Request) {})
products.Post("", func(w http.ResponseWriter, r *http.Request) {})
products.Put("", func(w http.ResponseWriter, r *http.Request) {})
products.Patch("", func(w http.ResponseWriter, r *http.Request) {})
products.Delete("", func(w http.ResponseWriter, r *http.Request) {})
```

Now, you have routes of products CRUD.

Easy, right?

Your career brighter right now 😎

## Conclusion

```go
package main

import "github.com/gowok/gowok"

func main() {
    gowok.
        Configures(ConfigureRoute).
        Run()
}

func ConfigureRoute() {
    gowok.Web.HandleFunc("GET", "/", func(w http.ResponseWriter, r *http.Request) {})

    products := gowok.Web.Group("/products")
    products.Get("", func(w http.ResponseWriter, r *http.Request) {})
    products.Post("", func(w http.ResponseWriter, r *http.Request) {})
    products.Put("", func(w http.ResponseWriter, r *http.Request) {})
    products.Patch("", func(w http.ResponseWriter, r *http.Request) {})
    products.Delete("", func(w http.ResponseWriter, r *http.Request) {})
}
```
