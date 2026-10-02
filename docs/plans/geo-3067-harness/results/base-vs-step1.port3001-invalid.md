(excluded 3 runs with network failures: [('F3b_space_small', 2), ('F3b_space_small', 3), ('F3b_space_small', 4)])
(excluded 1 runs with network failures: [('F3b_space_small', 4)])

## F2_explore  (ab-base n=4 vs ab-step1 n=4)

| metric | ab-base | ab-step1 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,567 | 903.1 | -664.3 (-42%) ± 89.2 | 0.029 ** |
| peak: renderer MB | 951.3 | 571.7 | -379.6 (-40%) ± 68.4 | 0.029 ** |
| peak: GPU MB | 301.2 | 106.0 | -195.2 (-65%) ± 24.6 | 0.029 ** |
| peak: JS heap MB | 95.9 | 135.6 | 39.8 (+41%) ± 16.0 | 0.029 ** |
| peak: page elements | 28,226 | 34,507 | 6,280 (+22%) ± 4,083 | 0.029 ** |
| peak: on-page elements | 5,389 | 11,332 | 5,943 (+110%) ± 1,429 | 0.029 ** |
| peak: decoded image MP | 9.7 | 1.1 | -8.6 (-89%) ± 1.1 | 0.029 ** |
| peak: videos with src | 7.0 | 0.0 | -7.0 (-100%) ± 1.8 | 0.029 ** |
| peak: query cache entries | 1,714 | 1,127 | -587.0 (-34%) ± 107.1 | 0.029 ** |
| peak: query cache MB | 9.4 | 4.5 | -4.9 (-52%) ± 0.5 | 0.029 ** |
| visit: requests | 632.2 | 482.0 | -150.2 (-24%) ± 51.0 | 0.029 ** |
| visit: settle s | 3.4 | 2.1 | -1.3 (-38%) ± 1.3 | 0.029 |
| kept after 1st visit: JS heap MB | 19.6 | 15.3 | -4.3 (-22%) ± 1.7 | 0.029 ** |
| kept after 1st visit: elements | 20,707 | 31,524 | 10,817 (+52%) ± 4,378 | 0.029 ** |
| kept after 1st visit: renderer MB | 420.5 | 105.7 | -314.8 (-75%) ± 85.9 | 0.029 ** |
| each revisit: JS heap MB | 8.7 | 8.2 | -0.6 (-7%) ± 1.7 | 0.343 |
| each revisit: elements | 16,841 | 33,646 | 16,805 (+100%) ± 502.1 | 0.029 ** |

GraphQL operations per first visit: EntityResponseCounts 52→132, EntitiesBatch 91→10, EntityResponders 24→79, Spaces 42→60, Space 22→6, DebateTranscriptClaims 19→0, ClaimResponseSummaries 18→0, anon 16→0

## F3_space_ai  (ab-base n=4 vs ab-step1 n=4)

| metric | ab-base | ab-step1 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,099 | 954.1 | -145.1 (-13%) ± 53.1 | 0.029 ** |
| peak: renderer MB | 584.0 | 510.3 | -73.6 (-13%) ± 39.2 | 0.029 ** |
| peak: GPU MB | 218.7 | 198.6 | -20.1 (-9%) ± 26.4 | 0.114 |
| peak: JS heap MB | 67.2 | 65.7 | -1.6 (-2%) ± 0.5 | 0.029 ** |
| peak: page elements | 11,424 | 9,940 | -1,484 (-13%) ± 64.3 | 0.029 ** |
| peak: on-page elements | 2,683 | 2,656 | -27.0 (-1%) ± 6.9 | 0.029 ** |
| peak: decoded image MP | 19.9 | 19.9 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 575.0 | 518.0 | -57.0 (-10%) ± 4.3 | 0.029 ** |
| peak: query cache MB | 5.5 | 5.1 | -0.4 (-8%) ± 0.7 | 0.200 |
| visit: requests | 537.2 | 496.8 | -40.5 (-8%) ± 6.4 | 0.029 ** |
| visit: settle s | 2.3 | 2.7 | 0.4 (+16%) ± 1.8 | 0.686 |
| kept after 1st visit: JS heap MB | 18.9 | 17.6 | -1.3 (-7%) ± 0.8 | 0.029 ** |
| kept after 1st visit: elements | 1,325 | 210.5 | -1,115 (-84%) ± 421.8 | 0.029 ** |
| kept after 1st visit: renderer MB | 213.6 | 145.9 | -67.7 (-32%) ± 48.5 | 0.029 ** |
| each revisit: JS heap MB | 4.9 | 4.3 | -0.7 (-14%) ± 1.6 | 0.343 |
| each revisit: elements | 564.4 | 143.9 | -420.5 (-75%) ± 206.4 | 0.029 ** |

GraphQL operations per first visit: anon 82→82, EntitiesBatch 70→70, EntityResponseCounts 62→62, EntityCommentCount 45→45, RelationsByFromEntityId 18→18, Spaces 14→16, PropertiesBatch 13→13, EntityResponders 11→10

## F3b_space_small  (ab-base n=1 vs ab-step1 n=3)

| metric | ab-base | ab-step1 | change (95% CI) | p |
|---|---|---|---|---|

GraphQL operations per first visit: EntityResponseCounts 25→50, EntitiesBatch 30→7, EntityResponders 12→29, Spaces 8→12, Space 9→1, anon 8→0, DebateTranscriptClaims 7→0, PropertiesBatch 6→6
