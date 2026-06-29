import express from "express";
import cors from "cors";
import { routes } from "./app/routes";
import { errorHandler } from "./app/middlewares/errorHandler";
import { initSentry } from "./config/sentry";

initSentry();

export const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);
app.use(errorHandler);
