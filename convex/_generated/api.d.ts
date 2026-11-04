/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as automation from "../automation.js";
import type * as http from "../http.js";
import type * as lib_guard from "../lib/guard.js";
import type * as loans from "../loans.js";
import type * as notify from "../notify.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

declare const fullApi: ApiFromModules<{
  automation: typeof automation;
  http: typeof http;
  "lib/guard": typeof lib_guard;
  loans: typeof loans;
  notify: typeof notify;
  tools: typeof tools;
  users: typeof users;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
