import express from "express";
import cors from "cors";
import { router as rootRouter } from "./routers/index";

const app = express();

const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/v1/", rootRouter);

app.listen(3000, () => {
  console.log("app started at 3000\n");
});
