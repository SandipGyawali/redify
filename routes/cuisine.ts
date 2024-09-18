import { Router } from "express";

const router: Router = Router();

router
  .route("/")
  .get(() => {
    console.log("Hs");
  })
  .post(() => console.log("sfs"));

export default router;
