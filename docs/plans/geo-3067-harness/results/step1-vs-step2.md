
## F2_explore  (step1-vs-step2.step1 n=4 vs step1-vs-step2.step2 n=4)

| metric | step1-vs-step2.step1 | step1-vs-step2.step2 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,640 | 1,621 | -18.5 (-1%) ± 596.0 | 0.486 |
| peak: renderer MB | 901.9 | 941.9 | 40.0 (+4%) ± 315.4 | 0.886 |
| peak: GPU MB | 433.0 | 370.5 | -62.5 (-14%) ± 268.0 | 0.343 |
| peak: JS heap MB | 81.1 | 59.0 | -22.1 (-27%) ± 2.2 | 0.029 ** |
| peak: page elements | 25,746 | 25,464 | -282.5 (-1%) ± 1,513 | 0.400 |
| peak: on-page elements | 4,244 | 1,369 | -2,874 (-68%) ± 63.6 | 0.029 ** |
| peak: decoded image MP | 12.0 | 14.8 | 2.8 (+23%) ± 10.3 | 0.571 |
| peak: videos with src | 8.0 | 6.5 | -1.5 (-19%) ± 1.6 | 0.143 |
| peak: query cache entries | 1,516 | 1,552 | 35.2 (+2%) ± 303.4 | 0.571 |
| peak: query cache MB | 8.9 | 9.2 | 0.3 (+4%) ± 1.6 | 0.829 |
| visit: requests | 626.0 | 617.8 | -8.2 (-1%) ± 49.6 | 0.886 |
| visit: settle s | 11.5 | 7.0 | -4.5 (-39%) ± 20.4 | 0.686 |
| kept after 1st visit: JS heap MB | 18.6 | 17.4 | -1.2 (-6%) ± 1.3 | 0.114 |
| kept after 1st visit: elements | 18,083 | 9,539 | -8,544 (-47%) ± 535.4 | 0.029 ** |
| kept after 1st visit: renderer MB | 370.5 | 434.3 | 63.8 (+17%) ± 233.7 | 0.686 |
| each revisit: JS heap MB | 7.8 | 6.3 | -1.4 (-18%) ± 0.6 | 0.029 ** |
| each revisit: elements | 13,657 | 4,785 | -8,872 (-65%) ± 826.7 | 0.029 ** |

GraphQL operations per first visit: EntitiesBatch 86→89, EntityResponseCounts 42→41, Spaces 38→39, DebateTranscriptClaims 26→20, Space 22→22, EntityResponders 20→20, ClaimResponseSummaries 17→17, anon 16→17

## F3_space_ai  (step1-vs-step2.step1 n=4 vs step1-vs-step2.step2 n=4)

| metric | step1-vs-step2.step1 | step1-vs-step2.step2 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,141 | 1,136 | -4.6 (-0%) ± 158.4 | 1.000 |
| peak: renderer MB | 600.0 | 608.7 | 8.8 (+1%) ± 111.6 | 0.886 |
| peak: GPU MB | 245.9 | 238.3 | -7.7 (-3%) ± 49.7 | 0.200 |
| peak: JS heap MB | 67.4 | 66.9 | -0.4 (-1%) ± 0.6 | 0.343 |
| peak: page elements | 11,926 | 11,465 | -460.8 (-4%) ± 555.6 | 0.114 |
| peak: on-page elements | 2,660 | 2,660 | 0.0 (+0%) ± 42.4 | 1.000 |
| peak: decoded image MP | 20.5 | 19.9 | -0.6 (-3%) ± 2.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 584.0 | 575.0 | -9.0 (-2%) ± 14.4 | 0.286 |
| peak: query cache MB | 5.3 | 5.3 | -0.0 (-0%) ± 0.1 | 0.800 |
| visit: requests | 548.0 | 543.2 | -4.8 (-1%) ± 15.0 | 0.486 |
| visit: settle s | 5.7 | 3.6 | -2.1 (-37%) ± 11.0 | 0.886 |
| kept after 1st visit: JS heap MB | 19.1 | 18.6 | -0.5 (-3%) ± 0.3 | 0.029 ** |
| kept after 1st visit: elements | 1,372 | 1,460 | 88.5 (+6%) ± 516.1 | 0.886 |
| kept after 1st visit: renderer MB | 227.3 | 210.4 | -16.9 (-7%) ± 118.6 | 0.686 |
| each revisit: JS heap MB | 4.9 | 5.1 | 0.2 (+5%) ± 1.2 | 0.343 |
| each revisit: elements | 563.6 | 499.2 | -64.4 (-11%) ± 252.7 | 1.000 |

GraphQL operations per first visit: anon 82→82, EntitiesBatch 70→70, EntityResponseCounts 62→62, EntityCommentCount 45→45, RelationsByFromEntityId 18→18, Spaces 14→14, PropertiesBatch 13→13, EntityResponders 10→12

## F3b_space_small  (step1-vs-step2.step1 n=4 vs step1-vs-step2.step2 n=4)

| metric | step1-vs-step2.step1 | step1-vs-step2.step2 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,603 | 1,530 | -73.2 (-5%) ± 58.7 | 0.057 |
| peak: renderer MB | 802.8 | 777.5 | -25.3 (-3%) ± 36.2 | 0.200 |
| peak: GPU MB | 492.2 | 444.7 | -47.6 (-10%) ± 71.7 | 0.114 |
| peak: JS heap MB | 76.1 | 62.8 | -13.3 (-17%) ± 10.5 | 0.029 ** |
| peak: page elements | 14,774 | 12,497 | -2,277 (-15%) ± 143.3 | 0.029 ** |
| peak: on-page elements | 3,498 | 2,214 | -1,284 (-37%) ± 39.0 | 0.029 ** |
| peak: decoded image MP | 22.5 | 23.0 | 0.5 (+2%) ± 1.7 | 0.143 |
| peak: videos with src | 6.0 | 6.0 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: query cache entries | 645.8 | 647.5 | 1.8 (+0%) ± 5.5 | 0.543 |
| peak: query cache MB | 2.8 | 2.8 | 0.0 (+0%) ± 0.0 | 1.000 |
| visit: requests | 262.2 | 268.5 | 6.2 (+2%) ± 18.6 | 0.914 |
| visit: settle s | 9.4 | 10.6 | 1.1 (+12%) ± 10.6 | 0.886 |
| kept after 1st visit: JS heap MB | 12.0 | 11.5 | -0.5 (-4%) ± 1.3 | 0.343 |
| kept after 1st visit: elements | 11,251 | 7,326 | -3,925 (-35%) ± 554.2 | 0.029 ** |
| kept after 1st visit: renderer MB | 294.9 | 240.3 | -54.6 (-19%) ± 86.1 | 0.114 |
| each revisit: JS heap MB | 2.7 | 2.9 | 0.3 (+10%) ± 0.6 | 0.343 |
| each revisit: elements | 1,694 | 2,621 | 927.1 (+55%) ± 3,942 | 0.743 |

GraphQL operations per first visit: EntitiesBatch 29→30, EntityResponseCounts 25→21, EntityResponders 12→12, Space 9→9, anon 8→8, Spaces 8→8, DebateTranscriptClaims 7→7, PropertiesBatch 6→6
