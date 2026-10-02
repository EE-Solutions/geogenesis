
## F2_explore  (base-vs-branch.base n=4 vs base-vs-branch.branch n=4)

| metric | base-vs-branch.base | base-vs-branch.branch | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,475 | 1,697 | 222.7 (+15%) ± 441.0 | 0.200 |
| peak: renderer MB | 864.4 | 987.4 | 123.0 (+14%) ± 212.3 | 0.200 |
| peak: GPU MB | 311.5 | 400.9 | 89.5 (+29%) ± 245.7 | 0.200 |
| peak: JS heap MB | 87.2 | 78.1 | -9.1 (-10%) ± 39.7 | 0.486 |
| peak: page elements | 26,204 | 23,772 | -2,432 (-9%) ± 6,555 | 0.200 |
| peak: on-page elements | 4,710 | 1,473 | -3,236 (-69%) ± 965.8 | 0.029 ** |
| peak: decoded image MP | 10.7 | 21.5 | 10.9 (+102%) ± 44.7 | 0.686 |
| peak: videos with src | 6.5 | 7.5 | 1.0 (+15%) ± 5.0 | 1.000 |
| peak: query cache entries | 1,462 | 1,428 | -34.2 (-2%) ± 467.4 | 0.886 |
| peak: query cache MB | 8.7 | 8.6 | -0.0 (-0%) ± 2.1 | 0.886 |
| visit: requests | 565.8 | 576.5 | 10.8 (+2%) ± 125.9 | 0.886 |
| visit: settle s | 4.4 | 3.7 | -0.6 (-14%) ± 2.8 | 0.686 |
| kept after 1st visit: JS heap MB | 19.4 | 17.7 | -1.7 (-9%) ± 2.4 | 0.343 |
| kept after 1st visit: elements | 19,325 | 9,729 | -9,596 (-50%) ± 4,772 | 0.029 ** |
| kept after 1st visit: renderer MB | 379.1 | 495.0 | 115.9 (+31%) ± 146.2 | 0.057 |
| each revisit: JS heap MB | 8.0 | 6.1 | -1.9 (-24%) ± 1.5 | 0.057 |
| each revisit: elements | 15,719 | 4,754 | -10,965 (-70%) ± 382.3 | 0.029 ** |

GraphQL operations per first visit: EntitiesBatch 81→88, EntityResponseCounts 46→15, Spaces 33→32, Space 20→5, DebateTranscriptClaims 18→20, anon 15→16, ClaimResponseSummaries 13→14, EntityResponders 14→13

## F3_space_ai  (base-vs-branch.base n=4 vs base-vs-branch.branch n=4)

| metric | base-vs-branch.base | base-vs-branch.branch | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,113 | 1,113 | -0.2 (-0%) ± 119.1 | 0.886 |
| peak: renderer MB | 590.1 | 599.6 | 9.5 (+2%) ± 59.3 | 1.000 |
| peak: GPU MB | 234.1 | 229.4 | -4.7 (-2%) ± 55.8 | 0.886 |
| peak: JS heap MB | 66.4 | 64.9 | -1.5 (-2%) ± 3.0 | 0.486 |
| peak: page elements | 11,362 | 10,361 | -1,000 (-9%) ± 1,712 | 0.171 |
| peak: on-page elements | 2,595 | 2,359 | -235.8 (-9%) ± 423.3 | 0.371 |
| peak: decoded image MP | 19.9 | 16.8 | -3.2 (-16%) ± 10.0 | 0.257 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 570.0 | 529.5 | -40.5 (-7%) ± 63.6 | 0.114 |
| peak: query cache MB | 5.4 | 5.0 | -0.4 (-7%) ± 0.7 | 0.143 |
| visit: requests | 541.5 | 417.0 | -124.5 (-23%) ± 34.4 | 0.029 ** |
| visit: settle s | 3.2 | 4.8 | 1.6 (+52%) ± 5.0 | 0.686 |
| kept after 1st visit: JS heap MB | 19.3 | 19.1 | -0.2 (-1%) ± 1.1 | 0.886 |
| kept after 1st visit: elements | 1,546 | 1,501 | -45.0 (-3%) ± 566.6 | 0.771 |
| kept after 1st visit: renderer MB | 236.0 | 237.8 | 1.9 (+1%) ± 96.8 | 1.000 |
| each revisit: JS heap MB | 5.4 | 5.5 | 0.1 (+2%) ± 1.0 | 0.886 |
| each revisit: elements | 628.8 | 541.8 | -87.0 (-14%) ± 177.0 | 0.286 |

GraphQL operations per first visit: anon 82→82, EntitiesBatch 72→70, EntityResponseCounts 59→0, EntityCommentCount 43→0, RelationsByFromEntityId 18→0, Spaces 12→14, PropertiesBatch 13→13, EntityResponders 10→9

## F3b_space_small  (base-vs-branch.base n=4 vs base-vs-branch.branch n=4)

| metric | base-vs-branch.base | base-vs-branch.branch | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,283 | 1,226 | -57.3 (-4%) ± 56.7 | 0.114 |
| peak: renderer MB | 721.3 | 673.7 | -47.6 (-7%) ± 59.6 | 0.114 |
| peak: GPU MB | 257.1 | 254.0 | -3.1 (-1%) ± 11.7 | 0.686 |
| peak: JS heap MB | 95.4 | 52.5 | -42.9 (-45%) ± 4.5 | 0.029 ** |
| peak: page elements | 16,157 | 10,370 | -5,787 (-36%) ± 2,784 | 0.029 ** |
| peak: on-page elements | 3,753 | 1,548 | -2,205 (-59%) ± 872.0 | 0.029 ** |
| peak: decoded image MP | 16.0 | 16.2 | 0.2 (+2%) ± 3.3 | 0.429 |
| peak: videos with src | 8.0 | 8.0 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: query cache entries | 758.2 | 504.8 | -253.5 (-33%) ± 151.2 | 0.029 ** |
| peak: query cache MB | 3.1 | 2.6 | -0.4 (-15%) ± 0.3 | 0.057 |
| visit: requests | 256.0 | 240.0 | -16.0 (-6%) ± 30.0 | 0.200 |
| visit: settle s | 4.5 | 4.8 | 0.2 (+5%) ± 3.6 | 1.000 |
| kept after 1st visit: JS heap MB | 13.1 | 10.7 | -2.4 (-19%) ± 1.7 | 0.029 ** |
| kept after 1st visit: elements | 11,585 | 5,493 | -6,092 (-53%) ± 2,461 | 0.029 ** |
| kept after 1st visit: renderer MB | 228.9 | 219.3 | -9.6 (-4%) ± 48.1 | 0.686 |
| each revisit: JS heap MB | 3.6 | 3.4 | -0.1 (-3%) ± 1.5 | 0.343 |
| each revisit: elements | 4,849 | 916.0 | -3,933 (-81%) ± 3,332 | 0.057 |

GraphQL operations per first visit: EntitiesBatch 36→32, EntityResponseCounts 16→4, DebateTranscriptClaims 9→8, PropertiesBatch 6→6, Space 5→1, Spaces 5→4, ClaimResponseSummaries 4→3, anon 4→3

## F4_claim_page  (base-vs-branch.base n=4 vs base-vs-branch.branch n=4)

| metric | base-vs-branch.base | base-vs-branch.branch | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 872.0 | 916.1 | 44.2 (+5%) ± 69.4 | 0.200 |
| peak: renderer MB | 432.9 | 459.7 | 26.8 (+6%) ± 33.6 | 0.057 |
| peak: GPU MB | 163.1 | 177.2 | 14.1 (+9%) ± 39.0 | 0.486 |
| peak: JS heap MB | 41.4 | 41.6 | 0.2 (+0%) ± 0.6 | 0.486 |
| peak: page elements | 5,902 | 5,766 | -136.0 (-2%) ± 455.6 | 1.000 |
| peak: on-page elements | 1,375 | 1,375 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: decoded image MP | 54.1 | 54.1 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 216.2 | 208.0 | -8.2 (-4%) ± 21.4 | 0.371 |
| peak: query cache MB | 1.0 | 1.0 | -0.0 (-2%) ± 0.0 | 1.000 |
| visit: requests | 120.0 | 100.0 | -20.0 (-17%) ± 7.8 | 0.029 ** |
| visit: settle s | 2.3 | 2.2 | -0.1 (-4%) ± 0.3 | 0.686 |
| kept after 1st visit: JS heap MB | 5.6 | 5.7 | 0.1 (+2%) ± 1.3 | 0.886 |
| kept after 1st visit: elements | 674.0 | 668.0 | -6.0 (-1%) ± 11.0 | 0.429 |
| kept after 1st visit: renderer MB | 99.0 | 112.4 | 13.4 (+14%) ± 46.5 | 0.486 |
| each revisit: JS heap MB | 1.0 | 1.0 | 0.0 (+2%) ± 0.2 | 0.886 |
| each revisit: elements | 331.1 | 202.4 | -128.8 (-39%) ± 223.0 | 0.486 |

GraphQL operations per first visit: EntityResponseCounts 19→2, EntityResponders 17→17, EntitiesBatch 11→11, Spaces 6→6, PropertiesBatch 5→5, Space 3→1, EntityCommentCounts 2→2, RelationsByFromEntityId 2→0

## F7_space_tabs  (base-vs-branch.base n=4 vs base-vs-branch.branch n=4)

| metric | base-vs-branch.base | base-vs-branch.branch | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,644 | 1,614 | -29.7 (-2%) ± 540.4 | 1.000 |
| peak: renderer MB | 1,131 | 1,032 | -98.8 (-9%) ± 503.6 | 0.486 |
| peak: GPU MB | 269.9 | 331.9 | 61.9 (+23%) ± 175.7 | 0.057 |
| peak: JS heap MB | 97.1 | 77.3 | -19.8 (-20%) ± 3.1 | 0.029 ** |
| peak: page elements | 12,610 | 6,494 | -6,116 (-49%) ± 0.8 | 0.029 ** |
| peak: on-page elements | 3,938 | 2,003 | -1,935 (-49%) ± 0.0 | 0.029 ** |
| peak: decoded image MP | 3.3 | 3.3 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 3,224 | 2,998 | -225.5 (-7%) ± 74.1 | 0.029 ** |
| peak: query cache MB | 11.9 | 12.2 | 0.3 (+2%) ± 1.6 | 1.000 |
| visit: requests | 955.2 | 530.0 | -425.2 (-45%) ± 100.6 | 0.029 ** |
| visit: settle s | 4.0 | 2.9 | -1.0 (-26%) ± 3.2 | 0.486 |
| kept after 1st visit: JS heap MB | 29.3 | 29.1 | -0.2 (-1%) ± 2.5 | 0.486 |
| kept after 1st visit: elements | 218.2 | 220.8 | 2.5 (+1%) ± 11.8 | 0.657 |
| kept after 1st visit: renderer MB | 754.2 | 637.1 | -117.0 (-16%) ± 465.4 | 0.486 |
| each revisit: JS heap MB | 12.9 | 13.6 | 0.7 (+5%) ± 6.2 | 0.886 |
| each revisit: elements | 138.0 | 345.9 | 207.9 (+151%) ± 660.5 | 0.429 |

GraphQL operations per first visit: EntityCommentCount 238→0, EntityResponseCounts 157→1, EntitiesBatch 136→137, RelationsByFromEntityId 80→0, PropertiesBatch 56→66, RelationFacet 50→50, Spaces 26→36, EntityResponders 14→20
