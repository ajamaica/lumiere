# Acorn Syntax Reference

## Table of Contents

- [Imports](#imports)
- [Inductive Types](#inductive-types)
- [Structures](#structures)
- [Typeclasses](#typeclasses)
- [Functions and Attributes](#functions-and-attributes)
- [Theorems and Proofs](#theorems-and-proofs)
- [Axioms](#axioms)
- [Built-in Logic](#built-in-logic)
- [Common Errors](#common-errors)
- [Lean 4 Comparison](#lean-4-comparison)

## Imports

```acorn
from nat import Nat
from list import List, append, reverse
```

## Inductive Types

Constructor names MUST be lowercase.

```acorn
inductive Nat {
    0
    suc(Nat)
}

inductive Tree[T] {
    empty
    node(Tree[T], T, Tree[T])
}

inductive MyBool { tru fls }
```

## Structures

```acorn
structure Pair[T, U] {
    first: T
    second: U
}

// Construction
let p = Pair.new(a, b)
```

## Typeclasses

Axioms inside typeclasses are named blocks - no `axiom` keyword.

```acorn
typeclass A: Add {
    add: (A, A) -> A
}

typeclass A: Zero {
    0: A
}

typeclass A: AddGroup extends Zero, Neg, Add {
    inverse_right(a: A) {
        a + -a = A.0
    }
}

// Instances
instance Nat: Zero {
    0 = Nat.0
}
```

## Functions and Attributes

```acorn
attributes Nat {
    define add(self, other: Nat) -> Nat {
        match other {
            Nat.0 { self }
            Nat.suc(pred) { self.add(pred).suc }
        }
    }
}

numerals Nat

// Existential definition
let identity(x: Bool) -> r: Bool satisfy {
    r = x
}
```

## Theorems and Proofs

```acorn
// Auto-proved
theorem add_comm(a: Nat, b: Nat) {
    a + b = b + a
}

// With proof hints
theorem double_is_add_self(n: Nat) by add_zero, add_suc {
    n + n = n.add(n)
}

// With implies
theorem example(a: Nat, b: Nat) {
    a < b implies a != b
}

// With explicit proof block
theorem schnorr_completeness[Gr: SchnorrGroup](s: Statement[Gr], w: Witness, r: Nat, c: Nat) {
    s.h = Gr.smul(w.x, Gr.g)
    implies
    Gr.smul(r + c * w.x, Gr.g) = Gr.smul(r, Gr.g) + Gr.smul(c, s.h)
} by {
    Gr.smul_distrib_scalar(r, c * w.x, Gr.g)
    s.h = Gr.smul(w.x, Gr.g)
    Gr.smul_assoc(c, w.x, Gr.g)
}
```

## Axioms

```acorn
axiom extensionality[T, U](f: T -> U, g: T -> U) {
    forall(x: T) { f(x) = g(x) } -> f = g
}

type Real: axiom
```

## Built-in Logic

Reserved keywords - do NOT redefine:

- `not` (unary)
- `and`, `or`, `implies`, `iff` (binary)
- `true`, `false`

```acorn
theorem double_negation(a: Bool) {
    not(not(a)) = a
}

theorem de_morgan(a: Bool, b: Bool) {
    not(a and b) = (not a) or (not b)
}
```

## Common Errors

| Error                                   | Cause                                | Fix                                         |
| --------------------------------------- | ------------------------------------ | ------------------------------------------- |
| `invalid variable name`                 | Uppercase constructor                | Use lowercase: `tru` not `T`                |
| `unexpected token: axiom`               | Using `axiom` keyword in typeclass   | Use named blocks: `name(args) { identity }` |
| `expected expression terminated by '}'` | `let` inside `implies` block         | Inline values directly                      |
| `expected a variable name` at `(`       | Generic structure as direct argument | Rename type variable (e.g., `Gr` not `G`)   |
| `this type cannot have attributes`      | Matching on `Bool.true`/`Bool.false` | Use custom type or built-in operators       |

## Lean 4 Comparison

| Aspect | Acorn                           | Lean 4                           |
| ------ | ------------------------------- | -------------------------------- |
| Engine | Rust + ONNX models              | Self-hosted (C++/Lean)           |
| Style  | Declarative, automated          | Tactical, interactive            |
| Logic  | First-order, propositional      | Dependent type theory            |
| Proofs | Specify axioms, solver connects | Guide via tactics (`rw`, `simp`) |
