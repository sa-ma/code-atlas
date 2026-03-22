import assert from "node:assert/strict";
import test from "node:test";
import type { RepositoryMetadata, RepositoryRef } from "@/lib/types/code-atlas";
import {
  createGitHubClient,
  decodeRepositoryContent,
  mapRepositoryMetadata,
  mapRepositoryTreeEntries,
  validateGitHubToken,
} from "@/lib/server/github/github-client";

const baseRef: RepositoryRef = {
  owner: "acme",
  repo: "atlas",
  htmlUrl: "https://github.com/acme/atlas",
};

const metadata: RepositoryMetadata = {
  ...baseRef,
  defaultBranch: "main",
  description: "Atlas repository",
};

test("mapRepositoryMetadata preserves repository identity and maps GitHub fields", () => {
  assert.deepEqual(
    mapRepositoryMetadata(baseRef, {
      default_branch: "main",
      description: "Atlas repository",
      html_url: "https://github.com/acme/atlas",
    }),
    metadata,
  );
});

test("mapRepositoryTreeEntries keeps only blob and tree entries", () => {
  assert.deepEqual(
    mapRepositoryTreeEntries({
      tree: [
        { path: "src", type: "tree" },
        { path: "src/main.ts", type: "blob", size: 42 },
        { path: "README.md", type: "commit" },
        { type: "blob" },
      ],
    }),
    [
      { path: "src", type: "tree" },
      { path: "src/main.ts", type: "blob", size: 42 },
    ],
  );
});

test("decodeRepositoryContent decodes base64 file content", () => {
  assert.deepEqual(
    decodeRepositoryContent("README.md", {
      type: "file",
      encoding: "base64",
      content: Buffer.from("hello world").toString("base64"),
      size: 11,
    }),
    {
      path: "README.md",
      content: "hello world",
      size: 11,
    },
  );
});

test("decodeRepositoryContent skips unsupported GitHub content payloads", () => {
  assert.equal(
    decodeRepositoryContent("docs", [
      {
        type: "file",
      },
    ]),
    null,
  );

  assert.equal(
    decodeRepositoryContent("link", {
      type: "symlink",
      encoding: "base64",
      content: "aGVsbG8=",
      size: 5,
    }),
    null,
  );
});

test("createGitHubClient maps not-found and rate-limit errors", async () => {
  const client = await createGitHubClient({
    getAuthenticatedUser() {
      return Promise.resolve({});
    },
    getRepository() {
      return Promise.reject(Object.assign(new Error("not found"), { status: 404 }));
    },
    getTree() {
      return Promise.reject(
        Object.assign(new Error("rate limit exceeded"), {
          status: 403,
        }),
      );
    },
    getContent() {
      return Promise.resolve({
        type: "file",
        encoding: "base64",
        content: Buffer.from("ok").toString("base64"),
        size: 2,
      });
    },
  });

  await assert.rejects(
    () => client.fetchRepositoryMetadata(baseRef),
    /Repository not found or not publicly accessible\./,
  );

  await assert.rejects(
    () => client.fetchRepositoryTree(metadata, "main"),
    /GitHub API rate limit reached\./,
  );
});

test("validateGitHubToken fails fast for unauthorized tokens", async () => {
  const client = await createGitHubClient({
    getAuthenticatedUser() {
      return Promise.reject(
        Object.assign(new Error("unauthorized"), {
          status: 401,
        }),
      );
    },
    getRepository() {
      return Promise.reject(new Error("not used"));
    },
    getTree() {
      return Promise.reject(new Error("not used"));
    },
    getContent() {
      return Promise.reject(new Error("not used"));
    },
  });

  await assert.rejects(
    () => validateGitHubToken(client),
    /Invalid GITHUB_TOKEN\. GitHub rejected the configured API token\./,
  );
});
