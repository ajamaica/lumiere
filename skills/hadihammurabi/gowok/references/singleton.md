---
name: singleton
description: object container, global long-lived object management
---

# Singleton

An object container that holds single data type value.
It use get or create mechanism.
For that you need to pass creation function to the singleton constructor.

You can read the singleton value anytime.
If the value exists, it will be returned.
But, if not, creation function will be called.

## New

Create new singleton is easy.
You should import the package.
Then you can start doing that.

When you create new singleton, the creation function not called yet.
It will be called when you doing get for first time.
In other words, you can call it lazy-loaded.

```go
import "github.com/gowok/gowok/singleton"

var YourVar = singleton.New(func() YourType {
    return YourData
})
```

Example:

```go
var client = singleton.New(func() http.Client {
	return http.Client{}
})
```

## Getter/Setter

Retrieving value that holded by singleton is easy.
Just call the variable.

> Btw, you aren't call the variable, but you call function inside the variable.

```go
YourVar(...YourType)
```

This way will give you the value.

Also, you can pass new value as parameter.
If you do this, singleton will replace old value with the new one.

> Keep in mind, this is getter and setter in single gate.

Example:

```go
res, err := client().Get("api.example.com")
if err != nil {
    panic(err)
}
...
```
