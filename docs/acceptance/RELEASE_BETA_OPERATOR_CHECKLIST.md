# CulinaryOS beta operator acceptance

Status: NOT RUN. Complete after the automated release gates in [RELEASE_READINESS.md](../RELEASE_READINESS.md). Use synthetic restaurant, staff and customer records. Record the exact revision, artifact hash, device/OS/browser and deployment URL for each run. A failed prerequisite blocks dependent cases.

This packet does not certify any device or payment provider. Server installation and client access are different: the self-host server requires its supported container environment; phones/tablets use the web clients. Native installers require their own platform build, signing and device checks.

| ID | Operator action | Required result | Result |
| --- | --- | --- | --- |
| H01 | Download the candidate onto a clean supported server and follow its installation guide | Prerequisites are checked; no developer checkout, private keys or unrecorded setup is required | NOT RUN |
| H02 | Open POS, KDS and manager screens from a second LAN device using the server's IP | API calls reach that server; no calls to the tablet's localhost; login and menus work | NOT RUN |
| H03 | Configure a domain and valid TLS certificate using the guide | Every public entrypoint loads securely; no browser warning bypass is needed | NOT RUN |
| H04 | Restart the server and reopen the clients | Accounts, menus, orders and kitchen tickets remain; clients reconnect without losing acknowledged work | NOT RUN |
| H05 | Follow marketing links for cloud, self-host and the demo | Each opens the intended destination; demo is labelled and isolated; signup never claims success on failure | NOT RUN |
| H06 | Create a cloud account and follow its verification email | Unverified access is refused; verification works once; expired/reused links are refused; failed delivery has an honest retry path | NOT RUN |
| H07 | Create a second independent restaurant account | Neither account can read or modify the other's menus, orders, devices or users | NOT RUN |
| H08 | Complete first-run setup with a manager account | Setup ends with a usable restaurant workspace and explicit POS/KDS device enrollment | NOT RUN |
| H09 | Sign in with an ordinary staff account | Staff can perform their assigned job and cannot access restricted management functions through either navigation or direct URLs | NOT RUN |
| H10 | Create a sample menu item with required and optional modifiers, then place an order | Required choices are enforced, amounts match the configured integer-cent prices, and the check survives navigation | NOT RUN |
| H11 | Send the same check twice and inspect KDS | One durable kitchen effect; seats, courses, notes and modifiers agree; ticket completion reaches the POS | NOT RUN |
| H12 | Disconnect a POS, queue permitted work, reconnect and retry | No acknowledged work is lost or duplicated; conflicts are explicit; card settlement is never invented offline | NOT RUN |
| H13 | Repeat H12 during the documented offline-duration load case | Full planned duration and recovery evidence are recorded; a short smoke test does not pass a two-hour gate | NOT RUN |
| H14 | Perform a synthetic cash sale, refund and drawer close | Authorized actions conserve every cent; excessive refunds and unauthorized comps are refused | NOT RUN |
| H15 | Back up the test venue, restore into a separate empty environment and compare records | Documented recovery succeeds without exposing another tenant or replacing the live environment | NOT RUN |
| H16 | Print a test receipt and trigger the configured drawer from the actual POS | A person confirms the physical slip and drawer movement; UI messages alone do not pass | NOT RUN |
| H17 | Pair each advertised payment reader and exercise the approved processor test workflow | Provider result, tenant/account, amount and application state agree; duplicate submission cannot duplicate settlement | NOT RUN |
| H18 | Walk signup, first order, error recovery and daily work on phone, tablet and desktop | Main actions remain reachable, text fits, focus is visible, and errors explain the next step | NOT RUN |
| H19 | Export venue records and follow the documented exit/support path | The operator can obtain their data and reach working support without an invented address or broken link | NOT RUN |

For each completed case record: **YES / NO**, evidence location, observed failure if any, and reviewer initials/date. Do not replace NOT RUN with YES until the required result is observed.

Release decision: **PENDING**. Public signup, physical hardware support, supported operating systems and general availability are advertised only for gates that have passed. Failed gates remain visible in the release record.
