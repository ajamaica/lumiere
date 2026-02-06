---
name: some
description: wrapping nilable value for safety access
---

# Some (Nil Safety)

Have you ever seen this panic?
Something happens when you access data from nil pointer.

```
panic: runtime error: invalid memory address or nil pointer dereference
```

Package `some` will help you to prevent this problem by wrapping
nilable value and way to access it.

## Some

A struct that contains the value and state of existence.
If there is value, state will be true.

### Get

Value getter that returns the value and existence state.
If you call this, you need to store two variables.

```go
func Get() (YourType, bool)
```

Example:

```go
product, ok := some.Some[Product]{}.Get()
if !ok {
    fmt.Println("product is not found")
    return
}
...
```

### IsPresent

Check existence of value, returns `true` if value exists.

```go
func IsPresent() bool
```

Example:

```go
ok := some.Some[Product]{}.IsPresent()
if !ok {
    fmt.Println("product is not found")
    return
}
...
```

### OrElse

Get value with default value if not exists.

```go
func OrElse(defaultValue) YourType
```

Example:

```go
defaultValue := Product{Name: "terang bulan"}
product := some.Some[Product]{}.OrElse(defaultValue)
...
```

### OrElseFunc

Get value but if not exists, it will run function to get default value.

```go
func OrElseFunc(func() YourType) YourType
```

Example:

```go
product := some.Some[Product]{}.OrElseFunc(func() Product {
    return Product{Name: "terang bulan"}
})
...
```

### OrPanic

Get value but if not exists, it will panic.
You can put an error as parameter, it will be used as message.

```go
func OrPanic(...error) YourType
```

Example:

```go
product := some.Some[Product]{}.OrPanic()
...
```

### IfPresent

Receive a callback function that will be called when the value is present.

```go
func IfPresent(func(value YourType))
```

Example:

```go
some.Some[Product]{}.IfPresent(func(product Product) {
    ...
})
```

## Helpers

Functions that help you to use `some` easily.

### Empty

Create empty data with defined type.

```go
some.Empty[YourType]()
```

Example:

```go
product := some.Empty[Product]()
```

### Of

Wrap data as nil safely.
No need to define the data type here, because it will be automatically
recognized by data given.

```go
some.Of(yourData)
```

Example:

```go
product := some.Of(Product{})
```
