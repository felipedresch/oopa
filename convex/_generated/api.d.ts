/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as bairros from "../bairros.js";
import type * as bootstrap from "../bootstrap.js";
import type * as dogPhotos from "../dogPhotos.js";
import type * as dogs from "../dogs.js";
import type * as domainValidators from "../domainValidators.js";
import type * as emails from "../emails.js";
import type * as errors from "../errors.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dogs from "../lib/dogs.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_tutors from "../lib/tutors.js";
import type * as permissionTemplates from "../permissionTemplates.js";
import type * as permissions from "../permissions.js";
import type * as seeds from "../seeds.js";
import type * as storage from "../storage.js";
import type * as testFixtures from "../testFixtures.js";
import type * as testHelpers from "../testHelpers.js";
import type * as tutors from "../tutors.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  bairros: typeof bairros;
  bootstrap: typeof bootstrap;
  dogPhotos: typeof dogPhotos;
  dogs: typeof dogs;
  domainValidators: typeof domainValidators;
  emails: typeof emails;
  errors: typeof errors;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/dogs": typeof lib_dogs;
  "lib/storage": typeof lib_storage;
  "lib/tokens": typeof lib_tokens;
  "lib/tutors": typeof lib_tutors;
  permissionTemplates: typeof permissionTemplates;
  permissions: typeof permissions;
  seeds: typeof seeds;
  storage: typeof storage;
  testFixtures: typeof testFixtures;
  testHelpers: typeof testHelpers;
  tutors: typeof tutors;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
