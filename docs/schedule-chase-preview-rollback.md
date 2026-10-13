# Schedule chase preview — rollback

Feature flag (off = previous chase behaviour):

- `CASEBRAIN_SCHEDULE_CHASE_LAB=0` or unset → lab path disabled (rollback)
- `CASEBRAIN_SCHEDULE_CHASE_LAB=1` → reviewed schedule-chase path enabled

CPS chase letter remains held while the lab path is on.

This preview releases reviewed schedule-chase improvements only. It is not a claim that the whole app is trained or fully validated. Learning stores are not modified by this path.
