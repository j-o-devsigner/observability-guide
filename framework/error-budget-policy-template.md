# Error budget policy template

> Adapted from the [SRE Workbook's example error budget policy](https://sre.google/workbook/error-budget-policy/).
> The policy is **not a punishment**. It's an agreement made in advance, so a spent budget leads to a decision
> instead of an argument. Values marked ⚠️ are suggestions to adjust.

| Field | Value |
|---|---|
| Applies to | services / SLO documents |
| Owners | service owner · SRE · engineering manager |
| Approved on | YYYY-MM-DD |
| Review | yearly or after a policy escalation |

## 1. Goals and non-goals

| Goals | Non-goals |
|---|---|
| Protect users from repeated SLO misses | Punish teams for missing SLOs |
| Give a clear signal to balance reliability and features | Stop all change (halting releases is a last resort) |

## 2. While the service is within its SLO

Releases and feature work continue normally.

## 3. When the budget is exhausted (over the last 4 weeks)

- All changes and releases stop **except P0 issues and security fixes**, until the service is back within its SLO.
- The team prioritizes reliability work.

Reliability work is **mandatory** when the overrun was caused by:

| Cause | Example |
|---|---|
| The team's own code bug or procedural error | Bad config pushed without canary |
| A hard dependency found in a postmortem that could be softened | No timeout or fallback to a downstream |
| Errors that were miscategorized and hid budget spend | 5xx counted as success |

## 4. Exemptions (feature work may continue)

| Cause | Why exempt |
|---|---|
| Company-wide network or infrastructure problem | Not within the team's control |
| Another team's service (which has frozen its own releases) | The owner is already acting |
| Out-of-scope traffic (load tests, penetration tests) | Not real users |

## 5. Outage policy

| Trigger | Required action |
|---|---|
| A single incident uses **> 20%** of the 4-week budget | Postmortem with at least one **P0 action item** |
| A class of outage uses > 20% of the quarter's budget | A P0 item in next quarter's plan |

## 6. Escalation

If the owners disagree about the budget calculation or the actions, escalate to [role, e.g. head of engineering] ⚠️.

## 7. Communication

| Event | Who is told | Channel |
|---|---|---|
| Budget below 50% ⚠️ | Team | Team channel (automatic) |
| Budget exhausted, freeze starts | Team, manager, dependent teams | Channel + email |
| Freeze ends | Same | Channel |

## 8. Signatures

| Role | Name | Date |
|---|---|---|
| Service owner | | |
| SRE | | |
| Engineering manager | | |
