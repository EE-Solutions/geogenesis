
## F2_explore  (amp.on n=4 vs amp.off n=4)

| metric | amp.on | amp.off | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,525 | 1,551 | 25.6 (+2%) ± 386.9 | 0.886 |
| peak: renderer MB | 766.0 | 860.6 | 94.5 (+12%) ± 241.1 | 0.486 |
| peak: GPU MB | 464.5 | 386.0 | -78.5 (-17%) ± 154.1 | 0.343 |
| peak: JS heap MB | 57.9 | 55.4 | -2.4 (-4%) ± 4.0 | 0.200 |
| peak: page elements | 23,423 | 11,011 | -12,412 (-53%) ± 3,582 | 0.029 ** |
| peak: on-page elements | 1,504 | 1,323 | -181.8 (-12%) ± 258.6 | 0.057 |
| peak: decoded image MP | 14.8 | 13.6 | -1.2 (-8%) ± 5.5 | 0.629 |
| peak: videos with src | 8.0 | 8.0 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: query cache entries | 1,271 | 1,514 | 243.2 (+19%) ± 418.7 | 0.200 |
| peak: query cache MB | 7.8 | 8.8 | 1.0 (+13%) ± 2.4 | 0.200 |
| visit: requests | 528.0 | 697.2 | 169.2 (+32%) ± 188.1 | 0.057 |
| visit: settle s | 6.0 | 7.5 | 1.5 (+25%) ± 8.8 | 1.000 |
| kept after 1st visit: JS heap MB | 16.0 | 17.4 | 1.4 (+9%) ± 3.8 | 0.686 |
| kept after 1st visit: elements | 10,479 | 9,399 | -1,080 (-10%) ± 1,270 | 0.057 |
| kept after 1st visit: renderer MB | 315.4 | 398.6 | 83.2 (+26%) ± 198.4 | 0.486 |
| each revisit: JS heap MB | 7.3 | 6.5 | -0.8 (-11%) ± 1.0 | 0.114 |
| each revisit: elements | 4,930 | 1,170 | -3,761 (-76%) ± 1,833 | 0.029 ** |

GraphQL operations per first visit: EntitiesBatch 76→89, Spaces 40→44, DebateTranscriptClaims 20→22, anon 16→17, ClaimResponseSummaries 12→16, EntityResponseCounts 10→10, EntityResponders 10→10, SpaceBatch 9→8

## F3_space_ai  (amp.on n=4 vs amp.off n=4)

| metric | amp.on | amp.off | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,083 | 987.2 | -96.0 (-9%) ± 191.8 | 0.343 |
| peak: renderer MB | 562.9 | 521.5 | -41.4 (-7%) ± 94.5 | 0.486 |
| peak: GPU MB | 246.8 | 187.8 | -59.0 (-24%) ± 95.5 | 0.200 |
| peak: JS heap MB | 65.9 | 64.7 | -1.2 (-2%) ± 4.7 | 0.200 |
| peak: page elements | 10,818 | 10,808 | -10.8 (-0%) ± 1,695 | 0.800 |
| peak: on-page elements | 2,502 | 2,521 | 18.8 (+1%) ± 559.8 | 0.400 |
| peak: decoded image MP | 13.4 | 16.8 | 3.3 (+25%) ± 12.6 | 0.714 |
| peak: videos with src | 0.0 | 0.0 | 0.0 ± 0.0 | 1.000 |
| peak: query cache entries | 551.8 | 560.0 | 8.2 (+1%) ± 82.5 | 0.343 |
| peak: query cache MB | 5.2 | 5.3 | 0.1 (+3%) ± 1.0 | 0.371 |
| visit: requests | 421.8 | 458.5 | 36.8 (+9%) ± 48.5 | 0.200 |
| visit: settle s | 9.5 | 9.0 | -0.5 (-5%) ± 22.4 | 1.000 |
| kept after 1st visit: JS heap MB | 19.1 | 19.0 | -0.1 (-1%) ± 1.3 | 0.886 |
| kept after 1st visit: elements | 1,624 | 1,261 | -363.2 (-22%) ± 522.3 | 0.114 |
| kept after 1st visit: renderer MB | 229.2 | 167.9 | -61.3 (-27%) ± 83.9 | 0.200 |
| each revisit: JS heap MB | 5.6 | 5.2 | -0.3 (-5%) ± 1.1 | 0.200 |
| each revisit: elements | 488.9 | 436.0 | -52.9 (-11%) ± 223.4 | 0.486 |

GraphQL operations per first visit: anon 81→82, EntitiesBatch 70→72, Spaces 14→14, PropertiesBatch 13→13, EntityResponders 10→10, EntityResponseCountsBatch 8→9, EntitiesOrderedByPropertyConnection 8→8, EntityBacklinksPage 6→7

## F3b_space_small  (amp.on n=4 vs amp.off n=3)

| metric | amp.on | amp.off | change (95% CI) | p |
|---|---|---|---|---|
| peak: total MB | 1,173 | 1,046 | -126.3 (-11%) ± 330.8 | 0.400 |
| peak: renderer MB | 618.8 | 546.3 | -72.5 (-12%) ± 191.7 | 0.229 |
| peak: GPU MB | 250.9 | 222.5 | -28.3 (-11%) ± 100.3 | 0.400 |
| peak: JS heap MB | 56.3 | 52.8 | -3.5 (-6%) ± 5.6 | 0.229 |
| peak: page elements | 11,475 | 7,839 | -3,637 (-32%) ± 726.3 | 0.057 |
| peak: on-page elements | 1,724 | 1,721 | -3.8 (-0%) ± 11.6 | 0.114 |
| peak: decoded image MP | 14.9 | 14.9 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: videos with src | 8.0 | 8.0 | 0.0 (+0%) ± 0.0 | 1.000 |
| peak: query cache entries | 531.8 | 524.3 | -7.4 (-1%) ± 33.5 | 0.514 |
| peak: query cache MB | 2.7 | 2.7 | -0.1 (-2%) ± 0.4 | 0.714 |
| visit: requests | 239.2 | 262.3 | 23.1 (+10%) ± 20.8 | 0.057 |
| visit: settle s | 4.0 | 3.7 | -0.3 (-7%) ± 4.1 | 0.629 |
| kept after 1st visit: JS heap MB | 10.1 | 10.0 | -0.1 (-1%) ± 0.8 | 0.629 |
| kept after 1st visit: elements | 6,054 | 5,712 | -341.4 (-6%) ± 840.3 | 0.057 |
| kept after 1st visit: renderer MB | 147.6 | 115.3 | -32.3 (-22%) ± 188.2 | 0.629 |
| each revisit: JS heap MB | 3.0 | 2.5 | -0.6 (-19%) ± 0.3 | 0.057 |
| each revisit: elements | 2,128 | 14.2 | -2,114 (-99%) ± 2,092 | 0.057 |

GraphQL operations per first visit: EntitiesBatch 32→32, DebateTranscriptClaims 9→9, PropertiesBatch 6→6, Spaces 5→5, EntityResponders 5→5, anon 4→4, ClaimResponseSummaries 4→4, EntityResponseCountsBatch 4→4
