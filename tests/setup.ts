import { beforeAll, afterAll } from "bun:test";

beforeAll(() => {
  process.env.GOOGLE_GEMINI_API_KEY = "test-api-key";
  process.env.LOG_LEVEL = "error";
});

afterAll(() => {
  delete process.env.GOOGLE_GEMINI_API_KEY;
  delete process.env.LOG_LEVEL;
});