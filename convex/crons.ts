import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process adoption follow-ups",
  { hours: 24 },
  internal.adoptionFollowups.runDaily,
  {},
);

export default crons;
