import express, { type Express } from "express";
import cuisineRouter from "./routes/cuisine.js";
import restroRouter from "./routes/restro.js";
import { ErrorHandler } from "./middlewares/ErrorHandler.js";

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Defined Routes
 */
app.use("/restro", restroRouter);
app.use("/cuisines", cuisineRouter);

/**
 * Global Error Handler.
 */
app.use(ErrorHandler);

const PORT = process.env.PORT;
app
  .listen(process.env.PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  })
  .on("error", (error) => {
    console.error(error.message);
  });
