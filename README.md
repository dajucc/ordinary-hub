# Ordinary Hub

A scripting hub for **Ordinary** — quest automation, combat farming and character utilities, wrapped in a
[Rayfield Gen2](https://docs.sirius.menu/rayfield-gen2) interface.

Built to keep running: it survives death and respawn without reloading, and it keeps farming while the
Roblox window is unfocused.

## Access

The hub asks for a key the first time it runs, then remembers it on that machine.
Get the permanent key by completing the steps here: **[get your key](https://link-target.net/7669859/MXhdyhRUmXTD)**.
Paste it into the key window and press Verify. One-time step, the key never changes.

## Features

**Farm**
- Quest-set picker that takes the selected contract for you: abandons the current one, walks to that tier's
  quest giver, accepts, and confirms the switch against the game's own quest state.
- NPC picker, radius, stand-off distance, clicks per second.
- Auto power-up, auto turn-in, auto re-accept.
- Auto skills: fires abilities between landed punches and waits out the game's real cooldowns.

**Stealth**
- Realistic farm: the humanoid walks to targets with `PathfindingService` instead of teleporting.
- Sticky targeting: finishes the NPC it is fighting before picking another one.
- Live status readout (Utility -> Status): shows what the bot is doing right now - searching,
  walking to waypoint 2 of 5, attacking, un-sticking, handing in a quest - plus the recent state
  history, so it never looks like it is guessing.
- Movement steers to one waypoint at a time and only re-issues move orders when the destination
  actually changes, so the character walks a straight line instead of jittering.
- Abilities aim at that target and are only cast when it is in reach, so skills do not clip a crowd.
- Optional auto block that reacts to NPC telegraphs (see the fighting notes below).
- Attack range, sidestep-when-stuck, hide name, hop to the quietest server.
- Pauses clicks only while the pointer is over the hub window.

**Character**
- Walk speed, jump power, infinite jump, noclip, flight, respawn, teleport to the quest NPC.

**Visual**
- NPC and player ESP, adjustable radius, fullbright.

**Utility**
- Live quest tier and progress, skills used, next skill cooldown, session stats, rejoin, server hop, panic,
  unload.

## Installation

Add the loader to your executor's `autoexec` folder:

```lua
loadstring(game:HttpGet("https://raw.githubusercontent.com/dajucc/ordinary-hub/main/loadstring.lua?v=" .. os.time()))()
```

The loader always fetches the newest release of `ordinary-hub.lua`, cache-busted. Re-run it to update
without restarting Roblox.

## Keybinds

| Key | Action |
| --- | --- |
| `Right Shift` | Hide / show the window |
| `Right Ctrl` | Toggle autofarm |
| `G` | Toggle flight |
| `End` | Panic — stop farming and disable the movement features |

## How quests are handled

The game keeps the active contract on the player as attributes (`QuestTier`, `QuestGoal`, `QuestKills`,
`QuestLast`, `QuestAutoAccept`, `QuestAutoTurnIn`), so the hub reads the real state rather than scraping
panel text. Auto turn-in fires when `QuestKills >= QuestGoal`.

Accepting a quest requires standing at the giver and interacting with its `ProximityPrompt`. The hub finds
that prompt for the selected tier, moves into range, fires it, then calls the quest remote — the same path as
walking up and pressing `E`. A switch only counts as successful when `QuestTier` actually changes.

## Fighting notes

NPCs announce every attack on their own attributes: `Fighting` turns on when they engage, then
`ActionAnim` flips to `Telegraph` and runs an `M1_1` / `M1_2` / `M1_4` cycle, with each hit landing
about 0.6s after the telegraph for 13-21 damage. The player character exposes `Blocking`, `BlockHP`,
`ParryOpenedAt` and `PerfectBlockUntil`; starting a block opens a window of roughly 0.38s.

What was measured: holding block through an entire fight still took full damage from NPC melee (44 taken,
guard only dropping 9 of 100). So the hub keeps auto block **off** by default, offers it as a toggle for
situations where it does help, and defaults to fighting through instead.

## Behaviour notes

- **No air control.** Jumps rise but do not travel, so the hub never jumps to cross terrain. When the
  walking route is blocked it steps around the obstacle and re-plans a jump-free path.
- **Unfocused window is fine.** Farming continues while another window has focus; clicks pause only when the
  pointer is over the hub window itself.
- **Melee is real input.** Swings are sent as genuine clicks at screen centre, and the game validates hits at
  ground level, so underground farming and kill aura are not offered.
- **Hide name is local.** Other clients draw their own name tags, so this only affects your own screen.

## Disclaimer

Provided for educational use. Automating gameplay and running third-party scripts can violate Roblox's Terms
of Service and the game's rules, and can result in account action. Use at your own risk. This project is not
affiliated with Roblox or with the developers of Ordinary.

<!--
  ============================================================================
  developer notes - not rendered on GitHub, keep it that way
  ============================================================================

  Dungeon / boss research, captured live on build 4.6.0 (Undercroft run).

  DUNGEON PROTOCOL
  ----------------
  DungeonEvent (RemoteEvent, ReplicatedStorage) sends (kind, payload).
  State payload keys observed:
    state    = "fight" | "between" | "failed"   ("between" fires when a room clears)
    title    = "THE UNDERCROFT"
    room     = 1..rooms, roomName = "The Ossuary" / "The Deep Chamber"
    rooms    = 3
    enemies  = live enemy count for that room
    boss     = true in the last room
    youDown  = true once you are downed
    size     = party size
    endsAt   = unix timestamp of the run deadline
    color, down, count

  BossFightRemote ("State") drives the health bar:
    kind="Dungeon", id="Dungeon_3_331:2", level=0, name=<room>,
    title="THE UNDERCROFT", hp/max = pooled room HP (1729/1729 in The Ossuary),
    phase, phases, count, total, hasBoss, hideBar, endsAt, top

  Observed run timeline: fight room 2 "The Ossuary" with 5 enemies -> 3 -> 2 -> 1
  -> "between" (0 enemies, room cleared) -> 4 s later fight room 3 "The Deep Chamber"
  with 1 enemy and boss=true -> 54 s later "failed" + youDown=true at HP 0.

  Enemies are ordinary quest NPCs under Workspace.QuestNPCs, named:
    Event_Undercroft_Guard, Event_Undercroft_Guard_Medic, Event_Cellar_Runner,
    Event_Vault_Stalker, Event_Vault_Stalker_Medic, plus the room-3 boss.
  They carry normal NPC attributes (IsNPC, NPCName, Tier, AbilityName, ...), so
  the existing farm targeting works on them once you stay inside the run.

  Geometry: Workspace.DungeonRuns.Dungeon_<id> with Structure, Doors, Props,
  Markers, RoomDecor (x4), Room_1..Room_4, Origin, NoPvPZone, SanctumZone.
  Doors are already transparent and non-colliding, they do not gate progress.
  Prompts: Markers.LeavePoint.DungeonPrompt ("The way out" / "Leave the dungeon")
  is always enabled; Room_4.ExitPortal / NextDungeonPrompt appear on clear.

  Gates in the world:
    Map.Dungeons.Gate.DungeonGateAnchor_Undercroft  ["The Undercroft", Enter, max 14, at 1035,9,587]
    Map.Dungeons.Gate.InfiniteDungeonRift          ["INFINITE DUNGEON", Enter, max 12, at 1040,14,572]

  CONFIG (ReplicatedStorage modules, client-readable)
  ---------------------------------------------------
  DungeonConfig: Dungeons = { Undercroft }; 75 Modes (Easy/Medium/Hard, Act_HuntEasy/
  Medium/Hard, Act_Prison, Act_Royalty, Ladder_Ascendant_*); Entry = { BlockInCombat,
  GateRange, MaxPartySize, MinLevel, RecommendedLevel, StartCountdown, StreamSeconds };
  Lockout = { CooldownAfterClear, CycleSeconds, FailRestSeconds, LeaveRestSeconds,
  RestSeconds, Saved }; plus Rewards, Difficulty, Enemies, Rewards tables.
  InfiniteDungeonConfig: BossHealth=7 (scaling), cash/reward functions.
  MiniBossConfig: 13 named minibosses (Wraith Harrier, Veilwarden, Shardkin,
  Cinderheart, Hollowmaw, Dusk Shrike, Carrion Knight, Thornbone, Rhen..., Oren
  Vexmark, Ash Marcellus, Lady Avren, Silas Red); SpawnMinInterval=240,
  SpawnMaxInterval=540, LevelMin=6, LevelMax=8, Scale=1.45, AggroRange=70,
  RoamRadius=60, SafeZoneRadius=40, Hidden=true, SharedKillShare=0.2,
  ParryStagger=1.4, DespawnAfter=0, Enabled=true.
  SuperBossConfig: EventEvery=7200, FirstEventAfter=900, GatherSeconds=60,
  FightSeconds=840, Lives=3, ArenaOrigin=(9000,400,9000), ArrivalProtection=1.5,
  BreakArmor=1.5, KnockGap=3, Bosses(3), PartyScaling, Contribution, Rewards.
  BossEventConfig: Schedule { GlobalCooldown=150, MajorChance=0.45, MaxMajor=1,
  MaxMinor=1, MinPlayers=1, PauseMajorDuringWorldBoss=true, RetryEvery=30 };
  15 events (BossHunt, Invasion, HeadlessHorseman, FactionAttack, Ambush, Blackout,
  Duskline, RivalEncounter, TerritoryTakeover, HostageSituation, ProtectionEvent,
  PowerfulNPC, SchoolIncident, SpiritHaunting, BossEscape); Limits(13), Rewards(26).
  FactionRaidConfig: AlarmAfter=30, Bodyguards=2, CommanderHealth=2.5, Cooldown=900,
  Countdown=5, ExtractRadius=11, ExtractSeconds=75, MaxRaiders=4, MinLevel=2,
  TimeLimit=420, Drops(4), Tasks(3).

  Player attributes worth reading: BossAliveNow, BossArrivalAt, BossEventPoints,
  BossEventsWon, Mat_BossCore, MileDungeon, Setting_WorldBossOptOut,
  SuperBossReadyAt, WorldBossReadyAt, ArenaPoints, ArenaStreak.

  Note: most dungeon tables are populated server-side, so only the scalars above
  are reliable client-side. Outbound remote hooks are impossible in Solara
  (no hookfunction, and never proxy __namecall - it hangs the client). Inbound
  logging via each RemoteEvent.OnClientEvent works and is how this was captured.
-->
