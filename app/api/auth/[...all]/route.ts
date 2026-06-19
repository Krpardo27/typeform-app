import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST, PUT, DELETE } = toNextJsHandler(auth);