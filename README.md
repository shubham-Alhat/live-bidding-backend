# BidHub — Live Bidding Platform

[BidHub](https://bidhub.in) is a real-time auction platform where users can join live auctions and place bids.

> [!Note]  
> This is the backend repository. For a demo video and frontend architecture, see the [Frontend Repository →](https://github.com/shubham-Alhat/live-bidding-frontend)

## Tech Stack

- **Next.js** · **Browser WebSocket API** — Frontend

- **Node.js** · **TypeScript** · **ws** — Backend & WebSocket server

- **Redis** · **Lua scripting** — For in-memory data store and atomic operations for bid processing

- **BullMQ** — Job queues & background workers

- **PostgreSQL** · **Prisma** — Primary database & ORM

---

## Core Engineering Challenges

### 1. Authentication — Two-Token System with Silent Refresh

Implemented a Two-token auth system (short-lived access token + long-lived refresh token) stored in `httpOnly` cookies. When the access token expires, the client silently fetches a new one in the background — no logout, no interruption.

Google OAuth via Passport.js is fully integrated into this same flow.

### 2. Race Condition Prevention on Bid Processing — Redis + Lua Script

When multiple users place bids simultaneously, a simple `nodejs` implementation would cause race conditions, meaning two users could place same bid amount resulting in two winners in same auction.

To solve this, I used redis luascript to process bids as atomic operation

**working** -

When very first bid is processed, redis is locked which denies processing of incoming new bid until current one is completely processed & highest bid amount is updated. After current bid process completed, redis is unlocked & allows to enter new pending bid and if current bid is of same of amount as previous processed one, it throws an error - `bid too low`

![Image](https://res.cloudinary.com/diery17cm/image/upload/v1779867084/race-condition_o5isjh.png)

In above image, user is notified with a message when he and other user placed bid with same amount (i.e $26)

Also, I perform a test which simulates multiple users bidding simultaneously and redis lua script preventing race conditions. you can see whole repo and its test O/P [here](https://github.com/shubham-Alhat/Redis-Data-Structure-and-Lua-Script#redis-lua-script---atomic-bidding-proccess).

Below is O/P of test which shows that first bid is accepted while second bid (same amount) is rejected.

```bash
...
── Test 15: Race condition — two simultaneous equal bids ─
   ✅  exactly one bid wins
   ✅  ZSET has exactly 1 entry
...
```

### 3. Auction Timers & Async Bid Persistence — BullMQ

Two separate concerns are handled via BullMQ:

- **Auction timers** use delayed jobs — when an auction is created, a job is scheduled to fire exactly at the end time of auction. This job update the auction status to `ended` in redis store and triggers next job of storing bids to master DB

- **Bid persistence** is handled asynchronously by a background worker. Bids are accepted in real-time and stored in Redis. Once an auction ends, the worker kicks in — it takes all bids for that auction, persists them to the primary PostgreSQL database, and after successful insertion, cleans up the stale data from Redis

> [!Note]  
> **Why not store bids in real time - while bids are placing in auction ??**  
> Writing to the DB on every bid adds unnecessary latency while bidding. Instead, bids are stored in Redis, and once the auction ends, a single background job store all bids to PostgreSQL in bulk — using `createMany` method of prisma.

---

## Auction Lifecycle

![BidHub auction architecture](./auction-lifecycle.svg)

## Bidding flow

![BidHub bidding flow](./bid-flow.svg)

## Latency between redis ⇄ server and client ⇄ server in prod

> [!Note]  
> **The backend server, Redis server and Postgresql db are deployed in _singapore_ region and client (me) is in _india Pune_**

Now latency between server and redis is almost **2ms**, as both are in same region and redis also executes the lua script. below is logs from render server of bid processing.

```bash
2026-05-26T07:14:51.664099765Z place new bid: 1779779691663

2026-05-26T07:14:51.665779567Z bid placed result from redis: 1779779691665
```

Now latency between server and client: here server is in **singapore** and client is in **India Pune** which approximately gave upto **150ms to 200ms**. - _(this latency is actually between placing bid from client side and getting back the result from server validation and redis validation via websocket)_

Below is logs of client placing bid to getting result (bid accepted or rejected) from server.

```bash
d783b8c4e59e8441.js:5 raw data send -  1779779687766
7bdcb600d09b496b.js:1 ------  ws data ----------
7bdcb600d09b496b.js:1 {type: 'new_bid_placed', payload: {…}}
7bdcb600d09b496b.js:1 new bid placed -  1779779687925
```

_If we calculate the latency, it will be **159ms**._

We can bring down this latency upto **30ms-50ms** by placing our backend servers and redis server to India Mumbai (AWS) as single miliseconds matters in live bidding systems.

> _Inspired by watching WhatNot — a live shopping and auction platform — I build this project [Bidhub](https://bidhub.in) and implement core features which needed for actual live bidding systems_
