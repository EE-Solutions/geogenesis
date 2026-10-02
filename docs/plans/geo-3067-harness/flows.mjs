// Flow catalog. Each flow loads the neutral page, then repeats its journey CYCLES times through
// client-side navigation, returning to the neutral page between cycles. Checkpoints:
//   base     neutral page after the first load
//   peak<k>  inside the journey, at its heaviest point
//   ret<k>   back on the neutral page after cycle k (retained memory)
export const IDS = {
  aiSpace: '41e851610e13a19441c4d980f2f2ce6b',
  debateEntity: '01a0d3c42b077233b4ea03639c494e2c',
  claimEntity: '269127878f5d5367f4de9601be12346b',
  newsEntity: '6e8450acf6c71b21791d3af8443120eb',
  smallSpace: '224406e0de3c48d78ef12774111b8b2f',
  personalSpace: '192b75d51fe6eafe06e8066f5f09b7f6',
  aiTabs: [
    '?tabId=16793c7203854fb4a99e887f38761465',
    '?tabId=27d3f95835da4358ad0c21ebaa8e8a8e',
    '?tabId=71008b9add9846d1942c2fd97a7028ea',
    '?tabId=5224cd4360ce4be4b7c47b9f00ec9539',
    '?tabId=9b4d1f040ce162eddf28d347be9867f0',
    '/community',
    '/activity',
  ],
  proposals: [
    '56ff52a05f7c465a8ef74471439c68f1',
    'b88470586b9d4bf8ae4b2bdbb302af71',
    '748c232880a34aba9fd79ab62dca33fe',
    '0efe674a1b0a4393a8ab9b564b2b62af',
    'cdaaa4f04c624f759d1221592fc82d9e',
  ],
};
export let NEUTRAL = process.env.BENCH_NEUTRAL ?? '/tools';
const CYCLES = Number(process.env.BENCH_CYCLES ?? 3);
const AI = `/space/${IDS.aiSpace}`;

function cycled(journey) {
  return async h => {
    await h.goto(NEUTRAL);
    await h.checkpoint('base');
    for (let k = 1; k <= CYCLES; k++) {
      await journey(h, k);
      await h.checkpoint(`peak${k}`);
      await h.spa(NEUTRAL);
      await h.checkpoint(`ret${k}`);
    }
  };
}

export const FLOWS = {
  // Phase 0 tools ----------------------------------------------------------------------------
  // Loads each neutral-page candidate fresh and records its cost.
  NEUTRAL_PROBE: async h => {
    for (const p of ['/root', '/bounties', '/dev/not-found', '/feature-flags', '/tools', '/home']) {
      await h.goto(p);
      await h.checkpoint(p);
    }
  },
  // Positive controls: a known leak per cycle on top of a cheap navigation.
  CTRL50: cycled(async h => {
    await h.spa('/bounties');
    await h.page.evaluate(() => {
      (window.__leak ??= []).push(new Float64Array((50 * 1048576) / 8).fill(1));
      const keep = (window.__leakNodes ??= []);
      for (let i = 0; i < 5000; i++) keep.push(document.createElement('div'));
    });
  }),
  CTRL10: cycled(async h => {
    await h.spa('/bounties');
    await h.page.evaluate(() => {
      (window.__leak ??= []).push(new Float64Array((10 * 1048576) / 8).fill(1));
      const keep = (window.__leakNodes ??= []);
      for (let i = 0; i < 1000; i++) keep.push(document.createElement('div'));
    });
  }),
  // Same navigation without the leak (the control's control).
  CTRL0: cycled(async h => {
    await h.spa('/bounties');
  }),

  // App flows --------------------------------------------------------------------------------
  F1_home: cycled(async h => {
    await h.spa('/home');
    await h.settle();
    await h.wheel(8000);
  }),
  F2_explore: cycled(async h => {
    await h.spa('/explore');
    await h.settle();
    await h.wheel(30000);
  }),
  F3_space_ai: cycled(async h => {
    await h.spa(AI);
    await h.settle();
    await h.wheel(10000);
  }),
  F3b_space_small: cycled(async h => {
    await h.spa(`/space/${IDS.smallSpace}`);
    await h.settle();
    await h.wheel(10000);
  }),
  F4_claim_page: cycled(async h => {
    await h.spa(`${AI}/${IDS.claimEntity}`);
    await h.settle();
    await h.wheel(8000);
  }),
  F4b_entity_page: cycled(async h => {
    await h.spa(`${AI}/${IDS.newsEntity}`);
    await h.settle();
    await h.wheel(6000);
  }),
  F5_debates_feed: cycled(async h => {
    await h.spa(`${AI}/debates`);
    await h.settle();
    for (let i = 0; i < 6; i++) await h.feed(1);
    for (let i = 0; i < 2; i++) await h.feed(-1);
  }),
  F6_debate_page: cycled(async h => {
    await h.spa(`${AI}/${IDS.debateEntity}`);
    await h.settle();
    for (let i = 0; i < 4; i++) await h.feed(1);
    for (let i = 0; i < 4; i++) await h.feed(-1);
  }),
  F7_space_tabs: cycled(async h => {
    for (const tab of IDS.aiTabs) {
      await h.spa(`${AI}${tab}`);
      await h.settle();
      await h.wheel(3000);
    }
  }),
  F8_proposals: cycled(async h => {
    await h.spa(`${AI}/governance`);
    await h.settle();
    for (const id of IDS.proposals) {
      await h.spa(`${AI}/governance?proposalId=${id}`);
      await h.settle();
      await h.wheel(2000);
    }
  }),
  F9_bounties: cycled(async h => {
    await h.spa('/bounties');
    await h.settle();
    await h.wheel(6000);
  }),
  F10_search: cycled(async h => {
    for (const term of ['AI', 'climate', 'bitcoin', 'health', 'election']) {
      await h.page.getByRole('button', { name: 'Search' }).first().click();
      await h.sleep(500);
      await h.page.keyboard.type(term, { delay: 60 });
      await h.settle();
      await h.page.keyboard.press('Escape');
      await h.sleep(500);
    }
    await h.spa('/space/' + IDS.smallSpace);
    await h.settle();
  }),
  // Signed in. Personal space overview.
  F12_personal_space: cycled(async h => {
    await h.spa(`/space/${IDS.personalSpace}`);
    await h.settle();
    await h.wheel(8000);
  }),
  // Signed in. Debates hub People tab left open: growth and request rate while idle.
  // Read-only: no availability toggle, requests or responses.
  F11_hub_people: async h => {
    await h.goto(NEUTRAL);
    await h.checkpoint('base');
    await h.page.getByRole('button', { name: /^Debate$/ }).first().click();
    await h.page.getByRole('button', { name: 'People' }).or(h.page.getByRole('tab', { name: 'People' })).first().click();
    await h.checkpoint('open');
    for (let m = 2; m <= 10; m += 2) {
      await h.sleep(120000);
      await h.checkpoint(`idle${m}`, { noSettle: true });
    }
    await h.page.keyboard.press('Escape');
    await h.spa('/bounties');
    await h.spa(NEUTRAL);
    await h.checkpoint('ret');
  },
  // All of the above in one session, ending with a 5 minute idle on the AI space.
  F13_mixed: async h => {
    await h.goto(NEUTRAL);
    await h.checkpoint('base');
    const steps = [
      ['explore', async () => { await h.spa('/explore'); await h.settle(); await h.wheel(60000); }],
      ['space', async () => { await h.spa(AI); await h.settle(); await h.wheel(20000); }],
      ['feed', async () => { await h.spa(`${AI}/debates`); await h.settle(); for (let i = 0; i < 10; i++) await h.feed(1); }],
      ['claim', async () => { await h.spa(`${AI}/${IDS.claimEntity}`); await h.settle(); await h.wheel(15000); }],
      ['tabs', async () => { for (const t of IDS.aiTabs) { await h.spa(`${AI}${t}`); await h.settle(); } }],
      ['gov', async () => { for (const id of IDS.proposals) { await h.spa(`${AI}/governance?proposalId=${id}`); await h.settle(); } }],
    ];
    for (const [name, step] of steps) {
      await step();
      await h.checkpoint(name);
    }
    await h.spa(AI);
    await h.checkpoint('idle0');
    for (let m = 1; m <= 5; m++) {
      await h.sleep(60000);
      await h.checkpoint(`idle${m}`, { noSettle: true });
    }
    await h.spa(NEUTRAL);
    await h.checkpoint('ret');
  },
};
