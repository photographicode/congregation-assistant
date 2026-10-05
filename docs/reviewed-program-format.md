Import one month (one to six ISO weeks) through Schedule → Reviewed monthly program import. The program must be checked by the scheduler and contain text the congregation has permission to use. No automatic website scraping or bundled workbook text is provided.

Example using independently written demonstration labels:

```json
{"weeks":{"2026-W41":{"reading":"Local reading reference","parts":[{"id":"TreasuresTalk","type":"TreasuresTalk","section":"treasures","title":"Demo Bible treasures talk","minutes":10,"assistant":false},{"id":"StudentA","type":"Conversation","section":"field","title":"Demo conversation exercise","minutes":3,"assistant":true},{"id":"LocalDiscussion","type":"ChristianParts","section":"living","title":"Demo local discussion","minutes":10,"assistant":false}]}}}
```

Use stable unique IDs within each week. Types are Chairman, Prayer, TreasuresTalk, SpiritualGems, BibleReading, Conversation, FollowingUp, Disciples, Beliefs, Assistant, ChristianParts, BibleStudy or BibleStudyReader. Sections are treasures, field or living. Duration is a whole number from 0 to 60 minutes. Keep each title at most 300 characters, each week at most 36 parts and each file below 500 KB. The review confirmation lists every imported title, type and duration. Existing assignment identities are retained; review changes to parts before publishing. Changed assignment types determine future eligibility and history; they must not inherit a misleading old slot classification.
