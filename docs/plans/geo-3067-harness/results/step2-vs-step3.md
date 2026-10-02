
## F2_explore  (step2-vs-step3.step2 n=4 vs step2-vs-step3.step3 n=4)

| metric | step2-vs-step3.step2 | step2-vs-step3.step3 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,715 | 1,535 | -179.6 (-10%) ± 737.0 | 0.343 |
| peak: renderer MB | 984.5 | 914.4 | -70.1 (-7%) ± 347.5 | 0.486 |
| peak: GPU MB | 429.1 | 311.9 | -117.1 (-27%) ± 277.4 | 0.343 |
| peak: JS heap MB | 58.5 | 58.9 | 0.3 (+1%) ± 3.0 | 0.886 |
| peak: page elements | 23,138 | 25,236 | 2,097 (+9%) ± 7,456 | 0.657 |
| peak: on-page elements | 1,461 | 1,414 | -47.2 (-3%) ± 363.9 | 0.657 |
| peak: decoded image MP | 13.5 | 14.9 | 1.4 (+11%) ± 4.1 | 0.114 |
| peak: videos with src | 6.0 | 7.5 | 1.5 (+25%) ± 1.6 | 0.143 |
| peak: query cache entries | 1,419 | 1,473 | 53.8 (+4%) ± 662.0 | 0.343 |
| peak: query cache MB | 8.4 | 9.0 | 0.6 (+7%) ± 3.4 | 0.314 |
| visit: requests | 565.0 | 608.2 | 43.2 (+8%) ± 196.4 | 0.429 |
| visit: settle s | 7.1 | 4.1 | -3.0 (-42%) ± 10.4 | 0.486 |
| kept after 1st visit: JS heap MB | 16.3 | 17.0 | 0.7 (+4%) ± 3.7 | 1.000 |
| kept after 1st visit: elements | 8,949 | 9,266 | 317.0 (+4%) ± 1,234 | 0.371 |
| kept after 1st visit: renderer MB | 484.9 | 457.2 | -27.7 (-6%) ± 213.5 | 0.686 |
| each revisit: JS heap MB | 6.5 | 6.3 | -0.3 (-4%) ± 1.6 | 0.343 |
| each revisit: elements | 4,914 | 4,860 | -54.2 (-1%) ± 1,018 | 0.886 |

GraphQL operations per first visit: EntitiesBatch 81→86, Spaces 35→37, EntityResponseCounts 37→7, Space 21→5, EntityResponders 18→20, DebateTranscriptClaims 18→20, anon 16→17, ClaimResponseSummaries 15→15

## F3_space_ai  (step2-vs-step3.step2 n=4 vs step2-vs-step3.step3 n=4)

| metric | step2-vs-step3.step2 | step2-vs-step3.step3 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,159 | 1,208 | 48.9 (+4%) ± 102.2 | 0.486 |
| peak: renderer MB | 624.3 | 660.7 | 36.4 (+6%) ± 60.0 | 0.200 |
| peak: GPU MB | 232.7 | 254.4 | 21.7 (+9%) ± 57.4 | 0.686 |
| peak: JS heap MB | 67.7 | 66.8 | -1.0 (-1%) ± 2.1 | 0.114 |
| peak: page elements | 11,636 | 11,290 | -345.8 (-3%) ± 438.7 | 0.029 |
| peak: on-page elements | 2,652 | 2,645 | -7.5 (-0%) ± 25.5 | 1.000 |
| peak: decoded image MP | 19.9 | 19.9 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 577.8 | 569.5 | -8.2 (-1%) ± 11.2 | 0.029 |
| peak: query cache MB | 5.2 | 5.2 | -0.0 (-0%) ± 0.0 | 0.714 |
| visit: requests | 546.0 | 436.5 | -109.5 (-20%) ± 39.3 | 0.029 ** |
| visit: settle s | 2.6 | 2.2 | -0.4 (-17%) ± 1.8 | 0.886 |
| kept after 1st visit: JS heap MB | 18.9 | 19.0 | 0.1 (+0%) ± 0.6 | 0.886 |
| kept after 1st visit: elements | 1,398 | 1,618 | 220.2 (+16%) ± 469.2 | 0.286 |
| kept after 1st visit: renderer MB | 275.8 | 289.6 | 13.9 (+5%) ± 57.4 | 0.686 |
| each revisit: JS heap MB | 4.6 | 4.5 | -0.1 (-2%) ± 1.4 | 1.000 |
| each revisit: elements | 563.6 | 434.9 | -128.8 (-23%) ± 223.0 | 0.486 |

GraphQL operations per first visit: anon 82→82, EntitiesBatch 72→72, EntityResponseCounts 62→0, EntityCommentCount 45→0, RelationsByFromEntityId 18→0, EntityBacklinksPage 7→18, Spaces 12→14, PropertiesBatch 13→13

## F4_claim_page  (step2-vs-step3.step2 n=3 vs step2-vs-step3.step3 n=4)

| metric | step2-vs-step3.step2 | step2-vs-step3.step3 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 859.5 | 904.5 | 45.0 (+5%) ± 77.7 | 0.400 |
| peak: renderer MB | 427.7 | 447.6 | 19.9 (+5%) ± 50.7 | 0.400 |
| peak: GPU MB | 158.3 | 184.2 | 25.9 (+16%) ± 29.2 | 0.400 |
| peak: JS heap MB | 41.2 | 41.5 | 0.2 (+1%) ± 0.4 | 0.257 |
| peak: page elements | 5,759 | 5,902 | 142.8 (+2%) ± 455.1 | 0.771 |
| peak: on-page elements | 1,375 | 1,375 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: decoded image MP | 54.1 | 54.1 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 211.0 | 217.2 | 6.2 (+3%) ± 19.9 | 1.000 |
| peak: query cache MB | 1.0 | 1.0 | 0.0 (+2%) ± 0.0 | 1.000 |
| visit: requests | 119.0 | 102.8 | -16.2 (-14%) ± 5.4 | 0.029 ** |
| visit: settle s | 2.0 | 2.0 | 0.0 (+1%) ± 0.0 | 0.114 |
| kept after 1st visit: JS heap MB | 4.9 | 5.0 | 0.1 (+1%) ± 0.4 | 1.000 |
| kept after 1st visit: elements | 677.7 | 676.5 | -1.2 (-0%) ± 17.5 | 0.971 |
| kept after 1st visit: renderer MB | 98.7 | 123.6 | 24.9 (+25%) ± 44.3 | 0.229 |
| each revisit: JS heap MB | 0.9 | 0.9 | 0.1 (+7%) ± 0.2 | 0.229 |
| each revisit: elements | 395.5 | 395.5 | 0.0 (+0%) ± 0.0 | 1.000 |

GraphQL operations per first visit: EntityResponseCounts 18→2, EntityResponders 18→17, EntitiesBatch 11→12, Spaces 5→6, PropertiesBatch 5→5, Space 3→1, EntityCommentCounts 2→2, RelationsByFromEntityId 2→0

## F7_space_tabs  (step2-vs-step3.step2 n=4 vs step2-vs-step3.step3 n=4)

| metric | step2-vs-step3.step2 | step2-vs-step3.step3 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,400 | 1,427 | 26.3 (+2%) ± 390.9 | 0.886 |
| peak: renderer MB | 943.0 | 909.0 | -34.0 (-4%) ± 259.8 | 0.686 |
| peak: GPU MB | 221.4 | 275.4 | 54.0 (+24%) ± 219.2 | 0.686 |
| peak: JS heap MB | 75.6 | 75.6 | 0.0 (+0%) ± 0.7 | 0.486 |
| peak: page elements | 6,479 | 6,500 | 21.0 (+0%) ± 109.9 | 0.914 |
| peak: on-page elements | 1,966 | 1,974 | 8.2 (+0%) ± 28.9 | 0.743 |
| peak: decoded image MP | 3.3 | 3.3 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 2,990 | 2,990 | -0.5 (-0%) ± 8.6 | 0.886 |
| peak: query cache MB | 12.2 | 12.1 | -0.1 (-1%) ± 0.5 | 0.629 |
| visit: requests | 951.0 | 527.8 | -423.2 (-45%) ± 8.4 | 0.029 ** |
| visit: settle s | 2.1 | 2.1 | 0.0 (+0%) ± 0.1 | 0.771 |
| kept after 1st visit: JS heap MB | 29.5 | 29.4 | -0.1 (-0%) ± 1.7 | 0.343 |
| kept after 1st visit: elements | 222.5 | 217.0 | -5.5 (-2%) ± 12.3 | 0.371 |
| kept after 1st visit: renderer MB | 585.2 | 558.3 | -26.9 (-5%) ± 262.1 | 0.886 |
| each revisit: JS heap MB | 11.6 | 11.8 | 0.2 (+2%) ± 1.5 | 0.343 |
| each revisit: elements | 138.1 | 138.1 | 0.0 (+0%) ± 0.4 | 1.000 |

GraphQL operations per first visit: EntityCommentCount 238→0, EntitiesBatch 135→136, EntityResponseCounts 122→1, RelationsByFromEntityId 80→0, PropertiesBatch 66→66, RelationFacet 50→50, Spaces 36→36, EntityResponders 20→20
