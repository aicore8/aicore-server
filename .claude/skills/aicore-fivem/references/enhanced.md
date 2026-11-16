# FiveM for GTAV Enhanced: sources, new features, gating

What FiveM for GTAV Enhanced (early access, server `cfx-server`) adds or changes that matters to us. Legacy basics and the docs digest are in `docs.md`. Tags: **[notes]** patch notes, untested by us; **[docs]** the native docs; **[binary]** read from the server build; **[tested]** run by us.

## Sources and how to keep this file current

- Bug reports, feature requests and patch notes: https://github.com/citizenfx/rfc (GitHub Discussions). Patch notes: https://github.com/citizenfx/rfc/discussions/categories/patch-notes. Bugs: https://github.com/citizenfx/rfc/discussions/categories/-bug-fivem-for-gtav-enhanced.
- **Read up to: #627, 2026-11-11 (server build 177).** List newer patch notes, then read only those:

  ```bash
  gh api graphql -f query='query{repository(owner:"citizenfx",name:"rfc"){discussions(first:20,categoryId:"DIC_kwDORoogiM4DCFz2",orderBy:{field:CREATED_AT,direction:DESC}){nodes{number title createdAt url}}}}'
  ```

  Read one with `discussion(number:N){body comments(first:30){nodes{body}}}`; the comments carry Cfx staff answers and the bug links. Search bugs about a native: `search(type:DISCUSSION,query:"repo:citizenfx/rfc <native>",first:15)`.
- Current server build: `curl https://depot.cfx.re/public/p/fxserver_gen9/u/main` (JSON with `build` and the download links).
- Native signatures: `tools/native.py` reads the docs site's own data (`static.cfx.re/natives/natives_cfx.json`) and prints `!! Enhanced only` for natives whose docs say "This native only works in FiveM for GTAV Enhanced". A native the patch notes name but `native.py` does not know has no published signature: it is not used.
- After reading new notes: update the facts below (current truth, no changelog), move the "Read up to" marker, and fix any line elsewhere in the skill or the rules that the notes make wrong.

## Calling Enhanced-only natives and gating them

- Enhanced-only natives are in neither `@citizenfx/server` nor the typings. Call them by hash; a CFX native's hash is the joaat of its upper-case name (`CREATE_VOICE_CHANNEL` = `0x7A70A736`, `SET_VEHICLE_ENGINE_HEALTH` = `0x1B760FB5`) **[docs]**; take the hash from `native.py`, never compute it by hand in a script. Float arguments get FiveM's `+ 0.0000001`, or an integral value arrives as an int (ai-voice `server/routing/natives.ts`).
- Scripts never call these hashes themselves: lib server `enhanced` holds them behind its probes (null / false on Legacy). Where ai-* uses it: ai-vehicles / ai-garages store and restore windows, tyres, wheels, lights, bumpers and tank (`damage` column; deformation is left out, rfc #649), ai-mechanic writes repairs from the server as well as through the owner client, ai-prison catches escapes at the area's colshape exit (the 10 s check stays).
- BOOL results come back as `1` / `0` in JS (`engine.md`): read every Enhanced BOOL as truthy, never `=== true` or `typeof === "boolean"` (a type probe stays false on Enhanced too). Probe a by-hash native by "the call did not throw", on an entity a client owns.
- Gate by feature, never by a version string: probe once at start and cache the answer. ai-voice's probe creates two voice channels inside `try`; a Legacy server throws on the unknown hash.
- Without the feature the existing path stays, unchanged: Legacy servers keep working on the same code.
- Lua on Enhanced resolves a missing global by name on first use (`Citizen.LoadNative` in the `_G` metatable) **[binary]**, so a Lua bridge checks `if SetVehicleFixed then` before calling.

## Server vehicle natives (b177)

**[notes + docs]** 109 new server natives: vehicle damage (27), health (25), state (49), mod kits (7), voice (1).

- Published signatures: the 27 damage natives, the 25 health natives and `SetPlayerVoiceProximityRange` (`native.py` knows them). The 49 state natives (`SetVehicleEngineOn`, `SetVehicleLights`, `SetVehicleSiren`, `SetVehicleUndriveable`, `SetVehicleHandbrake`...) and the 7 mod kit natives have no published signature yet: do not use them.
- Some names already existed as Legacy server natives and are not Enhanced-only: `SetVehicleDoorsLocked`, `SetVehicleAlarm` (they cannot serve as an Enhanced probe).
- `server_setters` convar, on by default: health setters (`SetVehicleEngineHealth`, `SetVehiclePetrolTankHealth`, `SetVehicleTyreBurst` / `SetVehicleTyreFixed`...) write the synced vehicle data directly; with it off they go as an RPC to the owner client **[docs]**.
- `SetVehicleFixed` and `SetVehicleDeformationFixed` are RPCs to the owner: the server state updates once the owner client reports the repaired vehicle **[docs]**. Server vehicle health reads 0 while no client owns the entity (`engine.md`).
- Damage levels can only be raised; repair with `SetVehicleFixed` / `SetVehicleDeformationFixed`. `SetVehicleWrecked` always writes sync data and cannot be undone.
- Open bug: `SetVehicleDeformationLevel` has no effect on b177 and `CopyVehicleDamages` copies no deformation (https://github.com/citizenfx/rfc/discussions/649); reading the levels works.
- `server_authority` convar, off by default: clients can no longer change a vehicle's look after it is created, and server natives write sync data instead of RPCs. Keep it off: our props path applies the look on the owner client (lib `setVehicleProps`).
- The mod kit natives (`SetVehicleKitMod`...) take the synced mod indexes, not the indexes of the client's `SetVehicleMod`: `VehicleProps.mods` cannot be passed to them as they are.

## Server colshapes

**[docs]** Enhanced only per the docs, but the Legacy artifact 38055 (2026-10-30) ships the colshape wrappers and `ColshapeManager` too: colshapes are no Enhanced probe; lib `enhanced.hasColshapes` only checks that a test shape exists. `CreateColshapeSphere` / `Circle` / `Cuboid` / `Cylinder` / `Polygon` / `Rectangle` (shared natives) return an id. The server events `onColshapeEnter` / `onColshapeExit` arrive with the entity handle and the colshape id. `SetColshapeEntityType` picks which entity types count, `SetColshapeDimension` the routing bucket. `IsPointInsideColshape` tests a point. `CreateColshapePolygon` takes a plain array of points from JS and Lua.

## Voice

**[notes + docs]**

- Voice is on by default, with push-to-talk.
- The proximity range sets how far a player is heard, as on Legacy.
- `SetPlayerVoiceProximityRange(playerSrc, range)` (server) shortens how far one player is heard in every spatial channel: the smaller of this range and the channel's `maxDistance`; 0 uses the channel's distance. It does not change how far the player hears others.
- Voice relevancy follows OneSync relevancy.
- ai-voice's Enhanced router (`server/routing/enhanced.ts`, one spatial channel per range) was written before b177.

## Events

- `onPedDeath` and `onPedHealthChanged` (server): deaths and health / armour changes of peds, with the attacker and the weapon **[notes]**.
- `SetPlayerName(source, name)` (server) works during `playerConnecting` and later; `onPlayerNameChanged` reports old and new name and the resource that changed it **[notes]**.
- Client start events match Legacy: `onClientResourceStart` fires for every resource, its own too. `onResourceStarting` / `onResourceStart` fire on the client only on a restart, not at startup **[notes]**. Client code listens to `onClientResourceStart`.
- Threads created while a resource loads get their first tick after its `onClientResourceStart` **[notes]**.

## Limits and convars

**[notes]**

- State bag values: at most 32 KB per key; the server warns above 1 KB per value or 256 characters per key name (`statebags.md`).
- Script events from a client: about 75 per second by default (rate limiter convars).
- Further limiters, configured like the existing ones: `netGameEvent`, `netGameEventFlood`, `clientSync`.
- `TriggerClientEventInternal` names a too-large payload in its error.
- `sv_disconnectOnUnhandledNetEvent` (off by default) disconnects a client that sends a reliable net event no handler is registered for.
- Streaming caps around each player, about 256 vehicles, 256 peds and 512 objects. Tunable with `onesync_maxNearbyVehicles`, `onesync_maxNearbyPeds`, `onesync_maxNearbyObjects`, `onesync_maxNearbyPlayers` and `onesync_maxNearbyOther`.
- Sync packets are processed in parallel; turn it off with `set onesync_multithreadedPacketProcessing false`.
- `sv_entityLockdown` takes `no_dummy` (also through `SetRoutingBucketEntityLockdownMode`).
- `NetworkGetEntityOwner` answers -1 for a server-owned entity.
- `GetPlayerFromServerId` answers -1 for a player that does not exist.

## Assets

**[notes]**

- `stream_enhanced/` holds the Enhanced assets. `stream/` still loads, with a deprecation warning; when both exist only `stream_enhanced/` loads, wildcard matches included.
- Pools grow on their own for `StaticBounds`, `MapTypesStore`, `MapDataStore`, `TxdStore`, `InteriorProxy`, `FragmentStore`, `DrawableStore` and `MaxExtraVehicleModelInfos`. `dwdStore` sizes itself from the streamed `.ydd` count. Pool size requests are checked against the total of all resources.
- Custom clothing has about 256 slots. Testing it needs a server license key with a subscription, and one more `MapDataStore` per `.ymt` (Cfx staff in #627).
- KVP databases are no longer tied to the server URL.
