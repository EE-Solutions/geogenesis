(excluded 2 runs with network failures: [('F2_explore', 1), ('F3_space_ai', 2)])

## F2_explore  (ab-base n=3 vs ab-basecopy n=2)

| metric | ab-base | ab-basecopy | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,567 | 1,412 | -155.5 (-10%) ± 1,197 | 0.400 |
| peak: renderer MB | 927.4 | 800.7 | -126.6 (-14%) ± 1,361 | 0.400 |
| peak: GPU MB | 326.1 | 315.4 | -10.7 (-3%) ± 123.1 | 1.000 |
| peak: JS heap MB | 94.6 | 95.2 | 0.6 (+1%) ± 15.3 | 1.000 |
| peak: page elements | 28,568 | 28,558 | -10.0 (-0%) ± 599.9 | 1.000 |
| peak: on-page elements | 5,470 | 5,470 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: decoded image MP | 9.1 | 9.1 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 6.0 | 6.0 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: query cache entries | 1,696 | 1,674 | -22.8 (-1%) ± 828.4 | 0.400 |
| peak: query cache MB | 9.4 | 9.2 | -0.2 (-2%) ± 4.4 | 0.600 |
| visit: requests | 616.7 | 605.5 | -11.2 (-2%) ± 363.6 | 0.800 |
| visit: settle s | 5.3 | 4.5 | -0.8 (-15%) ± 5.7 | 1.000 |
| kept after 1st visit: JS heap MB | 19.8 | 19.8 | -0.0 (-0%) ± 6.1 | 1.000 |
| kept after 1st visit: elements | 21,144 | 21,356 | 211.5 (+1%) ± 880.8 | 0.400 |
| kept after 1st visit: renderer MB | 392.2 | 331.4 | -60.8 (-16%) ± 317.5 | 0.400 |
| each revisit: JS heap MB | 9.2 | 8.7 | -0.5 (-6%) ± 2.4 | 0.800 |
| each revisit: elements | 16,928 | 17,112 | 184.3 (+1%) ± 3,838 | 0.500 |

GraphQL operations per first visit: EntitiesBatch 92→86, EntityResponseCounts 54→54, Spaces 41→42, EntityResponders 26→26, Space 22→22, DebateTranscriptClaims 19→19, ClaimResponseSummaries 17→18, anon 16→16

## F3_space_ai  (ab-base n=3 vs ab-basecopy n=2)

| metric | ab-base | ab-basecopy | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,014 | 1,086 | 72.6 (+7%) ± 369.1 | 0.400 |
| peak: renderer MB | 558.2 | 597.7 | 39.5 (+7%) ± 224.9 | 0.400 |
| peak: GPU MB | 188.5 | 208.0 | 19.6 (+10%) ± 200.7 | 0.400 |
| peak: JS heap MB | 64.7 | 68.0 | 3.4 (+5%) ± 11.2 | 0.400 |
| peak: page elements | 10,614 | 11,484 | 869.7 (+8%) ± 4,068 | 0.800 |
| peak: on-page elements | 2,397 | 2,538 | 140.5 (+6%) ± 1,368 | 1.000 |
| peak: decoded image MP | 19.9 | 19.9 | 0.0 (+0%) ± 0.1 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 532.7 | 563.5 | 30.8 (+6%) ± 210.1 | 0.800 |
| peak: query cache MB | 4.9 | 5.2 | 0.2 (+5%) ± 1.8 | 0.800 |
| visit: requests | 518.3 | 522.5 | 4.2 (+1%) ± 139.0 | 0.800 |
| visit: settle s | 14.6 | 8.2 | -6.4 (-44%) ± 44.2 | 0.800 |
| kept after 1st visit: JS heap MB | 18.6 | 19.0 | 0.4 (+2%) ± 2.4 | 0.800 |
| kept after 1st visit: elements | 1,392 | 1,216 | -175.2 (-13%) ± 785.8 | 0.800 |
| kept after 1st visit: renderer MB | 159.8 | 174.9 | 15.1 (+9%) ± 124.0 | 0.800 |
| each revisit: JS heap MB | 4.9 | 5.6 | 0.7 (+14%) ± 2.2 | 0.400 |
| each revisit: elements | 542.2 | 629.5 | 87.3 (+16%) ± 369.1 | 0.600 |

GraphQL operations per first visit: anon 82→82, EntitiesBatch 70→70, EntityResponseCounts 54→58, EntityCommentCount 36→40, RelationsByFromEntityId 18→18, Spaces 15→14, PropertiesBatch 13→13, EntityResponders 11→12
