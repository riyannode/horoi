HOROI — PRODUCT REQUIREMENTS DOCUMENT
Tokenized Stock DeFi Conformance + Binance Web3 Evidence Infrastructure for BNB Smart Chain

Version: 2.0
Date: 19 September 2026
Project name: Horoi
Hackathon: BNB Hack — Tokenized Stocks Edition with Binance Web3 Wallet
Build window: 16 September 2026 → 11 October 2026
Submission lock: 11 October 2026, 12:00 UTC / 19:00 WIB
Target chain: BNB Smart Chain Mainnet (chainId 56)
Primary asset family for v1: bStocks
Primary Binance Web3 module: RWA Data API
Mainnet evidence modules: Transaction API + Wallet API
Optional depth modules: Trading API + DeFi API
Special-prize extensions: Binance Agentic Wallet / Wallet Skills + BNB Agent Studio
Repository rule: only three top-level directories — backend, frontend, docs

Rule normalization: when official hackathon sources differ, Horoi follows the stricter
submission interpretation. In particular, the <=4 minute demo video is treated as a
release gate even though the live hackathon page describes it as strongly recommended.


============================================================
1. EXECUTIVE SUMMARY
============================================================

Horoi is developer infrastructure that tests whether a DeFi integration preserves the
economic behavior of tokenized stocks when corporate-action mechanics change the
effective/displayed amount without requiring the raw onchain balance to change.

The initial target is bStocks on BNB Smart Chain.

Core thesis:

    "A token can be BEP-20 compatible and still be economically incompatible
     with a DeFi integration."

bStocks are BEP-20 tokenized securities on BSC and integrate BEP-677 / EIP-8056
Scaled UI Amount semantics. The raw token accounting remains canonical while a UI
multiplier can represent dividend reinvestment, stock splits, reverse splits and other
redenomination-like corporate-action effects.

A protocol may successfully execute:

    balanceOf()
    transfer()
    transferFrom()
    deposit()
    redeem()

and still represent the user's economic claim incorrectly after a multiplier transition.

Horoi exists to test those failure modes before a protocol claims support for a
 tokenized stock.

The hackathon version has two deliberately separated evidence planes:

A. CONFORMANCE PLANE — determines PASS / FAIL / INCOMPLETE.
- BSC contract state;
- pinned BSC mainnet block;
- isolated local fork;
- deterministic economic invariants;
- reproducible protocol interaction evidence.

B. BINANCE WEB3 EVIDENCE PLANE — proves hackathon integration depth and adds market,
transaction and wallet context.
- RWA Data API is mandatory and resolves the tokenized-stock identity and market context;
- Transaction API is used for mainnet transaction simulation and transaction evidence;
- Wallet API is used for wallet/readback evidence around live publication;
- Trading API may attach executable quote/slippage context without becoming a router;
- DeFi API may discover/build protocol interactions when the selected target is supported.

The Binance Web3 evidence plane NEVER decides conformance PASS or FAIL. External API
outages, stale market data or quote failures cannot rewrite deterministic onchain facts.
They are recorded separately as integration evidence.

Horoi is NOT:
- a stock picker;
- a trading bot;
- a router;
- a portfolio manager;
- a yield protocol;
- a generic token auditor;
- a replacement for a security audit;
- an LLM risk scorer.

Horoi IS:

    "A conformance test suite and evidence system for tokenized-stock DeFi integrations."

Primary product surfaces:
1. CLI/SDK-style developer workflow.
2. Web dashboard for interactive runs and judge demo.
3. Machine-readable HTTP API.
4. BSC mainnet HoroiRegistry for immutable report-summary anchoring.
5. Binance Web3 evidence panel tied to each report.

Special-prize extensions are isolated from the core engine:
- Binance Agentic Wallet / Wallet Skills may acquire a tiny demo fixture or provide an
  AI-native execution surface under explicit wallet limits;
- BNB Agent Studio may run a persistent Horoi Sentinel that watches for relevant
  tokenized-stock state/context changes and requests deterministic Horoi runs.

Neither extension may override or manufacture a Horoi verdict.

============================================================
2. HACKATHON FIT
============================================================

Event:
BNB Hack — Tokenized Stocks Edition with Binance Web3 Wallet.

Official structure:
- one main track: Tokenized Stocks Products & Agents;
- $20,000 total prize pool;
- BSC mainnet only for the track;
- at least one of bStocks, Ondo or xStocks must be central;
- spot only; perps are out;
- a working project must be built on one or more Binance Web3 API modules;
- Developer Experience Report is mandatory and worth 25% of score;
- public repository and runnable/deployed project evidence must remain accessible
  through judging;
- Horoi treats a <=4 minute demo video as mandatory internally even though official
  pages differ on whether it is mandatory or strongly recommended.

Horoi's primary asset family is bStocks. bStocks are central because the exact product
problem comes from their corporate-action and multiplier semantics; they are not a
logo or decorative API lookup.

Why Horoi fits the track:
- bStocks are the object being tested;
- Horoi reads real bStock contracts on BSC mainnet;
- Horoi resolves bStocks and market/reference context through Binance Web3 RWA Data;
- Horoi evaluates BEP-677 / EIP-8056 semantics;
- Horoi runs corporate-action scenarios from a pinned BSC mainnet fork;
- Horoi tests actual integration economics instead of only token transfer compatibility;
- Horoi anchors report summaries in a BSC mainnet contract;
- Horoi uses Binance Web3 transaction/wallet evidence around mainnet publication;
- Horoi creates a reproducible developer-facing report and CI exit status;
- Horoi directly addresses the event thesis that tokenized equities arrived onchain
  faster than the tooling around them.

Scoring alignment:

TECHNICAL IMPLEMENTATION — 30%
Required evidence:
- real BSC mainnet token state;
- real Binance Web3 RWA Data API responses;
- signed API authentication implemented correctly;
- deterministic fork execution;
- protocol interactions;
- exact error model;
- Transaction API simulation for mainnet publication path;
- Wallet API readback / transaction verification;
- BSC mainnet HoroiRegistry publication;
- reproducible CLI/API/UI.

CREATIVITY & ORIGINALITY — 25%
Horoi is not another:
- DCA bot;
- basket;
- arbitrage bot;
- stock-trading UI;
- generic portfolio agent;
- quote router.

The original thesis is:

    "Tokenized-stock compatibility must be tested against corporate-action economics,
     not inferred from BEP-20 compatibility."

DEVELOPER EXPERIENCE REPORT — 25%
Horoi records observed evidence for:
- onboarding time;
- API authentication friction;
- documentation mismatches;
- exact endpoints/modules used;
- latency and rate limits;
- RWA search/price/market-status behavior;
- tokenized-stock edge cases;
- transaction simulation behavior;
- wallet/readback behavior;
- AI stack attempts if Agentic Wallet/Wallet Skills or Agent Studio are evaluated;
- exact redesign suggestions.

The final narrative must be written from observed evidence. Do not fabricate DevEx
feedback and do not submit generic AI-generated praise.

PRODUCT QUALITY & UX — 20%
- one clear run flow;
- ticker/address discovery;
- readable PASS / FAIL / INCOMPLETE;
- evidence per invariant;
- explicit raw vs effective amount;
- Binance Web3 market context clearly separated from conformance truth;
- exact block/time/source labels;
- clear mainnet vs fork labeling;
- BscScan proof for real mainnet artifacts;
- usable CLI/API for developers and an understandable web flow for judges.

Tie-break alignment:
The official rules prioritize depth of Binance Web3 Wallet API usage before DevEx
quality. Horoi therefore makes RWA Data mandatory and integrates Transaction + Wallet
into the canonical proof path. Trading + DeFi modules are added only when they provide
real evidence, not to inflate module count.

Special prizes:

BEST USE OF AGENTIC WALLET / WALLET SKILLS
Eligible only if the extension is implemented and demonstrated credibly.
The extension must perform a real bounded wallet workflow or provide a meaningful
AI-native surface. Installing a skill without a product flow does not count as done.

BEST USE OF BNB AGENT STUDIO
Eligible only if Horoi Sentinel is actually deployed through Agent Studio and evidence
shows the live identity/runtime/task/payment path required by current Studio tooling.
A README claim or local mock is insufficient.

Important eligibility / network constraint:
BSC mainnet is the production network for Horoi. Local forks are test execution
sandboxes derived from BSC mainnet state; they do not replace mainnet evidence.

============================================================
3. THESIS
============================================================

Primary thesis:

    "Tokenized stocks can be technically composable without being economically
     composable."

Expanded:

Traditional ERC-20 compatibility answers questions such as:
- Can the token be transferred?
- Can a contract hold it?
- Can allowance/transferFrom work?

It does not prove:
- whether a protocol interprets effective balances correctly;
- whether a stock split preserves economic value inside the protocol;
- whether dividend reinvestment is reflected in the user's claim;
- whether a scheduled multiplier transition is applied at the correct time;
- whether rounding or stale multiplier reads create accounting drift.

Horoi defines and tests those invariants.

Judge-facing one-liner:

    "Before a DeFi protocol says it supports tokenized stocks, Horoi proves that
     dividends, splits, and multiplier changes will not silently break its accounting."


============================================================
4. PROBLEM
============================================================

bStocks use a multiplier mechanism.

Conceptually:

    effectiveAmount = rawAmount * uiMultiplier / 1e18

Example:
- raw balance: 10 TSLAB
- multiplier before split: 1.0
- effective balance: 10 TSLAB

After a 2-for-1 split:
- raw balance may remain: 10
- multiplier becomes: 2.0
- effective balance becomes: 20
- price per effective unit should correspondingly adjust so economic value is not
  created from nothing.

A DeFi protocol that only assumes raw token units are the complete economic quantity
may show technically valid transactions while representing the economic position
incorrectly.

Failure examples Horoi is designed to detect:

A. MULTIPLIER IGNORED
Protocol keeps treating raw amount as the complete user position after a dividend
or split adjustment.

B. MULTIPLIER APPLIED TWICE
Protocol reads an already-adjusted value and independently applies the multiplier.

C. EARLY MULTIPLIER APPLICATION
A pending scheduled multiplier is treated as active before effectiveAt.

D. LATE MULTIPLIER APPLICATION
The transition is active onchain but protocol accounting still uses prior state.

E. VALUE CONSERVATION FAILURE
A pure split causes the user's total economic claim to incorrectly double or halve.

F. REDEMPTION DRIFT
Protocol shares/receipts no longer redeem to the expected proportional economic claim.

G. ROUNDING DRIFT
Small fractional positions accumulate or lose value outside the suite's allowed
integer-rounding tolerance.

H. EVENT/STATE DISAGREEMENT
Transfer/accounting behavior disagrees with the token's multiplier state or required
Scaled UI Amount events.


============================================================
5. PRODUCT PRINCIPLES
============================================================

1. Deterministic verdicts first.
No LLM, market API, quote API, Agentic Wallet or Agent Studio component decides PASS,
FAIL or INCOMPLETE.

2. Evidence over score.
Every failure must show:
- expected state;
- observed state;
- source block;
- transaction/call evidence;
- invariant ID.

3. Never convert unknown into PASS.
If a required test cannot run, the result is INCOMPLETE.

4. Separate conformance truth from market context.
BSC state + deterministic invariants determine conformance. Binance Web3 APIs attach
context and execution evidence but cannot override core results.

5. Binance Web3 is a required product integration.
RWA Data is part of the canonical Horoi workflow, not optional README decoration.
Transaction + Wallet evidence is part of the mainnet proof path.

6. Do not sponsor-stuff.
A Binance API module is only added when its output is visible in the product/report and
supports a real user story. Calling unused endpoints solely to increase module count is
out of scope.

7. Mainnet state is read-only for test scenario creation.
Horoi never mutates BSC mainnet to manufacture corporate-action conditions.

8. Corporate-action mutation happens only on an isolated local fork.

9. Reports are block-bound and context-bound.
A PASS at block N is not a permanent guarantee. Binance Web3 context also stores its
own observation timestamp because market data is not replayable from the block alone.

10. Suite versions are immutable.
Changing test semantics creates a new suite version/hash.

11. No custody.
Horoi core does not hold users' tokenized stocks.

12. No backend hot wallet.
The API server does not require a production private key. Mainnet publication is
client-signed or performed by an explicitly configured publisher workflow.

13. Special-prize extensions are capability boundaries.
Agentic Wallet and Agent Studio may orchestrate or consume Horoi, but they cannot alter
core check semantics or suppress failures.

14. Security-sensitive upstream failures are explicit.
Clock drift, signature mismatch, stale context, rate limiting and simulation failure
must be recorded as evidence with stable errors.

15. Small codebase.
No unnecessary service/repository/utils abstraction. New sponsor integration logic gets
one focused Binance client module, not a forest of wrappers.

============================================================
6. USERS
============================================================

Primary:
- DeFi protocol developers integrating bStocks;
- vault/lending/custody developers;
- wallet or middleware engineers that interpret BEP-677 amounts;
- security/review engineers validating a tokenized-stock integration;
- protocol teams that need CI evidence before enabling a tokenized stock.

Secondary:
- tokenized-stock issuers verifying ecosystem compatibility;
- hackathon judges reproducing a conformance run;
- AI agents or MCP clients querying Horoi reports;
- Agent Studio agents using Horoi as a deterministic external verifier;
- integration engineers evaluating Binance Web3 tokenized-stock APIs.

Non-user:
- retail investor seeking a buy/sell recommendation.
Horoi must not position itself as investment advice or an alpha product.

============================================================
7. CORE USER STORIES
============================================================

US-01 — Discover token
As a developer, I can enter a ticker or bStock address and Horoi resolves it through
Binance Web3 RWA Data and confirms the BSC contract identity.

US-02 — Inspect token semantics
As a developer, I provide a bStock address and Horoi tells me which BEP-677/EIP-8056
interfaces it supports and its current/pending multiplier state.

US-03 — See official market context
As a developer, I see the Binance Web3 platform, underlying ticker, token/reference
price, market status, next-open context and source timestamp where the API exposes them.

US-04 — Test integration
As a developer, I provide a bStock and supported protocol target and Horoi runs the
selected conformance profile against a pinned BSC mainnet fork.

US-05 — See evidence
As a developer, I can inspect every check with expected and observed values plus the
source block and fork transaction/call evidence.

US-06 — Reproduce
As a developer, I can rerun the same deterministic suite at the same BSC block and
suite version.

US-07 — CI
As a developer, I can run Horoi from the CLI and fail CI when a required conformance
check fails or cannot execute.

US-08 — Build mainnet publication
As a developer, I can obtain the exact HoroiRegistry publication payload for a report.

US-09 — Simulate mainnet publication
Before signing/broadcasting, I can run the publication transaction through Binance Web3
Transaction API simulation and inspect the result.

US-10 — Publish result
As an authorized publisher, I can anchor the immutable result summary to HoroiRegistry
on BSC mainnet.

US-11 — Verify published result
As anyone, I can verify report ID, suite hash, result hash, block, asset, target,
publisher and status from the registry and compare the transaction against Binance Web3
Wallet/transaction readback evidence.

US-12 — Machine query
As another program, I can fetch a canonical JSON report without using the UI.

US-13 — Executability context
Where Trading API supports the selected asset/path, I can attach a small-notional quote,
route and slippage context to the report without that quote affecting conformance.

US-14 — DeFi target context
Where Binance DeFi API supports the selected target, Horoi can use protocol metadata and
unsigned interaction calldata as additional reproducibility evidence.

US-15 — Agent-native verification [SPECIAL EXTENSION]
An Agentic Wallet/Wallet Skills or Agent Studio workflow can request a Horoi run and
receive the deterministic report without giving the agent authority to alter the suite.

US-16 — Persistent sentinel [SPECIAL EXTENSION]
A deployed Horoi Sentinel may watch relevant tokenized-stock context changes and request
a rerun when policy conditions are met, while every final verdict still comes from the
same deterministic Horoi engine.

============================================================
8. MVP SCOPE
============================================================

MUST HAVE — TRACK ELIGIBILITY + CORE PRODUCT

A. BSTOCK DISCOVERY + INSPECTION
- chain ID validation;
- ticker/address resolution;
- ERC-165 interface checks;
- IScaledUIAmount;
- IScaledUIAmountNewUIMultiplier;
- optional IScaledUIAmountConversion;
- optional IScaledUIAmountBalances;
- optional IERC8056Scheduled;
- current multiplier;
- pending multiplier;
- effectiveAt;
- decimals;
- raw/effective amount comparison.

B. BINANCE WEB3 RWA DATA — MANDATORY
Horoi must make real signed calls to the official Binance Web3 RWA Data API.
Required product uses:
- resolve/query supported RWA issuance platform data;
- search token by ticker or contract;
- fetch RWA token price including onchain token price and underlying reference price;
- fetch underlying/company info where available;
- fetch token list/status metadata for the selected bStock;
- fetch underlying market/status context where available.

Store with each report:
- endpoint/module name;
- source timestamp;
- response latency;
- relevant normalized fields;
- hash of canonicalized relevant response payload;
- API error code if unavailable.

RWA API context cannot turn FAIL into PASS.

C. BINANCE WEB3 TRANSACTION API — MANDATORY MAINNET PROOF PATH
Required uses:
- confirm BSC support;
- get latest block height/gas context where useful;
- simulate the HoroiRegistry publication transaction before mainnet signing/broadcast;
- persist simulation status and latency;
- never treat simulation as equivalent to finalized onchain readback.

Broadcast through Binance Transaction API is optional because Horoi core intentionally
avoids a server hot wallet. If used, the transaction must already be safely signed and
final state must still be verified independently.

D. BINANCE WEB3 WALLET API — MANDATORY MAINNET READBACK PATH
Required uses around at least one mainnet publication:
- read publisher/demo wallet state on BSC where useful;
- fetch publication transaction details by hash after it is mined;
- compare returned chain/hash/status/method evidence with BSC RPC receipt/registry state;
- report disagreement instead of hiding it.

E. DETERMINISTIC TEST RUNNER
- pinned BSC mainnet fork;
- source block stored in report;
- corporate-action scenario simulation;
- baseline snapshot;
- post-transition snapshot;
- invariant evaluation;
- no mainnet state mutation for scenario creation.

F. FIRST PROTOCOL PROFILES
- ERC-4626-like vault integration profile;
- generic custody/holding profile;
- minimal TypeScript custom adapter interface.

G. REPORT
- PASS / FAIL / INCOMPLETE / ERROR;
- per-check evidence;
- suite version/hash;
- BSC source block/hash;
- asset/target addresses;
- raw/effective economic quantities;
- Binance Web3 evidence section;
- timings;
- deterministic result hash;
- separate context hash for non-deterministic external market evidence.

H. CLI
- discover;
- inspect;
- context;
- test;
- report;
- simulate-publish;
- publish;
- verify-publication.

I. API
- health;
- discover/search asset;
- inspect asset;
- get Binance Web3 context;
- start test run;
- get test run;
- get report;
- build publish payload;
- simulate publication;
- verify publication.

J. WEB UI
- new test form with ticker or contract input;
- result screen;
- Binance Web3 evidence/context panel;
- prior reports;
- registry proof;
- mainnet transaction readback proof.

K. BSC MAINNET CONTRACT
- HoroiRegistry.sol;
- report summary only;
- no token transfers;
- no custody;
- no upgrade proxy.

L. DOCUMENTATION
- architecture;
- exact test semantics;
- Binance Web3 integration semantics;
- error codes;
- deployment;
- DevEx evidence;
- judge demo;
- limitations and non-audit disclaimer.

M. DEVEX COLLECTION
- onboarding stopwatch/evidence;
- exact docs URL/module;
- API signing/clock/nonce issues;
- latency and rate-limit observations;
- RWA-specific behavior;
- transaction simulation behavior;
- wallet readback behavior;
- AI stack evaluation if attempted.

SHOULD HAVE — HIGH-VALUE DEPTH

N. TRADING API EXECUTABILITY CONTEXT
- request a small-notional cross-DEX quote for the selected bStock/path when supported;
- record quote route, expected output, price impact/slippage fields exposed by API and
  timestamp;
- do not auto-execute;
- do not use quote success/failure as conformance verdict.

O. DEFI API CONTEXT
- list/query supported protocol target if relevant;
- fetch protocol/investment detail;
- when supported, build unsigned deposit/redeem calldata and compare it with the adapter
  expectations;
- all state-changing conformance execution still happens on the isolated fork unless a
  specific small mainnet proof is explicitly safe and required.

P. PRODUCT POLISH
- CSV/JSON export;
- GitHub Actions example;
- public demo deployment;
- BscScan source verification;
- second RPC provider verification for published reports.

SPECIAL-PRIZE EXTENSIONS — ONLY AFTER CORE GATES PASS

Q. BINANCE AGENTIC WALLET / WALLET SKILLS
Credible options:
- bounded acquisition of a tiny supported bStock demo fixture under explicit wallet
  limits and human confirmation; or
- AI-native wallet/market flow that invokes Horoi before a tokenized-stock DeFi action.

Requirements if implemented:
- real Agentic Wallet / Wallet Skills evidence;
- user-defined spend/tradable-token limits respected;
- no autonomous unrestricted trading;
- the Horoi verdict remains external deterministic evidence;
- demo clearly separates the wallet decision/action from Horoi's conformance result.

R. BNB AGENT STUDIO — HOROI SENTINEL
A thin persistent agent may:
- hold an Agent Studio identity/wallet;
- run on Studio-managed runtime;
- expose an ERC-8183 task interface where current Studio output provides it;
- call Horoi's public API;
- watch RWA context for a configured asset/target;
- request a rerun when a deterministic policy trigger fires;
- use x402/B402 payment capabilities only if a real service dependency exists.

It may NOT:
- define Horoi invariants;
- convert INCOMPLETE to PASS;
- publish unsupported claims;
- trade user funds as part of the conformance engine.

NOT IN MVP
- AI scoring of conformance;
- generic chatbot as primary product;
- support for every protocol automatically;
- generic smart-contract bytecode vulnerability scanning;
- mainnet storage mutation to manufacture corporate actions;
- user token custody;
- automated remediation;
- certification NFT/token;
- governance token;
- custom oracle;
- portfolio recommendations;
- autonomous investment strategy.

============================================================
9. CONFORMANCE MODEL
============================================================

Horoi separates two classes of checks.

CLASS A — TOKEN SEMANTICS
Question:
"Does this token expose the expected Scaled UI Amount state consistently?"

CLASS B — INTEGRATION ECONOMICS
Question:
"Does this protocol preserve the user's intended economic claim when those token
semantics change?"

A protocol only receives PASS if every REQUIRED check for its selected profile passes.

Statuses:

PASS
- all required checks executed;
- all required checks passed.

FAIL
- at least one required check executed and failed.

INCOMPLETE
- one or more required checks could not be executed;
- no PASS is allowed even if all executed checks passed.

ERROR
- Horoi itself failed before producing a valid conformance result.


============================================================
10. SUITE V1
============================================================

Suite ID:
HOROI-BSTOCK-1

Suite version:
1.0.0

Suite hash:
keccak256 of the canonical suite manifest.

Required token checks:

H001 — CORE_INTERFACE
Verify ERC-165 support for IScaledUIAmount.

Expected:
supportsInterface(0xa60bf13d) == true.

H002 — REQUIRED_PENDING_INTERFACE
Verify IScaledUIAmountNewUIMultiplier.

Expected:
supportsInterface(0x4bd27648) == true.

H003 — ACTIVE_MULTIPLIER
Read uiMultiplier().

Expected:
value > 0.

H004 — PENDING_STATE
Read newUIMultiplier() and effectiveAt().

Expected when no genuine pending change:
newUIMultiplier == uiMultiplier
effectiveAt == 0

Expected with pending change:
effectiveAt > current fork timestamp.

H005 — TRANSFER_UI_EVENT
Execute an isolated fork transfer.

Expected:
standard Transfer event plus TransferWithUIAmount with raw and effective amounts that
match current multiplier semantics.

H006 — SCHEDULED_TRANSITION
If the token/admin model can be safely reproduced on fork, schedule a new multiplier,
warp to immediately before and after effectiveAt, and verify active/pending semantics.

If this required scenario cannot be reproduced for the selected certification
profile, result is INCOMPLETE, not PASS.

H007 — CONVERSION_CONSISTENCY
If optional conversion interface is supported:
- toUIAmount(raw) must match expected Math.mulDiv-style result;
- fromUIAmount(ui) must respect documented rounding behavior;
- Horoi does NOT require perfect round-trip equality.

If interface is not supported:
SKIP, unless profile explicitly requires it.

H008 — UI_BALANCE_CONSISTENCY
If optional balance interface is supported:
balanceOfUI(account) must equal the expected adjusted value within exact integer math.

If not supported:
SKIP, unless profile requires it.


Required integration checks:

H101 — BASELINE_DEPOSIT
Deposit known raw amount into target.

Expected:
transaction succeeds under supported target profile and Horoi can identify the user's
claim.

H102 — BASELINE_REDEEM
Redeem/withdraw the position.

Expected:
returned raw amount respects profile-specific exact or bounded rounding rules.

H103 — FORWARD_SPLIT
Simulate 2.0x multiplier.

Expected:
- effective quantity changes correctly;
- protocol does not create or destroy economic value solely because denomination
  changed;
- user remains entitled to the same proportional underlying economic claim for a
  pure split.

H104 — REVERSE_SPLIT
Simulate 0.1x multiplier.

Expected:
same conservation principle as H103 with profile-defined rounding bounds.

H105 — DIVIDEND_REINVESTMENT
Simulate a modest multiplier increase, e.g. 1.008x.

Expected:
the user's effective economic claim reflects the proportional reinvestment instead
of remaining stuck at the old effective amount or applying the adjustment twice.

H106 — PRE_EFFECTIVE_STATE
Snapshot immediately before effectiveAt.

Expected:
new multiplier must not be treated as active early.

H107 — POST_EFFECTIVE_STATE
Snapshot immediately after effectiveAt.

Expected:
active calculations use the new multiplier state.

H108 — REDEMPTION_AFTER_CHANGE
Redeem after multiplier transition.

Expected:
the user receives the protocol-defined proportional raw claim and the resulting
effective amount matches expected token semantics within rounding tolerance.

H109 — MULTI_USER_PROPORTION
Two users enter with different sizes before transition.

Expected:
multiplier transition preserves relative proportional ownership unless target
protocol explicitly specifies otherwise.

H110 — FRACTIONAL_BOUNDARY
Test a small valid fractional position.

Expected:
rounding remains inside the profile's explicit tolerance and never silently produces
a zero/negative economic claim where a nonzero claim should exist.


Optional integration checks:

H201 — BINANCE_REFERENCE_CONTEXT
Attach official reference-price/market metadata to report evidence.
This is context, not an oracle of test correctness.

H202 — COUNTRY/RESTRICTION_CONTEXT
Record integration restriction/eligibility metadata where official APIs expose it.
This is informational and must never be represented as legal advice.

H203 — CUSTOM_PROTOCOL_INVARIANT
Developer-defined invariant through Horoi's adapter interface.
Custom checks cannot override failed required checks.
\n\nHackathon integration evidence checks:\n\nW301 — RWA_IDENTITY\nUse Binance Web3 RWA Data to resolve the selected contract/ticker/platform.\nExpected:\n- chain resolves to BSC / 56;\n- selected asset identity is consistent with the BSC contract under test;\n- source timestamp and latency recorded.\n\nW302 — RWA_REFERENCE_CONTEXT\nFetch token price and underlying reference price where exposed.\nExpected:\n- both values are stored as context with source timestamp;\n- Horoi never interprets temporary price divergence as a conformance failure by itself.\n\nW303 — RWA_MARKET_STATUS\nFetch market status / next-open or related status fields where exposed.\nExpected:\n- context is displayed and stored;\n- outside-hours state is not mislabeled as a token/protocol failure.\n\nW304 — RWA_UNDERLYING_PROFILE\nFetch underlying company/attestation context where exposed.\nExpected:\n- report records only supported fields;\n- missing optional data is NOT a conformance failure.\n\nW305 — PUBLICATION_SIMULATION\nRun the HoroiRegistry publication transaction through Binance Web3 Transaction API.\nExpected:\n- simulation succeeds before user/publisher mainnet execution; OR\n- failure is surfaced with exact upstream evidence and publication is blocked until fixed.\n\nW306 — PUBLICATION_READBACK\nAfter a real BSC mainnet publication, query Binance Web3 Wallet/transaction detail and\ncompare with direct BSC receipt/registry reads.\nExpected:\n- tx hash/chain/status are consistent;\n- mismatch is reported as evidence, not silently ignored.\n\nW307 — EXECUTABLE_QUOTE_CONTEXT [OPTIONAL]\nWhere Trading API supports the path, attach a small-notional quote.\nExpected:\n- quote timestamp and route recorded;\n- no auto execution;\n- unavailable route cannot change Horoi PASS/FAIL.\n\nW308 — DEFI_TARGET_CONTEXT [OPTIONAL]\nWhere DeFi API supports the target, record protocol metadata/unsigned interaction data.\nExpected:\n- adapter semantics remain authoritative for Horoi's deterministic profile;\n- Binance-generated calldata is additional reproducibility evidence, not a verdict.\n\nW3xx statuses are integration-evidence statuses and are separate from Hxxx conformance\nchecks. A conformance PASS must never be downgraded or upgraded solely because an\nexternal context endpoint is unavailable. The submission-level acceptance criteria,\nhowever, require the mandatory W301/W302/W303/W305/W306 hackathon integration paths to\nbe demonstrated successfully at least once.\n

============================================================
11. ECONOMIC INVARIANTS
============================================================

Horoi must avoid the false assumption that "raw balance changed" or "raw balance did
not change" alone proves correctness.

Core quantities:

rawAmount
    canonical BEP-20 amount returned by raw token accounting.

multiplier
    18-decimal Scaled UI Amount multiplier.

effectiveAmount
    rawAmount * multiplier / 1e18.

referenceUnitPrice
    price context normalized to the effective/displayed unit when available.

economicNotional
    effectiveAmount * normalized referenceUnitPrice.

For a pure split scenario:
- effective quantity changes;
- normalized unit price changes inversely;
- economicNotional should remain approximately conserved, excluding market movement,
  fee, spread, and explicitly modeled rounding.

For dividend reinvestment:
- effective quantity may increase through multiplier;
- the expected economic change follows the modeled reinvestment event;
- Horoi tests consistency, not investment performance.

For protocol integrations:
Horoi measures both:
1. raw redeemable claim; and
2. effective economic claim.

A test must not FAIL merely because protocol share count does not change.
The failure condition is a violated economic invariant, not cosmetic display behavior.


============================================================
12. FORK EXECUTION DESIGN
============================================================

Horoi never changes BSC mainnet to manufacture test conditions.

Canonical run sequence:

1. Resolve the bStock by ticker/address through Binance Web3 RWA Data.
2. Validate BSC chain/address identity against direct RPC contract code.
3. Capture external context snapshot:
   - RWA token/platform identity;
   - token price/reference price where exposed;
   - market status/next-open context where exposed;
   - source API timestamp;
   - local request timestamp;
   - latency;
   - canonical context payload hash.
4. Resolve latest or user-pinned BSC mainnet block.
5. Persist:
   - chainId;
   - blockNumber;
   - blockHash;
   - RPC provider class/identifier without credentials.
6. Start local Anvil fork from that block.
7. Inspect bStock interfaces on the fork.
8. Snapshot baseline.
9. Run baseline target interactions.
10. Snapshot protocol/user accounting.
11. Reproduce multiplier transition only inside fork.
12. Warp fork time around effectiveAt where needed.
13. Run post-transition interactions.
14. Evaluate deterministic invariants.
15. Tear down fork.
16. Persist canonical conformance report.
17. Attach Binance Web3 context section separately.
18. Build HoroiRegistry publication payload.
19. Simulate publication through Binance Transaction API before real mainnet execution.
20. If publication is requested, obtain client/publisher signature and submit transaction.
21. Verify finalized/confirmed registry state through direct BSC readback.
22. Query Binance Wallet/transaction detail by tx hash and compare evidence.
23. Mark publication VERIFIED only when the registry state and transaction receipt agree.

External context reproducibility rule:
Market/reference API observations are time-bound, not block-replayable. Horoi therefore
stores their normalized fields, source timestamp and payload hash but never pretends a
future API call will reproduce historical context exactly.

Preferred fork mutation method:
Use the token's actual forked authorization/update path with Anvil impersonation only
inside the local fork when the responsible address and callable update path are
discoverable.

Fallback rule:
If Horoi cannot faithfully reproduce a required transition, that conformance path is
INCOMPLETE. Do not use raw storage mutation merely to force a PASS.

Reason:
Direct storage mutation can bypass real contract behavior and create false confidence.

No fork transaction may ever be broadcast to BSC mainnet.

============================================================
13. PROTOCOL ADAPTER MODEL
============================================================

Horoi cannot honestly claim to understand every DeFi ABI.

Therefore v1 has explicit profiles.

Profile: custody
Required operations:
- deposit/transfer token into target;
- identify target-held raw balance;
- return/redeem token;
- compare user/target claims.

Profile: erc4626
Required operations:
- asset();
- deposit();
- redeem()/withdraw();
- convertToAssets()/previewRedeem() where supported;
- share balance.

Profile: custom
Developer implements a small TypeScript adapter satisfying one interface.

Adapter contract in TypeScript conceptually exposes:

    setup(context)
    deposit(context, amount)
    position(context, user)
    redeem(context, amountOrShares)
    expectedClaim(context)

No adapter is allowed to set final PASS/FAIL.
It only exposes protocol actions/state.
The core Horoi engine evaluates required invariants.

All built-in adapters live in one file:
backend/adapters.ts

Do not create one folder per protocol in v1.


============================================================
14. REPORT FORMAT
============================================================

Canonical deterministic report fields:

reportVersion
suiteId
suiteVersion
suiteHash
runId
status

chainId
blockNumber
blockHash
testedAt

asset
target
profile

token:
  name?
  symbol?
  decimals
  uiMultiplier
  newUIMultiplier
  effectiveAt
  supportedInterfaces[]

checks[]:
  id
  required
  status
  expected
  observed
  evidence
  durationMs
  errorCode?

summary:
  requiredPassed
  requiredFailed
  requiredIncomplete
  optionalPassed
  optionalFailed
  optionalSkipped

resultHash

Separate non-deterministic Binance Web3 evidence section:

binanceWeb3:
  capturedAt
  contextHash
  calls[]:
    module
    operation
    endpointId
    success
    sourceTimestamp?
    latencyMs
    upstreamCode?
    errorCode?

  rwa:
    platformId?
    ticker?
    underlyingTicker?
    tokenPrice?
    referencePrice?
    tokenToShareRatio?
    marketStatus?
    openState?
    nextOpenTime?
    attestationUrls[]?

  tradingContext?:
    routeAvailable
    inputAsset
    outputAsset
    inputAmount
    expectedOutput?
    quoteTimestamp?
    quoteEvidenceHash?

  defiContext?:
    protocolId?
    investmentId?
    supportedActions[]
    calldataHash?

publication:
  registry?
  reportId?
  simulation:
    attempted
    success?
    latencyMs?
    evidenceHash?
    errorCode?
  txHash?
  publisher?
  receiptStatus?
  registryReadbackVerified?
  walletApiReadbackVerified?

specialPrizeEvidence?:
  agenticWallet:
    enabled
    sessionEvidence?
    policyEvidence?
    actionTxHash?
  agentStudio:
    enabled
    identity?
    runtimeEvidence?
    taskInterfaceEvidence?
    paymentEvidence?

Hashing rules:
- resultHash covers deterministic conformance payload only;
- checks sorted lexicographically by check ID;
- deterministic field ordering;
- suiteHash is separate so test semantics cannot silently change;
- Binance Web3 market context MUST NOT be inserted into resultHash because it changes
  with time and would destroy deterministic reruns;
- contextHash = keccak256(canonical normalized external evidence payload);
- registry anchors resultHash + suiteHash + block context; contextHash may be retained
  offchain in the report and can be added to a future registry version only if schema
  semantics are frozen.

Never include:
- API keys;
- API signing secrets;
- raw request signatures;
- private keys;
- seed phrases;
- credential-bearing RPC URLs;
- user PII;
- unrestricted wallet session tokens.

============================================================
15. ONCHAIN CONTRACT
============================================================

File:
backend/HoroiRegistry.sol

Contract:
HoroiRegistry

Purpose:
Anchor a minimal, verifiable summary of a Horoi report on BSC mainnet.

It does NOT:
- hold tokens;
- execute tests;
- call tokenized-stock contracts;
- manage protocol assets;
- upgrade;
- make financial decisions.

Recommended compiler:
Solidity 0.8.37.

Dependency:
OpenZeppelin Contracts 5.6.1 audited/latest tag.

Access:
OpenZeppelin AccessControl.

Roles:
DEFAULT_ADMIN_ROLE
PUBLISHER_ROLE

Admin:
- grant/revoke publisher;
- revoke a report if the publication itself is invalid or compromised.

Publisher:
- publish immutable report summaries.

Recommended struct:

    struct Report {
        address asset;
        address target;
        bytes32 suiteHash;
        bytes32 resultHash;
        uint64 blockNumber;
        uint64 testedAt;
        uint8 status;
        address publisher;
    }

Status encoding:
0 = UNKNOWN
1 = PASS
2 = FAIL
3 = INCOMPLETE

Report ID:

    keccak256(
        abi.encode(
            block.chainid,
            asset,
            target,
            suiteHash,
            resultHash,
            blockNumber
        )
    )

Storage:
mapping(bytes32 => Report) public reports;
mapping(bytes32 => bool) public revoked;

Functions:

    publish(
        address asset,
        address target,
        bytes32 suiteHash,
        bytes32 resultHash,
        uint64 blockNumber,
        uint8 status
    ) returns (bytes32 reportId)

    revoke(bytes32 reportId)

    exists(bytes32 reportId) view returns (bool)

Rules:
- publish only PUBLISHER_ROLE;
- reject address(0) for asset;
- target may be address(0) only for token-only conformance;
- reject zero suiteHash/resultHash;
- reject status outside PASS/FAIL/INCOMPLETE;
- reject duplicate reportId;
- testedAt uses block.timestamp;
- contract never overwrites a published Report;
- revoke marks revoked=true; it does not delete history.

Events:

    ReportPublished(
        bytes32 indexed reportId,
        address indexed asset,
        address indexed target,
        bytes32 suiteHash,
        bytes32 resultHash,
        uint64 blockNumber,
        uint8 status,
        address publisher
    )

    ReportRevoked(
        bytes32 indexed reportId,
        address indexed revokedBy
    )

Security:
- no external calls in publish/revoke;
- no delegatecall;
- no tx.origin;
- no upgrade proxy;
- no payable receive/fallback;
- no token approvals;
- no arbitrary calldata execution;
- custom errors instead of long revert strings;
- exact compiler pinned in Foundry;
- source verified after deployment.

Why no upgradeability:
The registry is intentionally tiny and immutable.
Test evolution is represented by suiteHash/version, not proxy upgrades.
If registry semantics ever need material change, deploy a new registry and document the
migration.


============================================================
16. BACKEND
============================================================

Runtime:
Bun 1.4.2.

Framework:
Elysia 1.4.30 stable.
Do NOT use Elysia 2 beta in the hackathon build.

Language:
TypeScript 7.0.2 stable.

Chain library:
viem 2.56.7 stable at 19 September 2026 verification time.

Persistence:
bun:sqlite built into Bun.
No ORM for v1.

Local chain:
Foundry/Anvil latest stable installed via foundryup.

Backend responsibilities:
- strict API input validation;
- Binance Web3 request signing and authentication;
- ticker/address RWA discovery;
- RWA context retrieval;
- stable upstream error translation;
- BSC RPC contract inspection;
- Anvil fork lifecycle;
- protocol adapter actions;
- deterministic conformance checks;
- deterministic report hashing;
- external context hashing;
- run/report persistence;
- Transaction API publication simulation;
- Wallet API publication readback verification;
- optional Trading API quote context;
- optional DeFi API protocol/calldata context;
- DevEx evidence capture;
- CLI command implementation.

Binance request rules:
- API key/secret stay server-side;
- current UTC timestamp must be generated at request time;
- system clock must be NTP-synchronized in production;
- nonce/replay semantics follow official authentication docs;
- request signing must include exact method/path/query/body semantics required by
  Binance Web3 authentication;
- only idempotent reads may be automatically retried;
- retry with bounded exponential backoff for 429/temporary upstream failures;
- never retry a state-changing broadcast blindly;
- record latency and upstream business code;
- redact signatures and secrets from logs.

Backend must not:
- render frontend;
- hold user tokenized stocks;
- contain an LLM in the conformance engine;
- hide failed/incomplete checks;
- treat Binance market data as an oracle of PASS/FAIL;
- auto-broadcast registry transactions with a shared hot key by default;
- fabricate Binance API success in production mode.

============================================================
17. FRONTEND
============================================================

Stack:
React 19.3.0 stable.
Vite 8.3.0 stable.
Tailwind CSS 4.3.3 stable.
TypeScript 7.0.2.
viem 2.56.7 for wallet/registry interaction.

No Next.js.
No state-management library.
No component framework unless implementation proves it necessary.
No wagmi unless direct viem wallet interaction becomes unmaintainable.

SCREEN 1 — RUN
Inputs:
- ticker or bStock address;
- target protocol address;
- profile: custody / erc4626 / custom;
- block: latest / explicit;
- Run test.

Before run, show resolved asset:
- token symbol/name;
- BSC chain;
- Binance RWA platform;
- underlying ticker;
- current token/reference price context where available;
- market status / next open where available;
- current/pending multiplier;
- supported BEP-677 interfaces.

Every context value must show its source and observed timestamp.

SCREEN 2 — RESULT
Top:
PASS / FAIL / INCOMPLETE.

Show:
- asset;
- target;
- block/hash;
- suite;
- result hash;
- duration;
- Binance context timestamp/hash.

Checks table:
ID | Test | Required | Status | Evidence.

Expandable deterministic evidence:
- expected;
- observed;
- fork transaction/call;
- before/after quantities;
- error code.

Economic comparison:
Before / After:
- raw claim;
- multiplier;
- effective claim;
- normalized economic notional.

Separate BINANCE WEB3 CONTEXT panel:
- RWA token/platform identity;
- token price vs reference price;
- market status;
- underlying context;
- request latency/source time;
- optional executable quote;
- optional DeFi target context.

This panel must explicitly say:
"Market/API context is evidence only. It does not determine Horoi conformance status."

SCREEN 3 — PUBLISH
- build registry payload;
- show Transaction API simulation result;
- connect/sign with wallet or authorized publisher flow;
- broadcast mainnet transaction;
- wait for receipt/readback;
- verify registry state;
- verify Binance Wallet/transaction readback;
- display VERIFIED only after both direct chain and publication evidence agree.

SCREEN 4 — REPORTS
Simple recent reports list.
Filters:
- asset;
- target;
- status.

SCREEN 5 — SPECIAL EXTENSION [ONLY IF IMPLEMENTED]
Minimal evidence view for Agentic Wallet / Agent Studio.
Do not build a generic chatbot UI.
Show only:
- agent/wallet identity;
- configured policy boundary;
- request/action evidence;
- linked Horoi report;
- task/runtime/payment evidence where applicable.

No login required for hackathon core.
No vanity metrics.
No fake safety score.
No "certified safe" badge.

============================================================
18. API
============================================================

Base:
/api

GET /health

Response concept:
{
  "ok": true,
  "chainId": 56,
  "suite": "HOROI-BSTOCK-1",
  "version": "2.0.0",
  "binanceWeb3": {
    "rwaConfigured": true,
    "transactionConfigured": true,
    "walletConfigured": true
  }
}

GET /assets/search?q=AAPL
- resolves supported RWA/ticker candidates through Binance Web3 RWA Data;
- production response must never expose API credentials.

POST /assets/inspect
Input:
{
  "asset": "0x..."
}

Returns:
- BSC contract semantics;
- supported interfaces;
- multiplier state;
- pinned block context.

GET /assets/:asset/context
Returns normalized Binance Web3 RWA evidence:
- platform;
- ticker/underlying;
- token/reference price;
- market status;
- source timestamp;
- context hash;
- per-call latency/error evidence.

POST /runs
Input:
{
  "asset": "0x...",
  "target": "0x...",
  "profile": "erc4626",
  "blockNumber": null
}

Returns:
{
  "runId": "...",
  "status": "RUNNING"
}

GET /runs/:id
Returns state/progress.

GET /reports/:id
Returns canonical Horoi report JSON with deterministic result + separate Binance Web3
context section.

GET /reports
Filters:
asset
target
status
limit
cursor

GET /reports/:id/publish
Returns exact registry arguments and hashes for wallet/publisher signing.
Does not broadcast.

POST /reports/:id/simulate-publication
- invokes Binance Transaction API simulation on the exact intended BSC mainnet call;
- stores simulation evidence;
- refuses to claim success if payload changed after simulation.

POST /publications/:txHash/verify
- direct BSC receipt read;
- HoroiRegistry readback;
- Binance Wallet/transaction detail readback;
- returns VERIFIED only if required evidence agrees.

GET /reports/:id/quote-context
Optional.
Uses Binance Trading API for small-notional executable context when supported.
No trade execution.

GET /reports/:id/defi-context
Optional.
Uses Binance DeFi API for protocol/investment/calldata context where supported.

API rules:
- all addresses checksum-normalized;
- chain fixed to 56 in production;
- unknown fields rejected;
- request size capped;
- strict schemas;
- upstream credentials never returned;
- internal stack traces never returned;
- stable errors from docs/ERRORS.md;
- conformance FAIL remains HTTP 200 with status=FAIL because it is a valid result;
- Binance context outage may return partial context but cannot silently become PASS;
- publication verification is separate from conformance status.

============================================================
19. CLI
============================================================

Binary:
horoi

Commands:

horoi discover <ticker-or-address>

horoi inspect <asset>

horoi context <asset>

horoi test <asset> <target> --profile erc4626
horoi test <asset> <target> --profile custody
horoi test <asset> <target> --profile custom --adapter ./adapter.ts

horoi report <runId> --json

horoi simulate-publish <runId>

horoi publish <runId>

horoi verify-publication <txHash>

Optional:
horoi quote-context <asset> --amount <small-notional>
horoi defi-context <asset> <target>

Default output:
human-readable concise table.

--json:
canonical machine-readable JSON.

Exit codes:
0 = PASS / successful non-test command
1 = FAIL
2 = INCOMPLETE
3 = Horoi execution error
4 = invalid CLI usage
5 = mandatory Binance Web3 integration evidence unavailable for the requested command
6 = publication simulation/verification failed

CI example:

    horoi test "$BSTOCK" "$VAULT" --profile erc4626 --json > horoi.json

A FAIL or INCOMPLETE fails CI unless the developer explicitly configures otherwise.
A Binance API context failure must be visible but must not rewrite deterministic status.

============================================================
20. DATA STORAGE
============================================================

Use bun:sqlite.

No PostgreSQL for hackathon.
No Supabase dependency.
No Redis.
No job queue service.

Tables:

runs
- id TEXT PRIMARY KEY
- asset TEXT NOT NULL
- target TEXT
- profile TEXT NOT NULL
- chain_id INTEGER NOT NULL
- block_number INTEGER NOT NULL
- block_hash TEXT NOT NULL
- status TEXT NOT NULL
- started_at INTEGER NOT NULL
- finished_at INTEGER
- progress_completed INTEGER NOT NULL DEFAULT 0
- progress_total INTEGER NOT NULL
- report_json TEXT
- result_hash TEXT
- context_hash TEXT
- error_code TEXT

publications
- report_id TEXT PRIMARY KEY
- run_id TEXT NOT NULL
- registry TEXT NOT NULL
- tx_hash TEXT NOT NULL
- publisher TEXT NOT NULL
- simulation_json TEXT
- chain_receipt_json TEXT
- wallet_readback_json TEXT
- verified INTEGER NOT NULL DEFAULT 0
- published_at INTEGER NOT NULL
- revoked INTEGER NOT NULL DEFAULT 0

web3_calls
- id TEXT PRIMARY KEY
- run_id TEXT
- report_id TEXT
- module TEXT NOT NULL
- operation TEXT NOT NULL
- requested_at INTEGER NOT NULL
- source_timestamp INTEGER
- duration_ms INTEGER NOT NULL
- success INTEGER NOT NULL
- upstream_code TEXT
- evidence_hash TEXT
- error_code TEXT

Store only normalized/canonical non-secret evidence, not raw credentials or signatures.
Full raw response persistence is optional and must be scrubbed before storage.

devex_events
- id TEXT PRIMARY KEY
- category TEXT NOT NULL
- doc_url TEXT
- module TEXT
- operation TEXT
- started_at INTEGER
- duration_ms INTEGER
- observed TEXT NOT NULL
- expected TEXT
- impact TEXT
- proposed_fix TEXT
- evidence_ref TEXT

Indexes:
runs(asset, target, started_at)
runs(status, started_at)
publications(run_id)
web3_calls(run_id, requested_at)
web3_calls(module, operation, requested_at)
devex_events(category, started_at)

Database writes use transactions where a state transition and report persistence must
be atomic.

============================================================
21. RUN STATE MACHINE
============================================================

DISCOVERING
  ↓
CONTEXT
  ↓
INSPECTING
  ↓
FORKING
  ↓
BASELINE
  ↓
SCENARIOS
  ↓
EVALUATING
  ↓
HASHING
  ↓
PASS / FAIL / INCOMPLETE

Any Horoi infrastructure failure:
  → ERROR

Rules:
- deterministic terminal conformance status never changes;
- a later market/API context refresh does not mutate resultHash;
- rerun creates a new run ID;
- no report is overwritten;
- contextHash may differ across reruns even when resultHash is identical because market
  context is time-bound.

Publication state is separate:

UNPUBLISHED
  ↓
PAYLOAD_BUILT
  ↓
SIMULATED
  ↓
SIGNED
  ↓
BROADCAST
  ↓
MINED
  ↓
REGISTRY_READBACK
  ↓
WALLET_API_READBACK
  ↓
VERIFIED

Any disagreement:
  → PUBLICATION_MISMATCH

A conformance PASS does not imply publication VERIFIED.
A publication VERIFIED does not imply conformance PASS.

============================================================
22. ERROR MODEL
============================================================

All public error definitions live in:
docs/ERRORS.md

Code uses stable codes, not ad-hoc prose.

Input / chain:
INPUT_INVALID
ADDRESS_INVALID
CHAIN_MISMATCH

RPC:
RPC_UNAVAILABLE
RPC_RATE_LIMITED
BLOCK_NOT_FOUND

Asset semantics:
ASSET_NOT_CONTRACT
CORE_INTERFACE_MISSING
PENDING_INTERFACE_MISSING
OPTIONAL_INTERFACE_UNAVAILABLE
MULTIPLIER_INVALID
PENDING_STATE_INVALID

Target / adapter:
TARGET_UNSUPPORTED
ADAPTER_INVALID
DEPOSIT_FAILED
REDEEM_FAILED

Fork:
FORK_START_FAILED
FORK_MUTATION_UNAVAILABLE
FORK_TRANSACTION_FAILED

Invariant:
INVARIANT_VALUE_NOT_CONSERVED
INVARIANT_MULTIPLIER_IGNORED
INVARIANT_MULTIPLIER_DOUBLE_APPLIED
INVARIANT_APPLIED_EARLY
INVARIANT_APPLIED_LATE
INVARIANT_REDEMPTION_DRIFT
INVARIANT_ROUNDING_EXCEEDED
INVARIANT_EVENT_MISMATCH

Report:
REPORT_HASH_FAILED
CONTEXT_HASH_FAILED

Binance Web3 authentication / transport:
BINANCE_API_NOT_CONFIGURED
BINANCE_AUTH_FAILED
BINANCE_SIGNATURE_MISMATCH
BINANCE_TIMESTAMP_DRIFT
BINANCE_RATE_LIMITED
BINANCE_UPSTREAM_UNAVAILABLE
BINANCE_RESPONSE_INVALID

RWA:
RWA_ASSET_NOT_FOUND
RWA_PLATFORM_UNSUPPORTED
RWA_CONTEXT_STALE
RWA_REFERENCE_UNAVAILABLE

Trading / DeFi optional context:
TRADING_QUOTE_UNAVAILABLE
TRADING_ROUTE_UNSUPPORTED
DEFI_TARGET_UNAVAILABLE
DEFI_TRANSACTION_BUILD_FAILED

Publication:
REGISTRY_NOT_CONFIGURED
REGISTRY_ALREADY_PUBLISHED
TX_SIMULATION_FAILED
TX_PAYLOAD_CHANGED_AFTER_SIMULATION
REGISTRY_TX_REVERTED
REGISTRY_READBACK_FAILED
WALLET_READBACK_FAILED
PUBLICATION_MISMATCH

Special extensions:
AGENTIC_WALLET_UNAVAILABLE
AGENTIC_WALLET_POLICY_REJECTED
AGENT_STUDIO_UNAVAILABLE
AGENT_STUDIO_RUNTIME_UNVERIFIED
AGENT_STUDIO_IDENTITY_UNVERIFIED

Internal:
INTERNAL_ERROR

HTTP mapping guideline:
400 input/profile errors
401/403 only for Horoi API auth if later added; Binance upstream auth stays translated
404 run/report/contract not found
409 duplicate/publication conflict
422 conformance cannot execute because target/asset semantics are unsupported
424 mandatory upstream integration dependency failed for the requested operation
429 Horoi public rate limit
502 upstream RPC/Binance API problem
500 Horoi internal failure

Conformance FAIL normally returns HTTP 200 with status=FAIL.
It is a valid product result, not an API error.

============================================================
23. SECURITY MODEL
============================================================

Threats and controls:

MALICIOUS ASSET CONTRACT
- eth_call where possible;
- isolated fork for state-changing tests;
- strict call gas caps;
- request timeouts;
- never trust token-returned strings.

MALICIOUS TARGET CONTRACT
- isolated fork;
- no production funds for conformance scenarios;
- no server hot wallet.

RPC POISONING
- record block hash;
- optional second-provider verification for published reports;
- report provider class/identifier without credential-bearing URL.

FALSE PASS FROM SKIPPED TEST
- required skip => INCOMPLETE.

SUITE MUTATION
- semantic version;
- immutable suite manifest;
- suiteHash in every report and registry record.

BINANCE API SECRET LEAK
- X-OC credentials server-side only;
- never expose secret/signature to frontend;
- redact auth headers/logs;
- .env ignored;
- deployment secret manager preferred.

BINANCE REQUEST REPLAY / CLOCK DRIFT
- follow timestamp/nonce rules from official authentication docs;
- NTP synchronization;
- bounded receive window;
- unique nonce where supported;
- record auth error separately from product error.

UPSTREAM API POISONING / INCONSISTENCY
- external data is context, not conformance truth;
- source timestamp + payload hash;
- compare asset identity to direct BSC address/code;
- direct chain readback for publication finality.

STALE MARKET CONTEXT
- every RWA/quote context has source timestamp;
- frontend labels stale evidence;
- stale context cannot become a fresh claim.

TRANSACTION SIMULATION TOCTOU
- exact payload hash stored after simulation;
- publishing a changed payload requires re-simulation;
- final registry state verified after mining.

PUBLISHER COMPROMISE
- dedicated PUBLISHER_ROLE;
- no custody permissions;
- report revocation flag;
- admin separate from publisher;
- multisig recommended for production admin.

REGISTRY RISK
- no asset custody;
- no external calls;
- no upgradeability;
- minimal storage.

AGENTIC WALLET EXTENSION
- explicit daily/spend/token scope configured in wallet product;
- no unrestricted transfer/trade policy;
- human confirmation for high-risk path where supported;
- agent cannot change Horoi suite/verdict;
- special extension failure does not corrupt core report.

AGENT STUDIO EXTENSION
- identity/runtime/payment evidence verified instead of inferred;
- agent calls public Horoi API, not internal database mutation path;
- no private Horoi admin credential embedded in agent;
- x402/B402 spending capped to actual service needs;
- no self-funding loop permitted to bypass user policy.

DEPENDENCY RISK
- exact lockfile versions;
- exact Solidity compiler;
- OpenZeppelin audited latest tag only;
- no Elysia beta;
- review lockfile updates;
- freeze dependencies before submission.

Important disclaimer:
Horoi is a conformance tool, not a security audit, legal opinion, financial advice or
permanent certification. Reports are valid only for the recorded suite, target, asset,
chain state and block context.

============================================================
24. REPOSITORY STRUCTURE
============================================================

Exactly three top-level directories:

/
├── backend/
├── frontend/
└── docs/

Root files are allowed. No other top-level directory.

Recommended root files:

package.json
bun.lock
tsconfig.json
foundry.toml
.env.example
.gitignore
README.md
LICENSE

backend/

backend/api.ts
- Elysia routes;
- thin handlers;
- no controllers/services folders.

backend/engine.ts
- suite manifest;
- state machine;
- deterministic checks;
- invariant evaluation;
- report construction;
- result/context hash boundaries.

backend/chain.ts
- viem BSC client;
- contract reads;
- BEP-677 interface IDs/ABIs;
- Anvil process/fork lifecycle;
- registry payload/receipt readback.

backend/binance.ts
- one focused Binance Web3 client module;
- request signing/authentication;
- RWA Data operations;
- Transaction API simulation;
- Wallet API readback;
- optional Trading / DeFi operations;
- normalized evidence + stable errors.
- Do not split one file per API endpoint in v1.

backend/adapters.ts
- custody adapter;
- ERC-4626 adapter;
- custom adapter interface;
- no one-folder-per-protocol architecture.

backend/db.ts
- bun:sqlite schema and queries;
- no ORM/repository abstraction.

backend/cli.ts
- discover/inspect/context/test/report/simulate-publish/publish/verify commands.

backend/sentinel.ts [ONLY IF AGENT STUDIO EXTENSION IMPLEMENTED]
- thin Horoi Sentinel policy/orchestration logic;
- no conformance semantics;
- may be adapted to the runtime shape generated by current Agent Studio tooling.
- If current Studio runtime requires a non-TypeScript scaffold, keep that generated
  runtime confined under backend/agent-studio/ and document why; do not change core stack.

backend/HoroiRegistry.sol
- only production Horoi smart contract.

backend/HoroiRegistry.t.sol
- Foundry tests.

frontend/

frontend/index.html

frontend/main.tsx
- React bootstrap only.

frontend/app.tsx
- screens/components together while maintainable.

frontend/api.ts
- typed Horoi API calls.

frontend/styles.css
- Tailwind import/theme + minimal CSS.

docs/

docs/PRD.md
- product scope and acceptance criteria.

docs/ARCHITECTURE.md
- data flow, trust boundaries, fork model, Binance evidence boundary, registry.

docs/TESTS.md
- Hxxx conformance + W3xx integration-evidence checks.

docs/ERRORS.md
- stable errors and remediation.

docs/BINANCE.md
- exact Web3 API modules/operations used;
- authentication notes;
- normalized fields;
- stale-context semantics;
- no secrets.

docs/DEPLOY.md
- API/frontend/registry deployment and rollback.

docs/DEVEX.md
- mandatory hackathon Developer Experience Report evidence.

docs/DEMO.md
- <=4 minute judge demo.

docs/SPECIAL.md [ONLY IF SPECIAL EXTENSIONS IMPLEMENTED]
- Agentic Wallet / Wallet Skills and Agent Studio evidence.

No generic:
src/
lib/
utils/
helpers/
services/
repositories/
components/
hooks/
types/

until scale genuinely requires them.

The goal is a readable hackathon codebase, not architectural theater.

============================================================
25. ROOT PACKAGE POLICY
============================================================

Use one Bun workspace/package definition at root where practical.

Scripts:

bun run dev
- run backend + frontend dev processes.

bun run api
- run backend API.

bun run web
- run Vite frontend.

bun run typecheck
- TypeScript noEmit.

bun run test
- backend unit/integration tests.

bun run build
- production backend binary + frontend build.

bun run contract:test
- forge test.

bun run contract:fmt
- forge fmt --check.

bun run verify
- typecheck + tests + contract tests + frontend production build.

Do not add Turborepo/Nx.
This repository is too small to justify them.


============================================================
26. DEPENDENCIES
============================================================

Pinned baseline verified 19 September 2026:

Runtime
- bun 1.4.2

Language
- typescript 7.0.2

Backend
- elysia 1.4.30
- viem 2.56.7

Frontend
- react 19.3.0
- react-dom 19.3.0
- vite 8.3.0
- tailwindcss 4.3.3

Smart contracts
- solidity 0.8.37
- @openzeppelin/contracts 5.6.1 audited latest tag
- Foundry latest stable via foundryup

External sponsor tooling
- Binance Web3 API over HTTPS REST; do not add a third-party unofficial SDK unless
  official docs make it necessary;
- Binance Agentic Wallet installed through current official Skills command only if the
  special extension is implemented;
- BNB Agent Studio CLI/runtime version must be recorded at implementation time because
  it is external tooling and may change during the event.

Avoid beta/canary/next tags for core dependencies.

Before implementation begins:
- run official/npm version checks;
- update only if a newer stable exists and tests pass;
- pin exact versions in bun.lock;
- freeze dependency upgrades before submission lock;
- record any sponsor CLI version in docs/DEVEX.md and docs/SPECIAL.md.

============================================================
27. SMART CONTRACT TEST REQUIREMENTS
============================================================

HoroiRegistry tests:

R001 deploy assigns admin correctly.
R002 admin can grant publisher.
R003 non-publisher cannot publish.
R004 publisher can publish PASS.
R005 publisher can publish FAIL.
R006 publisher can publish INCOMPLETE.
R007 invalid status reverts.
R008 zero asset reverts.
R009 zero suite hash reverts.
R010 zero result hash reverts.
R011 duplicate report reverts.
R012 report fields round-trip exactly.
R013 report ID matches offchain computation.
R014 non-authorized revoke reverts.
R015 authorized revoke marks report revoked.
R016 revoke does not delete original report.
R017 target address zero accepted only for token-only report if enabled by contract rule.
R018 fuzz report inputs within valid domain.
R019 no ETH/token custody path exists.
R020 gas snapshot recorded.

Contract release gate:
- forge fmt --check;
- forge build;
- forge test;
- fuzz tests pass;
- source verified on BSC explorer after deployment.


============================================================
28. BACKEND TEST REQUIREMENTS
============================================================

Unit:
- multiplier math;
- rounding bounds;
- interface decoding;
- suite hash;
- deterministic result hash;
- external context hash canonicalization;
- run/publication state machines;
- status aggregation;
- adapter validation;
- Binance request canonicalization/signature input construction;
- Binance response normalization;
- stale-context detection;
- stable upstream error mapping.

Fork integration:
- inspect real bStock on BSC fork;
- baseline transfer;
- baseline protocol interaction;
- scheduled transition;
- before effectiveAt;
- after effectiveAt;
- forward split;
- reverse split;
- dividend-like increment;
- multi-user proportionality;
- fractional boundary.

Binance Web3 live smoke tests [with event API key]:
- RWA platform/token discovery;
- selected bStock RWA price/context;
- underlying market/status context;
- BSC transaction support/latest block/gas where used;
- exact registry publication simulation on BSC;
- wallet/transaction detail readback for a known mainnet tx;
- optional Trading quote when supported;
- optional DeFi protocol/calldata path when supported.

Mock tests:
- 401/signature mismatch;
- timestamp drift;
- 429 rate limit;
- upstream 5xx/business failure;
- malformed response;
- stale source timestamp;
- asset identity mismatch;
- transaction simulation failure;
- payload changed after simulation;
- Wallet API/direct RPC disagreement.

Negative conformance:
- non-BEP-677 token;
- missing required interface;
- unsupported target;
- RPC interruption;
- impossible fork mutation => INCOMPLETE;
- failed deposit => FAIL or INCOMPLETE according to profile semantics;
- mandatory context endpoint unavailable => visible W3xx failure but never false PASS.

Determinism:
Two runs with same:
- suite;
- block;
- asset;
- target;
- profile;
must produce identical semantic checks and resultHash, excluding non-semantic runtime
metadata and external Binance context.

Context behavior:
Two runs may legitimately produce different contextHash because RWA prices, market
status or API timestamps changed. This must not alter deterministic resultHash.

Release evidence:
- unit tests pass;
- fork tests pass;
- live Binance smoke evidence recorded;
- no tests use fake production results.

============================================================
29. FRONTEND ACCEPTANCE
============================================================

Required:
- works at desktop demo width;
- usable on mobile without horizontal breakage;
- ticker OR contract-address input;
- input validation before request;
- loading/progress state;
- PASS/FAIL/INCOMPLETE visually distinct without depending only on color;
- copy buttons for addresses/hashes;
- BscScan links for real mainnet artifacts;
- stable error code + concise explanation;
- evidence expandable;
- no fake data in production mode;
- clearly mark FORK vs MAINNET;
- Binance Web3 fields show source and timestamp;
- token/reference price context explicitly labeled context, not oracle/verdict;
- stale/failed context visible instead of silently omitted;
- Transaction API simulation status visible before mainnet publish;
- final publication shows direct chain readback and Binance wallet/tx readback;
- resultHash and contextHash displayed separately;
- no API key/signature appears in browser network-visible response.

Do not show:
- fake "audited" badge;
- fake safety score;
- unsupported price prediction;
- "certified safe" language;
- fake Agent Studio/Agentic Wallet status;
- a green PASS derived from successful API availability rather than conformance checks.

============================================================
30. BINANCE / BNB INTEGRATION
============================================================

Core conformance truth source:
BSC contract state + deterministic Horoi suite.

Core hackathon API integration:
Binance Web3 API.

The live hackathon rules require a working project built on one or more Binance Web3 API
modules and use W3W API depth as a tie-break consideration. Horoi therefore treats
Binance Web3 integration as product functionality, not optional enrichment.

A. RWA DATA API — REQUIRED

Purpose:
Resolve tokenized-stock identity and attach official token/reference market context.

Required operations for the selected demo asset, where the API exposes them:
- Get RWA Token Issuance Platforms;
- Search RWA Token;
- Get RWA Token Price;
- Get RWA Underlying Info;
- Get RWA Token List / selected token status;
- Get RWA Underlying Market Data.

Horoi uses these data for:
- ticker → BSC contract discovery;
- bStocks platform confirmation;
- underlying ticker/company context;
- token price vs underlying reference price;
- market-open/closed context;
- next-open/close context;
- attestation/protection links when provided;
- DevEx evidence around tokenized-stock API behavior.

Rules:
- normalize fields before hashing;
- save source timestamp + request latency;
- do not infer missing fields;
- do not use price/reference divergence by itself as conformance FAIL;
- direct BSC contract address/code is the final identity check for the tested token.

B. TRANSACTION API — REQUIRED

Purpose:
Make the mainnet proof path safer and satisfy the event's dry-run expectation.

Required:
- confirm BSC support;
- simulate exact HoroiRegistry publication transaction;
- record simulation evidence;
- ensure payload hash is unchanged before signing/broadcasting.

Optional:
- gas/latest block operations when they add visible product evidence;
- broadcast already-signed transaction through the API.

Horoi does not keep a backend hot key solely to use broadcast API.

C. WALLET API — REQUIRED

Purpose:
Independent sponsor-stack readback around the live mainnet proof.

Required for at least one judge/demo publication:
- query relevant BSC wallet state as appropriate;
- query transaction detail by publication tx hash;
- compare Binance API result with direct BSC receipt and registry state.

The UI labels publication VERIFIED only after direct chain evidence succeeds. Binance
Wallet evidence is corroborating sponsor-stack evidence, not chain finality itself.

D. TRADING API — OPTIONAL HIGH-VALUE DEPTH

Purpose:
Show whether the tested tokenized-stock representation has an executable route and what
a tiny real-world route looks like without turning Horoi into a router.

Preferred use:
- get aggregated quote for a tiny configured notional;
- capture route/expected output/price-impact fields exposed by current API;
- optionally build swap transaction ONLY for special demo fixture acquisition;
- no unattended execution in Horoi core.

If no supported path exists:
record TRADING_ROUTE_UNSUPPORTED and continue conformance.

E. DEFI DATA / DEFI TRANSACTION — OPTIONAL HIGH-VALUE DEPTH

Purpose:
Connect Horoi's protocol-conformance thesis to Binance's DeFi integration surface.

Use when selected target is supported:
- list/get protocol detail;
- query position/investment metadata where meaningful;
- build unsigned deposit/redeem transaction;
- compare generated calldata/action semantics with Horoi adapter expectations;
- use isolated fork for the state-changing conformance scenario.

Do not claim the DeFi API supports the target until verified live.

F. B402 PAYMENTS

Not required for core Horoi.
Use only if a real Agent Studio/agent service dependency exists.
Do not bolt on paid calls with no product reason.

G. BINANCE AGENTIC WALLET / WALLET SKILLS — SPECIAL PRIZE EXTENSION

Current Agentic Wallet provides an AI-native execution layer with user-configured
limits/security boundaries and supports BSC.

Credible Horoi integration patterns:
1. FIXTURE ACQUISITION
   Under a tiny explicit spend cap and human-confirmed policy, acquire a supported bStock
   needed to demonstrate a real wallet/token path.
2. PRE-ACTION VERIFICATION
   AI user asks to interact with a tokenized-stock DeFi target; the workflow queries
   Horoi first and refuses/asks for human review when latest required report is
   FAIL/INCOMPLETE/stale under the user's policy.

Horoi must not claim arbitrary contract-call capabilities that current Agentic Wallet
does not expose. Implement only capabilities verified against live docs/tooling.

H. BNB AGENT STUDIO — SPECIAL PRIZE EXTENSION

Current Studio positioning includes:
- agent wallet;
- ERC-8004 identity;
- ERC-8183 task interface;
- managed cloud runtime;
- x402 payment/self-funding capabilities;
- MCP integration into supported coding clients.

Horoi Sentinel design:

    RWA CONTEXT WATCH
            ↓
    DETERMINISTIC TRIGGER POLICY
            ↓
    CALL PUBLIC HOROI API
            ↓
    RUN CONFORMANCE ENGINE
            ↓
    REPORT ID / RESULT HASH
            ↓
    OPTIONAL ALERT / TASK RESPONSE

Trigger examples:
- selected asset market/corporate-action status changes;
- pending multiplier appears/changes;
- report age exceeds policy threshold;
- target integration version/config changes if independently observable.

Studio agent may schedule/orchestrate a run; it does not decide the result.

I. AGENT STUDIO / AGENTIC WALLET IMPLEMENTATION RULE

Special extensions are merged only after:
- core test suite passes;
- real RWA API integration passes;
- Registry is deployed/tested;
- publication simulation/readback works;
- demo core path is stable.

This prevents sponsor-prize work from destabilizing the main-track submission.

============================================================
31. MAINNET DEPLOYMENT
============================================================

Production pieces:

A. HoroiRegistry
Network:
BSC Mainnet, chainId 56.

Deploy:
HoroiRegistry.sol.

After deployment:
- verify source on BscScan;
- record address and deployment tx;
- grant PUBLISHER_ROLE to dedicated publisher;
- use safer admin/multisig if available;
- document all role changes;
- publish at least one real report summary before submission.

B. API
Deploy Bun/Elysia service.
Requirements:
- BSC mainnet RPC;
- Binance Web3 API key/signing secret;
- NTP-synchronized system clock;
- SQLite persistent volume;
- no default publisher private key;
- outbound access to official Binance Web3 API;
- hard request/response timeouts;
- secret redaction.

C. Frontend
Static Vite build.
Environment:
- API base URL;
- chain ID 56;
- registry address.

No Binance Web3 secret in frontend environment.

D. Fork worker
Same backend host may spawn Anvil for hackathon volume.
One run = one isolated process.
Concurrency capped.
Kill on completion/timeout.
No fork process may expose a public RPC endpoint without auth/network restriction.

E. Binance Web3 production verification
Before submission:
- live RWA API call succeeds from production backend;
- selected bStock resolves correctly;
- Transaction API simulation succeeds for exact publication payload;
- Wallet/transaction detail readback succeeds for real publication tx;
- errors/latency visible in DevEx evidence.

F. Optional Trading/DeFi verification
If shown in demo/README:
- verify production calls against the actual selected asset/target;
- no mock result may remain in production mode.

G. Optional Agentic Wallet extension
- configure explicit wallet limits;
- use tiny demo amount only;
- record real action evidence;
- do not place wallet session secrets in repo/backend logs.

H. Optional BNB Agent Studio extension
- deploy Horoi Sentinel through current Studio flow;
- record agent identity/runtime/task evidence;
- verify it can call production Horoi API;
- verify any x402/B402 payment behavior claimed;
- clearly label any testnet-only runtime evidence if current Studio credits/runtime are
  limited to testnet.

No Kubernetes.
No microservices.
No separate worker service unless real load proves necessary.

============================================================
32. DEVEX REPORT COLLECTION
============================================================

The Developer Experience Report is a scored product deliverable, not an afterthought.
It is worth 25% of the official score.

Horoi automatically logs non-sensitive development evidence useful for the report:

ONBOARDING
- time from first official docs page opened to first successful signed Web3 API call;
- developer portal/API-key friction;
- authentication setup steps;
- exact failure/recovery sequence.

DOCUMENTATION
- exact URL/page;
- section/operation;
- mismatch or ambiguity;
- observed vs documented behavior.

WEB3 API
- module;
- operation;
- HTTP status/business code;
- latency;
- rate-limit behavior;
- timestamp/signature issues;
- response field inconsistencies;
- missing/unclear error messages.

TOKENIZED-STOCK SPECIFICS
- bStock identity resolution;
- token price vs reference price behavior;
- market-open/closed context;
- next-open behavior;
- outside-hours observations;
- BEP-677/multiplier behavior;
- corporate-action pause/status evidence;
- actual liquidity/quote behavior if Trading API is tested;
- differences between representations only if directly observed; do not invent Ondo or
  xStocks comparisons if Horoi did not test them.

TRANSACTION / WALLET
- simulation behavior;
- exact payload requirements;
- failure messages;
- latency;
- transaction readback timing;
- direct RPC vs API agreement/disagreement.

DEFI API [IF USED]
- protocol discovery quality;
- unsigned calldata ergonomics;
- unsupported target behavior;
- field/documentation gaps.

AI STACK
If Agentic Wallet / Wallet Skills / BNB Agent Studio are used or evaluated, record:
- install/onboarding;
- supported capabilities actually observed;
- policy/security controls;
- unsupported assumptions discovered;
- runtime/deployment friction;
- missing features.

If not used, say clearly which components were not used and why. Do not manufacture
feedback.

REDESIGN SUGGESTION FORMAT
Every significant issue must include:
- exact URL/page;
- exact operation;
- observed result;
- expected result;
- reproduction;
- user impact;
- proposed fix.

Rules:
- docs/DEVEX.md is written from actual captured evidence;
- no invented issues;
- no generic praise;
- no AI-generated filler;
- screenshots/log excerpts may support the report but secrets must be removed;
- final report must include exact measurable examples.

============================================================
33. DEMO PLAN — <= 4 MINUTES
============================================================

Goal:
Show one coherent end-to-end story that proves:
1. bStocks are central;
2. Binance Web3 API is real product infrastructure;
3. Horoi finds an economic integration issue ordinary token compatibility misses;
4. the result is deterministic/reproducible;
5. the proof is anchored and verified on BSC mainnet.

0:00–0:20 — Problem
Show a real bStock.
Say:
"A bStock can remain valid BEP-20 while a multiplier changes its effective economic
quantity. A DeFi integration can therefore execute successfully and still account for
the stock incorrectly."

0:20–0:45 — Binance Web3 discovery/context
Enter ticker or address.
Show live:
- RWA platform/token identity;
- underlying ticker;
- token price vs reference price;
- market status;
- source timestamp.

Say explicitly:
"This is official market context. It does not decide the conformance verdict."

0:45–1:05 — Onchain semantics
Show:
- BSC mainnet address;
- BEP-677 interfaces;
- current/pending multiplier;
- pinned source block.

1:05–2:10 — Deterministic run
Select protocol target/profile.
Show local fork and checks:
- baseline deposit;
- forward split;
- reverse split;
- dividend-like multiplier increment;
- pre/post effectiveAt;
- redemption.

Show one exact failure or incompatible fixture:
expected claim vs observed claim.

2:10–2:40 — Correct/compatible comparison
Show a PASS path or corrected integration.
Emphasize exact invariant, not generic risk score.

2:40–3:05 — Binance Transaction API simulation
Build exact HoroiRegistry publish payload.
Show simulation PASS and payload hash.

3:05–3:35 — BSC mainnet proof
Sign/broadcast publication.
Show:
- BscScan tx;
- report ID;
- suite hash;
- result hash;
- source block;
- registry readback.

3:35–3:50 — Binance Wallet readback
Show publication tx read through Binance Web3 Wallet/transaction API and verified against
direct chain state.

3:50–4:00 — Thesis
"Horoi lets DeFi developers prove a tokenized-stock integration survives the events
that make stocks economically different from ordinary tokens."

If special extension is strong enough to show:
Replace, do not extend, one 10–15 second portion with Agentic Wallet/Agent Studio evidence.
Never exceed four minutes and never sacrifice the core Horoi story for sponsor logos.

============================================================
34. HACKATHON ACCEPTANCE CRITERIA
============================================================

The submission is not complete until every CORE criterion below is true.

REPOSITORY / BUILD
AC-01 Public repo exists and remains accessible through judging.
AC-02 Only backend/frontend/docs are top-level directories.
AC-03 Clean-clone bun install succeeds.
AC-04 Typecheck passes.
AC-05 Backend tests pass.
AC-06 Contract tests pass.
AC-07 Frontend production build passes.
AC-08 No credential/private-key material committed in current tree or relevant public
      history used for submission.

BSTOCK / BSC
AC-09 Horoi resolves and inspects at least one real bStock on BSC mainnet.
AC-10 Selected bStock address/code is verified independently through BSC RPC.
AC-11 A conformance run uses a pinned BSC mainnet fork.
AC-12 Forward split scenario executes or required path is explicitly INCOMPLETE.
AC-13 Reverse split scenario executes or required path is explicitly INCOMPLETE.
AC-14 Dividend-like multiplier scenario executes or required path is explicitly INCOMPLETE.
AC-15 Scheduled transition pre/post effectiveAt executes or is explicitly INCOMPLETE.
AC-16 No required skipped test can yield PASS.
AC-17 At least one target/profile integration is reproducible from docs.

BINANCE WEB3 — REQUIRED
AC-18 Production backend makes a real authenticated Binance Web3 RWA Data API call.
AC-19 Ticker/address resolution is visible in product.
AC-20 Token/reference price context is visible where API provides it.
AC-21 Market status/source timestamp is visible where API provides it.
AC-22 Binance API context is stored separately from deterministic resultHash.
AC-23 RWA API outage/error cannot silently change conformance verdict.
AC-24 Exact HoroiRegistry publication call is simulated through Transaction API.
AC-25 Simulation evidence includes exact payload identity/hash and is shown in UI/CLI.
AC-26 At least one real mainnet publication tx is queried through Binance Wallet/transaction
      API after mining.
AC-27 Binance readback is compared with direct BSC receipt + registry state.
AC-28 A mismatch cannot be labeled VERIFIED.

REGISTRY / MAINNET
AC-29 HoroiRegistry deployed on BSC mainnet.
AC-30 Registry source verified.
AC-31 At least one report summary published on BSC mainnet.
AC-32 UI links to real BscScan report/tx evidence.
AC-33 Publication path does not require a default backend hot wallet.

PRODUCT / UX
AC-34 PASS/FAIL/INCOMPLETE distinction is clear.
AC-35 Raw vs effective amount is visible.
AC-36 Fork vs mainnet evidence is clearly labeled.
AC-37 ResultHash and contextHash are visibly distinct.
AC-38 No fake production data.
AC-39 README states limitations and non-audit/non-advice disclaimer.

DEVEX / SUBMISSION
AC-40 DevEx report contains observed, specific evidence.
AC-41 DevEx report covers actual Binance API onboarding/auth/API pitfalls.
AC-42 AI stack section states exactly what was or was not evaluated.
AC-43 Demo video <=4 minutes is prepared even if form currently treats it as optional.
AC-44 Deployed link or reproducible judge instructions work from a clean environment.
AC-45 Submission materials remain accessible through judging.
AC-46 Submission completed before 11 October 2026 12:00 UTC / 19:00 WIB.
AC-47 Repo is frozen at submission lock except changes explicitly allowed by event rules.

HIGH-VALUE DEPTH — REQUIRED ONLY IF CLAIMED IN SUBMISSION
AC-48 Trading API quote context shown in submission is real and reproducible.
AC-49 DeFi API context shown in submission is real and reproducible.
AC-50 No unsupported Binance capability is claimed.

SPECIAL PRIZE — REQUIRED ONLY IF CLAIMING THAT SPECIAL
AC-SP1 Agentic Wallet/Wallet Skills flow is real, bounded and evidenced.
AC-SP2 User-defined wallet policy/spend boundary is demonstrated where supported.
AC-SP3 BNB Agent Studio Sentinel is actually deployed if Best Use of Agent Studio is
       claimed.
AC-SP4 Studio identity/runtime/task/payment claims have direct evidence.
AC-SP5 Special extension never writes Horoi verdict/state directly.

============================================================
35. RELEASE GATES
============================================================

GATE 1 — CORE SEMANTICS
- real bStock inspection;
- suite manifest;
- report schema;
- multiplier math;
- deterministic hashes.

GATE 2 — BINANCE RWA
- API authentication works;
- ticker/address discovery;
- RWA price/reference context;
- market status context;
- stable errors/latency capture.

GATE 3 — FORK
- Anvil BSC mainnet fork;
- reproducible corporate-action scenarios;
- baseline/invariant tests.

GATE 4 — TARGET INTEGRATION
- custody profile;
- ERC-4626-like profile;
- custom adapter boundary;
- at least one reproducible target path.

GATE 5 — REGISTRY
- contract tests;
- BSC mainnet deployment;
- source verification;
- report publication payload.

GATE 6 — WEB3 MAINNET PROOF
- Binance Transaction API simulation;
- real BSC publication;
- direct chain readback;
- Binance Wallet/transaction readback;
- VERIFIED comparison.

GATE 7 — PRODUCT
- web UI;
- CLI;
- API;
- production deployment;
- clean clone verification.

GATE 8 — DEVEX / SUBMISSION
- DevEx evidence complete;
- <=4 minute demo;
- README/source links;
- final mainnet artifacts;
- submission form;
- repo freeze.

GATE 9 — OPTIONAL DEPTH
Only after GATE 1–8 are stable:
- Trading API quote context;
- DeFi API context.

GATE 10 — SPECIAL PRIZE EXTENSIONS
Only after GATE 1–8 are stable:
- Agentic Wallet/Wallet Skills bounded workflow;
- BNB Agent Studio Horoi Sentinel.

A failure in GATE 9 or 10 must not delay or destabilize the main-track submission.

============================================================
36. NON-GOALS / ANTI-SCOPE
============================================================

Do not add during hackathon unless core gates are already complete and the addition maps
directly to a scored requirement or special-prize proof:

- LangGraph;
- generic LLM reasoning inside conformance;
- chatbot as primary UI;
- autonomous investment strategy;
- portfolio recommendations;
- token launch;
- governance;
- marketplace;
- generic alerting product;
- generalized portfolio analytics;
- arbitrary x402 monetization;
- generic MCP server unrelated to Horoi;
- cross-chain support;
- generalized RWA support;
- Postgres;
- Redis;
- Kafka;
- Kubernetes;
- Docker orchestration beyond a simple deployment need;
- custom indexer;
- GraphQL;
- mobile app;
- browser extension;
- custom oracle;
- certification NFT;
- "AI safety score";
- unsupported trading automation.

Allowed after core gates:
- Agentic Wallet special-prize workflow;
- BNB Agent Studio Sentinel;
- Trading/DeFi API evidence context.

The rule is:

    "Every extra component must either improve the actual Horoi product,
     prove a scoring criterion, or provide real special-prize depth."

No sponsor-shaped feature with no user value.

============================================================
37. POST-HACKATHON ROADMAP
============================================================

Phase 2
- xStocks conformance profile;
- Ondo conformance profile;
- cross-wrapper semantic comparison;
- protocol adapter catalog;
- CI GitHub App;
- report retention/object storage.

Phase 3
- stable machine-readable MCP wrapper;
- persistent Horoi Sentinel productized beyond hackathon;
- protocol release gating:
  "Do not allow an agent to route this token into a target if the latest required Horoi
   report is FAIL/INCOMPLETE or older than policy threshold."
- signed third-party publisher support.

Phase 4
- cross-standard conformance matrix;
- issuer/protocol verification workflows;
- institutional policy engine;
- proof-attested report distribution;
- optional x402 paid verification endpoint if there is actual demand.

Phase 5
- multi-chain tokenized-stock standards only after per-chain semantics are explicit;
- no assumption that EIP-8056/BEP-677 semantics generalize to every chain/provider.

These are roadmap items, not reasons to bloat v1.

============================================================
38. OPEN QUESTIONS TO RESOLVE DURING IMPLEMENTATION
============================================================

Q1. Which exact real bStock contract provides the best reproducible BSC mainnet demo?
Resolution:
- discover through Binance RWA API;
- inspect deployed bytecode/interfaces/roles;
- verify address through BSC RPC;
- do not assume reference implementation matches production byte-for-byte.

Q2. Does the selected production bStock expose every expected BEP-677 interface?
Resolution:
- discover via ERC-165;
- distinguish mandatory vs optional interfaces;
- never fake optional support.

Q3. Which real BSC protocol target is appropriate for first external conformance run?
Resolution:
- target must actually accept or intentionally integrate the selected bStock; OR
- be a transparent integration harness created during the hackathon and clearly labeled
  as such, with no claim that an external protocol already supports bStocks.

Q4. Can each required corporate action be faithfully reproduced through the forked
contract's real authorized path?
Resolution:
- use impersonation only inside fork when faithful;
- if not possible, return INCOMPLETE;
- no raw storage mutation to manufacture PASS.

Q5. What exact Binance RWA API fields are returned for the selected bStock?
Resolution:
- verify live platform/search/price/underlying/market endpoints;
- document missing fields rather than borrowing examples from Ondo responses.

Q6. What are tokenPrice/referencePrice units and timing semantics for selected bStock?
Resolution:
- verify official API response/docs and compare with bStock multiplier semantics;
- store context only until semantics are proven;
- never silently normalize with an assumed multiplier direction.

Q7. Does Trading API expose an executable route for the selected bStock and chosen tiny
notional on BSC?
Resolution:
- verify live;
- if unsupported, omit the feature or show explicit unsupported evidence.

Q8. Does Binance DeFi API support the selected target/action?
Resolution:
- verify live before implementing demo dependency;
- do not choose a target solely because the API lists a protocol unless the asset/action
  is actually supported.

Q9. What exact Transaction API simulation input is required for the HoroiRegistry call?
Resolution:
- implement from current official schema;
- hash exact payload after simulation;
- re-simulate on any payload change.

Q10. What Wallet API transaction readback latency/consistency should Horoi expect after a
BSC tx is mined?
Resolution:
- measure in DevEx;
- direct BSC receipt is finality truth;
- API lag is recorded, not treated as chain failure.

Q11. Does Agentic Wallet currently support the exact bStock/action needed for a credible
special-prize flow?
Resolution:
- verify through live official tooling before claiming;
- otherwise skip this special extension.

Q12. What runtime/language shape does current BNB Agent Studio generate for Horoi Sentinel?
Resolution:
- use current CLI/tool output;
- keep generated runtime isolated under backend if it is not TypeScript;
- do not refactor core Bun stack just to match Studio scaffolding.

Q13. Which Agent Studio capabilities are mainnet vs managed-testnet-only during the event?
Resolution:
- label every runtime/identity/payment proof with actual network/environment;
- never present a testnet-only runtime artifact as BSC mainnet execution.

Q14. What developer-geography/country eligibility API is relevant to Horoi?
Resolution:
- Horoi is developer conformance infrastructure, not a consumer brokerage front end;
- do not add geo-blocking behavior unless official integration requirements make it
  applicable to the deployed product flow.

============================================================
39. KNOWN TECHNICAL FACTS THAT MUST NOT BE MISSTATED
============================================================

1. BEP-677 is currently marked Draft in the BNB Chain BEP repository.

2. BEP-677 adopts EIP-8056 Scaled UI Amount semantics for BSC and adds a BSC-specific
scheduled interface.

3. The core UI multiplier is 18-decimal; 1e18 represents 1.0x.

4. Raw BEP-20 accounting remains canonical. The scaled UI amount is computed from raw
amount and multiplier for display/economic interpretation.

5. Required/optional BEP-677 interfaces must be discovered through ERC-165 rather than
assumed.

6. The reference specification requires TransferWithUIAmount alongside transfers for
compliant implementations and documents rounding/non-symmetric conversion behavior.

7. Round-trip UI/raw conversion is not guaranteed to be lossless because of integer
rounding.

8. bStocks are described by Binance as BEP-20 tokenized securities on BSC that integrate
BEP-677 / Scaled UI Amount and use a Multiplier mechanism for corporate actions.

9. Binance describes dividend value as generally reinvested into the underlying and
reflected proportionally through the multiplier after applicable deductions.

10. Binance describes stock splits as adjusting effective/token quantity through the
multiplier mechanism while preserving the underlying economic relationship.

11. During bStock corporate-action processing, deposit/withdrawal/conversion services may
be temporarily paused. Do not generalize this to every operation without evidence.

12. The official hackathon live page requires a working project built on one or more
Binance Web3 API modules.

13. The hackathon's RWA Data API exposes tokenized-stock platform/token discovery,
onchain token price, underlying reference price and market/underlying context fields.
Exact support differs by asset/platform and must be verified live.

14. Binance Transaction API provides transaction simulation/broadcast-related operations.
Horoi uses simulation as preflight, not as proof of finalized state.

15. Binance Wallet API provides balance/transaction readback. Direct BSC receipt +
registry state remain Horoi's final publication truth.

16. Binance Agentic Wallet is optional to the main track and supports BSC with user-defined
execution/security limits. Horoi must not claim unsupported arbitrary contract-call
capabilities.

17. BNB Agent Studio is optional and currently positions agent identity, wallet, managed
runtime, ERC-8004, ERC-8183 and x402/B402-related capabilities. Network/runtime scope must
be verified at implementation time.

18. A Horoi PASS means only that the recorded suite passed for the recorded
asset/target/block/profile. It is not a permanent, universal safety certificate.

19. Binance Web3 contextHash is not equivalent to resultHash. Market context is
observation-time data and can change between otherwise identical deterministic runs.

20. Horoi does not provide investment advice or tell users whether to buy/sell a stock.

============================================================
40. CURRENT STABLE STACK DECISIONS
============================================================

Verified 19 September 2026:

Bun
1.4.2 stable.

Elysia
1.4.30 latest stable npm tag at verification time.
Elysia 2 remains beta/next and is excluded from core build.

React
19.3.0 stable.

Vite
8.3.0 latest stable npm tag at verification time.

Tailwind CSS
4.3.3 latest stable npm tag at verification time.

TypeScript
7.0.2 latest stable npm tag at verification time.

viem
2.56.7 latest stable npm tag at verification time.

Solidity
0.8.37 stable, released 10 September 2026 with important bug fixes.

OpenZeppelin Contracts
5.6.1 latest audited/stable tag.
Do not use 5.7.0 dev for hackathon release.

Foundry
Use latest stable installed by foundryup, not nightly.

BNB/Binance sponsor tooling
Do not pin versions from memory. Record exact installed Agentic Wallet Skills / Agent
Studio CLI/runtime versions at the time they are actually integrated and tested.

============================================================
41. SOURCES
============================================================

Hackathon:
https://www.bnbchain.org/en/hackathons/tokenized-stocks
https://www.bnbchain.org/en/blog/bnb-hack-tokenized-stocks-edition-with-binance-web3-wallet

Binance Web3 API overview / auth:
https://web3.binance.com/en/dev-docs/introduction
https://web3.binance.com/en/dev-docs/authentication
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api

RWA Data:
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data

Transaction API:
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api

Wallet API:
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/wallet-api

Trading API:
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api

DeFi Data / Transactions:
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/defi-data
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/defi-transaction

B402:
https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/b402-payments

Agentic Wallet / Wallet Skills:
https://developers.binance.com/en/docs/products/agentic-wallet/welcome
https://developers.binance.com/en/docs/products/agentic-wallet/quickstart/install-agentic-wallet
https://developers.binance.com/en/docs/products/agentic-wallet/reference/skills
https://developers.binance.com/en/docs/products/wallet-skills/overview
https://github.com/binance/binance-skills-hub

BNB Agent Studio:
https://www.bnbchain.org/en/bnb-agent-studio
https://www.bnbchain.org/en/blog/bnb-agent-studio-is-live-on-bnb-chain-ai-agents-from-one-prompt

BEP-677 / reference implementation:
https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP-677.md
https://github.com/bnb-chain/bep-677-contracts

bStocks:
https://www.binance.com/en/academy/articles/what-are-bstocks-a-guide-to-tokenized-stocks-on-binance
https://www.binance.com/en/support/announcement/detail/2c0c92ed15ac42d1b14bb1eac00d22bb
https://www.binance.com/en/support/faq/detail/f0d41139fadc4790bf9a4c0c7bce2e88

Stack:
https://bun.sh/
https://www.npmjs.com/package/elysia
https://react.dev/versions
https://www.npmjs.com/package/vite
https://www.npmjs.com/package/tailwindcss
https://www.npmjs.com/package/typescript
https://www.npmjs.com/package/viem
https://www.getfoundry.sh/
https://www.soliditylang.org/blog/2026/09/10/solidity-0.8.37-release-announcement/
https://contracts.openzeppelin.com/
https://www.npmjs.com/package/@openzeppelin/contracts

============================================================
42. FINAL BUILD DIRECTIVE
============================================================

Build Horoi as a narrow, evidence-first tokenized-stock conformance product that is
also deeply integrated with the sponsor stack without surrendering deterministic truth.

Canonical core loop:

    TICKER / BSTOCK ADDRESS
             ↓
    BINANCE RWA DATA RESOLUTION
             ↓
    VERIFY BSC CONTRACT IDENTITY
             ↓
    CAPTURE MARKET / REFERENCE CONTEXT
             ↓
    PIN BSC MAINNET BLOCK
             ↓
    LOCAL FORK
             ↓
    RUN CORPORATE-ACTION SCENARIOS
             ↓
    EVALUATE ECONOMIC INVARIANTS
             ↓
    PASS / FAIL / INCOMPLETE + EVIDENCE
             ↓
    RESULT HASH + SEPARATE CONTEXT HASH
             ↓
    BUILD HOROI REGISTRY PAYLOAD
             ↓
    BINANCE TRANSACTION API SIMULATION
             ↓
    BSC MAINNET PUBLICATION
             ↓
    DIRECT REGISTRY READBACK
             ↓
    BINANCE WALLET / TX READBACK
             ↓
    VERIFIED MAINNET PROOF

Optional depth loop:

    HOROI REPORT
       ├── Trading API executable quote context
       └── DeFi API target/calldata context

Special-prize extension loop:

    AGENTIC WALLET / AGENT STUDIO
                 ↓
         REQUEST / ORCHESTRATE
                 ↓
              HOROI API
                 ↓
      DETERMINISTIC CORE ENGINE
                 ↓
            REPORT RESULT

The agent layer never sits inside the verdict function.

Do not turn Horoi into a generic AI agent just to chase a sponsor category.
Do not build a router as the primary product.
Do not build autonomous investing.
Do not hide incomplete tests behind a score.
Do not claim "certified safe."
Do not merge optional sponsor extensions before core gates are stable.
Do not call Binance modules that are not visible in the product/report.
Do not use Binance API availability as proof of protocol correctness.

The strongest main-track submission is one where a judge can see:
1. a real bStock resolved through Binance Web3 RWA Data;
2. real BSC contract semantics;
3. a real or transparent supported protocol integration;
4. a specific corporate-action state transition;
5. a specific violated/preserved economic invariant;
6. a reproducible PASS/FAIL/INCOMPLETE result;
7. a separate official market/reference context snapshot;
8. a Binance Transaction API simulation of the exact publication call;
9. a BSC mainnet HoroiRegistry proof;
10. a Binance Wallet/transaction readback consistent with direct chain state;
11. a specific, evidence-backed DevEx report.

The strongest special-prize extension is one where the agent/wallet uses Horoi because
it needs independent deterministic evidence before acting — not one where Horoi is
rewritten into an LLM chatbot.

Judge-facing one-liner:

    "Before a DeFi protocol says it supports tokenized stocks, Horoi proves whether
     corporate-action semantics survive the integration — then anchors the evidence
     on BSC and cross-checks the live token context through Binance Web3."

Horoi exists to answer one question:

    "If this tokenized stock changes the way a real stock changes,
     does this DeFi integration still preserve what the user economically owns?"


============================================================
43. JUDGE PROOF MATRIX
============================================================

TECHNICAL IMPLEMENTATION — 30%
Proof to show:
- RWA API calls in live product;
- real BEP-677 reads;
- deterministic fork tests;
- protocol interaction;
- error handling;
- Transaction API simulation;
- mainnet registry tx;
- Wallet API readback;
- clean-clone tests.

CREATIVITY / ORIGINALITY — 25%
Proof to show:
- corporate-action conformance is not a trading/rebalancing clone;
- exact failure class ordinary BEP-20 compatibility misses;
- raw/effective economic claim comparison;
- deterministic reusable suite.

DEVEX — 25%
Proof to show:
- exact onboarding timing;
- concrete auth/docs/API friction;
- measured latency/rate-limit behavior;
- exact tokenized-stock edge cases;
- actionable redesign proposal.

PRODUCT QUALITY / UX — 20%
Proof to show:
- ticker/address → context → test → evidence → publish flow;
- no crypto jargon required to understand verdict;
- every technical claim drillable to evidence;
- clear mainnet/fork/source timestamps.

Tie-break:
- visible, meaningful depth across RWA + Transaction + Wallet;
- Trading/DeFi only if they add real value.


============================================================
44. IMPLEMENTATION PRIORITY
============================================================

P0 — DO FIRST
1. Verify selected real bStock through Binance RWA Data + BSC RPC.
2. Build Binance authentication client and capture real DevEx evidence immediately.
3. Validate BEP-677 interface assumptions against production token.
4. Lock deterministic suite/report schema.
5. Make pinned BSC fork reproducible.

P1 — CORE PRODUCT
6. Implement custody + ERC-4626/custom adapter boundary.
7. Complete split/dividend/scheduled-transition checks.
8. Build UI/CLI/API.
9. Deploy/test HoroiRegistry.

P2 — HACKATHON STACK DEPTH
10. Implement exact Transaction API publication simulation.
11. Publish one report on BSC mainnet.
12. Implement Wallet API transaction readback comparison.
13. Add Trading/DeFi context only after live feasibility is proven.

P3 — SUBMISSION
14. Write DevEx from observed events.
15. Record <=4 minute demo.
16. Clean-clone verification.
17. Freeze dependencies and submission SHA.

P4 — SPECIAL PRIZES
18. Add Agentic Wallet/Wallet Skills only if the flow is genuinely useful and supported.
19. Add BNB Agent Studio Horoi Sentinel only if core remains stable.
20. Record direct evidence for every special-prize claim.


============================================================
45. DEFINITION OF DONE
============================================================

Horoi v2 hackathon build is DONE only when:

- a judge can enter a real bStock ticker/address and see live Binance RWA context;
- Horoi independently verifies the BSC contract and BEP-677 semantics;
- a deterministic fork run produces a reproducible conformance result;
- at least one integration path demonstrates the economic invariant clearly;
- resultHash is stable across equivalent deterministic reruns;
- contextHash is separately captured and never masquerades as deterministic truth;
- the exact registry publication call is simulated through Binance Transaction API;
- a real report is published to HoroiRegistry on BSC mainnet;
- direct registry/receipt readback succeeds;
- Binance Wallet/transaction readback corroborates the publication;
- public UI, CLI and API expose the evidence without secrets;
- tests/build/typecheck/contract tests pass;
- clean-clone judge instructions work;
- DevEx contains specific observed evidence;
- demo is <=4 minutes;
- repo and deployed link remain available through judging;
- all claims in README/demo are backed by real artifacts.

Special prizes are additive, not blockers to DONE.

END OF PRD
