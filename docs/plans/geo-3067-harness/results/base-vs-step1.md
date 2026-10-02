
## F2_explore  (ab-base n=4 vs ab-step1 n=4)

| metric | ab-base | ab-step1 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,475 | 1,390 | -85.2 (-6%) ± 468.1 | 0.686 |
| peak: renderer MB | 804.4 | 770.1 | -34.3 (-4%) ± 245.3 | 0.686 |
| peak: GPU MB | 373.1 | 320.8 | -52.3 (-14%) ± 214.8 | 0.486 |
| peak: JS heap MB | 94.3 | 77.8 | -16.5 (-18%) ± 6.1 | 0.029 ** |
| peak: page elements | 27,434 | 24,308 | -3,125 (-11%) ± 5,000 | 0.200 |
| peak: on-page elements | 5,378 | 4,156 | -1,222 (-23%) ± 258.0 | 0.029 ** |
| peak: decoded image MP | 12.0 | 15.1 | 3.0 (+25%) ± 15.3 | 0.686 |
| peak: videos with src | 7.0 | 7.5 | 0.5 (+7%) ± 2.0 | 1.000 |
| peak: query cache entries | 1,556 | 1,287 | -268.8 (-17%) ± 582.7 | 0.171 |
| peak: query cache MB | 8.5 | 7.8 | -0.7 (-9%) ± 2.9 | 0.343 |
| visit: requests | 588.5 | 576.5 | -12.0 (-2%) ± 61.9 | 0.486 |
| visit: settle s | 9.5 | 11.1 | 1.5 (+16%) ± 14.6 | 0.886 |
| kept after 1st visit: JS heap MB | 18.6 | 17.3 | -1.2 (-7%) ± 2.7 | 0.200 |
| kept after 1st visit: elements | 20,367 | 17,262 | -3,106 (-15%) ± 2,324 | 0.029 ** |
| kept after 1st visit: renderer MB | 319.2 | 283.3 | -35.9 (-11%) ± 134.0 | 0.343 |
| each revisit: JS heap MB | 8.7 | 7.9 | -0.7 (-9%) ± 1.6 | 0.200 |
| each revisit: elements | 17,173 | 15,456 | -1,717 (-10%) ± 2,879 | 0.486 |

GraphQL operations per first visit: EntitiesBatch 80→77, EntityResponseCounts 61→44, Spaces 38→37, EntityResponders 27→24, Space 22→22, DebateTranscriptClaims 19→19, anon 16→16, ClaimResponseSummaries 15→14

## F3_space_ai  (ab-base n=4 vs ab-step1 n=4)

| metric | ab-base | ab-step1 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,067 | 1,140 | 72.9 (+7%) ± 86.5 | 0.200 |
| peak: renderer MB | 568.9 | 630.8 | 61.9 (+11%) ± 92.8 | 0.114 |
| peak: GPU MB | 214.0 | 229.1 | 15.1 (+7%) ± 85.5 | 1.000 |
| peak: JS heap MB | 67.1 | 68.0 | 0.9 (+1%) ± 3.3 | 0.486 |
| peak: page elements | 11,606 | 11,832 | 226.0 (+2%) ± 460.5 | 0.429 |
| peak: on-page elements | 2,679 | 2,679 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: decoded image MP | 17.1 | 22.9 | 5.7 (+33%) ± 10.4 | 0.571 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 577.5 | 584.0 | 6.5 (+1%) ± 10.6 | 0.114 |
| peak: query cache MB | 5.3 | 5.3 | 0.0 (+0%) ± 0.0 | 0.371 |
| visit: requests | 544.0 | 549.8 | 5.8 (+1%) ± 6.9 | 0.114 |
| visit: settle s | 2.4 | 9.3 | 6.9 (+294%) ± 22.0 | 0.486 |
| kept after 1st visit: JS heap MB | 18.9 | 19.2 | 0.3 (+1%) ± 0.5 | 0.486 |
| kept after 1st visit: elements | 1,654 | 1,476 | -177.5 (-11%) ± 513.6 | 0.486 |
| kept after 1st visit: renderer MB | 181.5 | 255.4 | 73.9 (+41%) ± 87.4 | 0.200 |
| each revisit: JS heap MB | 5.1 | 5.2 | 0.1 (+3%) ± 1.3 | 0.686 |
| each revisit: elements | 434.9 | 499.2 | 64.4 (+15%) ± 252.7 | 1.000 |

GraphQL operations per first visit: anon 82→82, EntitiesBatch 70→70, EntityResponseCounts 62→62, EntityCommentCount 45→45, RelationsByFromEntityId 18→18, Spaces 14→14, PropertiesBatch 13→13, EntityResponders 12→12

## F3b_space_small  (ab-base n=4 vs ab-step1 n=4)

| metric | ab-base | ab-step1 | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,548 | 1,466 | -82.1 (-5%) ± 412.3 | 0.886 |
| peak: renderer MB | 811.2 | 734.9 | -76.3 (-9%) ± 181.0 | 0.486 |
| peak: GPU MB | 433.8 | 436.9 | 3.1 (+1%) ± 223.2 | 1.000 |
| peak: JS heap MB | 97.1 | 76.7 | -20.5 (-21%) ± 13.8 | 0.029 ** |
| peak: page elements | 17,432 | 14,756 | -2,676 (-15%) ± 62.7 | 0.029 ** |
| peak: on-page elements | 4,496 | 3,500 | -996.0 (-22%) ± 7.8 | 0.029 ** |
| peak: decoded image MP | 25.5 | 29.5 | 4.0 (+16%) ± 21.2 | 1.000 |
| peak: videos with src | 6.0 | 6.0 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: query cache entries | 772.0 | 638.0 | -134.0 (-17%) ± 24.7 | 0.029 ** |
| peak: query cache MB | 3.0 | 2.8 | -0.2 (-7%) ± 0.2 | 0.143 |
| visit: requests | 280.0 | 279.8 | -0.2 (-0%) ± 66.4 | 0.886 |
| visit: settle s | 13.0 | 13.5 | 0.5 (+4%) ± 18.1 | 0.886 |
| kept after 1st visit: JS heap MB | 13.0 | 12.0 | -1.0 (-8%) ± 1.6 | 0.200 |
| kept after 1st visit: elements | 13,865 | 11,220 | -2,645 (-19%) ± 786.6 | 0.029 ** |
| kept after 1st visit: renderer MB | 251.0 | 241.4 | -9.6 (-4%) ± 85.4 | 0.886 |
| each revisit: JS heap MB | 3.1 | 3.0 | -0.1 (-2%) ± 0.8 | 0.686 |
| each revisit: elements | 3,480 | 4,037 | 557.5 (+16%) ± 5,619 | 1.000 |

GraphQL operations per first visit: EntityResponseCounts 33→33, EntitiesBatch 31→30, EntityResponders 16→16, Space 11→11, anon 8→8, Spaces 8→8, DebateTranscriptClaims 8→8, PropertiesBatch 7→7
