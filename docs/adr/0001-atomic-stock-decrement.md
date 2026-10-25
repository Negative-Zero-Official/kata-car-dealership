# ADR 0001: Decrement stock with one conditional UPDATE

- **Status:** Accepted
- **Date:** 2026-10-25
- **Area:** Inventory (purchase)

## Context

The plan requires that a purchase never pushes stock below zero, even when requests arrive at the same time.

The first version of `InventoryService.purchase` loaded the vehicle, checked `quantity > vehicle.quantity`, subtracted in Python and committed. The check and the write were separate steps, so concurrent buyers could all read the same stock, all pass the check, and each write back the same lowered value. `test_concurrent_purchases_never_oversell` (stock 5, 10 threads each buying 1 in its own session on a file-backed SQLite database) showed that all 10 purchases succeeded.

## Decision

`VehicleRepository.try_decrement(vehicle_id, amount)` takes stock off with a single statement:

```sql
UPDATE vehicles SET quantity = quantity - :n WHERE id = :id AND quantity >= :n
```

It commits and returns `rowcount == 1`. The database does the check and the subtraction together, so no two buyers can win the same unit.

`InventoryService.purchase` calls `try_decrement` first and only then loads the vehicle:

- vehicle missing → `VehicleNotFound` (404)
- decrement refused → `InsufficientStock` (409)
- otherwise → the vehicle with its updated stock

The read-then-write purchase path is removed. Nothing else changes `quantity` that way.

## Alternatives considered

- **Pessimistic locking (`SELECT … FOR UPDATE`).** SQLite ignores it, so it would not protect the default database. It would also hold a row lock across a round trip.
- **Optimistic locking (a version column with retry).** Correct, but it adds a column and a retry loop for something a single UPDATE already handles.
- **An application lock (`threading.Lock`).** Only works within one process, so it fails as soon as there is more than one worker.
- **A `CHECK (quantity >= 0)` constraint alone.** Prevents negative stock but turns a lost race into a database error instead of a clean 409. Still worth adding as a backstop later.

## Consequences

- Purchases are safe under concurrency on SQLite and on any database where `DATABASE_URL` might point later, such as Postgres, because a conditional UPDATE is atomic on both.
- "Not found" and "out of stock" are told apart by a second read after the UPDATE, not before it.
- Restock should follow the same pattern (`SET quantity = quantity + :n`) rather than read-then-write.
- `VehicleService.update` still uses load-modify-`save`, which is fine: it never assigns `quantity`, and SQLAlchemy only writes changed columns, so it cannot overwrite stock.
