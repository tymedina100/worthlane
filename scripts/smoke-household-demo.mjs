const apiBase = (process.env.WORTHLANE_API_URL ?? "http://localhost:3001/api").replace(
  /\/$/,
  ""
);
const password = process.env.WORTHLANE_DEMO_PASSWORD ?? "WorthlaneDemo!2026";
const mutate = process.env.WORTHLANE_SMOKE_MUTATE === "true";

const people = [
  {
    name: "Tyler",
    email: process.env.WORTHLANE_TYLER_EMAIL ?? "tyler.demo@worthlane.local",
  },
  {
    name: "Rachel",
    email: process.env.WORTHLANE_RACHEL_EMAIL ?? "rachel.demo@worthlane.local",
  },
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function apiRequest(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${path} returned ${response.status}: ${
        body?.error?.message ?? "unknown error"
      }`
    );
  }
  return body?.data;
}

async function loadPerson(person) {
  const session = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: person.email, password }),
  });
  invariant(session?.accessToken, `${person.name} login did not return an access token`);

  const summary = await apiRequest("/households/current/summary", {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  invariant(summary?.household?.id, `${person.name} has no active household`);
  invariant(
    summary.members?.some(
      (member) => member.isCurrentUser && member.displayName === person.name
    ),
    `${person.name} did not receive a caller-relative member record`
  );
  invariant(
    summary.finances?.detailedAccounts?.every(
      (account) => account.isOwner || account.visibility === "SHARED"
    ),
    `${person.name} received private partner account detail`
  );

  return {
    summary,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

const [tylerSession, rachelSession] = await Promise.all(people.map(loadPerson));
const tyler = tylerSession.summary;
const rachel = rachelSession.summary;

invariant(tyler.household.id === rachel.household.id, "Demo users are not linked to one household");
invariant(
  tyler.household.updatedAt === rachel.household.updatedAt,
  "Demo users read different household revisions"
);

const goalState = (summary) =>
  summary.sharedGoals.map((goal) => ({
    id: goal.id,
    currentAmountMinor: goal.currentAmountMinor,
    contributions: goal.recentContributions.map((item) => ({
      id: item.id,
      amountMinor: item.amountMinor,
      memberId: item.memberId,
    })),
  }));

invariant(
  JSON.stringify(goalState(tyler)) === JSON.stringify(goalState(rachel)),
  "Demo users read different shared-goal state"
);
invariant(tyler.sharedGoals.length > 0, "The demo household has no shared goal");
invariant(tyler.responsibilities.length > 0, "The demo household has no responsibility plan");
invariant(
  tyler.finances.summaryOnlyByOwner.length > 0 &&
    rachel.finances.summaryOnlyByOwner.length > 0,
  "The demo does not exercise summary-only privacy"
);

if (mutate) {
  const memberIds = tyler.members.map((member) => member.id);
  const temporary = await apiRequest("/households/current/responsibilities", {
    method: "POST",
    headers: { authorization: `Bearer ${tylerSession.accessToken}` },
    body: JSON.stringify({
      name: `Cross-client smoke ${Date.now()}`,
      categoryId: null,
      monthlyAmountMinor: 12345,
      assignment: { mode: "EQUAL", memberIds },
    }),
  });

  try {
    const rachelAfterCreate = await apiRequest("/households/current/summary", {
      headers: { authorization: `Bearer ${rachelSession.accessToken}` },
    });
    invariant(
      rachelAfterCreate.responsibilities.some((item) => item.id === temporary.id),
      "Rachel did not observe Tyler's shared responsibility mutation"
    );
  } finally {
    await apiRequest(`/households/current/responsibilities/${temporary.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${tylerSession.accessToken}` },
      body: "{}",
    });
  }

  const [tylerAfterDelete, rachelAfterDelete] = await Promise.all([
    apiRequest("/households/current/summary", {
      headers: { authorization: `Bearer ${tylerSession.accessToken}` },
    }),
    apiRequest("/households/current/summary", {
      headers: { authorization: `Bearer ${rachelSession.accessToken}` },
    }),
  ]);
  invariant(
    !tylerAfterDelete.responsibilities.some((item) => item.id === temporary.id) &&
      !rachelAfterDelete.responsibilities.some((item) => item.id === temporary.id),
    "Temporary synchronization responsibility was not cleaned up for both users"
  );
}

await Promise.all(
  [tylerSession, rachelSession].map((session) =>
    apiRequest("/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${session.accessToken}` },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
  )
);

console.log(
  `Household smoke passed: ${tyler.household.name}; ${tyler.members.length} separate users; ` +
    `${tyler.responsibilities.length} responsibilities; ${tyler.sharedGoals.length} synchronized goal; ` +
    `${mutate ? "cross-user mutation verified and cleaned" : "read-only mode"}.`
);
